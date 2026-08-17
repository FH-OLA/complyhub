import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/admin')
  }

  // ADMIN_EMAILS is a comma-separated list of authorised founder emails.
  // Non-admins receive a 404 rather than a 403 so the route is not revealed.
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-indigo-600">ComplyHub</span>
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              Admin
            </span>
          </div>
          <a href="/my-companies" className="text-sm text-gray-500 hover:text-gray-900">
            Back to app
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  )
}
