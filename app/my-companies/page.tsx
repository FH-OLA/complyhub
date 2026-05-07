import { createClient } from '@/lib/supabase/server'
import { fetchCompany } from '@/lib/companies-house/client'
import { calculateCompliance } from '@/lib/compliance'
import TrackedCompanyCard from '@/components/dashboard/TrackedCompanyCard'
import type { CompaniesHouseCompany } from '@/lib/companies-house/client'
import type { ComplianceResult } from '@/lib/compliance'

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

  const results: CompanyResult[] =
    companies && companies.length > 0
      ? await Promise.all((companies as TrackedCompany[]).map(fetchCompanyResult))
      : []

  const total = results.length

  const dueSoon = results.filter(({ compliance, error }) => {
    if (error || !compliance) return false

    return (
      (compliance.confirmationStatement.daysRemaining >= 0 &&
        compliance.confirmationStatement.daysRemaining <= 14) ||
      (compliance.accounts.daysRemaining >= 0 &&
        compliance.accounts.daysRemaining <= 14)
    )
  }).length

  const overdue = results.filter(({ compliance, error }) => {
    if (error || !compliance) return false

    return (
      compliance.confirmationStatement.daysRemaining < 0 ||
      compliance.accounts.daysRemaining < 0
    )
  }).length

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
            <p className="text-xs text-indigo-600 font-medium">
              Pro active — unlimited tracking enabled.
            </p>
          ) : (
            <>
              <p className="text-xs font-medium text-red-600">
                You’ve reached your free limit. Upgrade to continue tracking companies.
              </p>

              {hasReachedFreeLimit && (
                <a
                  href="/upgrade"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Upgrade now →
                </a>
              )}
            </>
          )}
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
        <div className="rounded-xl border p-10 text-center">
          <p className="text-sm text-gray-600">No companies tracked yet.</p>
        </div>
      )}

      {/* CONTENT */}
      {results.length > 0 && (
        <>
          {/* STATS */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-5">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>

            <div className="rounded-xl border p-5 bg-amber-50">
              <p className="text-xs text-amber-700">Due Soon</p>
              <p className="text-2xl font-bold">{dueSoon}</p>
            </div>

            <div className="rounded-xl border p-5 bg-red-50">
              <p className="text-xs text-red-700">Overdue</p>
              <p className="text-2xl font-bold">{overdue}</p>
            </div>
          </div>

          {/* 🔥 PRO PREVIEW CARD */}
          {!isProUser && (
            <div className="mb-6 rounded-xl border border-dashed p-6 text-center">
              <p className="text-sm text-gray-500">
                + Track another company{' '}
                <span className="font-semibold text-indigo-600">(Pro only)</span>
              </p>
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