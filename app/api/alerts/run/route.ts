import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { fetchCompany } from '@/lib/companies-house/client'
import { calculateCompliance } from '@/lib/compliance'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildReminderEmail, generateUnsubscribeToken, type AlertItem } from '@/lib/email'

function shouldAlert(days: number) {
  return days <= 14
}

function buildAlertStatus(days: number): 'overdue' | 'due_soon' {
  return days < 0 ? 'overdue' : 'due_soon'
}

export async function GET(request: Request) {
  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // -------------------------------------------------------------------------
  // Env guards — fail fast before any work is done
  // -------------------------------------------------------------------------
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }
  if (!process.env.ALERT_FROM_EMAIL) {
    return NextResponse.json({ error: 'ALERT_FROM_EMAIL is missing' }, { status: 500 })
  }
  if (!process.env.UNSUBSCRIBE_SECRET) {
    return NextResponse.json({ error: 'UNSUBSCRIBE_SECRET is missing' }, { status: 500 })
  }
  if (!process.env.APP_URL) {
    return NextResponse.json({ error: 'APP_URL is missing' }, { status: 500 })
  }

  const resend   = new Resend(process.env.RESEND_API_KEY)
  const supabase = createAdminClient()
  const appUrl   = process.env.APP_URL

  // -------------------------------------------------------------------------
  // 1. Fetch all tracked companies
  // -------------------------------------------------------------------------
  const { data: companies, error: companiesError } = await supabase
    .from('tracked_companies')
    .select('id, user_id, company_name, company_number')

  if (companiesError) {
    return NextResponse.json({ error: companiesError.message }, { status: 500 })
  }

  if (!companies || companies.length === 0) {
    return NextResponse.json({ success: true, processed: 0, sent: 0, skipped: 0 })
  }

  // -------------------------------------------------------------------------
  // 2. Bulk-load email preferences — ONE query for all relevant users.
  //    Users with no row are treated as opted-in (default-on).
  // -------------------------------------------------------------------------
  const uniqueUserIds = [...new Set(companies.map((c) => c.user_id))]

  const { data: prefsRows } = await supabase
    .from('email_preferences')
    .select('user_id, email_alerts_enabled')
    .in('user_id', uniqueUserIds)

  const optedOutSet = new Set<string>(
    (prefsRows ?? [])
      .filter((p: { user_id: string; email_alerts_enabled: boolean }) => !p.email_alerts_enabled)
      .map((p: { user_id: string }) => p.user_id),
  )

  // -------------------------------------------------------------------------
  // 3. Process in batches of 5
  // -------------------------------------------------------------------------
  let processed = 0
  let sent      = 0
  let skipped   = 0

  const BATCH_SIZE = 5

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (company) => {
        processed++

        try {
          // -----------------------------------------------------------------
          // 3a. Skip opted-out users immediately (no further queries)
          // -----------------------------------------------------------------
          if (optedOutSet.has(company.user_id)) {
            skipped++
            return
          }

          // -----------------------------------------------------------------
          // 3b. Resolve user email
          // -----------------------------------------------------------------
          const { data: userData } = await supabase.auth.admin.getUserById(company.user_id)
          const email = userData?.user?.email

          if (!email) {
            skipped++
            return
          }

          // -----------------------------------------------------------------
          // 3c. Fetch live data and calculate compliance
          // -----------------------------------------------------------------
          const liveData   = await fetchCompany(company.company_number)
          const compliance = calculateCompliance(liveData)

          if (liveData.company_status !== 'active') {
            skipped++
            return
          }

          // -----------------------------------------------------------------
          // 3d. Build candidate alerts
          // -----------------------------------------------------------------
          const candidateAlerts: Array<{
            alertType: string
            status: 'overdue' | 'due_soon'
            alertItem: AlertItem
          }> = []

          if (shouldAlert(compliance.confirmationStatement.daysRemaining)) {
            const status = buildAlertStatus(compliance.confirmationStatement.daysRemaining)
            candidateAlerts.push({
              alertType: 'confirmation_statement',
              status,
              alertItem: {
                obligation: 'Confirmation Statement',
                status,
                daysRemaining: compliance.confirmationStatement.daysRemaining,
                dueDate: compliance.confirmationStatement.dueDate,
              },
            })
          }

          if (shouldAlert(compliance.accounts.daysRemaining)) {
            const status = buildAlertStatus(compliance.accounts.daysRemaining)
            candidateAlerts.push({
              alertType: 'accounts_filing',
              status,
              alertItem: {
                obligation: 'Accounts Filing',
                status,
                daysRemaining: compliance.accounts.daysRemaining,
                dueDate: compliance.accounts.dueDate,
              },
            })
          }

          if (candidateAlerts.length === 0) {
            skipped++
            return
          }

          // -----------------------------------------------------------------
          // 3e. Deduplicate via alert_history (24-hour window)
          // -----------------------------------------------------------------
          const alertsToSend: typeof candidateAlerts = []

          for (const candidate of candidateAlerts) {
            const { data: recentAlert } = await supabase
              .from('alert_history')
              .select('id')
              .eq('user_id', company.user_id)
              .eq('company_number', company.company_number)
              .eq('alert_type', candidate.alertType)
              .eq('status', candidate.status)
              .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .order('sent_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (!recentAlert) {
              alertsToSend.push(candidate)
            }
          }

          if (alertsToSend.length === 0) {
            skipped++
            return
          }

          // -----------------------------------------------------------------
          // 3f. Build branded email
          // -----------------------------------------------------------------
          const unsubscribeToken = generateUnsubscribeToken(company.user_id)
          const unsubscribeUrl   = `${appUrl}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`

          const { subject, html } = buildReminderEmail({
            companyName:      company.company_name,
            companyNumber:    company.company_number,
            alerts:           alertsToSend.map((a) => a.alertItem),
            unsubscribeToken,
            appUrl,
          })

          // -----------------------------------------------------------------
          // 3g. Send via Resend with List-Unsubscribe headers (RFC 2369/8058)
          // -----------------------------------------------------------------
          const sendResult = await resend.emails.send({
            from:    process.env.ALERT_FROM_EMAIL!,
            to:      email,
            subject,
            html,
            headers: {
              // RFC 2369: provides the unsubscribe URL for email clients
              // RFC 8058: signals one-click unsubscribe support (POST to the URL)
              'List-Unsubscribe':      `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          })

          if (sendResult.error) {
            skipped++
            console.error(`Resend failed for ${email}:`, sendResult.error)
            return
          }

          // -----------------------------------------------------------------
          // 3h. Record sent alerts in alert_history
          // -----------------------------------------------------------------
          for (const alert of alertsToSend) {
            const { error: insertError } = await supabase.from('alert_history').insert({
              user_id:        company.user_id,
              company_number: company.company_number,
              alert_type:     alert.alertType,
              status:         alert.status,
              sent_at:        new Date().toISOString(),
            })

            if (insertError) {
              console.error(`alert_history insert failed for ${company.company_number}:`, insertError)
            }
          }

          sent++
        } catch (err) {
          skipped++
          console.error(`Failed for ${company.company_number}:`, err)
        }
      }),
    )
  }

  return NextResponse.json({ success: true, processed, sent, skipped })
}
