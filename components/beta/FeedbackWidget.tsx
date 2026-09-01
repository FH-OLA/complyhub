'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/events'

export default function FeedbackWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: rating > 0 ? rating : null, message, page: pathname }),
      })

      if (!res.ok) throw new Error('Failed to submit')

      setSubmitted(true)
      trackEvent('feedback_submitted')
    } catch {
      setError('Could not send feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(() => {
      setSubmitted(false)
      setRating(0)
      setMessage('')
      setError('')
    }, 300)
  }

  return (
    <div className="fixed bottom-safe-6 right-4 z-50 flex flex-col items-end gap-3 sm:right-6">
      {open && (
        <div className="w-[calc(100vw-2rem)] max-w-xs rounded-[var(--card-radius)] border border-border bg-surface shadow-xl sm:w-80">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
            <p className="text-sm font-semibold text-text-1">Beta Feedback</p>
            <button
              onClick={handleClose}
              aria-label="Close feedback panel"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-text-3 hover:text-text-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:rounded-[var(--button-radius)]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>

          {submitted ? (
            <div className="px-4 py-8 text-center">
              <p className="mt-2 text-sm font-semibold text-text-1">Thanks for your feedback!</p>
              <p className="mt-1 text-xs text-text-3">It helps us make ComplyHub better.</p>
              <button
                onClick={handleClose}
                className="mt-4 inline-flex min-h-[44px] items-center text-xs font-medium text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:rounded-[var(--button-radius)]"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4">
              <label htmlFor="feedback-message" className="mb-3 block text-xs text-text-3">
                How is ComplyHub working for you so far?
              </label>

              {/* Star rating */}
              <div className="mb-3 flex gap-1" role="group" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} out of 5`}
                    className={`flex min-h-[44px] min-w-[44px] items-center justify-center text-2xl leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:rounded-[var(--button-radius)] ${
                      star <= rating ? 'text-semantic-amber' : 'text-border hover:text-semantic-amber'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's working well, or what could be better?"
                required
                rows={3}
                maxLength={2000}
                className="w-full resize-none rounded-[var(--input-radius)] border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder-text-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />

              {error && <p className="mt-1 text-xs text-semantic-red-text" role="alert">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-[var(--button-radius)] bg-accent text-sm font-semibold text-accent-fg hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Send feedback'}
              </button>
            </form>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 sm:rounded-[var(--pill-radius)] sm:px-4"
        aria-label={open ? 'Close feedback' : 'Open feedback'}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="sm:hidden" aria-hidden="true">
          <path d="M2 13l2-2h8a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6z" />
          <path d="M8 16h4a2 2 0 002-2v-1" />
        </svg>
        <span className="hidden text-sm font-semibold sm:inline">Feedback</span>
      </button>
    </div>
  )
}
