'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/events'

export default function AiAdvisorLocked() {
  const [expanded, setExpanded] = useState(false)

  const handleExpand = () => {
    setExpanded(true)
    trackEvent('ai_upgrade_prompt_shown')
  }

  // ── Collapsed state ───────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="mt-4 border-t border-border-light pt-4">
        <button
          type="button"
          onClick={handleExpand}
          aria-expanded="false"
          className="flex w-full min-h-[44px] items-center justify-between gap-3 rounded-[var(--button-radius)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-3" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M6 6.5a2 2 0 013.5 1.5c0 1-1.5 1-1.5 2M8 12v.01" />
            </svg>
            <p className="text-sm font-medium text-text-1">Compliance Advisor</p>
          </div>
          <span className="shrink-0 rounded-[var(--pill-radius)] bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent">
            Pro
          </span>
        </button>
      </div>
    )
  }

  // ── Expanded locked panel ─────────────────────────────────────────────────
  return (
    <div className="mt-4 border-t border-border-light pt-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-text-1">Compliance Advisor</p>
        <span className="rounded-[var(--pill-radius)] bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent">
          Pro
        </span>
      </div>

      <div className="rounded-[var(--card-radius)] border border-border bg-ground p-4">
        <p className="mb-2 text-sm font-medium text-text-1">Ask questions like:</p>
        <ul className="mb-3 space-y-1 text-sm text-text-2">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-3" aria-hidden="true" />
            What should I do next?
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-3" aria-hidden="true" />
            Is anything overdue?
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-3" aria-hidden="true" />
            Which filing should I prioritise?
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-3" aria-hidden="true" />
            Explain my compliance score.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-3" aria-hidden="true" />
            Summarise this company&apos;s compliance position.
          </li>
        </ul>
        <p className="mb-3 text-sm text-text-2">
          Upgrade to Pro to unlock compliance guidance.
        </p>
        <a
          href="/upgrade"
          onClick={() => trackEvent('ai_upgrade_clicked')}
          className="inline-flex min-h-[44px] items-center rounded-[var(--button-radius)] bg-accent px-4 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1"
        >
          Upgrade to Pro &rarr;
        </a>
      </div>
    </div>
  )
}
