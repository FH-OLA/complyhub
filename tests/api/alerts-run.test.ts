import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeAdminClient, makeQueryChain } from '../helpers/supabase-mock'
import { TEST_DATE, dormantCompany, overdueCompany } from '../helpers/fixtures'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/companies-house/client', () => ({
  fetchCompany: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

vi.mock('resend', () => {
  const mockResend = { emails: { send: vi.fn() } }
  return { Resend: vi.fn(() => mockResend) }
})

import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCompany } from '@/lib/companies-house/client'
import { GET } from '@/app/api/alerts/run/route'

const mockedCreateAdmin  = vi.mocked(createAdminClient)
const mockedFetchCompany = vi.mocked(fetchCompany)
const mockedCapture      = vi.mocked(Sentry.captureException)
const resendInstance     = new (Resend as unknown as new () => {
  emails: { send: ReturnType<typeof vi.fn> }
})()

const CRON_SECRET = 'test-cron-secret'
const RECIPIENT   = 'recipient@example.com'

// The free-text Resend message deliberately embeds an address, mirroring what
// Resend returns for validation errors. It must never reach Sentry.
const LEAKY_MESSAGE = `DO NOT LEAK ${RECIPIENT}`

function makeRequest(secret: string = CRON_SECRET): Request {
  return new Request('http://localhost/api/alerts/run', {
    headers: { authorization: `Bearer ${secret}` },
  })
}

/**
 * Chain for alert_history that answers the dedup SELECT and records INSERTs.
 *
 * `existing: null` (default) means "no recent alert", so the candidate is sent.
 * `insertErrors` is consumed one entry per INSERT, so a multi-alert email can
 * have one row succeed and the next fail.
 */
function makeAlertHistoryChain(
  inserts: Record<string, unknown>[],
  opts: { existing?: unknown; insertErrorQueue?: (unknown | null)[] } = {},
) {
  const selectResult = { data: opts.existing ?? null, error: null }
  // Shared across chain instances — `from('alert_history')` is called once for
  // the dedupe SELECT and once per INSERT, so the queue must not reset.
  const insertErrors = opts.insertErrorQueue ?? []

  const chain: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === 'then') {
          return (resolve: (v: typeof selectResult) => unknown) =>
            Promise.resolve(selectResult).then(resolve)
        }
        if (prop === 'maybeSingle' || prop === 'single') {
          return () => Promise.resolve(selectResult)
        }
        if (prop === 'insert') {
          return (payload: Record<string, unknown>) => {
            inserts.push(payload)
            const insertResult = { data: null, error: insertErrors.shift() ?? null }
            return {
              then: (resolve: (v: typeof insertResult) => unknown) =>
                Promise.resolve(insertResult).then(resolve),
            }
          }
        }
        return () => chain
      },
    },
  )
  return chain
}

type TrackedRow = { id: string; user_id: string; company_name: string; company_number: string }

function setupAdmin(
  companies: TrackedRow[],
  historyOpts: { existing?: unknown; insertErrors?: (unknown | null)[] } = {},
) {
  const alertHistoryInserts: Record<string, unknown>[] = []
  const insertErrorQueue = [...(historyOpts.insertErrors ?? [])]
  const admin = makeAdminClient()

  admin.from.mockImplementation((table: string) => {
    if (table === 'tracked_companies') return makeQueryChain({ data: companies, error: null })
    if (table === 'email_preferences') return makeQueryChain({ data: [], error: null })
    if (table === 'alert_history')
      return makeAlertHistoryChain(alertHistoryInserts, {
        existing: historyOpts.existing,
        insertErrorQueue,
      })
    return makeQueryChain({ data: null, error: null })
  })

  // Every tracked user resolves to a deterministic address. Without this the
  // route skips at the email-resolution step and never reaches Resend.
  admin.auth.admin.getUserById.mockImplementation(async (userId: string) => ({
    data: { user: { id: userId, email: userId === 'user-a' ? RECIPIENT : `${userId}@example.test` } },
  }))

  mockedCreateAdmin.mockReturnValue(admin as never)
  return { admin, alertHistoryInserts }
}

const COMPANY_A: TrackedRow = {
  id: 'tracked-a',
  user_id: 'user-a',
  company_name: 'Dormant Test Ltd',
  company_number: '11223344',
}

