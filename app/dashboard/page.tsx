'use client'

import { useState } from 'react'
import CompanyLookupForm from '@/components/dashboard/CompanyLookupForm'
import CompanyCard from '@/components/dashboard/CompanyCard'
import OnboardingCard from '@/components/onboarding/OnboardingCard'
import type { CompanyWithCompliance } from '@/lib/compliance'

export default function DashboardPage() {
  const [company, setCompany] = useState<CompanyWithCompliance | null>(null)
  const [companyTracked, setCompanyTracked] = useState(false)

  return (
    <div>
      <OnboardingCard
        companySearched={company !== null}
        companyTracked={companyTracked}
      />

      <div className="mb-8">
        <h1 className="font-display text-[28px] font-bold text-text-1">Dashboard</h1>
        <p className="mt-1 text-sm text-text-2">
          Look up a UK company number to view its live compliance status.
        </p>
      </div>

      <section className="rounded-[var(--card-radius)] border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-text-1">Company Lookup</h2>
        <CompanyLookupForm onResult={(result) => { setCompany(result); if (!result) setCompanyTracked(false) }} />
        {company && (
          <CompanyCard
            company={company}
            onTracked={() => setCompanyTracked(true)}
          />
        )}
      </section>
    </div>
  )
}
