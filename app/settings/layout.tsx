import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/dashboard/Navbar'
import FeedbackWidget from '@/components/beta/FeedbackWidget'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const headerStore = await headers()
    const pathname = headerStore.get('x-pathname') ?? '/settings'
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={user.email ?? ''} />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      <FeedbackWidget />
    </div>
  )
}
