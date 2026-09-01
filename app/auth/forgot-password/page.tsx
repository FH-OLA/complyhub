'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const sendReset = async () => {
    setError('')
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback?next=/auth/reset-password`,
    })

    if (error) {
      setError('Something went wrong. Please try again.')
    } else {
      setSent(true)
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendReset()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-xl font-bold text-accent">
            ComplyHub
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-text-1">Reset your password</h1>
          <p className="mt-2 text-sm text-text-2">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <Card>
          {sent ? (
            <div className="text-center">
              <p className="rounded-[var(--button-radius)] bg-semantic-green-bg px-3 py-4 text-sm text-semantic-green-text">
                Check your email for a password reset link.
              </p>
              <p className="mt-4 text-sm text-text-3">
                Didn&apos;t receive it?{' '}
                <button
                  onClick={sendReset}
                  disabled={loading}
                  className="font-medium text-accent hover:text-accent-hover disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send again'}
                </button>
              </p>
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

              {error && (
                <p role="alert" className="rounded-[var(--button-radius)] bg-semantic-red-bg px-3 py-2 text-sm text-semantic-red-text">{error}</p>
              )}

              <Button type="submit" loading={loading} className="w-full mt-2">
                Send reset link
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-sm text-text-2">
          Remember your password?{' '}
          <Link href="/auth/login" className="font-medium text-accent hover:text-accent-hover">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
