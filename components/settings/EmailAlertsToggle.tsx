'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/events'

interface Props {
  userId: string
  initialEnabled: boolean
}

export default function EmailAlertsToggle({ userId, initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')

  const handleToggle = async () => {
    const next = !enabled
    setSaving(true)
    setError('')
    setSavedAt(null)

    const supabase = createClient()
    const { error: upsertError } = await supabase
      .from('email_preferences')
      .upsert(
        { user_id: userId, email_alerts_enabled: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )

    if (upsertError) {
      setError('Failed to save preference. Please try again.')
      setSaving(false)
      return
    }

    setEnabled(next)
    setSavedAt(new Date())
    setSaving(false)
    trackEvent(next ? 'email_alerts_enabled' : 'email_alerts_disabled')
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Compliance deadline reminders</h3>
          <p className="mt-1 text-sm text-gray-500">
            Receive a daily email when a tracked company has a filing deadline within 14 days or overdue.
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          {savedAt && !error && (
            <p className="mt-2 text-sm text-green-600">
              Preference saved.
            </p>
          )}
        </div>

        {/*
          The button is the ARIA switch and interactive element. It has a
          min-h/min-w of 44px to meet touch target requirements. The visual
          toggle track and thumb live inside as non-interactive children.
        */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={saving}
          onClick={handleToggle}
          className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="sr-only">{enabled ? 'Disable email alerts' : 'Enable email alerts'}</span>
          <span
            aria-hidden="true"
            className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 border-transparent transition-colors duration-200 ${
              enabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </span>
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        {enabled
          ? 'Email alerts are enabled. You can unsubscribe at any time using the link in any reminder email.'
          : 'Email alerts are disabled. Re-enable at any time using the toggle above.'}
      </p>
    </div>
  )
}
