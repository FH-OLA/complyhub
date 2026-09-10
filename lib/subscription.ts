/**
 * Subscription lifecycle helpers.
 *
 * Entitlement itself is unchanged and still expressed as
 * (plan === 'pro' && status === 'active'). A scheduled cancellation does NOT
 * revoke Pro early — Stripe keeps the subscription active until the period
 * ends, and so does ComplyHub.
 */

export interface SubscriptionRow {
  plan?: string | null
  status?: string | null
  cancel_at_period_end?: boolean | null
  current_period_end?: string | null
}

/** Formats an ISO timestamp as e.g. "10 October 2026". */
function formatEndDate(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  // Pinned to UTC so the rendered date matches the stored instant regardless of
  // the server's timezone.
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * The customer-facing notice for a Pro subscription that is scheduled to end.
 *
 * Returns null unless the subscription is genuinely Pro-and-active, is flagged
 * to cancel at period end, and has a usable end date — so the message can never
 * appear for an account that is not actually in that state, and never implies
 * the account is already cancelled.
 */
export function buildScheduledCancellationNotice(
  subscription: SubscriptionRow | null | undefined,
): string | null {
  if (!subscription) return null
  if (subscription.plan !== 'pro' || subscription.status !== 'active') return null
  if (!subscription.cancel_at_period_end) return null
  if (!subscription.current_period_end) return null

  const endDate = formatEndDate(subscription.current_period_end)
  if (!endDate) return null

  return `Your Pro subscription is scheduled to end on ${endDate}. You'll keep Pro access until then.`
}
