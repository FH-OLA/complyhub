import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  try {
    const data = await resend.emails.send({
      from: process.env.ALERT_FROM_EMAIL!,
      to:'laudement@gmail.com', // <-- PUT YOUR EMAIL
      subject: 'Test email from ComplyHub',
      html: '<p>This is a test email</p>',
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error })
  }
}