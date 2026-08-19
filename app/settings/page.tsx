import { createClient } from '@/lib/supabase/server'
import EmailAlertsToggle from '@/components/settings/EmailAlertsToggle'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: prefs } = await supabase
    .from('email_preferences')
    .select('email_alerts_enabled')
    .eq('user_id', user!.id)
    .maybeSingle()

  // Absence of a row means opted-in (default-on)
  const emailAlertsEnabled = prefs?.email_alerts_enabled ?? true

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account preferences.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Email notifications
        </h2>
        <EmailAlertsToggle
          userId={user!.id}
          initialEnabled={emailAlertsEnabled}
        />
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Account
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Email address</p>
              <p className="mt-0.5 text-sm text-gray-500">{user!.email}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
