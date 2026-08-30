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
    <div className="fixed bottom-safe-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[calc(100vw-3rem)] max-w-xs rounded-[var(--card-radius)] border border-border bg-surface shadow-xl sm:w-80">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
            <p className="text-sm font-semibold text-text-1">Beta Feedback</p>
            <button
              onClick={handleClose}
              aria-label="Close feedback panel"
              className="text-sm text-text-3 hover:text-text-1"
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
                className="mt-4 text-xs font-medium text-accent hover:text-accent-hover"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4">
              <p className="mb-3 text-xs text-text-3">
                How is ComplyHub working for you so far?
              </p>

              {/* Star rating */}
              <div className="mb-3 flex gap-1" role="group" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} out of 5`}
                    className={`flex min-h-[44px] min-w-[44px] items-center justify-center text-2xl leading-none transition-colors ${
                      star <= rating ? 'text-semantic-amber' : 'text-border hover:text-semantic-amber'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's working well, or what could be better?"
                required
                rows={3}
                maxLength={2000}
                className="w-full resize-none rounded-[var(--input-radius)] border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder-text-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />

              {error && <p className="mt-1 text-xs text-semantic-red">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="mt-3 w-full rounded-[var(--button-radius)] bg-accent py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Send feedback'}
              </button>
            </form>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] items-center rounded-[var(--pill-radius)] bg-accent px-4 text-sm font-semibold text-white shadow-lg hover:bg-accent-hover"
        aria-label={open ? 'Close feedback' : 'Open feedback'}
      >
        Feedback
      </button>
    </div>
  )
}
