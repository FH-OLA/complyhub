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
        <h1 className="text-3xl font-bold text-gray-900">
          You&apos;re now on ComplyHub Pro
        </h1>
        <p className="mt-4 text-gray-600">
          You can now track unlimited companies and receive full compliance alerts.
        </p>
        <Link
          href="/my-companies"
          className="mt-8 inline-block rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
        >
          Go to My Companies
        </Link>
      </div>
    )
  }

  // Webhook may not have fired yet — show a holding state rather than an error.
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-gray-900">Payment received</h1>
      <p className="mt-4 text-gray-600">
        Your account is being upgraded to Pro. This usually takes a few seconds.
      </p>
      <a
        href="/success"
        className="mt-8 inline-block rounded-xl border border-indigo-300 px-6 py-3 font-semibold text-indigo-600 hover:bg-indigo-50"
      >
        Refresh
      </a>
    </div>
  )
}
