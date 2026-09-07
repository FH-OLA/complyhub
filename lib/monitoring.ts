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

/**
 * Generic sibling of `captureStripeError` for non-Stripe subsystems.
 * Kept separate so the reviewed Stripe path stays untouched.
 * Fail-safe by the same contract: it must never throw into a caller.
 */
export function captureError(error: unknown, tags: SafeTags): void {
  try {
    Sentry.captureException(error, { tags })
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
    // Server-side GeoIP enrichment adds this after the payload leaves us; the
    // org-level $user.geo.** scrubbing rule is the authoritative control. This
    // covers anything the SDK itself might attach.
    delete event.user.geo
  }

  // Ephemeral Vercel container hostname. `includeServerName: false` stops the
  // Node SDK collecting it; this covers every other runtime and code path.
  delete event.server_name

  // Full dependency inventory with exact versions, added by the Node SDK's
  // default `modulesIntegration`. Not needed to debug beta errors.
  delete event.modules

  if (event.contexts) {
    // Locale and timezone: constant on the server, a fingerprinting and
    // coarse-location signal in the browser. No debugging value either way.
    delete event.contexts.culture
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
