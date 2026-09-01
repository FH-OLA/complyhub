'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Could not update your password. The link may have expired — please request a new one.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-xl font-bold text-accent">
            ComplyHub
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-text-1">Set a new password</h1>
          <p className="mt-2 text-sm text-text-2">
            Choose a new password for your ComplyHub account.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="password"
              label="New password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            {error && (
              <p role="alert" className="rounded-[var(--button-radius)] bg-semantic-red-bg px-3 py-2 text-sm text-semantic-red-text">{error}</p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
