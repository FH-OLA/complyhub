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
  // Destination to redirect to after a successful login.
  // Must be a local path; anything else falls back to /dashboard.
  next?: string
  // Error code forwarded from /auth/callback via ?error= query param.
  callbackError?: string
}

// Map callback error codes to user-facing messages.
const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'The sign-in link is incomplete. Please request a new one.',
  link_invalid: 'This link has expired or has already been used. Please request a new one.',
}

// Validate that a redirect target is a local path to prevent open redirects.
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

  // Signup-specific state
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [resending, setResending] = useState(false)
  const [resentMessage, setResentMessage] = useState('')

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
        // Email confirmation is disabled in Supabase — user is already authenticated.
        router.push('/dashboard')
        router.refresh()
      } else {
        // Email confirmation is required — show the confirmation prompt.
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin
              ? 'Sign in to your ComplyHub account'
              : 'Start monitoring your compliance today'}
          </p>
        </div>

        <Card>
          {awaitingConfirmation ? (
            // Post-signup state: waiting for the user to confirm their email.
            <div className="text-center">
              <p className="rounded-lg bg-green-50 px-3 py-4 text-sm text-green-700">
                Check your email to confirm your account.
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Didn&apos;t receive it?{' '}
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Resend email'}
                </button>
              </p>
              {resentMessage && (
                <p className="mt-2 text-sm text-gray-600">{resentMessage}</p>
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

              {/* Password field with forgot-password link for login mode */}
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
                      className="text-xs text-indigo-600 hover:text-indigo-500"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>

              {/* Error from /auth/callback (e.g. expired confirmation link) */}
              {callbackErrorMessage && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {callbackErrorMessage}
                </p>
              )}

              {/* Error from the sign-in or sign-up call */}
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <Button type="submit" loading={loading} className="w-full mt-2">
                {isLogin ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? (
            <>
              Don&apos;t have an account?{' '}
              <Link
                href="/auth/signup"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-indigo-600 hover:text-indigo-500"
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
