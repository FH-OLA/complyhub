import { createClient } from '@/lib/supabase/server'
import { fetchCompany } from '@/lib/companies-house/client'
import { calculateCompliance } from '@/lib/compliance'
import TrackedCompanyCard from '@/components/dashboard/TrackedCompanyCard'
import ManageSubscriptionButton from '@/components/dashboard/ManageSubscriptionButton'
import EmptyState from '@/components/ui/EmptyState'
import type { CompaniesHouseCompany } from '@/lib/companies-house/client'
import type { ComplianceResult } from '@/lib/compliance'
import { calculateHealthScore, getHealthTier } from '@/lib/health-score'

interface TrackedCompany {
  id: string
  company_name: string
  company_number: string
  created_at: string
}

interface CompanyResult {
  tracked: TrackedCompany
  liveData: CompaniesHouseCompany | null
  compliance: ComplianceResult | null
  error: string | null
}

async function fetchCompanyResult(tracked: TrackedCompany): Promise<CompanyResult> {
  try {
    const liveData = await fetchCompany(tracked.company_number)
    const compliance = calculateCompliance(liveData)

    return { tracked, liveData, compliance, error: null }
  } catch {
    return { tracked, liveData: null, compliance: null, error: 'Could not load live data' }
  }
}

export default async function MyCompaniesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('plan, status')
    .eq('user_id', user!.id)
    .maybeSingle()

  const isProUser = subscription?.plan === 'pro' && subscription?.status === 'active'

  const { data: companies, error: dbError } = await supabase
    .from('tracked_companies')
    .select('id, company_name, company_number, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const rawResults: CompanyResult[] =
    companies && companies.length > 0
      ? await Promise.all((companies as TrackedCompany[]).map(fetchCompanyResult))
      : []

  // Sort by urgency: lowest health score first (most urgent at top).
  // Dissolved companies (no obligations) sort to the bottom; errors sort first.
  const results = [...rawResults].sort((a, b) => {
    const sortScore = (r: CompanyResult) => {
      if (r.error || !r.compliance) return -1 // fetch errors float to top
      if (r.liveData?.company_status === 'dissolved') return 101 // dissolved sink to bottom
      return calculateHealthScore(r.compliance)
    }
    return sortScore(a) - sortScore(b)
  })

  const total = results.length

  const healthCounts = results.reduce(
    (acc, { liveData, compliance, error }) => {
      if (error || !compliance || !liveData) return acc
      // Dissolved companies have no compliance obligations — exclude from counts.
      if (liveData.company_status === 'dissolved') return acc
      const tier = getHealthTier(calculateHealthScore(compliance))
      acc[tier] += 1
      return acc
    },
    { healthy: 0, attention: 0, action: 0 },
  )

  const hasReachedFreeLimit = !isProUser && total >= 1

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* HEADER */}
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-gray-900">My Companies</h1>

            {isProUser ? (
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                Pro plan
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                Free plan
              </span>
            )}
          </div>

          <p className="mt-3 text-base text-gray-600">
            Live compliance tracking for your companies.
          </p>
        </div>

        {/* ACTION AREA */}
        <div className="flex flex-col items-start gap-2 md:items-end">
          {hasReachedFreeLimit ? (
            <div className="cursor-not-allowed rounded-xl bg-gray-300 px-4 py-2.5 text-sm font-semibold text-white">
              + Track another company
            </div>
          ) : (
            <a
              href="/dashboard"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              + Track another company
            </a>
          )}

          {isProUser ? (
            <>
              <p className="text-xs text-indigo-600 font-medium">
                Pro active — unlimited tracking enabled.
              </p>
              <ManageSubscriptionButton />
            </>
          ) : hasReachedFreeLimit ? (
            <>
              <p className="text-xs font-medium text-red-600">
                You&apos;ve reached your free limit. Upgrade to continue tracking companies.
              </p>
              <a
                href="/upgrade"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Upgrade now &rarr;
              </a>
            </>
          ) : null}
        </div>
      </div>

      <div className="mb-8 h-px bg-gray-200" />

      {/* ERROR */}
      {dbError && (
        <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">
          Failed to load companies: {dbError.message}
        </div>
      )}

      {/* EMPTY STATE */}
      {!dbError && results.length === 0 && (
        <EmptyState
          icon="🏢"
          heading="No companies tracked yet"
          body="Search for a UK company number to view its compliance status, then track it to monitor upcoming filing deadlines."
          action={{ label: 'Track your first company', href: '/dashboard' }}
        />
      )}

      {/* CONTENT */}
      {results.length > 0 && (
        <>
          {/* STATS */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-green-100 bg-green-50 p-5 ring-1 ring-green-100">
              <p className="text-xs font-medium uppercase tracking-wide text-green-700">Healthy</p>
              <p className="mt-1 text-3xl font-bold text-green-800">{healthCounts.healthy}</p>
              <p className="mt-1 text-xs text-green-600">All deadlines on track</p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 ring-1 ring-amber-100">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Attention needed</p>
              <p className="mt-1 text-3xl font-bold text-amber-800">{healthCounts.attention}</p>
              <p className="mt-1 text-xs text-amber-600">Deadlines approaching</p>
            </div>

            <div className="rounded-xl border border-red-100 bg-red-50 p-5 ring-1 ring-red-100">
              <p className="text-xs font-medium uppercase tracking-wide text-red-700">Action required</p>
              <p className="mt-1 text-3xl font-bold text-red-800">{healthCounts.action}</p>
              <p className="mt-1 text-xs text-red-600">Overdue or urgent</p>
            </div>
          </div>

          {/* UPGRADE CTA */}
          {!isProUser && (
            <div className="mb-6 rounded-xl border-2 border-indigo-100 bg-indigo-50 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-indigo-900">Track unlimited companies with Pro</p>
                  <p className="mt-1 text-sm text-indigo-700">
                    Get priority alerts, early deadline warnings, and full compliance coverage.
                  </p>
                </div>
                <a
                  href="/upgrade"
                  className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Upgrade to Pro
                </a>
              </div>
            </div>
          )}

          {/* COMPANY LIST */}
          <div className="grid gap-6">
            {results.map(({ tracked, liveData, compliance, error }) => {
              if (error || !liveData || !compliance) {
                return (
                  <div key={tracked.id} className="rounded-xl border p-6">
                    <p className="font-semibold">{tracked.company_name}</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )
              }

              return (
                <TrackedCompanyCard
                  key={tracked.id}
                  trackedId={tracked.id}
                  company={liveData}
                  compliance={compliance}
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}