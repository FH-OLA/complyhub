'use client'

import { useState } from 'react'
import { PLANS } from '@/lib/plans'

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
    <div className="mx-auto flex min-h-[70vh] max-w-[960px] items-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="grid w-full gap-8 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Upgrade to Pro
          </p>

          <h1 className="mt-3 font-display text-[28px] font-bold text-text-1 sm:text-3xl">
            Never miss a compliance deadline again.
          </h1>

          <p className="mt-4 text-base text-text-2">{PLANS.pro.description}</p>

          <ul className="mt-8 space-y-3 text-sm text-text-2">
            {PLANS.pro.features.map((feature, i) => (
              <li key={feature}>
                &#10003; {feature}
                {i === 0 && (
                  <span className="ml-2 rounded-[var(--pill-radius)] bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">
                    PRO
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-[var(--card-radius)] bg-semantic-amber-bg p-4 text-sm text-semantic-amber-text">
            Missing a Companies House deadline can result in penalties and company strike-off.
          </div>
        </div>

        <div className="rounded-[var(--card-radius)] border-2 border-accent bg-surface p-8">
          <h2 className="text-xl font-semibold text-text-1">ComplyHub {PLANS.pro.name}</h2>

          <p className="mt-2 text-3xl font-bold text-text-1">
            {PLANS.pro.price}
            <span className="text-base font-medium text-text-2">{PLANS.pro.period}</span>
          </p>

          <p className="mt-4 text-sm text-text-2">Cancel anytime. No hidden fees.</p>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="mt-8 flex min-h-[44px] w-full items-center justify-center rounded-[var(--button-radius)] bg-accent px-4 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Redirecting...' : 'Upgrade to Pro'}
          </button>

          {error && <p className="mt-4 text-sm text-semantic-red-text">{error}</p>}

          <p className="mt-4 text-xs text-text-3">Secure checkout powered by Stripe.</p>
        </div>
      </div>
    </div>
  )
}
