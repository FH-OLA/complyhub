import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Only allow local paths to prevent open-redirect attacks.
function safeNext(value: string | null): string {
  if (!value) return '/dashboard'
  if (value.startsWith('/') && !value.startsWith('//')) return value
  return '/dashboard'
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  // A missing code means the link was incomplete or tampered with.
  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  // An error here means the link has expired, was already used, or is invalid.
  // Do not expose the raw Supabase error message — redirect with a safe indicator.
  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=link_invalid`)
  }

  // Redirect to the validated next destination.
  // For password reset this will be /auth/reset-password (set by forgot-password page).
  // For email confirmation this defaults to /dashboard.
  return NextResponse.redirect(`${origin}${next}`)
}
