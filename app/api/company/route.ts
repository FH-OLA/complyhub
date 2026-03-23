import { NextRequest, NextResponse } from 'next/server'
import { fetchCompany } from '@/lib/companies-house/client'
import { createClient } from '@/lib/supabase/server'
import { calculateCompliance } from '@/lib/compliance'
export async function GET(request: NextRequest) {
  // Require authentication
 // const supabase = await createClient()
 // const { data: { user } } = await supabase.auth.getUser()

 // if (!user) {
 //   return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
 // }

  const companyNumber = request.nextUrl.searchParams.get('number')

  if (!companyNumber || companyNumber.trim() === '') {
    return NextResponse.json({ error: 'Company number is required' }, { status: 400 })
  }

  try {
    const company = await fetchCompany(companyNumber)

const compliance = calculateCompliance(company)

return NextResponse.json({
  ...company,
  compliance,
})
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'

    if (message === 'Company not found') {
      return NextResponse.json({ error: 'Company not found. Check the number and try again.' }, { status: 404 })
    }

    if (message.includes('COMPANIES_HOUSE_API_KEY')) {
      return NextResponse.json({ error: 'Companies House integration is not configured.' }, { status: 503 })
    }

console.error(err)
return NextResponse.json({ error: String(err) }, { status: 500 })  }
}
