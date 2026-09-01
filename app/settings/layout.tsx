import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import AuthenticatedShell from '@/components/dashboard/AuthenticatedShell'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const headerStore = await headers()
    const pathname = headerStore.get('x-pathname') ?? '/settings'
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`)
  }

  return (
    <AuthenticatedShell userEmail={user.email ?? ''}>{children}</AuthenticatedShell>
  )
}
