import { redirect } from 'next/navigation'
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

  if (!user) {
    redirect('/auth/login?next=/my-companies')
  }

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .maybeSingle()

  const isProUser = subscription?.plan === 'pro' && subscription?.status === 'active'

  const { data: companies, error: dbError } = await supabase
    .from('tracked_companies')
    .select('id, company_name, company_number, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (dbError) {
    console.error('[my-companies] Failed to load tracked_companies:', dbError)
  }

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
    <>
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold text-text-1">My Companies</h1>
          <p className="mt-1 text-sm text-text-2">
            Live compliance tracking for your companies.
          </p>
          <div className="mt-2 flex items-center gap-3">
            {isProUser ? (
              <span className="rounded-[var(--pill-radius)] bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-accent">
                Pro
              </span>
            ) : (
              <span className="rounded-[var(--pill-radius)] border border-border-light bg-ground px-2.5 py-0.5 text-xs font-medium text-text-3">
                Free
              </span>
            )}
            {isProUser && <ManageSubscriptionButton />}
          </div>
        </div>

        {/* ACTION AREA */}
        <div className="flex flex-col items-start gap-2 sm:shrink-0 sm:items-end">
          {hasReachedFreeLimit ? (
            <span className="flex min-h-[44px] cursor-not-allowed items-center rounded-[var(--button-radius)] bg-accent px-4 text-sm font-semibold text-accent-fg opacity-50">
              + Track another company
            </span>
          ) : (
            <a
              href="/dashboard"
              className="flex min-h-[44px] items-center rounded-[var(--button-radius)] bg-accent px-4 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1"
            >
              + Track another company
            </a>
          )}

          {isProUser ? (
            <p className="text-xs text-text-3">Unlimited tracking</p>
          ) : hasReachedFreeLimit ? (
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <p className="text-xs text-semantic-red-text">
                Free limit reached. Upgrade to continue tracking.
              </p>
              <a
                href="/upgrade"
                className="flex min-h-[44px] items-center text-xs font-medium text-accent transition-colors hover:text-accent-hover"
              >
                Upgrade now &rarr;
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <div className="h-px bg-border-light" />

      {/* ERROR */}
      {dbError && (
        <div className="mt-6 rounded-[var(--card-radius)] bg-semantic-red-bg p-4 text-sm text-semantic-red-text">
          Could not load your companies. Please refresh the page or try again later.
        </div>
      )}

      {/* EMPTY STATE */}
      {!dbError && results.length === 0 && (
        <div className="mt-8">
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="7" width="18" height="14" rx="2" />
                <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            }
            heading="No companies tracked yet"
            body="Search for a UK company number to view its compliance status, then track it to monitor upcoming filing deadlines."
            action={{ label: 'Track your first company', href: '/dashboard' }}
          />
        </div>
      )}

      {/* CONTENT */}
      {results.length > 0 && (
        <>
          {/* PORTFOLIO SUMMARY */}
          <div className="mt-6 rounded-[var(--card-radius)] border border-border bg-surface p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-start sm:gap-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-semantic-green sm:mt-1.5" aria-hidden="true" />
                <div className="text-center sm:text-left">
                  <p className="text-[11px] font-medium text-text-2 sm:text-xs">Healthy</p>
                  <p className="text-lg font-semibold tabular-nums text-text-1 sm:text-xl">{healthCounts.healthy}</p>
                  <p className="hidden text-xs text-text-3 sm:block">All deadlines on track</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-start sm:gap-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-semantic-amber sm:mt-1.5" aria-hidden="true" />
                <div className="text-center sm:text-left">
                  <p className="text-[11px] font-medium text-text-2 sm:text-xs">Attention needed</p>
                  <p className="text-lg font-semibold tabular-nums text-text-1 sm:text-xl">{healthCounts.attention}</p>
                  <p className="hidden text-xs text-text-3 sm:block">Deadlines approaching</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-start sm:gap-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-semantic-red sm:mt-1.5" aria-hidden="true" />
                <div className="text-center sm:text-left">
                  <p className="text-[11px] font-medium text-text-2 sm:text-xs">Action required</p>
                  <p className="text-lg font-semibold tabular-nums text-text-1 sm:text-xl">{healthCounts.action}</p>
                  <p className="hidden text-xs text-text-3 sm:block">Overdue or urgent</p>
                </div>
              </div>
            </div>
          </div>

          {/* UPGRADE CTA */}
          {!isProUser && (
            <div className="mt-4 rounded-[var(--card-radius)] border border-border bg-accent-muted p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-1">
                    Track unlimited companies with Pro
                  </p>
                  <p className="mt-1 text-xs text-text-2">
                    Get priority alerts, early deadline warnings, and full compliance coverage.
                  </p>
                </div>
                <a
                  href="/upgrade"
                  className="flex min-h-[44px] shrink-0 items-center justify-center rounded-[var(--button-radius)] bg-accent px-5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
                >
                  Upgrade to Pro
                </a>
              </div>
            </div>
          )}

          {/* COMPANY LIST */}
          <div className="mt-6 space-y-4">
            {results.map(({ tracked, liveData, compliance, error }) => {
              if (error || !liveData || !compliance) {
                return (
                  <div
                    key={tracked.id}
                    className="rounded-[var(--card-radius)] border border-border bg-surface p-5"
                  >
                    <p className="text-sm font-semibold text-text-1">{tracked.company_name}</p>
                    <p className="mt-1 text-xs text-semantic-red-text">{error}</p>
                  </div>
                )
              }

              return (
                <TrackedCompanyCard
                  key={tracked.id}
                  trackedId={tracked.id}
                  company={liveData}
                  compliance={compliance}
                  isProUser={isProUser}
                />
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
