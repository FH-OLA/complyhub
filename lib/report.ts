import type { CompaniesHouseCompany } from '@/lib/companies-house/client'
import type { ComplianceResult } from '@/lib/compliance'
import { calculateHealthScore, getCompanyHealthTier, type HealthTier } from '@/lib/health-score'

// ---------------------------------------------------------------------------
// ReportData
//
// Renderer-agnostic data structure for a single-company compliance report.
// Decoupled from the HTTP layer and from any specific output format (PDF,
// email, JSON storage) so future report types can build on the same foundation.
// ---------------------------------------------------------------------------

export interface ReportData {
  reportId: string       // CHR-YYYYMMDD-XXXXXX  (non-persistent, display only)
  version: string        // e.g. "1.0"
  generatedAt: string    // ISO timestamp

  company: {
    name: string
    number: string
    status: string       // "active" | "dissolved" | …
    type: string         // Companies House company type, spaces substituted for hyphens
    incorporationDate: string
    registeredAddress: string
    sicCodes: string[]
  }

  compliance: {
    healthScore: number  // 0–100; meaningful only when status !== "dissolved"
    healthTier: HealthTier
    confirmationStatement: {
      status: 'ok' | 'due_soon' | 'overdue'
      daysRemaining: number
      dueDate: string
      lastFiled: string  // empty string if unknown
    }
    accounts: {
      status: 'ok' | 'due_soon' | 'overdue'
      daysRemaining: number
      dueDate: string
      lastFiled: string
      lastAccountsType: string  // e.g. "total exemption small", empty if unknown
    }
  }

  // Human-readable action strings; empty array when all obligations are ok.
  actionsRequired: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateReportId(): string {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  // Use Web Crypto CSPRNG (available in both Node.js and Edge runtimes).
  // 3 random bytes → 6 uppercase hex characters (24 bits of entropy).
  const bytes = crypto.getRandomValues(new Uint8Array(3))
  const random = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  return `CHR-${yyyymmdd}-${random}`
}

function formatAddress(addr: CompaniesHouseCompany['registered_office_address']): string {
  return [
    addr?.address_line_1,
    addr?.address_line_2,
    addr?.locality,
    addr?.postal_code,
    addr?.country,
  ]
    .filter(Boolean)
    .join(', ')
}

function formatDaysLabel(daysRemaining: number, status: 'ok' | 'due_soon' | 'overdue'): string {
  if (status === 'overdue') {
    const n = Math.abs(daysRemaining)
    return `File immediately — overdue by ${n} day${n !== 1 ? 's' : ''}`
  }
  return `Due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} (${new Date(
    Date.now() + daysRemaining * 86400000,
  ).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`
}

// ---------------------------------------------------------------------------
// buildReportData
//
// Pure transform: three already-fetched data sources → ReportData.
// No network calls. Safe to call from any context.
// ---------------------------------------------------------------------------

export function buildReportData(
  tracked: { id: string; company_name: string; company_number: string },
  liveData: CompaniesHouseCompany,
  compliance: ComplianceResult,
): ReportData {
  const healthScore = calculateHealthScore(compliance)
  const healthTier  = getCompanyHealthTier(liveData.company_status, compliance)

  const csLastFiled  = liveData.confirmation_statement?.last_made_up_to ?? ''
  const accLastFiled = liveData.accounts?.last_accounts?.made_up_to ?? ''
  const accType      = liveData.accounts?.last_accounts?.type
    ? liveData.accounts.last_accounts.type.replace(/-/g, ' ')
    : ''

  // Build action strings only for active companies with upcoming/overdue obligations.
  const actionsRequired: string[] = []
  if (liveData.company_status !== 'dissolved') {
    if (
      compliance.confirmationStatement.status === 'due_soon' ||
      compliance.confirmationStatement.status === 'overdue'
    ) {
      actionsRequired.push(
        `Confirmation Statement: ${formatDaysLabel(
          compliance.confirmationStatement.daysRemaining,
          compliance.confirmationStatement.status,
        )}`,
      )
    }
    if (
      compliance.accounts.status === 'due_soon' ||
      compliance.accounts.status === 'overdue'
    ) {
      actionsRequired.push(
        `Accounts Filing: ${formatDaysLabel(
          compliance.accounts.daysRemaining,
          compliance.accounts.status,
        )}`,
      )
    }
  }

  return {
    reportId:    generateReportId(),
    version:     '1.0',
    generatedAt: new Date().toISOString(),

    company: {
      name:               liveData.company_name,
      number:             liveData.company_number,
      status:             liveData.company_status,
      type:               (liveData.company_type ?? '').replace(/-/g, ' '),
      incorporationDate:  liveData.date_of_creation ?? '',
      registeredAddress:  formatAddress(liveData.registered_office_address),
      sicCodes:           liveData.sic_codes ?? [],
    },

    compliance: {
      healthScore,
      healthTier,
      confirmationStatement: {
        status:        compliance.confirmationStatement.status,
        daysRemaining: compliance.confirmationStatement.daysRemaining,
        dueDate:       compliance.confirmationStatement.dueDate,
        lastFiled:     csLastFiled,
      },
      accounts: {
        status:          compliance.accounts.status,
        daysRemaining:   compliance.accounts.daysRemaining,
        dueDate:         compliance.accounts.dueDate,
        lastFiled:       accLastFiled,
        lastAccountsType: accType,
      },
    },

    actionsRequired,
  }
}
