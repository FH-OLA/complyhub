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
  if (status === 'overdue') return 'text-semantic-red-text'
  if (status === 'due_soon') return 'text-semantic-amber-text'
  return 'text-semantic-green-text'
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

  const isActive = company.company_status === 'active'

  return (
    <div className="mt-6 max-w-2xl rounded-[var(--card-radius)] border border-border bg-surface p-5">
      <h2 className="break-words text-lg font-semibold text-text-1">{company.company_name}</h2>

      <p className="mt-1 text-[13px] text-text-2">
        {company.company_number}
        {company.company_type ? ` · ${company.company_type.replace(/-/g, ' ')}` : ''}
      </p>

      <div className={`mt-2 flex items-center gap-1.5 text-[13px] font-semibold ${
        isActive ? 'text-semantic-green-text' : 'text-text-3'
      }`}>
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isActive ? 'bg-semantic-green' : 'bg-text-3'
          }`}
          aria-hidden="true"
        />
        {isActive ? 'Active' : 'Dissolved'}
      </div>

      <p className="mt-2 text-[13px] text-text-2">
        {company.registered_office_address?.address_line_1},{' '}
        {company.registered_office_address?.locality},{' '}
        {company.registered_office_address?.postal_code}
      </p>

      <div className="mt-5">
        <h3 className="mb-3 text-sm font-semibold text-text-1">
          Compliance Status
        </h3>

        {company.company_status === 'dissolved' ? (
          <div className="rounded-[var(--button-radius)] bg-ground px-4 py-3">
            <p className="text-[13px] font-medium text-text-2">Company dissolved</p>
            <p className="text-xs text-text-3">
              No compliance obligations remaining
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between rounded-[var(--button-radius)] bg-ground px-4 py-3">
              <span className="text-[13px] text-text-2">Confirmation Statement</span>
              <div className="text-right">
                <span
                  className={`text-[13px] font-semibold ${getStatusColor(
                    company.compliance.confirmationStatement.status
                  )}`}
                >
                  {formatDays(company.compliance.confirmationStatement.daysRemaining)}
                </span>
                <span className="block text-[11px] text-text-3">
                  {formatDate(company.compliance.confirmationStatement.dueDate)}
                </span>
              </div>
            </div>

            <div className="flex justify-between rounded-[var(--button-radius)] bg-ground px-4 py-3">
              <span className="text-[13px] text-text-2">Accounts Filing</span>
              <div className="text-right">
                <span
                  className={`text-[13px] font-semibold ${getStatusColor(
                    company.compliance.accounts.status
                  )}`}
                >
                  {formatDays(company.compliance.accounts.daysRemaining)}
                </span>
                <span className="block text-[11px] text-text-3">
                  {formatDate(company.compliance.accounts.dueDate)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="mt-4 rounded-[var(--button-radius)] bg-semantic-green-bg px-3 py-3 text-[13px] text-semantic-green-text">
          <p>{message}</p>
          <a
            href="/my-companies"
            className="mt-1 inline-flex min-h-[44px] items-center font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:rounded-[var(--button-radius)]"
          >
            View in My Companies &rarr;
          </a>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 rounded-[var(--button-radius)] bg-semantic-red-bg px-3 py-3 text-[13px] text-semantic-red-text">
          {errorMsg}
        </div>
      )}

      {showUpgradePrompt && (
        <div className="mt-4 rounded-[var(--card-radius)] border border-border bg-accent-muted p-4">
          <p className="text-sm font-semibold text-text-1">Free plan limit reached</p>
          <p className="mt-1 text-[13px] text-text-2">
            You can track 1 company on the free plan. Upgrade to Pro to track unlimited companies.
          </p>
          <a
            href="/upgrade"
            className="mt-3 inline-flex min-h-[44px] items-center rounded-[var(--button-radius)] bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1"
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
        className={`mt-5 w-full rounded-[var(--button-radius)] py-2 min-h-[44px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 ${
          tracked || loading || checkingTracked
            ? 'cursor-not-allowed bg-accent text-accent-fg opacity-50'
            : 'bg-accent text-accent-fg hover:bg-accent-hover'
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
