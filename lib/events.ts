export type EventType =
  | 'company_searched'
  | 'company_tracked'
  | 'company_removed'
  | 'upgrade_clicked'
  | 'feedback_submitted'
  | 'email_alerts_disabled'
  | 'email_alerts_enabled'
  | 'report_downloaded'

/**
 * Fire-and-forget usage event tracker.
 * Synchronous call — never awaited, never throws to the caller.
 * Tracking failures are silently discarded so they never disrupt the UX.
 */
export function trackEvent(
  eventType: EventType,
  properties?: Record<string, string | number | boolean>,
): void {
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: eventType, properties: properties ?? {} }),
  }).catch(() => {
    // Intentionally empty — event tracking is non-critical
  })
}
