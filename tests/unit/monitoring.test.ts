import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import { captureStripeError, scrubEvent } from '@/lib/monitoring'

const mockedCapture = vi.mocked(Sentry.captureException)

describe('scrubEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('strips request headers, cookies, body, and query_string', () => {
    const event = scrubEvent({
      request: {
        url: '/api/stripe/webhook',
        headers: { Authorization: 'Bearer secret', Cookie: 'session=abc' },
        cookies: { session: 'abc' },
        data: '{"raw": "body"}',
        query_string: 'token=secret',
      },
    } as unknown as Sentry.ErrorEvent)

    expect(event).not.toBeNull()
    expect(event!.request!.headers).toBeUndefined()
    expect(event!.request!.cookies).toBeUndefined()
    expect(event!.request!.data).toBeUndefined()
    expect(event!.request!.query_string).toBeUndefined()
    expect(event!.request!.url).toBe('/api/stripe/webhook')
  })

  it('strips user email, username, and ip_address', () => {
    const event = scrubEvent({
      user: {
        id: 'u1',
        email: 'user@example.com',
        username: 'someone',
        ip_address: '1.2.3.4',
      },
    } as unknown as Sentry.ErrorEvent)

    expect(event).not.toBeNull()
    expect(event!.user!.id).toBe('u1')
    expect(event!.user!.email).toBeUndefined()
    expect(event!.user!.username).toBeUndefined()
    expect(event!.user!.ip_address).toBeUndefined()
  })

  it('removes HTTP breadcrumbs to anthropic domains', () => {
    const event = scrubEvent({
      breadcrumbs: [
        { category: 'http', data: { url: 'https://api.anthropic.com/v1/messages' } },
        { category: 'http', data: { url: 'https://api.supabase.co/rest/v1' } },
        { category: 'console', message: 'some log' },
      ],
    } as unknown as Sentry.ErrorEvent)

    expect(event!.breadcrumbs).toHaveLength(2)
    expect(event!.breadcrumbs![0].data!.url).toBe('https://api.supabase.co/rest/v1')
    expect(event!.breadcrumbs![1].category).toBe('console')
  })

  it('removes HTTP breadcrumbs to openai domains', () => {
    const event = scrubEvent({
      breadcrumbs: [
        { type: 'http', data: { url: 'https://api.openai.com/v1/chat' } },
        { category: 'http', data: { url: 'https://example.com/api' } },
      ],
    } as unknown as Sentry.ErrorEvent)

    expect(event!.breadcrumbs).toHaveLength(1)
    expect(event!.breadcrumbs![0].data!.url).toBe('https://example.com/api')
  })

  it('strips request_body and response_body from remaining breadcrumbs', () => {
    const event = scrubEvent({
      breadcrumbs: [
        {
          category: 'http',
          data: {
            url: 'https://api.stripe.com/v1/checkout/sessions',
            request_body: '{"secret": "data"}',
            response_body: '{"result": "data"}',
            body: '{"also": "stripped"}',
          },
        },
      ],
    } as unknown as Sentry.ErrorEvent)

    expect(event!.breadcrumbs).toHaveLength(1)
    expect(event!.breadcrumbs![0].data!.request_body).toBeUndefined()
    expect(event!.breadcrumbs![0].data!.response_body).toBeUndefined()
    expect(event!.breadcrumbs![0].data!.body).toBeUndefined()
    expect(event!.breadcrumbs![0].data!.url).toBe('https://api.stripe.com/v1/checkout/sessions')
  })

  it('handles event with no request/user/breadcrumbs', () => {
    const event = scrubEvent({
      exception: { values: [{ type: 'Error', value: 'test' }] },
    } as unknown as Sentry.ErrorEvent)

    expect(event).not.toBeNull()
  })
})

describe('captureStripeError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards only allow-listed tags and optional extra', () => {
    const err = new Error('DB write failed')
    captureStripeError(err, {
      subsystem: 'stripe',
      operation: 'webhook-checkout-upsert',
      stripe_event_type: 'checkout.session.completed',
    }, { stripe_event_id: 'evt_123' })

    expect(mockedCapture).toHaveBeenCalledOnce()
    const [capturedErr, context] = mockedCapture.mock.calls[0]
    expect(capturedErr).toBe(err)
    expect(context).toEqual({
      tags: {
        subsystem: 'stripe',
        operation: 'webhook-checkout-upsert',
        stripe_event_type: 'checkout.session.completed',
      },
      extra: { stripe_event_id: 'evt_123' },
    })
  })

  it('omits extra when not provided', () => {
    captureStripeError(new Error('test'), {
      subsystem: 'stripe',
      operation: 'checkout-session-create',
    })

    const [, context] = mockedCapture.mock.calls[0]
    expect(context).toEqual({
      tags: {
        subsystem: 'stripe',
        operation: 'checkout-session-create',
      },
    })
    expect((context as Record<string, unknown>).extra).toBeUndefined()
  })

  it('does not throw when Sentry.captureException throws', () => {
    mockedCapture.mockImplementation(() => {
      throw new Error('Sentry is down')
    })

    expect(() => {
      captureStripeError(new Error('test'), {
        subsystem: 'stripe',
        operation: 'test',
      })
    }).not.toThrow()
  })
})
