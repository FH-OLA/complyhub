const BASE_URL = 'https://api.company-information.service.gov.uk'

export interface CompaniesHouseCompany {
  company_name: string
  company_number: string
  company_status: string
  company_type: string
  date_of_creation: string
  registered_office_address: {
    address_line_1?: string
    address_line_2?: string
    locality?: string
    postal_code?: string
    country?: string
  }
  sic_codes?: string[]
  confirmation_statement?: {
    last_made_up_to?: string
    next_due?: string
    next_made_up_to?: string
  }
  accounts?: {
    next_due?: string
    next_made_up_to?: string
    last_accounts?: {
      made_up_to?: string
      type?: string
    }
  }
}
export async function fetchCompany(companyNumber: string): Promise<CompaniesHouseCompany> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
console.log("API KEY:", apiKey)
  if (!apiKey) {
    throw new Error('COMPANIES_HOUSE_API_KEY is not configured')
  }

  const credentials = Buffer.from(`${apiKey}:`).toString('base64')
  const normalised = companyNumber.trim().toUpperCase()

  const response = await fetch(`${BASE_URL}/company/${normalised}`, {
    headers: { Authorization: `Basic ${credentials}` },
    next: { revalidate: 3600 }, // cache for 1 hour
  })

  if (response.status === 404) {
    throw new Error('Company not found')
  }

  if (!response.ok) {
    throw new Error(`Companies House API error: ${response.status}`)
  }

  return response.json()
}
