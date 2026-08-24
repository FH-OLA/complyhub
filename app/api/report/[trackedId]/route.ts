import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCompany } from '@/lib/companies-house/client'
import { calculateCompliance } from '@/lib/compliance'
import { buildReportData } from '@/lib/report'
import { generateCompliancePDF } from '@/lib/pdf'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackedId: string }> },
) {
  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { trackedId } = await params

  // -------------------------------------------------------------------------
  // Ownership check
  //
  // Atomic IDOR-safe query: requires both the correct trackedId AND the
  // authenticated user's id. Returns the same 403 for "not found" and
  // "belongs to another user" to prevent enumeration.
  // -------------------------------------------------------------------------
  const { data: tracked, error: trackError } = await supabase
    .from('tracked_companies')
    .select('id, company_number, company_name')
    .eq('id', trackedId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (trackError) {
    console.error(`[report] DB error for trackedId=${trackedId} user=${user.id}:`, trackError)
    return NextResponse.json(
      { error: 'Could not generate report. Please try again.' },
      { status: 500 },
    )
  }

  if (!tracked) {
    return NextResponse.json(
      { error: 'Report not available.' },
      { status: 403 },
    )
  }

  // -------------------------------------------------------------------------
  // Fetch live Companies House data
  // -------------------------------------------------------------------------
  let liveData: Awaited<ReturnType<typeof fetchCompany>>
  try {
    liveData = await fetchCompany(tracked.company_number)
  } catch (err) {
    console.error(
      `[report] Companies House fetch failed for ${tracked.company_number}:`,
      err,
    )
    return NextResponse.json(
      { error: 'Could not generate report. Please try again.' },
      { status: 503 },
    )
  }

  // -------------------------------------------------------------------------
  // Build report data and generate PDF
  // -------------------------------------------------------------------------
  const compliance = calculateCompliance(liveData)
  const reportData = buildReportData(tracked, liveData, compliance)

  let pdfBuffer: ArrayBuffer
  try {
    pdfBuffer = await generateCompliancePDF(reportData)
  } catch (err) {
    console.error(
      `[report] PDF generation failed for ${tracked.company_number}:`,
      err,
    )
    return NextResponse.json(
      { error: 'Could not generate report. Please try again.' },
      { status: 500 },
    )
  }

  // -------------------------------------------------------------------------
  // Return PDF
  // -------------------------------------------------------------------------
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `complyhub-report-${tracked.company_number}-${dateStr}.pdf`

  // Blob is unambiguously BodyInit; Content-Type is set on the Blob itself
  // so the Response headers only need Disposition and Cache-Control.
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' })

  return new Response(blob, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'private, no-store',
    },
  })
}
