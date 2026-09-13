import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildSignUpCredentials } from '@/components/auth/AuthForm'

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
