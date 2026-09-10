import type { CompaniesHouseCompany } from '@/lib/companies-house/client'

export type ComplianceStatus = 'ok' | 'due_soon' | 'overdue' | 'not_applicable'

export interface ComplianceResult {
  confirmationStatement: {
    dueDate: string
    status: ComplianceStatus
    daysRemaining: number
  }
  accounts: {
    dueDate: string
    status: ComplianceStatus
    daysRemaining: number
  }
}

// Merged type returned by /api/company — CompaniesHouseCompany enriched with
// the computed compliance result. Used by CompanyCard, CompanyLookupForm, and
// the dashboard page.
export type CompanyWithCompliance = CompaniesHouseCompany & { compliance: ComplianceResult }

// ✅ Helper functions (THIS was missing)
function getStatus(days: number): 'ok' | 'due_soon' | 'overdue' {
  if (days < 0) return 'overdue'
  if (days <= 30) return 'due_soon'
  return 'ok'
}

function diffInDays(date: Date): number {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Companies House supplies plain YYYY-MM-DD dates, which Date parses as UTC
// midnight. The fallback arithmetic below therefore uses UTC calendar setters:
// the local-time equivalents (setDate/setFullYear) shift the result by a day
// when the runtime timezone crosses a spring-forward DST transition inside the
// span — reproducible under Europe/London for a review period ending in March.
function addDaysUTC(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function addYearsUTC(date: Date, years: number): Date {
  const next = new Date(date)
  next.setUTCFullYear(next.getUTCFullYear() + years)
  return next
}

// Statutory window to file a confirmation statement after the review period ends.
const CS_FILING_WINDOW_DAYS = 14

// ✅ Main function
export function calculateCompliance(data: CompaniesHouseCompany): ComplianceResult {
  if (data.company_status === 'dissolved') {
    return {
      confirmationStatement: {
        dueDate: 'N/A',
        status: 'not_applicable',
        daysRemaining: 0,
      },
      accounts: {
        dueDate: 'N/A',
        status: 'not_applicable',
        daysRemaining: 0,
      },
    }
  }

  // Confirmation Statement due date.
  //
  // Companies House publishes two dates that are easy to confuse, 14 days apart:
  //   • next_made_up_to — the statement (review-period) date. NOT a deadline.
  //   • next_due        — the authoritative filing deadline.
  // The statutory filing window is the 14 days after the review period ends, so
  // a company remains compliant between next_made_up_to and next_due. Treating
  // the review-period date as the deadline reports "overdue" 14 days early.
  //
  // Prefer next_due whenever Companies House supplies it. Each fallback below
  // adds the same 14-day window so it approximates the real filing deadline
  // rather than the review-period date.
  const cs = data.confirmation_statement
  let confirmationDue: Date

  if (cs?.next_due) {
    confirmationDue = new Date(cs.next_due)
  } else if (cs?.next_made_up_to) {
    confirmationDue = addDaysUTC(new Date(cs.next_made_up_to), CS_FILING_WINDOW_DAYS)
  } else if (cs?.last_made_up_to) {
    const reviewPeriodEnd = addYearsUTC(new Date(cs.last_made_up_to), 1)
    confirmationDue = addDaysUTC(reviewPeriodEnd, CS_FILING_WINDOW_DAYS)
  } else {
    const reviewPeriodEnd = addYearsUTC(new Date(data.date_of_creation), 1)
    confirmationDue = addDaysUTC(reviewPeriodEnd, CS_FILING_WINDOW_DAYS)
  }

  const csDays = diffInDays(confirmationDue)

  // ✅ Accounts
  let accountsDue: Date

  if (data.accounts?.next_due) {
    accountsDue = new Date(data.accounts.next_due)
  } else {
    accountsDue = new Date(data.date_of_creation)
    accountsDue.setMonth(accountsDue.getMonth() + 21)
  }

  const accDays = diffInDays(accountsDue)

  return {
    confirmationStatement: {
      dueDate: confirmationDue.toISOString(),
      status: getStatus(csDays),
      daysRemaining: csDays,
    },
    accounts: {
      dueDate: accountsDue.toISOString(),
      status: getStatus(accDays),
      daysRemaining: accDays,
    },
  }
}