'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/events'

// ---------------------------------------------------------------------------
// Markdown renderer
//
// Processes the AI response as React elements — no dangerouslySetInnerHTML,
// no arbitrary HTML. Handles the specific constructs the advisor model emits:
// headings (# / ##), bold (**text**), bullet lists (- / *), numbered lists,
// and paragraphs. Uses a line-by-line state machine so mixed content (e.g. a
// paragraph immediately followed by a list without a blank line) is handled
// correctly.
// ---------------------------------------------------------------------------

function renderInline(text: string): React.ReactNode {
  const segments = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {segments.map((seg, i) =>
        seg.startsWith('**') && seg.endsWith('**') ? (
          <strong key={i}>{seg.slice(2, -2)}</strong>
        ) : (
          seg
        ),
      )}
    </>
  )
}

function AdvisorMarkdown({ content }: { content: string }) {
  const lines   = content.split('\n')
  const nodes:  React.ReactNode[] = []
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []
  let paraLines: string[] = []

  const flushPara = (key: string) => {
    const text = paraLines.join(' ').trim()
    if (text) {
      nodes.push(
        <p key={key} className="leading-relaxed">
          {renderInline(text)}
        </p>,
      )
    }
    paraLines = []
  }

  const flushList = (key: string) => {
    if (!listItems.length) return
    if (listType === 'ul') {
      nodes.push(
        <ul key={key} className="list-disc space-y-0.5 pl-4">
          {listItems.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
        </ul>,
      )
    } else {
      nodes.push(
        <ol key={key} className="list-decimal space-y-0.5 pl-4">
          {listItems.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
        </ol>,
      )
    }
    listItems = []
    listType  = null
  }

  lines.forEach((raw, idx) => {
    const trimmed = raw.trim()
    const k       = String(idx)

    if (trimmed.startsWith('## ')) {
      flushPara(`p${k}`); flushList(`l${k}`)
      nodes.push(
        <h4 key={k} className="font-semibold text-gray-900">
          {renderInline(trimmed.slice(3))}
        </h4>,
      )
      return
    }

    if (trimmed.startsWith('# ')) {
      flushPara(`p${k}`); flushList(`l${k}`)
      nodes.push(
        <h3 key={k} className="font-semibold text-gray-900">
          {renderInline(trimmed.slice(2))}
        </h3>,
      )
      return
    }

    if (/^[-*]\s/.test(trimmed)) {
      flushPara(`p${k}`)
      if (listType !== 'ul') { flushList(`l${k}`); listType = 'ul' }
      listItems.push(trimmed.replace(/^[-*]\s/, ''))
      return
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushPara(`p${k}`)
      if (listType !== 'ol') { flushList(`l${k}`); listType = 'ol' }
      listItems.push(trimmed.replace(/^\d+\.\s+/, ''))
      return
    }

    if (!trimmed) {
      flushPara(`p${k}`); flushList(`l${k}`)
      return
    }

    // Regular text — accumulate into paragraph, flushing any open list first
    flushList(`l${k}`)
    paraLines.push(trimmed)
  })

  flushPara('p-end')
  flushList('l-end')

  return (
    <div className="space-y-2 text-sm text-gray-800">
      {nodes}
    </div>
  )
}

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
          <span className="text-xs text-indigo-500">Ask a question ›</span>
        </button>
      </div>
    )
  }

  // ── Expanded advisor ──────────────────────────────────────────────────────
  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
        ✦ AI Compliance Advisor
      </p>

      {/* Suggested questions */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSuggestion(q)}
            disabled={loading}
            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Question input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this company's compliance…"
          maxLength={500}
          disabled={loading}
          className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden="true"
              />
              Thinking…
            </span>
          ) : (
            'Ask'
          )}
        </button>
      </form>

      {/* Loading state (while awaiting first answer) */}
      {loading && !answer && (
        <div className="mt-3 rounded-xl bg-indigo-50 p-4">
          <div className="flex items-center gap-2 text-sm text-indigo-700">
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
              aria-hidden="true"
            />
            Analysing compliance data…
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Answer */}
      {answer && (
        <div className="mt-3 rounded-xl bg-indigo-50 p-4">
          <AdvisorMarkdown content={answer} />
        </div>
      )}

      {/* Hardcoded disclaimer — not AI-generated, not suppressible */}
      <p className="mt-3 text-xs text-gray-400">
        AI guidance is for informational purposes only and does not constitute
        legal or accounting advice.
      </p>
    </div>
  )
}
