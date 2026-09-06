import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureRequestError: vi.fn(),
  flush: vi.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import { onRequestError } from '@/instrumentation'

const mockedCapture = vi.mocked(Sentry.captureRequestError)
const mockedFlush = vi.mocked(Sentry.flush)

type Args = Parameters<typeof Sentry.captureRequestError>

const error = new Error('boom')
const request: Args[1] = {
  path: '/api/events',
  method: 'POST',
  headers: {},
}
const context: Args[2] = {
  routerKind: 'App Router',
  routePath: '/api/events',
  routeType: 'route',
}

describe('onRequestError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('captures the error exactly once, forwarding its arguments unchanged', async () => {
    mockedFlush.mockResolvedValue(true)

    await onRequestError(error, request, context)

    expect(mockedCapture).toHaveBeenCalledTimes(1)
    expect(mockedCapture).toHaveBeenCalledWith(error, request, context)
  })

  it('awaits the flush before resolving', async () => {
    let flushResolved = false
    mockedFlush.mockImplementation(
      () =>
        new Promise<boolean>((resolve) =>
          setTimeout(() => {
            flushResolved = true
            resolve(true)
          }, 5),
        ),
    )

    await onRequestError(error, request, context)

    expect(flushResolved).toBe(true)
    expect(mockedFlush).toHaveBeenCalledWith(2000)
  })

  it('does not throw when the flush times out, and does not re-capture', async () => {
    mockedFlush.mockResolvedValue(false)

    await expect(onRequestError(error, request, context)).resolves.toBeUndefined()

    expect(mockedCapture).toHaveBeenCalledTimes(1)
  })

  it('does not throw when the flush rejects, and does not re-capture', async () => {
    mockedFlush.mockRejectedValue(new Error('transport down'))

    await expect(onRequestError(error, request, context)).resolves.toBeUndefined()

    expect(mockedCapture).toHaveBeenCalledTimes(1)
  })

  it('logs no request data, headers, or payload when the flush fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockedFlush.mockResolvedValue(false)

    await onRequestError(
      error,
      { ...request, headers: { cookie: 'session=secret' } },
      context,
    )

    const logged = warnSpy.mock.calls.flat().join(' ')
    expect(logged).not.toContain('secret')
    expect(logged).not.toContain('session')
    expect(logged).not.toContain('/api/events')
  })
})
