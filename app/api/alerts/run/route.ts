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
  const debug: any[] = []

  for (const company of companies ?? []) {
    processed++

    try {
      const row: any = {
        company_number: company.company_number,
        company_name: company.company_name,
      }

      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(company.user_id)
      row.user_lookup_error = userError?.message || null

      const email = userData?.user?.email
      row.email = email || null

      if (!email) {
        skipped++
        row.stage = 'no_email'
        debug.push(row)
        continue
      }

      const liveData = await fetchCompany(company.company_number)
      row.company_status = liveData.company_status

      const compliance = calculateCompliance(liveData)
      row.compliance = {
        confirmationStatement: compliance.confirmationStatement,
        accounts: compliance.accounts,
      }

      if (liveData.company_status !== 'active') {
        skipped++
        row.stage = 'inactive_company'
        debug.push(row)
        continue
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

      row.candidateAlerts = candidateAlerts

      if (candidateAlerts.length === 0) {
        skipped++
        row.stage = 'no_candidate_alerts'
        debug.push(row)
        continue
      }

      const alertsToSend: typeof candidateAlerts = []

      for (const alert of candidateAlerts) {
        const { data: recentAlert, error: recentAlertError } = await supabase
          .from('alert_history')
          .select('id, sent_at')
          .eq('user_id', company.user_id)
          .eq('company_number', company.company_number)
          .eq('alert_type', alert.alertType)
          .eq('status', alert.status)
          .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (recentAlertError) {
          row.recent_alert_error = recentAlertError.message
        }

        if (!recentAlert) {
          alertsToSend.push(alert)
        }
      }

      row.alertsToSend = alertsToSend

      if (alertsToSend.length === 0) {
        skipped++
        row.stage = 'duplicate_alerts_blocked'
        debug.push(row)
        continue
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
          </div>
        `,
      })

      row.sendResult = sendResult

      if (sendResult.error) {
        skipped++
        row.stage = 'send_failed'
        debug.push(row)
        continue
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
          row.insert_error = insertError.message
          skipped++
          row.stage = 'history_insert_failed'
          debug.push(row)
          return NextResponse.json({ success: true, processed, sent, skipped, debug })
        }
      }

      sent++
      row.stage = 'sent'
      debug.push(row)
    } catch (err) {
      skipped++
      debug.push({
        company_number: company.company_number,
        stage: 'exception',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({ success: true, processed, sent, skipped, debug })
}