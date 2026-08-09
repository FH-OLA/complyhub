'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CompaniesHouseCompany } from '@/lib/companies-house/client'
import type { ComplianceResult } from '@/lib/compliance'
import { getCompanyHealthTier, HEALTH_TIER_CONFIG } from '@/lib/health-score'

interface Props {
  trackedId: string
  company: CompaniesHouseCompany
  compliance: ComplianceResult
}

function CompanyStatusBadge({ status }: { status: string }) {
  const isActive = status === 'active'
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {status}
    </span>
  )
}

function CompliancePill({
  status,
  daysRemaining,
}: {
  status: 'ok' | 'due_soon' | 'overdue'
  daysRemaining: number
}) {
  const styles = {
    ok: 'bg-green-100 text-green-700',
    due_soon: 'bg-orange-100 text-orange-700',
    overdue: 'bg-red-100 text-red-700',
  }

  const label =
    status === 'overdue'
      ? `Overdue by ${Math.abs(daysRemaining)} days`
      : `Due in ${daysRemaining} days`

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {label}
    </span>
  )
}

function formatDate(isoString: string): string {
  if (!isoString || isoString === 'N/A') return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TrackedCompanyCard({ trackedId, company, compliance }: Props) {
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
  }

  const csLastFiled = formatDate(company.confirmation_statement?.last_made_up_to ?? '')
  const accLastFiled = formatDate(company.accounts?.last_accounts?.made_up_to ?? '')

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{company.company_name}</h2>
          <p className="mt-1 text-sm text-gray-500">#{company.company_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tierConfig.badge}`}>
            {tierConfig.label}
          </span>
          <CompanyStatusBadge status={company.company_status} />
        </div>
      </div>

      {company.company_status === 'active' && compliance.accounts.status === 'due_soon' && (
        <div className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
          ⚠️ Action needed soon: Accounts due
        </div>
      )}

      {company.company_status === 'active' && compliance.accounts.status === 'overdue' && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          🚨 Urgent: Accounts overdue
        </div>
      )}

      {/* Compliance rows */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
          <span className="text-sm text-gray-700">Confirmation Statement</span>
          {company.company_status === 'dissolved' ? (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              No action
            </span>
          ) : (
            <div className="flex flex-col items-end gap-0.5">
              <CompliancePill
                status={compliance.confirmationStatement.status}
                daysRemaining={compliance.confirmationStatement.daysRemaining}
              />
              <span className="text-xs text-gray-400">
                {formatDate(compliance.confirmationStatement.dueDate)}
              </span>
              {csLastFiled && (
                <span className="text-xs text-gray-400">Last filed: {csLastFiled}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <span className="text-sm text-gray-700">Accounts Filing</span>
          {company.company_status === 'dissolved' ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              N/A
            </span>
          ) : (
            <div className="flex flex-col items-end gap-0.5">
              <CompliancePill
                status={compliance.accounts.status}
                daysRemaining={compliance.accounts.daysRemaining}
              />
              <span className="text-xs text-gray-400">
                {formatDate(compliance.accounts.dueDate)}
              </span>
              {accLastFiled && (
                <span className="text-xs text-gray-400">Last filed: {accLastFiled}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400">Companies House data refreshed hourly</p>

      {confirmingRemove ? (
        <div className="mt-5 rounded-xl border border-gray-200 p-3">
          <p className="mb-3 text-sm text-gray-700">Remove this company from tracking?</p>
          {removeError && <p className="mb-2 text-xs text-red-600">{removeError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setConfirmingRemove(false); setRemoveError('') }}
              disabled={removing}
              className="flex-1 rounded-lg border border-gray-200 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex-1 rounded-lg bg-red-600 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {removing ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingRemove(true)}
          className="mt-5 w-full rounded-xl border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Remove company
        </button>
      )}
    </div>
  )
}
