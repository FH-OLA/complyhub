import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/dashboard/Navbar'
import FeedbackWidget from '@/components/beta/FeedbackWidget'
import Container from '@/components/ui/Container'

export default async function MyCompaniesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // proxy.ts injects x-pathname on every request so we can send the user
    // back to where they were trying to go after a successful login.
    const headerStore = await headers()
    const pathname = headerStore.get('x-pathname') ?? '/my-companies'
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`)
  }

  return (
    <div className="min-h-screen bg-ground">
      <Navbar userEmail={user.email ?? ''} />
      <main><Container className="py-10">{children}</Container></main>
      <FeedbackWidget />
    </div>
  )
}
