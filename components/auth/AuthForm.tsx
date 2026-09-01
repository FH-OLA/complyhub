'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

interface AuthFormProps {
  mode: 'login' | 'signup'
  next?: string
  callbackError?: string
}

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'The sign-in link is incomplete. Please request a new one.',
  link_invalid: 'This link has expired or has already been used. Please request a new one.',
}

function safeRedirect(value: string | undefined): string {
  if (!value) return '/dashboard'
  if (value.startsWith('/') && !value.startsWith('//')) return value
  return '/dashboard'
}

export default function AuthForm({ mode, next, callbackError }: AuthFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [resending, setResending] = useState(false)
  const [resentMessage, setResentMessage] = useState('')
  const [tosChecked, setTosChecked] = useState(false)

  const isLogin = mode === 'login'
  const redirectTo = safeRedirect(next)

  const callbackErrorMessage = callbackError
    ? (CALLBACK_ERROR_MESSAGES[callbackError] ?? 'Something went wrong. Please sign in again.')
    : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push(redirectTo)
        router.refresh()
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setAwaitingConfirmation(true)
      }
    }

    setLoading(false)
  }

  const handleResend = async () => {
    setResending(true)
    setResentMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    setResentMessage(error ? 'Could not resend. Please try again.' : 'Confirmation email resent.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-xl font-bold text-accent">
            ComplyHub
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-text-1">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm text-text-2">
            {isLogin
              ? 'Sign in to your ComplyHub account'
              : 'Start monitoring your compliance today'}
          </p>
        </div>

        <Card>
          {awaitingConfirmation ? (
            <div className="text-center">
              <p className="rounded-[var(--button-radius)] bg-semantic-green-bg px-3 py-4 text-sm text-semantic-green-text">
                Check your email to confirm your account.
              </p>
              <p className="mt-4 text-sm text-text-3">
                Didn&apos;t receive it?{' '}
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="font-medium text-accent hover:text-accent-hover disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Resend email'}
                </button>
              </p>
              {resentMessage && (
                <p className="mt-2 text-sm text-text-2">{resentMessage}</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div>
                <Input
                  id="password"
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                {isLogin && (
                  <div className="mt-1 text-right">
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-accent hover:text-accent-hover"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>

              {callbackErrorMessage && (
                <p role="alert" className="rounded-[var(--button-radius)] bg-semantic-amber-bg px-3 py-2 text-sm text-semantic-amber-text">
                  {callbackErrorMessage}
                </p>
              )}

              {error && (
                <p role="alert" className="rounded-[var(--button-radius)] bg-semantic-red-bg px-3 py-2 text-sm text-semantic-red-text">{error}</p>
              )}

              {!isLogin && (
                <label
                  htmlFor="tos"
                  className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[var(--button-radius)] px-1 py-2 -mx-1 text-sm text-text-2"
                >
                  <input
                    id="tos"
                    type="checkbox"
                    checked={tosChecked}
                    onChange={(e) => setTosChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  />
                  <span>
                    I agree to the{' '}
                    <Link href="/terms" className="font-medium text-accent hover:text-accent-hover">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="font-medium text-accent hover:text-accent-hover">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
              )}

              <Button
                type="submit"
                loading={loading}
                disabled={!isLogin && !tosChecked}
                className="w-full mt-2"
              >
                {isLogin ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-sm text-text-2">
          {isLogin ? (
            <>
              Don&apos;t have an account?{' '}
              <Link
                href="/auth/signup"
                className="font-medium text-accent hover:text-accent-hover"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-accent hover:text-accent-hover"
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
