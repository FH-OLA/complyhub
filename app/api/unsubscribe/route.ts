import { NextRequest, NextResponse } from 'next/server'
import { verifyUnsubscribeToken } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'

const SETTINGS_URL = `${process.env.APP_URL ?? ''}/settings`

function confirmationHtml(message: string, isError = false): string {
  const colour = isError ? '#dc2626' : '#059669'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>ComplyHub — Email Preferences</title>
</head>
<body style="margin:0;padding:40px 20px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">ComplyHub</p>
    <p style="margin:0 0 24px;font-size:14px;color:${colour};font-weight:600;">${message}</p>
    <p style="margin:0;font-size:14px;color:#6b7280;">
      You can manage your email preferences at any time from your
      <a href="${SETTINGS_URL}" style="color:#4B6A8A;text-decoration:underline;">account settings</a>.
    </p>
  </div>
</body>
</html>`
}

async function processUnsubscribe(token: string | null): Promise<NextResponse> {
  if (!token) {
    return new NextResponse(
      confirmationHtml('Invalid unsubscribe link — token is missing.', true),
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    )
  }

  const result = verifyUnsubscribeToken(token)

  if (!result.valid) {
    return new NextResponse(
      confirmationHtml('Invalid or expired unsubscribe link.', true),
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    )
  }

  // Use the admin (service-role) client for this write.
  // The request is unauthenticated by session; HMAC verification above
  // substitutes for auth. The admin client is never exposed client-side.
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('email_preferences')
    .upsert(
      {
        user_id: result.userId,
        email_alerts_enabled: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

  if (error) {
    console.error('Unsubscribe upsert error:', error)
    return new NextResponse(
      confirmationHtml('Something went wrong. Please try again or manage your preferences from settings.', true),
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    )
  }

  return new NextResponse(
    confirmationHtml('You have been unsubscribed from ComplyHub compliance reminder emails.'),
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  )
}

// GET — clicked from email footer link
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  return processUnsubscribe(token)
}

// POST — triggered by RFC 8058 one-click unsubscribe in supporting email clients.
// The token is passed as a query param in the List-Unsubscribe URL.
// The request body contains `List-Unsubscribe=One-Click` (ignored; token is sufficient).
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  return processUnsubscribe(token)
}
