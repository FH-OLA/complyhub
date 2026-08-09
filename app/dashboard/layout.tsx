import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/dashboard/Navbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // proxy.ts injects x-pathname on every request so we can send the user
    // back to where they were trying to go after a successful login.
    const headerStore = await headers()
    const pathname = headerStore.get('x-pathname') ?? '/dashboard'
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={user.email ?? ''} />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  )
}
