'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/events'
import AdvisorMarkdown from '@/components/ui/AdvisorMarkdown'

const SUGGESTED_QUESTIONS = [
  'What should I do next?',
  'Is anything overdue?',
  'Which filing should I prioritise?',
  'Explain my compliance score.',
  "Summarise this company's compliance position.",
] as const

interface Props {
  trackedId: string
}

export default function AiAdvisor({ trackedId }: Props) {
  const [expanded, setExpanded]   = useState(false)
  const [question, setQuestion]   = useState('')
  const [answer, setAnswer]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const handleExpand = () => {
    setExpanded(true)
    trackEvent('ai_advisor_opened')
  }

  const ask = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError('')
    setAnswer('')

    try {
      const res  = await fetch(`/api/advisor/${trackedId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question: trimmed }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Could not generate a response. Please try again.')
        return
      }

      setAnswer(data.answer ?? '')
    } catch {
      setError('Could not generate a response. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    ask(question)
  }

  const handleSuggestion = (q: string) => {
    setQuestion(q)
    ask(q)
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
            <div>
              <p className="text-sm font-medium text-text-1">Compliance Advisor</p>
              <p className="hidden text-xs text-text-3 sm:block">Ask questions about this company&apos;s compliance position.</p>
            </div>
          </div>
          <span className="shrink-0 text-xs text-accent">Ask &rsaquo;</span>
        </button>
      </div>
    )
  }

  // ── Expanded advisor ──────────────────────────────────────────────────────
  return (
    <div className="mt-4 border-t border-border-light pt-4">
      <p className="mb-3 text-sm font-medium text-text-1">Compliance Advisor</p>

      {/* Suggested questions */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSuggestion(q)}
            disabled={loading}
            className="min-h-[44px] max-w-full rounded-[var(--button-radius)] border border-border bg-ground px-3 py-2 text-xs text-text-2 transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Question input */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          aria-label="Ask a compliance question"
          placeholder="Ask about this company's compliance…"
          maxLength={500}
          disabled={loading}
          className="min-h-[44px] min-w-0 flex-1 rounded-[var(--input-radius)] border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="flex min-h-[44px] shrink-0 items-center justify-center rounded-[var(--button-radius)] bg-accent px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 animate-spin rounded-full border-2 border-accent-fg border-t-transparent motion-reduce:animate-none"
                aria-hidden="true"
              />
              Thinking…
            </span>
          ) : (
            'Ask'
          )}
        </button>
      </form>

      {/* Loading state */}
      {loading && !answer && (
        <div className="mt-3 rounded-[var(--card-radius)] bg-ai-surface p-4">
          <div className="flex items-center gap-2 text-sm text-text-2">
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none"
              aria-hidden="true"
            />
            Analysing compliance data…
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm text-semantic-red-text" role="alert">
          {error}
        </p>
      )}

      {/* Answer */}
      {answer && (
        <div className="overflow-anywhere mt-3 rounded-[var(--card-radius)] bg-ai-surface p-4">
          <AdvisorMarkdown content={answer} />
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-3 text-xs text-text-3">
        AI guidance is for informational purposes only and does not constitute
        legal or accounting advice.
      </p>
    </div>
  )
}
