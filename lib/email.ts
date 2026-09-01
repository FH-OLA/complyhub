import { createHmac, timingSafeEqual } from 'crypto'

// ---------------------------------------------------------------------------
// Unsubscribe token helpers
//
// Token format (opaque to the caller):
//   base64url( user_id + ':' + HMAC-SHA256(user_id, UNSUBSCRIBE_SECRET) )
//
// Tokens are intentionally non-expiring. Rationale: users may click an
// unsubscribe link weeks or months after receiving an email; that link must
// still work. If UNSUBSCRIBE_SECRET is rotated all outstanding tokens
// naturally become invalid — this is the intended rotation behaviour.
// ---------------------------------------------------------------------------

export function generateUnsubscribeToken(userId: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET is not set')

  const sig = createHmac('sha256', secret).update(userId).digest('hex')
  return Buffer.from(`${userId}:${sig}`).toString('base64url')
}

export type VerifyTokenResult =
  | { valid: true; userId: string }
  | { valid: false }

export function verifyUnsubscribeToken(token: string): VerifyTokenResult {
  const secret = process.env.UNSUBSCRIBE_SECRET
  if (!secret) return { valid: false }

  let payload: string
  try {
    payload = Buffer.from(token, 'base64url').toString('utf8')
  } catch {
    return { valid: false }
  }

  // Split on the first colon only — user_id (UUID) contains no colons;
  // the HMAC hex value also contains no colons.
  const colonIdx = payload.indexOf(':')
  if (colonIdx === -1) return { valid: false }

  const userId = payload.slice(0, colonIdx)
  const sig    = payload.slice(colonIdx + 1)

  const expected = createHmac('sha256', secret).update(userId).digest('hex')

  // HMAC-SHA256 always produces 64 hex chars. Reject on length mismatch
  // before calling timingSafeEqual to avoid buffer-size errors.
  if (sig.length !== 64 || expected.length !== 64) return { valid: false }

  try {
    const equal = timingSafeEqual(
      Buffer.from(sig,      'hex'),
      Buffer.from(expected, 'hex'),
    )
    if (!equal) return { valid: false }
  } catch {
    return { valid: false }
  }

  if (!userId) return { valid: false }
  return { valid: true, userId }
}

// ---------------------------------------------------------------------------
// Email template
// ---------------------------------------------------------------------------

export interface AlertItem {
  /** Human-readable obligation name, e.g. "Confirmation Statement" */
  obligation: string
  status: 'due_soon' | 'overdue'
  daysRemaining: number
  /** ISO date string */
  dueDate: string
}

export interface ReminderEmailOptions {
  companyName: string
  companyNumber: string
  alerts: AlertItem[]
  unsubscribeToken: string
  appUrl: string
}

function formatDueDate(isoString: string): string {
  if (!isoString || isoString === 'N/A') return 'Unknown'
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return 'Unknown'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatStatusLabel(daysRemaining: number, status: 'due_soon' | 'overdue'): string {
  if (status === 'overdue') {
    const n = Math.abs(daysRemaining)
    return `Overdue by ${n} day${n !== 1 ? 's' : ''}`
  }
  return `Due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
}

/**
 * Generic reminder email renderer.
 *
 * Accepts one or more alert items and renders a single branded email.
 * Subject line and header colour adapt based on whether any alert is overdue,
 * making this function suitable for upcoming-deadline and overdue reminder
 * types without requiring separate builders.
 *
 * Future reminder types (e.g. digest, confirmation) can be supported by
 * extending AlertItem or adding a `type` discriminant to ReminderEmailOptions.
 */
export function buildReminderEmail(options: ReminderEmailOptions): {
  subject: string
  html: string
} {
  const { companyName, companyNumber, alerts, unsubscribeToken, appUrl } = options

  const hasOverdue = alerts.some((a) => a.status === 'overdue')

  const subject = hasOverdue
    ? `Action required: ${companyName} has an overdue filing`
    : `Compliance reminder: ${companyName}`

  // Header accent: red for overdue, amber for upcoming
  const headerBg    = hasOverdue ? '#dc2626' : '#d97706'
  const headerLabel = hasOverdue ? 'Action Required' : 'Deadline Reminder'

  const alertRows = alerts
    .map((alert) => {
      const pillBg   = alert.status === 'overdue' ? '#fef2f2' : '#fffbeb'
      const pillText = alert.status === 'overdue' ? '#dc2626' : '#b45309'
      const statusLabel = formatStatusLabel(alert.daysRemaining, alert.status)
      const dueDateLabel = formatDueDate(alert.dueDate)
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
            <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:2px;">${alert.obligation}</div>
            <div style="font-size:13px;color:#6b7280;">Due: ${dueDateLabel}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;text-align:right;vertical-align:top;white-space:nowrap;">
            <span style="display:inline-block;padding:3px 10px;border-radius:9999px;background:${pillBg};color:${pillText};font-size:12px;font-weight:600;">
              ${statusLabel}
            </span>
          </td>
        </tr>`
    })
    .join('\n')

  const unsubscribeUrl  = `${appUrl}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
  const settingsUrl     = `${appUrl}/settings`
  const dashboardUrl    = `${appUrl}/my-companies`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

          <!-- Header -->
          <tr>
            <td style="background:${headerBg};padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-.3px;">ComplyHub</span>
                    <span style="margin-left:8px;font-size:11px;font-weight:600;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.5px;">Beta</span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:.5px;">${headerLabel}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">Compliance update for</p>
              <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111827;">${companyName}</h1>
              <p style="margin:0 0 24px;font-size:13px;color:#9ca3af;">Company number: ${companyNumber}</p>

              <table width="100%" cellpadding="0" cellspacing="0">
                ${alertRows}
              </table>

              <div style="margin-top:28px;">
                <a href="${dashboardUrl}"
                   style="display:inline-block;padding:12px 24px;background:#4B6A8A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                  View My Companies &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #f3f4f6;padding:20px 32px;">
              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;line-height:1.6;">
                You are receiving this because you track <strong>${companyName}</strong> in ComplyHub.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                <a href="${settingsUrl}" style="color:#6b7280;text-decoration:underline;">Manage email preferences</a>
                &nbsp;&middot;&nbsp;
                <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html }
}
