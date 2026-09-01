import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function SuccessPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent('/success')}`)
  }

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .maybeSingle()

  const isProUser = subscription?.plan === 'pro' && subscription?.status === 'active'

  if (isProUser) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-[28px] font-bold text-text-1 sm:text-3xl">
          You&apos;re now on ComplyHub Pro
        </h1>
        <p className="mt-4 text-text-2">
          You can now track unlimited companies and receive full compliance alerts.
        </p>
        <Link
          href="/my-companies"
          className="mt-8 inline-flex min-h-[44px] items-center rounded-[var(--button-radius)] bg-accent px-6 py-3 font-semibold text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1"
        >
          Go to My Companies
        </Link>
      </div>
    )
  }

  // Webhook may not have fired yet — show a holding state rather than an error.
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-display text-[28px] font-bold text-text-1 sm:text-3xl">Payment received</h1>
      <p className="mt-4 text-text-2">
        Your account is being upgraded to Pro. This usually takes a few seconds.
      </p>
      <a
        href="/success"
        className="mt-8 inline-flex min-h-[44px] items-center rounded-[var(--button-radius)] border border-accent bg-surface px-6 py-3 font-semibold text-accent transition-colors hover:bg-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1"
      >
        Refresh
      </a>
    </div>
  )
}
