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
