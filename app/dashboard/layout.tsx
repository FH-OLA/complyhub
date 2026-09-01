import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import AuthenticatedShell from '@/components/dashboard/AuthenticatedShell'

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
    <AuthenticatedShell userEmail={user.email ?? ''}>{children}</AuthenticatedShell>
  )
}
