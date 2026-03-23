import { createClient } from '@/lib/supabase/server'
import { fetchCompany } from '@/lib/companies-house/client'
import { calculateCompliance } from '@/lib/compliance'
import TrackedCompanyCard from '@/components/dashboard/TrackedCompanyCard'
import type { CompaniesHouseCompany } from '@/lib/companies-house/client'
import type { ComplianceResult } from '@/lib/compliance'

interface TrackedCompany {
  id: string
  company_name: string
  company_number: string
  created_at: string
}

interface CompanyResult {
  tracked: TrackedCompany
  liveData: CompaniesHouseCompany | null
  compliance: ComplianceResult | null
  error: string | null
}

async function fetchCompanyResult(tracked: TrackedCompany): Promise<CompanyResult> {
  try {
    const liveData = await fetchCompany(tracked.company_number)
    const compliance = calculateCompliance(liveData)
    return { tracked, liveData, compliance, error: null }
  } catch {
    return { tracked, liveData: null, compliance: null, error: 'Could not load live data' }
  }
}

export default async function MyCompaniesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: companies, error: dbError } = await supabase
    .from('tracked_companies')
    .select('id, company_name, company_number, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const results: CompanyResult[] = companies && companies.length > 0
    ? await Promise.all((companies as TrackedCompany[]).map(fetchCompanyResult))
    : []

    return (
    <div className="mx-auto max-w-5xl px-4">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Companies</h1>
        <p className="mt-2 text-base text-gray-600">
          Live compliance status for your tracked companies.
        </p>
      </div>

      <div className="mb-8 h-px bg-gray-200" />

      {dbError && (
        <p className="text-sm text-red-600">Failed to load companies: {dbError.message}</p>
      )}

      {!dbError && results.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-md">
          <p className="text-sm text-gray-500">No companies tracked yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Use the{' '}
            <a href="/dashboard" className="text-indigo-600 underline">
              Dashboard
            </a>{' '}
            to look up and track a company.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6 flex justify-center">
          <div className="grid w-full max-w-3xl gap-6">
            {results.map(({ tracked, liveData, compliance, error }) => {
              if (error || !liveData || !compliance) {
                return (
                  <div
                    key={tracked.id}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md"
                  >
                    <p className="font-semibold text-gray-900">{tracked.company_name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">#{tracked.company_number}</p>
                    <p className="mt-4 text-sm text-red-600">{error}</p>
                  </div>
                )
              }

              return (
                <TrackedCompanyCard
  key={tracked.id}
  trackedId={tracked.id}
  company={liveData}
  compliance={compliance}
/>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}