'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/events'

interface Props {
  trackedId: string
}

export default function DownloadReportButton({ trackedId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDownload = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/report/${trackedId}`)

      if (!res.ok) {
        setError('Could not generate report. Please try again.')
        return
      }

      // Read the server-supplied filename from Content-Disposition so the
      // downloaded file is named consistently with what the API produces.
      const disposition = res.headers.get('content-disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `complyhub-report-${trackedId}.pdf`

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)

      const anchor = document.createElement('a')
      anchor.href     = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)

      trackEvent('report_downloaded')
    } catch {
      setError('Could not generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[var(--button-radius)] border border-border py-2 text-sm font-medium text-accent transition-colors hover:bg-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
            Generating report...
          </>
        ) : (
          'Download Compliance Report'
        )}
      </button>
      {error && (
        <p className="mt-1.5 text-center text-xs text-semantic-red-text" role="alert">{error}</p>
      )}
    </div>
  )
}
