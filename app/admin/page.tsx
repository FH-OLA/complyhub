import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-gray-400">No rating</span>
  return (
    <span className="text-amber-400" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatEventLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminPage() {
  const supabase = createAdminClient()

  // Fetch all data in parallel
  const [
    usersResult,
    { data: allSubs },
    { count: companiesTotal },
    { data: companiesByUserRaw },
    { data: recentFeedback },
    { count: feedbackTotal },
    { data: recentEvents },
    { data: allEventTypes },
    { data: allRatingsData },
  ] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('user_subscriptions').select('user_id, plan, status'),
    supabase.from('tracked_companies').select('*', { count: 'exact', head: true }),
    supabase.from('tracked_companies').select('user_id'),
    supabase
      .from('beta_feedback')
      .select('id, user_email, message, rating, page, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('beta_feedback').select('*', { count: 'exact', head: true }),
    supabase
      .from('usage_events')
      .select('id, user_id, event_type, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('usage_events').select('event_type'),
    supabase.from('beta_feedback').select('rating').not('rating', 'is', null),
  ])

  const users = usersResult.data?.users ?? []

  // Derived: pro subscribers
  const proUsers = (allSubs ?? []).filter(
    (s) => s.plan === 'pro' && s.status === 'active',
  )

  // Derived: tracked company count per user
  const companyCountByUser: Record<string, number> = {}
  companiesByUserRaw?.forEach((r) => {
    companyCountByUser[r.user_id] = (companyCountByUser[r.user_id] ?? 0) + 1
  })

  // Derived: plan label per user
  const planByUser: Record<string, string> = {}
  allSubs?.forEach((s) => {
    planByUser[s.user_id] = s.plan === 'pro' && s.status === 'active' ? 'Pro' : 'Free'
  })

  // Derived: email lookup for events table
  const emailByUserId: Record<string, string> = {}
  users.forEach((u) => {
    emailByUserId[u.id] = u.email ?? u.id
  })

  // Sorted beta tester list (newest first)
  const betaTesters = [...users]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((u) => ({
      id: u.id,
      email: u.email ?? '—',
      createdAt: u.created_at,
      plan: planByUser[u.id] ?? 'Free',
      companies: companyCountByUser[u.id] ?? 0,
    }))

  const conversion =
    users.length > 0 ? Math.round((proUsers.length / users.length) * 100) : 0

  // User growth (derived from existing users list)
  const now = Date.now()
  const MS_WEEK = 7 * 24 * 60 * 60 * 1000
  const MS_MONTH = 30 * 24 * 60 * 60 * 1000
  const newUsersThisWeek = users.filter(
    (u) => now - new Date(u.created_at).getTime() < MS_WEEK,
  ).length
  const newUsersThisMonth = users.filter(
    (u) => now - new Date(u.created_at).getTime() < MS_MONTH,
  ).length

  // Companies per user
  const usersWithCompanies = Object.keys(companyCountByUser).length
  const avgCompaniesPerUser =
    usersWithCompanies > 0
      ? ((companiesTotal ?? 0) / usersWithCompanies).toFixed(1)
      : '0'

  // Usage event breakdown
  const eventBreakdown: Record<string, number> = {}
  allEventTypes?.forEach((row: { event_type: string }) => {
    eventBreakdown[row.event_type] = (eventBreakdown[row.event_type] ?? 0) + 1
  })
  const totalEvents = Object.values(eventBreakdown).reduce((a, b) => a + b, 0)

  // Average feedback rating
  const ratings = (allRatingsData ?? [])
    .map((r: { rating: number | null }) => r.rating)
    .filter((r): r is number => r !== null)
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : null

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Founder Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Private beta operational overview</p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KEY STATS                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={users.length} />
        <StatCard
          label="Pro Subscribers"
          value={proUsers.length}
          sub={`${conversion}% conversion rate`}
        />
        <StatCard label="Companies Tracked" value={companiesTotal ?? 0} />
        <StatCard label="Feedback Submissions" value={feedbackTotal ?? 0} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* GROWTH & PRODUCT ANALYTICS                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Growth</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="New users (7 days)"
            value={newUsersThisWeek}
          />
          <StatCard
            label="New users (30 days)"
            value={newUsersThisMonth}
          />
          <StatCard
            label="Avg companies / user"
            value={avgCompaniesPerUser}
            sub={`${usersWithCompanies} users with at least 1`}
          />
          <StatCard
            label="Avg feedback rating"
            value={avgRating !== null ? `${avgRating} / 5` : '—'}
            sub={`${ratings.length} rated submission${ratings.length !== 1 ? 's' : ''}`}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* EVENT BREAKDOWN                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Usage Event Breakdown
          {totalEvents > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              {totalEvents} total
            </span>
          )}
        </h2>

        {totalEvents === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            No events recorded yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">Event type</th>
                  <th className="px-4 py-3 text-left">Count</th>
                  <th className="px-4 py-3 text-left">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(eventBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <tr key={type} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          {formatEventLabel(type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{count}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-1.5 rounded-full bg-indigo-400"
                              style={{ width: `${Math.round((count / totalEvents) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {Math.round((count / totalEvents) * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* BETA TESTERS                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Beta Testers ({users.length})
        </h2>

        {betaTesters.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            No users yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-left">Companies</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {betaTesters.map((tester) => (
                  <tr key={tester.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{tester.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          tester.plan === 'Pro'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tester.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tester.companies}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(tester.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* RECENT FEEDBACK                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Feedback</h2>

        {!recentFeedback || recentFeedback.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            No feedback yet. Responses from the in-app widget will appear here.
          </div>
        ) : (
          <div className="space-y-3">
            {recentFeedback.map((item: {
              id: string
              user_email: string | null
              message: string
              rating: number | null
              page: string | null
              created_at: string
            }) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Stars rating={item.rating} />
                      {item.page && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500">
                          {item.page}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{item.message}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-gray-400">
                    <p>{item.user_email ?? 'Anonymous'}</p>
                    <p>{formatDateTime(item.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* USAGE EVENTS                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Usage Events (last 30)</h2>

        {!recentEvents || recentEvents.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            No events recorded yet. Key user interactions will appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">Event</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentEvents.map((event: {
                  id: string
                  user_id: string
                  event_type: string
                  created_at: string
                }) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {formatEventLabel(event.event_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {emailByUserId[event.user_id] ?? event.user_id}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDateTime(event.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* BUILD INFORMATION                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Build Information</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-gray-500">Version</dt>
            <dd className="mt-0.5 font-mono font-medium text-gray-900">v0.1.0</dd>
          </div>
          <div>
            <dt className="text-gray-500">Stage</dt>
            <dd className="mt-0.5 font-mono font-medium text-gray-900">Private Beta</dd>
          </div>
          <div>
            <dt className="text-gray-500">Environment</dt>
            <dd className="mt-0.5 font-mono font-medium text-gray-900">
              {process.env.NODE_ENV}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Admin emails configured</dt>
            <dd className="mt-0.5 font-mono font-medium text-gray-900">
              {(process.env.ADMIN_EMAILS ?? '').split(',').filter(Boolean).length}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
