import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { calculateCompliance } from '@/lib/compliance'
import {
  TEST_DATE,
  activeCompany,
  overdueCompany,
  dormantCompany,
  dissolvedCompany,
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

  it('computes CS due date as last_made_up_to + 1 year', () => {
    const result = calculateCompliance(activeCompany)
    // last_made_up_to = 2025-06-01 → due = 2026-06-01
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
  it('falls back to date_of_creation + 1 year when no CS data', () => {
    const noCs = { ...activeCompany, confirmation_statement: undefined }
    const result = calculateCompliance(noCs)
    // date_of_creation = 2018-06-01 → CS due 2019-06-01 (long overdue)
    expect(result.confirmationStatement.status).toBe('overdue')
  })

  it('falls back to date_of_creation + 21 months when no accounts next_due', () => {
    const noAccounts = { ...activeCompany, accounts: undefined }
    const result = calculateCompliance(noAccounts)
    // date_of_creation = 2018-06-01 + 21 months = 2020-03-01 (overdue)
    expect(result.accounts.status).toBe('overdue')
  })
})
