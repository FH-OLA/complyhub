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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 rounded-2xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Beta Feedback</p>
            <button
              onClick={handleClose}
              aria-label="Close feedback panel"
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {submitted ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl">🎉</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">Thanks for your feedback!</p>
              <p className="mt-1 text-xs text-gray-500">It helps us make ComplyHub better.</p>
              <button
                onClick={handleClose}
                className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4">
              <p className="mb-3 text-xs text-gray-500">
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
                    className={`text-2xl leading-none transition-colors ${
                      star <= rating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-300'
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
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="mt-3 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
              >
                {submitting ? 'Sending...' : 'Send feedback'}
              </button>
            </form>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700"
        aria-label={open ? 'Close feedback' : 'Open feedback'}
      >
        Feedback
      </button>
    </div>
  )
}
