'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { CompaniesHouseCompany } from '@/lib/companies-house/client'

interface CompanyLookupFormProps {
  onResult: (company: CompaniesHouseCompany | null) => void
}

export default function CompanyLookupForm({ onResult }: CompanyLookupFormProps) {
  const [companyNumber, setCompanyNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    onResult(null)
    setLoading(true)

    const response = await fetch(`/api/company?number=${encodeURIComponent(companyNumber)}`)
    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      onResult(null)
    } else {
      onResult(data)
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Input
          id="company-number"
          label="UK Company Number"
          placeholder="e.g. 12345678"
          value={companyNumber}
          onChange={(e) => setCompanyNumber(e.target.value)}
          required
          error={error}
          maxLength={8}
        />
      </div>
      <Button type="submit" loading={loading} className="shrink-0">
        Look up company
      </Button>
    </form>
  )
}
