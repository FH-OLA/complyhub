'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CompaniesHouseCompany } from '@/lib/companies-house/client'
import type { ComplianceResult } from '@/lib/compliance'
import { getCompanyHealthTier, HEALTH_TIER_CONFIG } from '@/lib/health-score'
import { trackEvent } from '@/lib/events'
import DownloadReportButton from '@/components/dashboard/DownloadReportButton'
import AiAdvisor from '@/components/dashboard/AiAdvisor'
import AiAdvisorLocked from '@/components/dashboard/AiAdvisorLocked'
import FilingAssistant from '@/components/dashboard/FilingAssistant'
import FilingAssistantLocked from '@/components/dashboard/FilingAssistantLocked'

interface Props {
  trackedId: string
  company: CompaniesHouseCompany
  compliance: ComplianceResult
  isProUser: boolean
}

function StatusDot({ status }: { status: string }) {
  const isActive = status === 'active'
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${isActive ? 'bg-semantic-green' : 'bg-text-3'}`}
        aria-hidden="true"
      />
      <span className={`text-xs capitalize ${isActive ? 'text-text-2' : 'text-text-3'}`}>
        {status}
      </span>
    </span>
  )
}

function ComplianceRow({
  label,
  status,
  daysRemaining,
  dueDate,
  lastFiled,
}: {
  label: string
  status: 'ok' | 'due_soon' | 'overdue' | 'not_applicable'
  daysRemaining: number
  dueDate: string
  lastFiled: string
}) {
  const statusStyles: Record<string, string> = {
    ok: 'bg-semantic-green-bg text-semantic-green-text',
    due_soon: 'bg-semantic-amber-bg text-semantic-amber-text',
    overdue: 'bg-semantic-red-bg text-semantic-red-text',
    not_applicable: 'bg-ground text-text-3',
  }

  const statusLabel =
    status === 'overdue'
      ? `Overdue by ${Math.abs(daysRemaining)} days`
      : `Due in ${daysRemaining} days`

  return (
    <div className="rounded-[var(--button-radius)] bg-ground px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-1">{label}</p>
          {lastFiled && (
            <p className="mt-0.5 text-xs text-text-3">Last filed {lastFiled}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <span
            className={`rounded-[var(--pill-radius)] px-2 py-0.5 text-xs font-medium tabular-nums ${statusStyles[status]}`}
          >
            {statusLabel}
          </span>
          {dueDate && (
            <span className="text-xs tabular-nums text-text-3">{dueDate}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(isoString: string): string {
  if (!isoString || isoString === 'N/A') return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TrackedCompanyCard({ trackedId, company, compliance, isProUser }: Props) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [removeError, setRemoveError] = useState('')

  const tier = getCompanyHealthTier(company.company_status, compliance)
  const tierConfig = HEALTH_TIER_CONFIG[tier]

  const handleRemove = async () => {
    setRemoving(true)
    setRemoveError('')
    const res = await fetch(`/api/track/${trackedId}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setRemoveError(data.error || 'Failed to remove company')
      setRemoving(false)
      return
    }
    router.refresh()
    trackEvent('company_removed')
  }

  const isDissolved = company.company_status === 'dissolved'
  const csLastFiled = formatDate(company.confirmation_statement?.last_made_up_to ?? '')
  const accLastFiled = formatDate(company.accounts?.last_accounts?.made_up_to ?? '')

  return (
    <article className="rounded-[var(--card-radius)] border border-border bg-surface p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-base font-semibold text-text-1">
            {company.company_name}
          </h2>
          <p className="mt-0.5 text-xs tabular-nums text-text-3">
            #{company.company_number}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <span
            className={`rounded-[var(--pill-radius)] px-2.5 py-0.5 text-xs font-medium ${tierConfig.badge}`}
          >
            {tierConfig.label}
          </span>
          <StatusDot status={company.company_status} />
        </div>
      </div>

      {/* Alerts — preserved conditions exactly */}
      {company.company_status === 'active' && compliance.accounts.status === 'due_soon' && (
        <div className="mt-4 flex items-start gap-2.5 rounded-[var(--button-radius)] border-l-2 border-semantic-amber bg-semantic-amber-bg px-3 py-2.5">
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-semantic-amber" aria-hidden="true" />
          <p className="text-sm text-semantic-amber-text">
            Accounts due soon — review your filing deadline.
          </p>
        </div>
      )}

      {company.company_status === 'active' && compliance.accounts.status === 'overdue' && (
        <div className="mt-4 flex items-start gap-2.5 rounded-[var(--button-radius)] border-l-2 border-semantic-red bg-semantic-red-bg px-3 py-2.5">
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-semantic-red" aria-hidden="true" />
          <p className="text-sm text-semantic-red-text">
            Accounts overdue — file as soon as possible.
          </p>
        </div>
      )}

      {/* Filing obligations */}
      {isDissolved ? (
        <div className="mt-4 rounded-[var(--button-radius)] bg-ground px-4 py-3">
          <p className="text-sm text-text-3">No filing obligations</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <ComplianceRow
            label="Confirmation Statement"
            status={compliance.confirmationStatement.status}
            daysRemaining={compliance.confirmationStatement.daysRemaining}
            dueDate={formatDate(compliance.confirmationStatement.dueDate)}
            lastFiled={csLastFiled}
          />
          <ComplianceRow
            label="Annual Accounts"
            status={compliance.accounts.status}
            daysRemaining={compliance.accounts.daysRemaining}
            dueDate={formatDate(compliance.accounts.dueDate)}
            lastFiled={accLastFiled}
          />
        </div>
      )}

      <p className="mt-3 text-xs text-text-3">Companies House data refreshed hourly</p>

      {/* Actions — report, AI tools */}
      <div className="mt-4 border-t border-border-light pt-4">
        <DownloadReportButton trackedId={trackedId} />

        {isProUser ? (
          <AiAdvisor trackedId={trackedId} />
        ) : (
          <AiAdvisorLocked />
        )}

        {!isDissolved && (
          isProUser ? (
            <FilingAssistant trackedId={trackedId} />
          ) : (
            <FilingAssistantLocked />
          )
        )}
      </div>

      {/* Remove company */}
      <div className="mt-4 border-t border-border-light pt-3">
        {confirmingRemove ? (
          <div className="rounded-[var(--card-radius)] border border-border p-3">
            <p className="text-sm text-text-1">Remove this company from tracking?</p>
            {removeError && (
              <p className="mt-1 text-xs text-semantic-red-text" role="alert">
                {removeError}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { setConfirmingRemove(false); setRemoveError('') }}
                disabled={removing}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-[var(--button-radius)] border border-border bg-surface text-sm text-text-2 transition-colors hover:bg-ground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-[var(--button-radius)] border border-semantic-red bg-semantic-red-bg text-sm font-medium text-semantic-red-text transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
              >
                {removing ? 'Removing...' : 'Confirm remove'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingRemove(true)}
            className="inline-flex min-h-[44px] items-center text-xs text-text-3 transition-colors hover:text-semantic-red-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:rounded-[var(--button-radius)]"
          >
            Remove company
          </button>
        )}
      </div>
    </article>
  )
}