const COMPANY_B: TrackedRow = {
  id: 'tracked-b',
  user_id: 'user-b',
  company_name: 'Second Test Ltd',
  company_number: '55667788',
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/alerts/run — Resend send-failure observability
//
// The Resend SDK converts transport failures into a RESOLVED { error } object
// rather than throwing, so this branch handles effectively every send failure.
// Before the fix it was console-only: a revoked key or exhausted quota failed
// for every recipient, every day, while the cron returned HTTP 200.
//
// dormantCompany at TEST_DATE yields exactly one eligible alert:
//   confirmation statement next_due 2026-01-15 → 14 days → eligible (<= 14)
//   accounts            next_due 2026-01-20 → 19 days → not eligible
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/alerts/run — Resend failure reporting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(TEST_DATE)

    process.env.CRON_SECRET         = CRON_SECRET
    process.env.RESEND_API_KEY      = 'test-resend-key'
    process.env.ALERT_FROM_EMAIL    = 'alerts@example.test'
    process.env.UNSUBSCRIBE_SECRET  = 'test-unsubscribe-secret'
    process.env.APP_URL             = 'https://example.test'

    mockedFetchCompany.mockResolvedValue(dormantCompany)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── A. Returned Resend error ───────────────────────────────────────────────

  it('captures a returned Resend error exactly once', async () => {
    const { alertHistoryInserts } = setupAdmin([COMPANY_A])
    resendInstance.emails.send.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', statusCode: 429, message: LEAKY_MESSAGE },
      headers: null,
    })

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    expect(mockedCapture).toHaveBeenCalledTimes(1)
    expect(alertHistoryInserts).toHaveLength(0)
  })

  it('reports only the provider error code and status', async () => {
    setupAdmin([COMPANY_A])
    resendInstance.emails.send.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', statusCode: 429, message: LEAKY_MESSAGE },
      headers: null,
    })

    await GET(makeRequest())

    const [captured] = mockedCapture.mock.calls[0]
    expect(captured).toBeInstanceOf(Error)
    expect((captured as Error).message).toContain('rate_limit_exceeded')
    expect((captured as Error).message).toContain('429')
  })

  it('leaks no recipient, company number, or free-text provider message', async () => {
    setupAdmin([COMPANY_A])
    resendInstance.emails.send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', statusCode: 422, message: LEAKY_MESSAGE },
      headers: null,
    })

    await GET(makeRequest())

    const [captured, context] = mockedCapture.mock.calls[0]
    const serialised = `${(captured as Error).message} ${JSON.stringify(context)}`

    expect(serialised).not.toContain(RECIPIENT)
    expect(serialised).not.toContain('@')            // no address in any form
    expect(serialised).not.toContain('DO NOT LEAK')  // no free-text provider message
    expect(serialised).not.toContain('11223344')     // no company number
    expect(serialised).not.toContain('user-a')       // no user id
    expect(serialised).not.toContain('Dormant Test') // no company name
  })

  it('tags the capture with the existing SafeTags shape only', async () => {
    setupAdmin([COMPANY_A])
    resendInstance.emails.send.mockResolvedValue({
      data: null,
      error: { name: 'invalid_api_key', statusCode: 401, message: LEAKY_MESSAGE },
      headers: null,
    })

    await GET(makeRequest())

    const [, context] = mockedCapture.mock.calls[0]
    expect(context).toEqual({
      tags: { subsystem: 'alerts', operation: 'compliance_reminder_send' },
    })
  })

  it('counts the company as skipped rather than sent', async () => {
    setupAdmin([COMPANY_A])
    resendInstance.emails.send.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', statusCode: 429, message: LEAKY_MESSAGE },
      headers: null,
    })

    const body = await (await GET(makeRequest())).json()

    expect(body.success).toBe(true)
    expect(body.processed).toBe(1)
    expect(body.sent).toBe(0)
    expect(body.skipped).toBe(1)
  })

  // ── B. Successful send ─────────────────────────────────────────────────────

  it('captures nothing and writes alert_history on a successful send', async () => {
    const { alertHistoryInserts } = setupAdmin([COMPANY_A])
    resendInstance.emails.send.mockResolvedValue({
      data: { id: 'email_123' },
      error: null,
      headers: null,
    })

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockedCapture).not.toHaveBeenCalled()
    expect(body.sent).toBe(1)

    // Exactly one obligation is eligible for dormantCompany at TEST_DATE.
    expect(alertHistoryInserts).toHaveLength(1)
    expect(alertHistoryInserts[0]).toMatchObject({
      user_id:        'user-a',
      company_number: '11223344',
      alert_type:     'confirmation_statement',
      status:         'due_soon',
    })
  })

  // ── C. Per-recipient isolation ─────────────────────────────────────────────

  it('isolates a failed recipient so other companies still receive their email', async () => {
    const { alertHistoryInserts } = setupAdmin([COMPANY_A, COMPANY_B])

    resendInstance.emails.send.mockImplementation(async ({ to }: { to: string }) =>
      to === RECIPIENT
        ? {
            data: null,
            error: { name: 'rate_limit_exceeded', statusCode: 429, message: LEAKY_MESSAGE },
            headers: null,
          }
        : { data: { id: 'email_ok' }, error: null, headers: null },
    )

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.processed).toBe(2)
    expect(body.sent).toBe(1)
    expect(body.skipped).toBe(1)

    // Only the successful company is recorded — the failed one stays retryable.
    expect(alertHistoryInserts).toHaveLength(1)
    expect(alertHistoryInserts[0]).toMatchObject({ company_number: '55667788' })
    expect(mockedCapture).toHaveBeenCalledTimes(1)
  })

  // ── D. Monitoring fail-safe ────────────────────────────────────────────────

  it('completes the run even when Sentry capture itself throws', async () => {
    const { alertHistoryInserts } = setupAdmin([COMPANY_A])
    mockedCapture.mockImplementation(() => {
      throw new Error('Sentry transport failure')
    })
    resendInstance.emails.send.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', statusCode: 429, message: LEAKY_MESSAGE },
      headers: null,
    })

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.skipped).toBe(1)
    expect(alertHistoryInserts).toHaveLength(0)
  })

  // ── E. Thrown send() — residual edge case ──────────────────────────────────
  //
  // The installed SDK converts transport failures into a resolved { error },
  // so this path is close to unreachable in production. It is covered here to
  // pin the CURRENT behaviour: the outer per-company catch handles it, the run
  // continues, and no alert_history row is written — but it is console-only,
  // NOT captured. Widening that catch was out of scope for this task.

  it('documents that a thrown send() is contained but remains console-only', async () => {
    const { alertHistoryInserts } = setupAdmin([COMPANY_A])
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    resendInstance.emails.send.mockRejectedValue(new Error('socket hang up'))

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.skipped).toBe(1)
    expect(alertHistoryInserts).toHaveLength(0)
    // Residual gap, deliberately unchanged in this task.
    expect(mockedCapture).not.toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  // ───────────────────────────────────────────────────────────────────────────
  // alert_history write failure (E2.3 P2)
  //
  // The email has already been delivered when the insert runs, so the send is
  // never retried and `sent` is not decremented. What is lost is the dedupe
  // record — the next run re-selects the alert and the customer gets a
  // duplicate. That risk is deliberately accepted for controlled beta; these
  // tests exist so a persistent failure is visible rather than silent.
  // ───────────────────────────────────────────────────────────────────────────

  // Synthetic Supabase error whose free-text fields are baited with data that
  // must never reach Sentry.
  const BAIT_INSERT_ERROR = {
    code:    '23505',
    message: `duplicate key violates constraint for ${RECIPIENT}`,
    details: 'Key (user_id, company_number)=(user-a, 11223344) already exists.',
    hint:    `Check ${RECIPIENT} and company 11223344`,
  }

  function okSend() {
    resendInstance.emails.send.mockResolvedValue({
      data: { id: 'email_123' },
      error: null,
      headers: null,
    })
  }

  // ── A. Send succeeds, history insert fails ─────────────────────────────────

  it('captures a history-write failure without retrying the delivered email', async () => {
    const { alertHistoryInserts } = setupAdmin([COMPANY_A], { insertErrors: [BAIT_INSERT_ERROR] })
    okSend()

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockedCapture).toHaveBeenCalledTimes(1)

    const [, context] = mockedCapture.mock.calls[0]
    expect(context).toEqual({
      tags: { subsystem: 'alerts', operation: 'reminder_history_write' },
    })

    // The email WAS delivered, so it still counts as sent.
    expect(body.sent).toBe(1)
    expect(body.history_write_failures).toBe(1)
    expect(body.skipped).toBe(0)

    // The insert was attempted; it simply did not persist.
    expect(alertHistoryInserts).toHaveLength(1)
    expect(resendInstance.emails.send).toHaveBeenCalledTimes(1)
  })

  // ── B. Privacy ─────────────────────────────────────────────────────────────

  it('reports only the SQLSTATE code, never the baited error fields', async () => {
    setupAdmin([COMPANY_A], { insertErrors: [BAIT_INSERT_ERROR] })
    okSend()

    await GET(makeRequest())

    const [captured, context] = mockedCapture.mock.calls[0]
    expect(captured).toBeInstanceOf(Error)

    const serialised = `${(captured as Error).message} ${JSON.stringify(context)}`

    expect(serialised).toContain('23505')          // safe: fixed SQLSTATE code

    expect(serialised).not.toContain(RECIPIENT)
    expect(serialised).not.toContain('@')          // no address in any form
    expect(serialised).not.toContain('11223344')   // no company number
    expect(serialised).not.toContain('user-a')     // no user id
    expect(serialised).not.toContain('duplicate key')   // no message text
    expect(serialised).not.toContain('already exists')  // no details text
    expect(serialised).not.toContain('Check ')          // no hint text
  })

  // ── C. Successful history write ────────────────────────────────────────────

  it('captures nothing and reports zero failures when the history write succeeds', async () => {
    const { alertHistoryInserts } = setupAdmin([COMPANY_A])
    okSend()

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockedCapture).not.toHaveBeenCalled()
    expect(body.sent).toBe(1)
    expect(body.history_write_failures).toBe(0)
    expect(alertHistoryInserts).toHaveLength(1)
  })

  // ── D. Multi-alert partial failure ─────────────────────────────────────────

  it('counts one send and one failure when a multi-alert email persists partially', async () => {
    // overdueCompany yields TWO eligible alerts at TEST_DATE (CS -214 days,
    // accounts -306 days), bundled into a single email but inserted as two rows.
    mockedFetchCompany.mockResolvedValue(overdueCompany)
    const { alertHistoryInserts } = setupAdmin([COMPANY_A], {
      insertErrors: [null, BAIT_INSERT_ERROR],
    })
    okSend()

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)

    // One email carried both obligations.
    expect(resendInstance.emails.send).toHaveBeenCalledTimes(1)
    expect(body.sent).toBe(1)

    // Two inserts attempted, one failed.
    expect(alertHistoryInserts).toHaveLength(2)
    expect(body.history_write_failures).toBe(1)
    expect(mockedCapture).toHaveBeenCalledTimes(1)
  })

  // ── E. Monitoring fail-safe ────────────────────────────────────────────────

  it('still reports the failure count when Sentry capture itself throws', async () => {
    setupAdmin([COMPANY_A], { insertErrors: [BAIT_INSERT_ERROR] })
    mockedCapture.mockImplementation(() => {
      throw new Error('Sentry transport failure')
    })
    okSend()

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.sent).toBe(1)
    expect(body.history_write_failures).toBe(1)
  })

  // ── F. Dedupe implication — the accepted residual duplicate risk ───────────

  it('skips an alert that already has a history row', async () => {
    // A persisted row inside the 24-hour window suppresses the reminder.
    setupAdmin([COMPANY_A], { existing: { id: 'existing-history-row' } })
    okSend()

    const body = await (await GET(makeRequest())).json()

    expect(resendInstance.emails.send).not.toHaveBeenCalled()
    expect(body.sent).toBe(0)
    expect(body.skipped).toBe(1)
  })

  it('re-selects the alert when no history row exists — the duplicate path', async () => {
    // This is exactly the state a failed insert leaves behind: the email was
    // delivered, but with no row the next run sends it again.
    setupAdmin([COMPANY_A], { existing: null })
    okSend()

    const body = await (await GET(makeRequest())).json()

    expect(resendInstance.emails.send).toHaveBeenCalledTimes(1)
    expect(body.sent).toBe(1)
  })
})
