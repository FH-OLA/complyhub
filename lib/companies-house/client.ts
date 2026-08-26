const BASE_URL = 'https://api.company-information.service.gov.uk'
const FETCH_TIMEOUT_MS = 8_000
const MAX_RETRIES = 1

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

// Returns true for errors that are definitive API responses (not network/timeout
// failures) and should not be retried.
function isNonRetryable(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message === 'Company not found' ||
      err.message.startsWith('Companies House API error:'))
  )
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchCompany(companyNumber: string): Promise<CompaniesHouseCompany> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
  if (!apiKey) {
    throw new Error('COMPANIES_HOUSE_API_KEY is not configured')
  }

  const credentials = Buffer.from(`${apiKey}:`).toString('base64')
  const normalised = companyNumber.trim().toUpperCase()
  const url = `${BASE_URL}/company/${normalised}`
  const options: RequestInit = {
    headers: { Authorization: `Basic ${credentials}` },
    next: { revalidate: 3600 }, // cache for 1 hour
  }

  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)

      if (response.status === 404) {
        throw new Error('Company not found')
      }

      if (!response.ok) {
        throw new Error(`Companies House API error: ${response.status}`)
      }

      return response.json()
    } catch (err) {
      if (isNonRetryable(err)) throw err
      lastError = err
    }
  }

  throw lastError
}
