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

    return {
      tracked,
      liveData,
      compliance,
      error: null,
    }
  } catch {
    return {
      tracked,
      liveData: null,
      compliance: null,
      error: 'Could not load live data',
    }
  }
}

export default async function MyCompaniesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: companies, error: dbError } = await supabase
    .from('tracked_companies')
    .select('id, company_name, company_number, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const results: CompanyResult[] =
    companies && companies.length > 0
      ? await Promise.all((companies as TrackedCompany[]).map(fetchCompanyResult))
      : []

  const total = results.length

  const dueSoon = results.filter(({ compliance, error }) => {
    if (error || !compliance) return false

    const csDueSoon =
      compliance.confirmationStatement.daysRemaining >= 0 &&
      compliance.confirmationStatement.daysRemaining <= 14

    const accountsDueSoon =
      compliance.accounts.daysRemaining >= 0 &&
      compliance.accounts.daysRemaining <= 14

    return csDueSoon || accountsDueSoon
  }).length

  const overdue = results.filter(({ compliance, error }) => {
    if (error || !compliance) return false

    return (
      compliance.confirmationStatement.daysRemaining < 0 ||
      compliance.accounts.daysRemaining < 0
    )
  }).length

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">My Companies</h1>
        <p className="mt-3 text-base text-gray-600">
          Live compliance status for your tracked companies.
        </p>
      </div>

      <div className="mb-8 h-px bg-gray-200" />

      {dbError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load companies: {dbError.message}
        </div>
      )}

      {!dbError && results.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-600">No companies tracked yet.</p>
          <p className="mt-2 text-sm text-gray-400">
            Use the{' '}
            <a href="/dashboard" className="font-medium text-indigo-600 underline">
              Dashboard
            </a>{' '}
            to look up and track a company.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="mb-8 flex justify-center">
            <div className="grid w-full max-w-3xl gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <p className="text-xs uppercase tracking-wide text-gray-500">Total Companies</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{total}</p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-5 shadow-sm transition hover:shadow-md">
                <p className="text-xs uppercase tracking-wide text-amber-700">Due Soon</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">{dueSoon}</p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-5 shadow-sm transition hover:shadow-md">
                <p className="text-xs uppercase tracking-wide text-red-700">Overdue</p>
                <p className="mt-2 text-3xl font-bold text-red-900">{overdue}</p>
              </div>
            </div>
          </div>

          {overdue > 0 && (
            <div className="mb-6 flex justify-center">
              <div className="w-full max-w-3xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                ⚠️ You have <strong>{overdue}</strong> overdue compliance item(s). Take action now
                to avoid penalties.
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <div className="grid w-full max-w-3xl gap-6">
              {results.map(({ tracked, liveData, compliance, error }) => {
                if (error || !liveData || !compliance) {
                  return (
                    <div
                      key={tracked.id}
                      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                    >
                      <p className="text-lg font-semibold text-gray-900">{tracked.company_name}</p>
                      <p className="mt-1 text-sm text-gray-500">#{tracked.company_number}</p>
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
        </>
      )}