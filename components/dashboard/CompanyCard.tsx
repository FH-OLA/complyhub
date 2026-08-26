import { useState, useEffect } from 'react'
import { trackEvent } from '@/lib/events'
import type { CompanyWithCompliance } from '@/lib/compliance'

type Props = {
  company: CompanyWithCompliance
  onTracked?: () => void
}

function formatDays(days: number) {
  if (days < 0) return `Overdue by ${Math.abs(days)} days`
  return `Due in ${days} days`
}

function getStatusColor(status: string) {
  if (status === 'overdue') return 'text-red-600'
  if (status === 'due_soon') return 'text-orange-500'
  return 'text-green-600'
}

function formatDate(isoString: string): string {
  if (!isoString || isoString === 'N/A') return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CompanyCard({ company, onTracked }: Props) {
  const [loading, setLoading] = useState(false)
  const [tracked, setTracked] = useState(false)
  const [checkingTracked, setCheckingTracked] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)

  useEffect(() => {
    setCheckingTracked(true)

    fetch(`/api/track?company_number=${encodeURIComponent(company.company_number)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.tracked) setTracked(true)
      })
      .finally(() => setCheckingTracked(false))
  }, [company.company_number])

  return (
    <div className="mt-6 max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
      <h2 className="break-words text-2xl font-bold text-gray-900">{company.company_name}</h2>

      <p className="mt-1 text-sm text-gray-500">
        {company.company_number}
        {company.company_type ? ` · ${company.company_type.replace(/-/g, ' ')}` : ''}
      </p>

      <p
        className={`mt-2 font-semibold ${
          company.company_status === 'active' ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {company.company_status === 'active' ? '🟢 Active' : '🔴 Dissolved'}
      </p>

      <p className="mt-2 text-sm text-gray-600">
        {company.registered_office_address?.address_line_1},{' '}
        {company.registered_office_address?.locality},{' '}
        {company.registered_office_address?.postal_code}
      </p>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          Compliance Status
        </h3>

        {company.company_status === 'dissolved' ? (
          <div className="rounded-xl bg-red-50 p-4">
            <p className="font-semibold text-red-700">Company dissolved</p>
            <p className="text-sm text-red-600">
              No compliance obligations remaining
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between rounded-xl bg-gray-50 p-4">
              <span className="text-sm text-gray-700">Confirmation Statement</span>
              <div className="text-right">
                <span
                  className={`text-sm font-semibold ${getStatusColor(
                    company.compliance.confirmationStatement.status
                  )}`}
                >
                  {formatDays(company.compliance.confirmationStatement.daysRemaining)}
                </span>
                <span className="block text-xs text-gray-400">
                  {formatDate(company.compliance.confirmationStatement.dueDate)}
                </span>
              </div>
            </div>

            <div className="flex justify-between rounded-xl bg-gray-50 p-4">
              <span className="text-sm text-gray-700">Accounts Filing</span>
              <div className="text-right">
                <span
                  className={`text-sm font-semibold ${getStatusColor(
                    company.compliance.accounts.status
                  )}`}
                >
                  {formatDays(company.compliance.accounts.daysRemaining)}
                </span>
                <span className="block text-xs text-gray-400">
                  {formatDate(company.compliance.accounts.dueDate)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <p>{message}</p>
          <a
            href="/my-companies"
            className="mt-1 inline-block font-semibold text-green-800 hover:underline"
          >
            View in My Companies &rarr;
          </a>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {showUpgradePrompt && (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-900">Free plan limit reached</p>
          <p className="mt-1 text-sm text-indigo-700">
            You can track 1 company on the free plan. Upgrade to Pro to track unlimited companies.
          </p>
          <a
            href="/upgrade"
            className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Upgrade to Pro
          </a>
        </div>
      )}

      <button
        disabled={loading || tracked || checkingTracked}
        onClick={async () => {
          setLoading(true)
          setMessage(null)
          setErrorMsg(null)
          setShowUpgradePrompt(false)

          try {
            const res = await fetch('/api/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                company_number: company.company_number,
                company_name: company.company_name,
              }),
            })

            const data = await res.json()

            if (!res.ok) {
              if (res.status === 403) {
                setShowUpgradePrompt(true)
                trackEvent('upgrade_clicked', { source: 'track_limit' })
                return
              }

              if (data.error?.includes('already')) {
                setTracked(true)
                setErrorMsg('You are already tracking this company')
                return
              }

              setErrorMsg(data.error || 'Failed to track company')
              return
            }

            setTracked(true)
            setMessage('Company tracked successfully!')
            trackEvent('company_tracked')
            onTracked?.()
          } catch {
            setErrorMsg('Something went wrong. Please try again.')
          } finally {
            setLoading(false)
          }
        }}
        className={`mt-6 w-full rounded-xl py-2 text-white min-h-[44px] ${
          tracked || loading || checkingTracked
            ? 'cursor-not-allowed bg-gray-400'
            : 'bg-black hover:bg-gray-800'
        }`}
      >
        {checkingTracked
          ? 'Checking...'
          : tracked
            ? 'Already Tracking'
            : loading
              ? 'Tracking...'
              : 'Track this company'}
      </button>
    </div>
  )
}