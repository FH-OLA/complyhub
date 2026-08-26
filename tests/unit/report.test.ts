import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildReportData } from '@/lib/report'
import {
  TEST_DATE,
  activeCompany,
  dissolvedCompany,
  healthyCompliance,
  overdueCompliance,
  attentionCompliance,
  trackedRow,
} from '../helpers/fixtures'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TEST_DATE)
})

afterAll(() => {
  vi.useRealTimers()
})

// ─────────────────────────────────────────────────────────────────────────────
// Report ID format
// ─────────────────────────────────────────────────────────────────────────────

describe('report ID format', () => {
  it('follows the CHR-YYYYMMDD-XXXXXX pattern', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    expect(report.reportId).toMatch(/^CHR-\d{8}-[0-9A-F]{6}$/)
  })

  it('encodes the pinned test date in the report ID', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    // TEST_DATE is 2026-01-01 → yyyymmdd = 20260101
    expect(report.reportId).toContain('20260101')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// buildReportData — company fields
// ─────────────────────────────────────────────────────────────────────────────

describe('buildReportData — company section', () => {
  it('maps company name and number from live data', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    expect(report.company.name).toBe('Active Test Ltd')
    expect(report.company.number).toBe('12345678')
  })

  it('converts hyphenated company type to space-separated', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    expect(report.company.type).toBe('private limited company')
  })

  it('formats registered address as a comma-separated string', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    expect(report.company.registeredAddress).toContain('1 Test Street')
    expect(report.company.registeredAddress).toContain('London')
    expect(report.company.registeredAddress).toContain('SW1A 1AA')
  })

  it('includes SIC codes from live data', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    expect(report.company.sicCodes).toEqual(['62012'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// buildReportData — compliance fields
// ─────────────────────────────────────────────────────────────────────────────

describe('buildReportData — compliance section', () => {
  it('computes health score from the provided compliance result', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    expect(report.compliance.healthScore).toBe(100)
  })

  it('sets healthTier to dissolved for dissolved companies', () => {
    const report = buildReportData(trackedRow, dissolvedCompany, overdueCompliance)
    expect(report.compliance.healthTier).toBe('dissolved')
  })

  it('carries through lastFiled for confirmation statement', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    expect(report.compliance.confirmationStatement.lastFiled).toBe('2025-06-01')
  })

  it('carries through lastFiled and type for accounts', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    expect(report.compliance.accounts.lastFiled).toBe('2025-03-31')
    // Hyphenated type converted to spaces
    expect(report.compliance.accounts.lastAccountsType).toBe('total exemption small')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// buildReportData — actionsRequired
// ─────────────────────────────────────────────────────────────────────────────

describe('buildReportData — actionsRequired', () => {
  it('returns empty array when both obligations are ok', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    expect(report.actionsRequired).toHaveLength(0)
  })

  it('includes both obligations when both are overdue', () => {
    const report = buildReportData(trackedRow, activeCompany, overdueCompliance)
    expect(report.actionsRequired).toHaveLength(2)
    expect(report.actionsRequired[0]).toMatch(/Confirmation Statement/)
    expect(report.actionsRequired[1]).toMatch(/Accounts Filing/)
  })

  it('includes both obligations when both are due_soon', () => {
    const report = buildReportData(trackedRow, activeCompany, attentionCompliance)
    expect(report.actionsRequired).toHaveLength(2)
  })

  it('returns empty array for dissolved companies', () => {
    const report = buildReportData(trackedRow, dissolvedCompany, overdueCompliance)
    expect(report.actionsRequired).toHaveLength(0)
  })
})
