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

    // redirectTo carries next=/auth/reset-password so the callback knows
    // to send the user to the password-reset form after the code is exchanged.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback?next=/auth/reset-password`,
    })

    if (error) {
      // Do not reveal whether the email exists — show a generic message.
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <Card>
          {sent ? (
            <div className="text-center">
              <p className="rounded-lg bg-green-50 px-3 py-4 text-sm text-green-700">
                Check your email for a password reset link.
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Didn&apos;t receive it?{' '}
                <button
                  onClick={sendReset}
                  disabled={loading}
                  className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
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
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <Button type="submit" loading={loading} className="w-full mt-2">
                Send reset link
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
