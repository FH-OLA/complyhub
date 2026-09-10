import { describe, it, expect } from 'vitest'
import { buildScheduledCancellationNotice } from '@/lib/subscription'

const proActive = {
  plan: 'pro',
  status: 'active',
  cancel_at_period_end: true,
  current_period_end: '2026-10-10T12:34:56.000Z',
}

describe('buildScheduledCancellationNotice', () => {
  it('renders the notice with the stored end date for a cancelling Pro user', () => {
    expect(buildScheduledCancellationNotice(proActive)).toBe(
      "Your Pro subscription is scheduled to end on 10 October 2026. You'll keep Pro access until then.",
    )
  })

  it('does not imply the account is already cancelled', () => {
    const notice = buildScheduledCancellationNotice(proActive)!
    expect(notice).toContain('scheduled to end')
    expect(notice).toContain('keep Pro access until then')
    expect(notice.toLowerCase()).not.toContain('has been cancelled')
    expect(notice.toLowerCase()).not.toContain('no longer')
  })

  it('returns null when no cancellation is scheduled', () => {
    expect(
      buildScheduledCancellationNotice({ ...proActive, cancel_at_period_end: false }),
    ).toBeNull()
  })

  it('returns null when the end date is missing', () => {
    expect(
      buildScheduledCancellationNotice({ ...proActive, current_period_end: null }),
    ).toBeNull()
  })

  it('returns null when the end date is unparseable', () => {
    expect(
      buildScheduledCancellationNotice({ ...proActive, current_period_end: 'not-a-date' }),
    ).toBeNull()
  })

  it('returns null for a free user even if the flag is somehow set', () => {
    expect(
      buildScheduledCancellationNotice({ ...proActive, plan: 'free' }),
    ).toBeNull()
  })

  it('returns null once the subscription is no longer active', () => {
    expect(
      buildScheduledCancellationNotice({ ...proActive, status: 'cancelled' }),
    ).toBeNull()
  })

  it('returns null for a missing subscription row', () => {
    expect(buildScheduledCancellationNotice(null)).toBeNull()
    expect(buildScheduledCancellationNotice(undefined)).toBeNull()
  })

  it('formats the date in UTC regardless of the stored time of day', () => {
    // 23:30 UTC must not roll forward or back into a neighbouring day.
    expect(
      buildScheduledCancellationNotice({
        ...proActive,
        current_period_end: '2026-10-10T23:30:00.000Z',
      }),
    ).toContain('10 October 2026')
  })
})
