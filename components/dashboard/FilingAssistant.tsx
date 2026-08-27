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
            ✦ AI Filing Assistant
          </span>
          <span className="text-xs text-indigo-500">Prepare a filing ›</span>
        </button>
      </div>
    )
  }

  const guidance = selectedType ? FILING_GUIDANCE[selectedType] : null

  // ── Expanded assistant ────────────────────────────────────────────────────
  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
        ✦ AI Filing Assistant
      </p>

      {/* Filing type selector */}
      <div className="mb-3 flex flex-wrap gap-2">
        {FILING_OPTIONS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => fetchGuide(type)}
            disabled={loading}
            className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              selectedType === type
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="mt-3 rounded-xl bg-indigo-50 p-4">
          <div className="flex items-center gap-2 text-sm text-indigo-700">
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
              aria-hidden="true"
            />
            Preparing your filing guide…
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Guide — overflow-anywhere handles long URLs in AI output */}
      {guide && (
        <div className="overflow-anywhere mt-3 rounded-xl bg-indigo-50 p-4">
          <AdvisorMarkdown content={guide} />
        </div>
      )}

      {/* Official filing destinations — sourced from the guidance layer, never from AI output */}
      {guidance && guide && (
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold text-gray-600">File directly:</p>
          {guidance.officialDestinations.map((dest) => (
            <a
              key={dest.url}
              href={dest.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-indigo-600 underline hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 rounded"
            >
              {dest.label}
            </a>
          ))}
          <p className="pt-1 text-xs text-gray-400">
            Guidance reviewed: {guidance.lastReviewed} · Source: {guidance.sourceLabel}
          </p>
        </div>
      )}

      {/* Hardcoded disclaimer — not AI-generated, not suppressible */}
      <p className="mt-3 text-xs text-gray-400">
        ComplyHub does not file on your behalf. This guidance is for informational
        purposes only. Verify requirements directly with Companies House.
      </p>
    </div>
  )
}
