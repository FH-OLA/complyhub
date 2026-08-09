import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export default async function UpgradeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent('/upgrade')}`)
  }

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('plan, status, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const isProUser = subscription?.plan === 'pro' && subscription?.status === 'active'

  if (isProUser && subscription?.stripe_customer_id && process.env.NEXT_PUBLIC_BASE_URL) {
    // Build the portal URL before calling redirect so the Stripe call stays
    // outside any catch block (redirect() throws internally).
    let portalUrl: string | null = null
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/my-companies`,
      })
      portalUrl = session.url
    } catch {
      // Portal creation failed — fall through and render the upgrade page.
    }
    if (portalUrl) {
      redirect(portalUrl)
    }
  }

  return <>{children}</>
}
