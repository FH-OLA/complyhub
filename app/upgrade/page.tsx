'use client'

import { useState } from 'react'

export default function UpgradePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    try {
      setLoading(true)
      setError('')

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center px-4 py-16">
      <div className="grid w-full gap-8 md:grid-cols-2">
        
        {/* LEFT SIDE */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Upgrade to Pro
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
            Track unlimited companies and never miss a deadline.
          </h1>

          <p className="mt-4 text-base text-gray-600">
            ComplyHub Pro gives you full visibility and control over compliance,
            helping you avoid penalties and scale confidently.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-gray-700">
            <li>✔ Track unlimited companies</li>
            <li>✔ Priority compliance alerts</li>
            <li>✔ Early deadline warnings</li>
            <li>✔ Future premium features</li>
          </ul>
        </div>

        {/* RIGHT SIDE */}
        <div className="rounded-2xl border-2 border-indigo-600 bg-white p-8 shadow-md">
          <h2 className="text-xl font-semibold text-gray-900">ComplyHub Pro</h2>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            £9<span className="text-base font-medium text-gray-600">/month</span>
          </p>

          <p className="mt-4 text-sm text-gray-600">
            Cancel anytime. No hidden fees.
          </p>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="mt-8 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
          >
            {loading ? 'Redirecting...' : 'Upgrade to Pro'}
          </button>

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}

          <p className="mt-4 text-xs text-gray-400">
            Secure checkout powered by Stripe.
          </p>
        </div>

      </div>
    </div>
  )
}