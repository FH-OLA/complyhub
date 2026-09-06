import * as Sentry from '@sentry/nextjs'

type SafeTags = {
  subsystem: string
  operation: string
  stripe_event_type?: string
}

export function captureStripeError(
  error: unknown,
  tags: SafeTags,
  extra?: { stripe_event_id?: string },
): void {
  try {
    Sentry.captureException(error, {
      tags,
      ...(extra ? { extra } : {}),
    })
  } catch {
    // Monitoring must never interfere with business logic
  }
}

export function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  if (event.request) {
    delete event.request.cookies
    delete event.request.headers
    delete event.request.data
    delete event.request.query_string
  }

  if (event.user) {
    delete event.user.email
    delete event.user.username
    delete event.user.ip_address
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.filter((b) => {
      if (b.category === 'http' || b.type === 'http') {
        const url = (b.data?.url as string) ?? ''
        if (url.includes('anthropic') || url.includes('api.openai')) return false
      }
      return true
    })

    for (const b of event.breadcrumbs) {
      if (b.data) {
        delete b.data.request_body
        delete b.data.response_body
        delete b.data.body
      }
    }
  }

  return event
}
