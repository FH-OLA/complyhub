'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  companySearched?: boolean
  companyTracked?: boolean
}

const STEPS = [
  {
    label: 'Look up a UK company',
    description: 'Enter a Companies House number below to fetch live compliance data.',
  },
  {
    label: 'Track it',
    description: 'Click "Track this company" to save it to your portfolio.',
  },
  {
    label: 'Monitor your portfolio',
    description: 'Visit My Companies to view health scores and upcoming filing deadlines.',
  },
]

export default function OnboardingCard({
  companySearched = false,
  companyTracked = false,
}: Props) {
  const [visible, setVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      if (!user.user_metadata?.onboarding_dismissed) {
        setVisible(true)
      }
    })
  }, [])

  const handleDismiss = async () => {
    setDismissing(true)
    const supabase = createClient()
    await supabase.auth.updateUser({ data: { onboarding_dismissed: true } })
    setVisible(false)
    setDismissing(false)
  }

  if (!visible) return null

  const stepDone = [companySearched, companyTracked]
  const completedCount = stepDone.filter(Boolean).length
  const progressPct = (completedCount / STEPS.length) * 100

  return (
    <div className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-indigo-900">Welcome to ComplyHub</h2>
          <p className="mt-1 text-sm text-indigo-700">
            Get started in three steps — takes less than a minute.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          aria-label="Dismiss onboarding guide"
          className="shrink-0 rounded p-1 text-indigo-400 transition-colors hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
          <div
            className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-indigo-500">
          {completedCount} of {STEPS.length} steps complete
        </p>
      </div>

      {/* Step list */}
      <ol className="mt-4 space-y-3">
        {STEPS.map((step, i) => {
          const done = stepDone[i] ?? false
          const active = i === completedCount && !done

          return (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done
                    ? 'bg-indigo-500 text-white'
                    : active
                      ? 'border-2 border-indigo-400 bg-white text-indigo-600'
                      : 'bg-indigo-100 text-indigo-300'
                }`}
                aria-hidden="true"
              >
                {done ? '✓' : i + 1}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${
                    done
                      ? 'text-indigo-400 line-through decoration-indigo-300'
                      : active
                        ? 'text-indigo-900'
                        : 'text-indigo-500'
                  }`}
                >
                  {step.label}
                </p>
                {active && (
                  <p className="mt-0.5 text-xs leading-relaxed text-indigo-600">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* CTA when company is tracked */}
      {companyTracked && (
        <div className="mt-5 border-t border-indigo-100 pt-4">
          <Link
            href="/my-companies"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
          >
            View My Companies
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      )}
    </div>
  )
}
