import { NextResponse } from 'next/server'
import { fetchCompany } from '@/lib/companies-house/client'
import { calculateCompliance } from '@/lib/compliance'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

function shouldAlert(days: number) {
  return days <= 14
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

  for (const company of companies ?? []) {
    processed++

    try {
      const { data: userData } = await supabase.auth.admin.getUserById(company.user_id)
      const email = userData?.user?.email

      if (!email) {
        skipped++
        continue
      }

      const liveData = await fetchCompany(company.company_number)
      const compliance = calculateCompliance(liveData)

      const alerts: string[] = []

      if (
        liveData.company_status === 'active' &&
        shouldAlert(compliance.confirmationStatement.daysRemaining)
      ) {
        alerts.push(
          `Confirmation Statement ${
            compliance.confirmationStatement.daysRemaining < 0
              ? `overdue by ${Math.abs(compliance.confirmationStatement.daysRemaining)} days`
              : `due in ${compliance.confirmationStatement.daysRemaining} days`
          }`
        )
      }

      if (
        liveData.company_status === 'active' &&
        shouldAlert(compliance.accounts.daysRemaining)
      ) {
        alerts.push(
          `Accounts Filing ${
            compliance.accounts.daysRemaining < 0
              ? `overdue by ${Math.abs(compliance.accounts.daysRemaining)} days`
              : `due in ${compliance.accounts.daysRemaining} days`
          }`
        )
      }

      if (alerts.length === 0) {
        skipped++
        continue
      }

      const sendResult = await resend.emails.send({
        from: process.env.ALERT_FROM_EMAIL,
        to: email,
        subject: `⚠️ Compliance alert for ${company.company_name}`,
        html: `
          <h2>⚠️ Compliance Alert</h2>
          <p><strong>${company.company_name}</strong> needs attention:</p>
          <ul>
            ${alerts.map((a) => `<li>${a}</li>`).join('')}
          </ul>
          <p>Log in to ComplyHub to review.</p>
        `,
      })

      if (sendResult.error) {
        console.error(`Resend failed for ${email}:`, sendResult.error)
        continue
      }

      sent++
    } catch (err) {
      console.error(`Failed for ${company.company_number}`, err)
    }
  }

  return NextResponse.json({ success: true, processed, sent, skipped })
}