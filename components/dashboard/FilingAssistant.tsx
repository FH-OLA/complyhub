'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/events'
import AdvisorMarkdown from '@/components/ui/AdvisorMarkdown'
import { FILING_GUIDANCE } from '@/lib/filing-guidance'
import type { FilingType } from '@/lib/filing-guidance'

const FILING_OPTIONS: { type: FilingType; label: string }[] = [
  { type: 'confirmation_statement', label: 'Confirmation Statement (CS01)' },
  { type: 'accounts',               label: 'Annual Accounts' },
]

interface Props {
  trackedId: string
}

export default function FilingAssistant({ trackedId }: Props) {
  const [expanded,     setExpanded]     = useState(false)
  const [selectedType, setSelectedType] = useState<FilingType | null>(null)
  const [guide,        setGuide]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  const fetchGuide = async (filingType: FilingType) => {
    setSelectedType(filingType)
    setLoading(true)
    setError('')
    setGuide('')
    trackEvent('ai_filing_opened')

    try {
      const res  = await fetch(`/api/filing-assistant/${trackedId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ filingType }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Could not generate a guide. Please try again.')
        return
      }

      setGuide(data.guide ?? '')
    } catch {
      setError('Could not generate a guide. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleExpand = () => setExpanded(true)

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
              <rect x="3" y="2" width="10" height="12" rx="1" />
              <path d="M6 5h4M6 8h4M6 11h2" />
            </svg>
            <div>
              <p className="text-sm font-medium text-text-1">Filing Assistant</p>
              <p className="hidden text-xs text-text-3 sm:block">Prepare for a Confirmation Statement or Annual Accounts filing.</p>
            </div>
          </div>
          <span className="shrink-0 text-xs text-accent">Prepare &rsaquo;</span>
        </button>
      </div>
    )
  }

  const guidance = selectedType ? FILING_GUIDANCE[selectedType] : null

  // ── Expanded assistant ────────────────────────────────────────────────────
  return (
    <div className="mt-4 border-t border-border-light pt-4">
      <p className="mb-3 text-sm font-medium text-text-1">Filing Assistant</p>

      {/* Filing type selector */}
      <div className="mb-3 flex flex-wrap gap-2">
        {FILING_OPTIONS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => fetchGuide(type)}
            disabled={loading}
            aria-pressed={selectedType === type}
            className={`min-h-[44px] rounded-[var(--button-radius)] border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
              selectedType === type
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-border bg-ground text-text-2 hover:border-accent hover:text-accent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="mt-3 rounded-[var(--card-radius)] bg-ai-surface p-4">
          <div className="flex items-center gap-2 text-sm text-text-2">
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none"
              aria-hidden="true"
            />
            Preparing your filing guide…
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm text-semantic-red-text" role="alert">
          {error}
        </p>
      )}

      {/* Guide */}
      {guide && (
        <div className="overflow-anywhere mt-3 rounded-[var(--card-radius)] bg-ai-surface p-4">
          <AdvisorMarkdown content={guide} />
        </div>
      )}

      {/* Official filing destinations */}
      {guidance && guide && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-text-2">File directly:</p>
          {guidance.officialDestinations.map((dest) => (
            <a
              key={dest.url}
              href={dest.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center gap-1.5 rounded-[var(--button-radius)] text-xs text-accent underline transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1"
            >
              {dest.label}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
                <path d="M5 2h5v5M10 2L4.5 7.5" />
              </svg>
            </a>
          ))}
          <p className="pt-1 text-xs text-text-3">
            Guidance reviewed: {guidance.lastReviewed} · Source: {guidance.sourceLabel}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-3 text-xs text-text-3">
        ComplyHub does not file on your behalf. This guidance is for informational
        purposes only. Verify requirements directly with Companies House.
      </p>
    </div>
  )
}
