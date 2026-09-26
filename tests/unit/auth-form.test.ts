import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildSignUpCredentials } from '@/components/auth/AuthForm'
import { buildPasswordResetRedirect } from '@/app/auth/forgot-password/page'

// ─────────────────────────────────────────────────────────────────────────────
// Signup email-confirmation redirect (P0)
//
// Omitting options.emailRedirectTo made Supabase fall back to the project's
// Site URL, returning the PKCE code to https://complyhub.uk/?code=… — the
// marketing homepage, which has no code-exchange handler. Confirmed users
// landed logged out and the confirmation was silently lost.
// ─────────────────────────────────────────────────────────────────────────────

const ORIGINAL_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

describe('buildSignUpCredentials', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.test'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL_BASE_URL
  })

  it('sends emailRedirectTo pointing at the auth callback', () => {
    const credentials = buildSignUpCredentials('new@user.test', 'pw')
    expect(credentials.options.emailRedirectTo).toBe('https://example.test/auth/callback')
  })

  it('routes confirmation to /auth/callback, never to the site root', () => {
    const { options } = buildSignUpCredentials('new@user.test', 'pw')
    // The production defect: the code landed on "/" instead of the callback.
    expect(options.emailRedirectTo).toMatch(/\/auth\/callback$/)
    expect(options.emailRedirectTo).not.toBe('https://example.test')
    expect(options.emailRedirectTo).not.toBe('https://example.test/')
  })

  it('builds the URL from NEXT_PUBLIC_BASE_URL rather than a hardcoded host', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://staging.example.test'
    const { options } = buildSignUpCredentials('new@user.test', 'pw')
    expect(options.emailRedirectTo).toBe('https://staging.example.test/auth/callback')
    expect(options.emailRedirectTo).not.toContain('complyhub.uk')
  })

  it('does not append a next parameter — the callback already defaults to /dashboard', () => {
    const { options } = buildSignUpCredentials('new@user.test', 'pw')
    expect(options.emailRedirectTo).not.toContain('next=')
    expect(options.emailRedirectTo).not.toContain('?')
  })

  it('passes the credentials through unchanged alongside the options', () => {
    const credentials = buildSignUpCredentials('new@user.test', 's3cret')
    expect(credentials.email).toBe('new@user.test')
    expect(credentials.password).toBe('s3cret')
  })

  it('is accepted by a supabase-shaped signUp with the exact expected argument', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null })
    await signUp(buildSignUpCredentials('new@user.test', 'pw'))

    expect(signUp).toHaveBeenCalledTimes(1)
    expect(signUp).toHaveBeenCalledWith({
      email: 'new@user.test',
      password: 'pw',
      options: { emailRedirectTo: 'https://example.test/auth/callback' },
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Missing configuration
//
// NEXT_PUBLIC_BASE_URL is inlined at build time for these client components, so
// an absent value cannot be recovered at runtime. Both builders must fail
// explicitly rather than interpolate `undefined` into an auth redirect — the
// exact shape that stranded confirmed users on the marketing homepage.
// ─────────────────────────────────────────────────────────────────────────────

describe('auth redirects — missing NEXT_PUBLIC_BASE_URL', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_BASE_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL
  })

  for (const [label, value] of [
    ['undefined', undefined],
    ['empty string', ''],
  ] as const) {
    it(`signup fails explicitly when the base URL is ${label}`, () => {
      if (value === undefined) delete process.env.NEXT_PUBLIC_BASE_URL
      else process.env.NEXT_PUBLIC_BASE_URL = value

      expect(() => buildSignUpCredentials('new@user.test', 'pw')).toThrow(
        /NEXT_PUBLIC_BASE_URL is not configured/,
      )
    })

    it(`password reset fails explicitly when the base URL is ${label}`, () => {
      if (value === undefined) delete process.env.NEXT_PUBLIC_BASE_URL
      else process.env.NEXT_PUBLIC_BASE_URL = value

      expect(() => buildPasswordResetRedirect()).toThrow(
        /NEXT_PUBLIC_BASE_URL is not configured/,
      )
    })
  }

  it('never produces a URL containing "undefined"', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL

    // Both must throw rather than return a string — assert on the thrown path
    // so a future regression that returns "undefined/auth/callback" fails here.
    let signupResult: unknown = null
    let resetResult: unknown = null
    try { signupResult = buildSignUpCredentials('new@user.test', 'pw') } catch { /* expected */ }
    try { resetResult = buildPasswordResetRedirect() } catch { /* expected */ }

    expect(signupResult).toBeNull()
    expect(resetResult).toBeNull()
  })

  it('does not leak the configured value in the error message', () => {
    process.env.NEXT_PUBLIC_BASE_URL = ''

    const message = (() => {
      try { buildPasswordResetRedirect(); return '' } catch (e) { return (e as Error).message }
    })()

    expect(message).toBe('NEXT_PUBLIC_BASE_URL is not configured')
    expect(message).not.toContain('http')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Password-reset redirect — valid configuration
// ─────────────────────────────────────────────────────────────────────────────

describe('buildPasswordResetRedirect', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_BASE_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.test'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL
  })

  it('routes through the auth callback with the reset-password next target', () => {
    expect(buildPasswordResetRedirect()).toBe(
      'https://example.test/auth/callback?next=/auth/reset-password',
    )
  })

  it('respects a different configured origin rather than a hardcoded host', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://staging.example.test'

    const url = buildPasswordResetRedirect()
    expect(url).toBe('https://staging.example.test/auth/callback?next=/auth/reset-password')
    expect(url).not.toContain('complyhub.uk')
  })

  it('keeps the next parameter — the callback would otherwise default to /dashboard', () => {
    expect(buildPasswordResetRedirect()).toContain('next=/auth/reset-password')
  })

  it('never contains the literal "undefined"', () => {
    expect(buildPasswordResetRedirect()).not.toContain('undefined')
  })
})
