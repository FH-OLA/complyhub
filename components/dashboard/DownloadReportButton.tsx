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
    <div className="mt-4">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden="true" />
            Generating report...
          </>
        ) : (
          'Download Compliance Report'
        )}
      </button>
      {error && (
        <p className="mt-1.5 text-center text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  )
}
