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
    <div className="mb-8 rounded-[var(--card-radius)] border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-text-1">Get started</h2>
          <p className="mt-1 text-[13px] text-text-2">
            Three steps — takes less than a minute.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          aria-label="Dismiss onboarding guide"
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-[var(--button-radius)] text-text-3 transition-colors hover:bg-ground hover:text-text-2 focus:outline-none focus:ring-2 focus:ring-focus-ring disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-border-light">
          <div
            className="h-1 rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-text-3">
          {completedCount} of {STEPS.length} steps complete
        </p>
      </div>

      {/* Step list */}
      <ol className="mt-3 space-y-2.5">
        {STEPS.map((step, i) => {
          const done = stepDone[i] ?? false
          const active = i === completedCount && !done

          return (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done
                    ? 'bg-accent text-accent-fg'
                    : active
                      ? 'border-2 border-accent bg-surface text-accent'
                      : 'bg-ground text-text-3 border border-border-light'
                }`}
                aria-hidden="true"
              >
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M2 5l2 2 4-4" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-[13px] font-medium ${
                    done
                      ? 'text-text-3 line-through'
                      : active
                        ? 'text-text-1'
                        : 'text-text-3'
                  }`}
                >
                  {step.label}
                </p>
                {active && (
                  <p className="mt-0.5 text-xs leading-relaxed text-text-2">
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
        <div className="mt-4 border-t border-border-light pt-3">
          <Link
            href="/my-companies"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            View My Companies
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      )}
    </div>
  )
}
