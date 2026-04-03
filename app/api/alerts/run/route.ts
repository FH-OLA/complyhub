import { NextResponse } from 'next/server'
import { fetchCompany } from '@/lib/companies-house/client'
import { calculateCompliance } from '@/lib/compliance'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

function shouldAlert(days: number) {
  return days <= 14
}

function buildAlertStatus(days: number) {
  return days < 0 ? 'overdue' : 'due_soon'
}

export async function GET(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }

  if (!process.env.ALERT_FROM_EMAIL) {
    return NextResponse.json({ error: 'ALERT_FROM_EMAIL is missing' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = createAdminClient()

  const { data: companies, error } = await supabase
    .from('tracked_companies')
    .select('id, user_id, company_name, company_number')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let processed = 0
  let sent = 0
  let skipped = 0

  const BATCH_SIZE = 5

  for (let i = 0; i < (companies?.length || 0); i += BATCH_SIZE) {
    const batch = (companies ?? []).slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (company) => {
        processed++

        try {
          const { data: userData } = await supabase.auth.admin.getUserById(company.user_id)
          const email = userData?.user?.email

          if (!email) {
            skipped++
            return
          }

          const liveData = await fetchCompany(company.company_number)
          const compliance = calculateCompliance(liveData)

          if (liveData.company_status !== 'active') {
            skipped++
            return
          }

          const candidateAlerts: Array<{
            alertType: string
            status: string
            message: string
          }> = []

          if (shouldAlert(compliance.confirmationStatement.daysRemaining)) {
            const status = buildAlertStatus(compliance.confirmationStatement.daysRemaining)
            candidateAlerts.push({
              alertType: 'confirmation_statement',
              status,
              message:
                compliance.confirmationStatement.daysRemaining < 0
                  ? `Confirmation Statement overdue by ${Math.abs(
                      compliance.confirmationStatement.daysRemaining
                    )} days`
                  : `Confirmation Statement due in ${compliance.confirmationStatement.daysRemaining} days`,
            })
          }

          if (shouldAlert(compliance.accounts.daysRemaining)) {
            const status = buildAlertStatus(compliance.accounts.daysRemaining)
            candidateAlerts.push({
              alertType: 'accounts_filing',
              status,
              message:
                compliance.accounts.daysRemaining < 0
                  ? `Accounts Filing overdue by ${Math.abs(compliance.accounts.daysRemaining)} days`
                  : `Accounts Filing due in ${compliance.accounts.daysRemaining} days`,
            })
          }

          if (candidateAlerts.length === 0) {
            skipped++
            return
          }

          const alertsToSend: typeof candidateAlerts = []

          for (const alert of candidateAlerts) {
            const { data: recentAlert } = await supabase
              .from('alert_history')
              .select('id, sent_at')
              .eq('user_id', company.user_id)
              .eq('company_number', company.company_number)
              .eq('alert_type', alert.alertType)
              .eq('status', alert.status)
              .gte(
                'sent_at',
                new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
              )
              .order('sent_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (!recentAlert) {
              alertsToSend.push(alert)
            }
          }

          if (alertsToSend.length === 0) {
            skipped++
            return
          }

          const sendResult = await resend.emails.send({
            from: process.env.ALERT_FROM_EMAIL!,
            to: email,
            subject: `⚠️ Compliance alert for ${company.company_name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2>⚠️ ComplyHub Alert</h2>
                <p><strong>${company.company_name}</strong> requires attention:</p>
                <ul>
                  ${alertsToSend.map((a) => `<li>${a.message}</li>`).join('')}
                </ul>
                <p>
                  <a
                    href="https://complyhub.uk/my-companies"
                    style="display:inline-block;padding:10px 16px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:6px;"
                  >
                    View Dashboard
                  </a>
                </p>
                <p style="margin-top:20px;font-size:12px;color:#666;">
                  You're receiving this because you are monitoring this company in ComplyHub.
                </p>
              </div>
            `,
          })

          if (sendResult.error) {
            skipped++
            console.error(`Resend failed for ${email}:`, sendResult.error)
            return
          }

          for (const alert of alertsToSend) {
            const { error: insertError } = await supabase.from('alert_history').insert({
              user_id: company.user_id,
              company_number: company.company_number,
              alert_type: alert.alertType,
              status: alert.status,
              sent_at: new Date().toISOString(),
            })

            if (insertError) {
              skipped++
              console.error(
                `Alert history insert failed for ${company.company_number}:`,
                insertError
              )
              return
            }
          }

          sent++
        } catch (err) {
          skipped++
          console.error(`Failed for ${company.company_number}`, err)
        }
      })
    )
  }

  return NextResponse.json({ success: true, processed, sent, skipped })
}