import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabaseClient, makeQueryChain } from '../helpers/supabase-mock'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('stripe', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  }
  return { default: vi.fn(() => mockStripe) }
})

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/stripe/checkout/route'

const mockedCreateClient = vi.mocked(createClient)
const stripeInstance = new (Stripe as unknown as new () => {
  checkout: { sessions: { create: ReturnType<typeof vi.fn> } }
})()

describe('POST /api/stripe/checkout', () => {
  let supabase: ReturnType<typeof makeSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = makeSupabaseClient()
    mockedCreateClient.mockResolvedValue(supabase as never)
    process.env.STRIPE_PRICE_ID = 'price_test'
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
  })

  it('returns 401 when user is not authenticated', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns 401 when user has no email', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: null } },
    })
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns 409 when user already has active Pro subscription', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@example.com' } },
    })
    supabase.from.mockReturnValueOnce(
      makeQueryChain({ data: { plan: 'pro', status: 'active', stripe_customer_id: 'cus_abc' } }),
    )
    const res = await POST()
    expect(res.status).toBe(409)
    expect(stripeInstance.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('passes customer_email for first-time user with no subscription row', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@example.com' } },
    })
    supabase.from.mockReturnValueOnce(makeQueryChain({ data: null }))
    stripeInstance.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/session' })

    const res = await POST()
    expect(res.status).toBe(200)

    const createCall = stripeInstance.checkout.sessions.create.mock.calls[0][0]
    expect(createCall.customer_email).toBe('test@example.com')
    expect(createCall.customer).toBeUndefined()
  })

  it('passes customer_email when subscription exists but stripe_customer_id is null', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@example.com' } },
    })
    supabase.from.mockReturnValueOnce(
      makeQueryChain({ data: { plan: 'free', status: 'cancelled', stripe_customer_id: null } }),
    )
    stripeInstance.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/session' })

    const res = await POST()
    expect(res.status).toBe(200)

    const createCall = stripeInstance.checkout.sessions.create.mock.calls[0][0]
    expect(createCall.customer_email).toBe('test@example.com')
    expect(createCall.customer).toBeUndefined()
  })

  it('passes customer (not customer_email) when stripe_customer_id exists', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@example.com' } },
    })
    supabase.from.mockReturnValueOnce(
      makeQueryChain({ data: { plan: 'free', status: 'cancelled', stripe_customer_id: 'cus_existing' } }),
    )
    stripeInstance.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/session' })

    const res = await POST()
    expect(res.status).toBe(200)

    const createCall = stripeInstance.checkout.sessions.create.mock.calls[0][0]
    expect(createCall.customer).toBe('cus_existing')
    expect(createCall.customer_email).toBeUndefined()
  })

  it('includes metadata with user_id and plan', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@example.com' } },
    })
    supabase.from.mockReturnValueOnce(makeQueryChain({ data: null }))
    stripeInstance.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/session' })

    await POST()

    const createCall = stripeInstance.checkout.sessions.create.mock.calls[0][0]
    expect(createCall.metadata).toEqual({ user_id: 'u1', plan: 'pro' })
  })

  it('returns 500 when STRIPE_PRICE_ID is missing', async () => {
    delete process.env.STRIPE_PRICE_ID
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@example.com' } },
    })
    const res = await POST()
    expect(res.status).toBe(500)
  })

  it('returns 500 when Stripe throws', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@example.com' } },
    })
    supabase.from.mockReturnValueOnce(makeQueryChain({ data: null }))
    stripeInstance.checkout.sessions.create.mockRejectedValue(new Error('Stripe API error'))

    const res = await POST()
    expect(res.status).toBe(500)
  })
})
