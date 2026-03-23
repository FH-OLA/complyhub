'use client'

import { useState } from 'react'
import type { CompaniesHouseCompany } from '@/lib/companies-house/client'
import type { ComplianceResult } from '@/lib/compliance'

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

export default function TrackedCompanyCard({ trackedId, company, compliance }: Props) {
    const [removing, setRemoving] = useState(false)
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
  <h2 className="text-lg font-semibold text-gray-900">{company.company_name}</h2>
  <p className="mt-1 text-sm text-gray-500">#{company.company_number}</p>
</div>
        <CompanyStatusBadge status={company.company_status} />
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
            <CompliancePill
              status={compliance.confirmationStatement.status}
              daysRemaining={compliance.confirmationStatement.daysRemaining}
            />
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <span className="text-sm text-gray-700">Accounts Filing</span>
          {company.company_status === 'dissolved' ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              N/A
            </span>
          ) : (
            <CompliancePill
              status={compliance.accounts.status}
              daysRemaining={compliance.accounts.daysRemaining}
            />
          )}
        </div>
            </div>

      <button
        disabled={removing}
        onClick={async () => {
          const confirmed = window.confirm('Remove this company from tracking?')
          if (!confirmed) return

          setRemoving(true)

          const res = await fetch(`/api/track/${trackedId}`, {
            method: 'DELETE',
          })

          setRemoving(false)

          if (!res.ok) {
  const data = await res.json()
  alert(data.error || 'Failed to remove company')
  return
}

          window.location.reload()
        }}
        className={`mt-5 w-full rounded-xl border py-2 text-sm font-medium ${
          removing
            ? 'cursor-not-allowed border-gray-200 text-gray-400'
            : 'border-red-200 text-red-600 hover:bg-red-50'
        }`}
      >
        {removing ? 'Removing...' : 'Remove company'}
      </button>

    </div>
  )
}
