import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeAdminClient, makeQueryChain } from '../helpers/supabase-mock'

// next/headers must be mocked before the route is imported because the Stripe
// webhook handler calls headers() at the top of the POST function body.
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('stripe', () => {
  const mockStripe = {
    webhooks: {
      constructEvent: vi.fn(),
    },
  }
  return { default: vi.fn(() => mockStripe) }
})

import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { POST } from '@/app/api/stripe/webhook/route'

const mockedHeaders      = vi.mocked(headers)
const mockedCreateAdmin  = vi.mocked(createAdminClient)
const stripeInstance     = new (Stripe as unknown as new () => { webhooks: { constructEvent: ReturnType<typeof vi.fn> } })()

function makeWebhookRequest(body = 'body'): Request {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body,
  })
}

function makeHeadersMap(sig?: string) {
  return { get: (key: string) => (key === 'stripe-signature' ? (sig ?? 'sig123') : null) }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stripe webhook
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/stripe/webhook', () => {
  let adminClient: ReturnType<typeof makeAdminClient>

  beforeEach(() => {
    adminClient = makeAdminClient()
    mockedCreateAdmin.mockReturnValue(adminClient as never)
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    mockedHeaders.mockResolvedValue({ get: () => null } as never)
    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(400)
  })

  it('returns 500 when STRIPE_WEBHOOK_SECRET env var is not set', async () => {
    const original = process.env.STRIPE_WEBHOOK_SECRET
    delete process.env.STRIPE_WEBHOOK_SECRET
    mockedHeaders.mockResolvedValue(makeHeadersMap() as never)
    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(500)
    process.env.STRIPE_WEBHOOK_SECRET = original
  })

  it('continues processing when idempotency insert fails with a non-23505 error', async () => {
    mockedHeaders.mockResolvedValue(makeHeadersMap() as never)
    stripeInstance.webhooks.constructEvent.mockReturnValue({
      id: 'evt_other_err',
      type: 'payment_intent.succeeded',
      data: { object: {} },
    })
    // Non-duplicate error — should log and continue
    adminClient.from.mockReturnValueOnce(
      makeQueryChain({ error: { message: 'connection timeout', code: '57014' } }),
    )
    const res = await POST(makeWebhookRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.received).toBe(true)
  })

  it('returns 400 when signature verification fails', async () => {
    mockedHeaders.mockResolvedValue(makeHeadersMap('badsig') as never)
    stripeInstance.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('invalid signature')
    })
    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(400)
  })

  it('returns 200 without re-processing when event is already recorded (23505)', async () => {
    mockedHeaders.mockResolvedValue(makeHeadersMap() as never)
    stripeInstance.webhooks.constructEvent.mockReturnValue({
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: { object: { metadata: {}, customer: null, subscription: null } },
    })
    adminClient.from.mockReturnValueOnce(
      makeQueryChain({ error: { message: 'duplicate', code: '23505' } }),
    )
    const res = await POST(makeWebhookRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.received).toBe(true)
    // The from() mock was consumed by the idempotency insert — no further DB calls
    expect(adminClient.from).toHaveBeenCalledTimes(1)
  })

  it('upserts user_subscriptions on checkout.session.completed with user_id metadata', async () => {
    mockedHeaders.mockResolvedValue(makeHeadersMap() as never)
    stripeInstance.webhooks.constructEvent.mockReturnValue({
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { user_id: 'u1' },
          customer: 'cus_abc',
          subscription: 'sub_xyz',
        },
      },
    })
    // First call: idempotency insert succeeds
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null }))
    // Second call: upsert user_subscriptions
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null }))

    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(200)
    expect(adminClient.from).toHaveBeenCalledWith('stripe_webhook_events')
    expect(adminClient.from).toHaveBeenCalledWith('user_subscriptions')
  })

  it('returns 200 and acknowledges unsupported event types gracefully', async () => {
    mockedHeaders.mockResolvedValue(makeHeadersMap() as never)
    stripeInstance.webhooks.constructEvent.mockReturnValue({
      id: 'evt_unknown_1',
      type: 'payment_intent.succeeded',
      data: { object: {} },
    })
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null }))

    const res = await POST(makeWebhookRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.received).toBe(true)
  })

  it('updates status on customer.subscription.updated', async () => {
    mockedHeaders.mockResolvedValue(makeHeadersMap() as never)
    stripeInstance.webhooks.constructEvent.mockReturnValue({
      id: 'evt_sub_updated_1',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_xyz', status: 'past_due' } },
    })
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null }))

    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(200)
    expect(adminClient.from).toHaveBeenCalledWith('user_subscriptions')
  })

  it('sets plan to free on customer.subscription.deleted', async () => {
    mockedHeaders.mockResolvedValue(makeHeadersMap() as never)
    stripeInstance.webhooks.constructEvent.mockReturnValue({
      id: 'evt_sub_deleted_1',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_xyz' } },
    })
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null }))

    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(200)
    expect(adminClient.from).toHaveBeenCalledWith('user_subscriptions')
  })

  it('sets status to past_due on invoice.payment_failed', async () => {
    mockedHeaders.mockResolvedValue(makeHeadersMap() as never)
    stripeInstance.webhooks.constructEvent.mockReturnValue({
      id: 'evt_inv_failed_1',
      type: 'invoice.payment_failed',
      data: {
        object: {
          parent: {
            subscription_details: { subscription: 'sub_xyz' },
          },
        },
      },
    })
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null }))

    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(200)
    expect(adminClient.from).toHaveBeenCalledWith('user_subscriptions')
  })
})
