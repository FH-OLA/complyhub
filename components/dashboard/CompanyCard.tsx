import { useState, useEffect } from 'react'

type Props = {
  company: any
}

function formatDays(days: number) {
  if (days < 0) return `Overdue by ${Math.abs(days)} days`
  if (days <= 30) return `Due in ${days} days`
  return `Due in ${days} days`
}

function getStatusColor(status: string) {
  if (status === 'overdue') return 'text-red-600'
  if (status === 'due_soon') return 'text-orange-500'
  return 'text-green-600'
}

export default function CompanyCard({ company }: Props) {
  const [loading, setLoading] = useState(false)
  const [tracked, setTracked] = useState(false)
  const [checkingTracked, setCheckingTracked] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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
      {/* Company Name */}
      <h2 className="text-2xl font-bold text-gray-900">{company.company_name}</h2>

      {/* Status */}
      <p
        className={`mt-1 font-semibold ${
          company.company_status === 'active' ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {company.company_status === 'active' ? '🟢 Active' : '🔴 Dissolved'}
      </p>

      {/* Address */}
      <p className="mt-2 text-sm text-gray-600">
        {company.registered_office_address?.address_line_1},{' '}
        {company.registered_office_address?.locality},{' '}
        {company.registered_office_address?.postal_code}
      </p>

      {/* Compliance Section */}
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
            {/* Confirmation Statement */}
            <div className="flex justify-between rounded-xl bg-gray-50 p-4">
              <span className="text-sm text-gray-700">Confirmation Statement</span>
              <span
                className={`text-sm font-semibold ${getStatusColor(
                  company.compliance.confirmationStatement.status
                )}`}
              >
                {formatDays(company.compliance.confirmationStatement.daysRemaining)}
              </span>
            </div>

            {/* Accounts */}
            <div className="flex justify-between rounded-xl bg-gray-50 p-4">
              <span className="text-sm text-gray-700">Accounts Filing</span>
              <span
                className={`text-sm font-semibold ${getStatusColor(
                  company.compliance.accounts.status
                )}`}
              >
                {formatDays(company.compliance.accounts.daysRemaining)}
              </span>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Track Button */}
      <button
        disabled={loading || tracked || checkingTracked}
        onClick={async () => {
          setLoading(true)
          setMessage(null)
          setErrorMsg(null)

          const res = await fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company_number: company.company_number,
              company_name: company.company_name,
            }),
          })

          const data = await res.json()

          setLoading(false)

          if (!res.ok) {
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
        }}
        className={`mt-6 w-full rounded-xl py-2 text-white ${
          tracked || loading || checkingTracked
            ? 'cursor-not-allowed bg-gray-400'
            : 'bg-black hover:bg-gray-800'
        }`}
      >
        {checkingTracked ? 'Checking...' : tracked ? 'Already Tracking' : loading ? 'Tracking...' : 'Track this company'}
      </button>
    </div>
  )
}