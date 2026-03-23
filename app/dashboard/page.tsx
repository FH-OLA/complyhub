'use client'

import { useState } from 'react'
import CompanyLookupForm from '@/components/dashboard/CompanyLookupForm'
import CompanyCard from '@/components/dashboard/CompanyCard'
import type { CompaniesHouseCompany } from '@/lib/companies-house/client'

export default function DashboardPage() {
  const [company, setCompany] = useState<CompaniesHouseCompany | null>(null)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Look up a UK company to start monitoring its compliance status.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Company Lookup</h2>
        <CompanyLookupForm onResult={setCompany} />
        {company && <CompanyCard company={company} />}
      </section>
    </div>
  )
}
