import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// `Sentry.captureRequestError` schedules its own flush through `vercelWaitUntil`,
// which returns early unless the global `EdgeRuntime` string is defined. On the
// Node.js runtime that check never passes, so the flush is never registered with
// the platform and the envelope races container freeze — observed in production
// as a 500 logged by Vercel with no corresponding Sentry event.
//
// Next.js types `onRequestError` as `=> void | Promise<void>` and awaits the
// result (see `instrumentationOnRequestError` in Next's base server), so
// awaiting a bounded flush here keeps the invocation alive until delivery
// completes. Capture behaviour itself is unchanged: `flush` only drains the
// transport queue, it never re-captures or mutates the event.
export async function onRequestError(
  ...args: Parameters<typeof Sentry.captureRequestError>
): Promise<void> {
  Sentry.captureRequestError(...args)

  try {
    // 2000 ms matches the bound the SDK itself uses in `flushSafelyWithTimeout`.
    const flushed = await Sentry.flush(2000)
    if (!flushed) {
      // No payload, request data, or DSN — just the operational signal that
      // delivery did not drain in time.
      console.warn('[sentry] event flush did not complete before timeout')
    }
  } catch {
    // Monitoring must never interfere with request handling.
    console.warn('[sentry] event flush failed')
  }
}
