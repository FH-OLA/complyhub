'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/events'

export default function AiAdvisorLocked() {
  const [expanded, setExpanded] = useState(false)

  const handleExpand = () => {
    setExpanded(true)
    trackEvent('ai_upgrade_prompt_shown')
  }

  // ── Collapsed header ──────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="mt-5 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={handleExpand}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            ✦ AI Compliance Advisor
          </span>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
            Pro
          </span>
        </button>
      </div>
    )
  }

  // ── Expanded locked panel ─────────────────────────────────────────────────
  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          ✦ AI Compliance Advisor
        </p>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          Pro feature
        </span>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <p className="mb-2 text-sm font-medium text-indigo-900">Ask questions like:</p>
        <ul className="mb-4 space-y-1 text-sm text-indigo-700">
          <li>• What should I do next?</li>
          <li>• Is anything overdue?</li>
          <li>• Which filing should I prioritise?</li>
          <li>• Explain my compliance score.</li>
          <li>• Summarise this company&apos;s compliance position.</li>
        </ul>
        <p className="mb-4 text-sm text-indigo-700">
          Upgrade to Pro to unlock AI-powered compliance guidance.
        </p>
        <a
          href="/upgrade"
          onClick={() => trackEvent('ai_upgrade_clicked')}
          className="inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Upgrade to Pro →
        </a>
      </div>
    </div>
  )
}
