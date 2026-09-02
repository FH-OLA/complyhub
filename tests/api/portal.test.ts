import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabaseClient, makeQueryChain } from '../helpers/supabase-mock'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('stripe', () => {
  const mockStripe = {
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
  }
  return { default: vi.fn(() => mockStripe) }
})

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/stripe/portal/route'

const mockedCreateClient = vi.mocked(createClient)
const stripeInstance = new (Stripe as unknown as new () => {
  billingPortal: { sessions: { create: ReturnType<typeof vi.fn> } }
})()

describe('POST /api/stripe/portal', () => {
  let supabase: ReturnType<typeof makeSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = makeSupabaseClient()
    mockedCreateClient.mockResolvedValue(supabase as never)
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
  })

  it('returns 401 when user is not authenticated', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns 404 when stripe_customer_id is missing', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
    })
    supabase.from.mockReturnValueOnce(
      makeQueryChain({ data: null }),
    )
    const res = await POST()
    expect(res.status).toBe(404)
    expect(stripeInstance.billingPortal.sessions.create).not.toHaveBeenCalled()
  })

  it('returns 404 when subscription exists but stripe_customer_id is null', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
    })
    supabase.from.mockReturnValueOnce(
      makeQueryChain({ data: { stripe_customer_id: null } }),
    )
    const res = await POST()
    expect(res.status).toBe(404)
    expect(stripeInstance.billingPortal.sessions.create).not.toHaveBeenCalled()
  })

  it('creates portal session with stored stripe_customer_id', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
    })
    supabase.from.mockReturnValueOnce(
      makeQueryChain({ data: { stripe_customer_id: 'cus_abc' } }),
    )
    stripeInstance.billingPortal.sessions.create.mockResolvedValue({
      url: 'https://billing.stripe.com/session',
    })

    const res = await POST()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.url).toBe('https://billing.stripe.com/session')

    const createCall = stripeInstance.billingPortal.sessions.create.mock.calls[0][0]
    expect(createCall.customer).toBe('cus_abc')
    expect(createCall.return_url).toBe('http://localhost:3000/my-companies')
  })

  it('returns 500 when Stripe portal creation throws', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
    })
    supabase.from.mockReturnValueOnce(
      makeQueryChain({ data: { stripe_customer_id: 'cus_abc' } }),
    )
    stripeInstance.billingPortal.sessions.create.mockRejectedValue(
      new Error('Stripe API error'),
    )

    const res = await POST()
    expect(res.status).toBe(500)
  })
})
