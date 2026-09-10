import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { calculateCompliance } from '@/lib/compliance'
import {
  TEST_DATE,
  activeCompany,
  overdueCompany,
  dormantCompany,
  dissolvedCompany,
  filingWindowCompany,
} from '../helpers/fixtures'

// Pin time so that all daysRemaining calculations are deterministic.
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TEST_DATE)
})

afterAll(() => {
  vi.useRealTimers()
})

// ─────────────────────────────────────────────────────────────────────────────
// Dissolved companies
// ─────────────────────────────────────────────────────────────────────────────

describe('dissolved company', () => {
  it('returns N/A due dates for both obligations', () => {
    const result = calculateCompliance(dissolvedCompany)
    expect(result.confirmationStatement.dueDate).toBe('N/A')
    expect(result.accounts.dueDate).toBe('N/A')
  })

  it('returns not_applicable status for both obligations', () => {
    const result = calculateCompliance(dissolvedCompany)
    expect(result.confirmationStatement.status).toBe('not_applicable')
    expect(result.accounts.status).toBe('not_applicable')
  })

  it('returns 0 daysRemaining for both obligations', () => {
    const result = calculateCompliance(dissolvedCompany)
    expect(result.confirmationStatement.daysRemaining).toBe(0)
    expect(result.accounts.daysRemaining).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Active company — healthy (both ok)
// ─────────────────────────────────────────────────────────────────────────────

describe('active company — both obligations on track', () => {
  it('returns ok status for confirmation statement', () => {
    const result = calculateCompliance(activeCompany)
    expect(result.confirmationStatement.status).toBe('ok')
  })

  it('returns ok status for accounts filing', () => {
    const result = calculateCompliance(activeCompany)
    expect(result.accounts.status).toBe('ok')
  })

  it('returns positive daysRemaining for both obligations', () => {
    const result = calculateCompliance(activeCompany)
    expect(result.confirmationStatement.daysRemaining).toBeGreaterThan(30)
    expect(result.accounts.daysRemaining).toBeGreaterThan(30)
  })

  it('uses confirmation_statement.next_due when present', () => {
    const result = calculateCompliance(activeCompany)
    expect(result.confirmationStatement.dueDate).toContain('2026-06-01')
  })

  it('uses accounts.next_due when present', () => {
    const result = calculateCompliance(activeCompany)
    expect(result.accounts.dueDate).toContain('2026-09-01')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Active company — overdue (both past due date)
// ─────────────────────────────────────────────────────────────────────────────

describe('active company — both obligations overdue', () => {
  it('returns overdue status for confirmation statement', () => {
    const result = calculateCompliance(overdueCompany)
    expect(result.confirmationStatement.status).toBe('overdue')
  })

  it('returns overdue status for accounts filing', () => {
    const result = calculateCompliance(overdueCompany)
    expect(result.accounts.status).toBe('overdue')
  })

  it('returns negative daysRemaining for both obligations', () => {
    const result = calculateCompliance(overdueCompany)
    expect(result.confirmationStatement.daysRemaining).toBeLessThan(0)
    expect(result.accounts.daysRemaining).toBeLessThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Active company — due_soon (within 30 days)
// ─────────────────────────────────────────────────────────────────────────────

describe('active company — both obligations due soon', () => {
  it('returns due_soon status for confirmation statement', () => {
    const result = calculateCompliance(dormantCompany)
    expect(result.confirmationStatement.status).toBe('due_soon')
  })

  it('returns due_soon status for accounts filing', () => {
    const result = calculateCompliance(dormantCompany)
    expect(result.accounts.status).toBe('due_soon')
  })

  it('returns daysRemaining between 0 and 30 for both', () => {
    const result = calculateCompliance(dormantCompany)
    expect(result.confirmationStatement.daysRemaining).toBeGreaterThanOrEqual(0)
    expect(result.confirmationStatement.daysRemaining).toBeLessThanOrEqual(30)
    expect(result.accounts.daysRemaining).toBeGreaterThanOrEqual(0)
    expect(result.accounts.daysRemaining).toBeLessThanOrEqual(30)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Fallback logic when optional fields are absent
// ─────────────────────────────────────────────────────────────────────────────

describe('fallback date logic', () => {
  it('falls back to next_made_up_to + 14 days when next_due is absent', () => {
    const noNextDue = {
      ...filingWindowCompany,
      confirmation_statement: {
        last_made_up_to: '2024-12-26',
        next_made_up_to: '2025-12-26',
      },
    }
    const result = calculateCompliance(noNextDue)
    // 2025-12-26 + 14 days = 2026-01-09 — same as the authoritative next_due.
    expect(result.confirmationStatement.dueDate).toContain('2026-01-09')
    expect(result.confirmationStatement.status).not.toBe('overdue')
  })

  it('falls back to last_made_up_to + 1 year + 14 days when only last_made_up_to is present', () => {
    const onlyLastMadeUpTo = {
      ...filingWindowCompany,
      confirmation_statement: { last_made_up_to: '2024-12-26' },
    }
    const result = calculateCompliance(onlyLastMadeUpTo)
    // 2024-12-26 + 1 year = 2025-12-26, + 14 days = 2026-01-09.
    expect(result.confirmationStatement.dueDate).toContain('2026-01-09')
    expect(result.confirmationStatement.status).not.toBe('overdue')
  })

  it('falls back to date_of_creation + 1 year + 14 days when no CS data at all', () => {
    const noCs = { ...filingWindowCompany, confirmation_statement: undefined }
    const result = calculateCompliance(noCs)
    // date_of_creation = 2019-12-26 → 2020-12-26 + 14 days = 2021-01-09.
    expect(result.confirmationStatement.dueDate).toContain('2021-01-09')
  })

  it('still reports overdue via the creation-date fallback for a long-lapsed company', () => {
    const noCs = { ...activeCompany, confirmation_statement: undefined }
    const result = calculateCompliance(noCs)
    // date_of_creation = 2018-06-01 → 2019-06-01 + 14 days = 2019-06-15 (long overdue)
    expect(result.confirmationStatement.dueDate).toContain('2019-06-15')
    expect(result.confirmationStatement.status).toBe('overdue')
  })

  it('falls back to date_of_creation + 21 months when no accounts next_due', () => {
    const noAccounts = { ...activeCompany, accounts: undefined }
    const result = calculateCompliance(noAccounts)
    // date_of_creation = 2018-06-01 + 21 months = 2020-03-01 (overdue)
    expect(result.accounts.status).toBe('overdue')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Regression — the 14-day confirmation statement filing window
//
// Companies House allows 14 days after the review period ends (next_made_up_to)
// to file. Deriving the deadline from the review-period date reported "overdue"
// throughout that window while the company was still legally compliant.
//
// Every assertion here fails against the previous implementation, which computed
// last_made_up_to + 1 year = 2025-12-26 — six days before TEST_DATE.
// ─────────────────────────────────────────────────────────────────────────────

describe('confirmation statement — inside the 14-day filing window', () => {
  it('prefers next_due over the review-period date', () => {
    const result = calculateCompliance(filingWindowCompany)
    expect(result.confirmationStatement.dueDate).toContain('2026-01-09')
    // The review-period date must NOT be used as the deadline.
    expect(result.confirmationStatement.dueDate).not.toContain('2025-12-26')
  })

  it('does NOT mark the company overdue during the filing window', () => {
    const result = calculateCompliance(filingWindowCompany)
    expect(result.confirmationStatement.status).not.toBe('overdue')
    expect(result.confirmationStatement.status).toBe('due_soon')
  })

  it('reports positive days remaining, not a negative count', () => {
    const result = calculateCompliance(filingWindowCompany)
    // TEST_DATE 2026-01-01 → 2026-01-09 is 8 days away.
    expect(result.confirmationStatement.daysRemaining).toBe(8)
    expect(result.confirmationStatement.daysRemaining).toBeGreaterThan(0)
  })

  it('leaves the accounts obligation unaffected', () => {
    const result = calculateCompliance(filingWindowCompany)
    expect(result.accounts.dueDate).toContain('2026-09-01')
    expect(result.accounts.status).toBe('ok')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Regression — timezone stability across DST transitions
//
// Companies House dates are plain YYYY-MM-DD, parsed as UTC midnight. Using
// local-time setters (setDate/setFullYear) shifts the result a day early when
// the runtime timezone crosses a spring-forward transition inside the span.
// These assertions must hold identically under TZ=UTC, TZ=Europe/London and
// TZ=America/New_York.
// ─────────────────────────────────────────────────────────────────────────────

describe('confirmation statement — DST-stable date arithmetic', () => {
  it('adds 14 days across the UK spring-forward transition (30 March 2025)', () => {
    const ukSpringForward = {
      ...filingWindowCompany,
      confirmation_statement: { next_made_up_to: '2025-03-20' },
    }
    const result = calculateCompliance(ukSpringForward)
    // 2025-03-20 + 14 days = 2025-04-03. Local-time setters yield 2025-04-02
    // under Europe/London because BST begins on 30 March.
    expect(result.confirmationStatement.dueDate).toContain('2025-04-03')
    expect(result.confirmationStatement.dueDate).not.toContain('2025-04-02')
  })

  it('adds 14 days across the US spring-forward transition (9 March 2025)', () => {
    const usSpringForward = {
      ...filingWindowCompany,
      confirmation_statement: { next_made_up_to: '2025-03-02' },
    }
    const result = calculateCompliance(usSpringForward)
    // 2025-03-02 + 14 days = 2025-03-16. Local-time setters yield 2025-03-15
    // under America/New_York because EDT begins on 9 March.
    expect(result.confirmationStatement.dueDate).toContain('2025-03-16')
    expect(result.confirmationStatement.dueDate).not.toContain('2025-03-15')
  })

  it('adds 1 year then 14 days across a DST transition without drifting', () => {
    const yearThenWindow = {
      ...filingWindowCompany,
      confirmation_statement: { last_made_up_to: '2024-03-20' },
    }
    const result = calculateCompliance(yearThenWindow)
    // 2024-03-20 + 1 year = 2025-03-20, + 14 days = 2025-04-03.
    expect(result.confirmationStatement.dueDate).toContain('2025-04-03')
  })

  it('produces a UTC-midnight instant, not a shifted local instant', () => {
    const ukSpringForward = {
      ...filingWindowCompany,
      confirmation_statement: { next_made_up_to: '2025-03-20' },
    }
    const result = calculateCompliance(ukSpringForward)
    expect(result.confirmationStatement.dueDate).toBe('2025-04-03T00:00:00.000Z')
  })
})
