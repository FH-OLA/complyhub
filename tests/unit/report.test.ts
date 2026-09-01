import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildReportData, sanitizeFilenameSegment, buildReportFilename, buildContentDisposition } from '@/lib/report'
import {
  TEST_DATE,
  activeCompany,
  dissolvedCompany,
  healthyCompliance,
  overdueCompliance,
  attentionCompliance,
  dissolvedCompliance,
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
    const report = buildReportData(trackedRow, dissolvedCompany, dissolvedCompliance)
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
    expect(report.actionsRequired[1]).toMatch(/Annual Accounts/)
  })

  it('includes both obligations when both are due_soon', () => {
    const report = buildReportData(trackedRow, activeCompany, attentionCompliance)
    expect(report.actionsRequired).toHaveLength(2)
  })

  it('returns empty array for dissolved companies', () => {
    const report = buildReportData(trackedRow, dissolvedCompany, dissolvedCompliance)
    expect(report.actionsRequired).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeFilenameSegment
// ─────────────────────────────────────────────────────────────────────────────

describe('sanitizeFilenameSegment', () => {
  it('converts spaces to hyphens', () => {
    expect(sanitizeFilenameSegment('LAUDEM ENTERPRISE LIMITED')).toBe('LAUDEM-ENTERPRISE-LIMITED')
  })

  it('handles ampersands and apostrophes', () => {
    expect(sanitizeFilenameSegment("A&B CONSULTING LTD")).toBe('A&B-CONSULTING-LTD')
    expect(sanitizeFilenameSegment("O'BRIEN & SONS LIMITED")).toBe("O'BRIEN-&-SONS-LIMITED")
  })

  it('removes slashes and backslashes', () => {
    expect(sanitizeFilenameSegment('Company / Test \\ Ltd')).not.toMatch(/[\/\\]/)
  })

  it('removes filesystem-unsafe characters', () => {
    const result = sanitizeFilenameSegment('Test: Company * "Name" <Ltd>')
    expect(result).not.toMatch(/[:*?"<>|]/)
  })

  it('collapses multiple spaces into single hyphens', () => {
    expect(sanitizeFilenameSegment('Company   Multiple   Spaces')).toBe('Company-Multiple-Spaces')
  })

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeFilenameSegment('  Trimmed Ltd  ')).toBe('Trimmed-Ltd')
  })

  it('collapses repeated hyphens', () => {
    expect(sanitizeFilenameSegment('A - B -- C')).toBe('A-B-C')
  })

  it('truncates very long names to 80 characters', () => {
    const long = 'A'.repeat(120)
    expect(sanitizeFilenameSegment(long).length).toBeLessThanOrEqual(80)
  })

  it('returns fallback for empty input', () => {
    expect(sanitizeFilenameSegment('')).toBe('Company')
    expect(sanitizeFilenameSegment('   ')).toBe('Company')
  })

  it('returns fallback when all characters are unsafe', () => {
    expect(sanitizeFilenameSegment('***')).toBe('Company')
  })

  it('produces deterministic output', () => {
    const input = 'Test Company Ltd'
    expect(sanitizeFilenameSegment(input)).toBe(sanitizeFilenameSegment(input))
  })

  it('strips dot-dot traversal segments', () => {
    expect(sanitizeFilenameSegment('../Company Ltd')).not.toContain('..')
    expect(sanitizeFilenameSegment('..\\Company Ltd')).not.toContain('..')
  })

  it('handles bare dot and dot-dot', () => {
    expect(sanitizeFilenameSegment('.')).toBe('Company')
    expect(sanitizeFilenameSegment('..')).toBe('Company')
  })

  it('collapses multiple dots', () => {
    expect(sanitizeFilenameSegment('...Company...')).not.toContain('..')
  })

  it('strips control characters', () => {
    expect(sanitizeFilenameSegment("Company\r\nInjected")).toBe('CompanyInjected')
    expect(sanitizeFilenameSegment("Company\x00Ltd")).toBe('CompanyLtd')
  })

  it('strips NUL bytes', () => {
    expect(sanitizeFilenameSegment('\x00\x00\x00')).toBe('Company')
  })

  it('strips leading and trailing dots', () => {
    expect(sanitizeFilenameSegment('.hidden')).toBe('hidden')
    expect(sanitizeFilenameSegment('name.')).toBe('name')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// buildReportFilename
// ─────────────────────────────────────────────────────────────────────────────

describe('buildReportFilename', () => {
  it('produces a company-first filename ending in .pdf', () => {
    const result = buildReportFilename('LAUDEM ENTERPRISE LIMITED', '2026-09-01')
    expect(result).toBe('LAUDEM-ENTERPRISE-LIMITED_Compliance-Report_2026-09-01.pdf')
  })

  it('includes the report date', () => {
    const result = buildReportFilename('Test Ltd', '2026-09-01')
    expect(result).toContain('2026-09-01')
  })

  it('ends with .pdf', () => {
    const result = buildReportFilename('Any Company', '2026-01-01')
    expect(result).toMatch(/\.pdf$/)
  })

  it('does not contain path separators', () => {
    const result = buildReportFilename('Company / With \\ Slashes', '2026-01-01')
    expect(result).not.toMatch(/[\/\\]/)
  })

  it('handles punctuation-heavy names', () => {
    const result = buildReportFilename('A*B:C<D>E|F"G', '2026-01-01')
    expect(result).toMatch(/\.pdf$/)
    expect(result).not.toMatch(/[*:<>|"]/)
  })

  it('uses deterministic fallback for invalid dateStr', () => {
    const result = buildReportFilename('Test Ltd', 'not-a-date')
    expect(result).toBe('Test-Ltd_Compliance-Report_unknown-date.pdf')
  })

  it('produces identical output for identical invalid date input', () => {
    const a = buildReportFilename('Test Ltd', 'garbage')
    const b = buildReportFilename('Test Ltd', 'garbage')
    expect(a).toBe(b)
    expect(a).toContain('unknown-date')
  })

  it('sanitises dateStr with path traversal attempts', () => {
    const result = buildReportFilename('Test Ltd', '../../etc')
    expect(result).not.toContain('..')
    expect(result).not.toContain('/')
    expect(result).toMatch(/\.pdf$/)
    expect(result).toContain('unknown-date')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// buildContentDisposition
// ─────────────────────────────────────────────────────────────────────────────

describe('buildContentDisposition', () => {
  it('includes both filename and filename* parameters', () => {
    const result = buildContentDisposition('Test Ltd', '2026-09-01')
    expect(result).toContain('filename=')
    expect(result).toContain("filename*=UTF-8''")
  })

  it('starts with attachment', () => {
    const result = buildContentDisposition('Test Ltd', '2026-09-01')
    expect(result).toMatch(/^attachment;/)
  })

  it('handles ampersands and apostrophes safely', () => {
    const result = buildContentDisposition("A&B CONSULTING LTD", '2026-09-01')
    expect(result).toContain('A%26B')
    expect(result).not.toMatch(/[\r\n]/)
  })

  it('handles apostrophe names', () => {
    const result = buildContentDisposition("O'BRIEN & SONS LIMITED", '2026-09-01')
    expect(result).toContain("O'BRIEN")
    expect(result).not.toMatch(/[\r\n]/)
  })

  it('percent-encodes Unicode in filename*', () => {
    const result = buildContentDisposition('CAFÉ TEST LIMITED', '2026-09-01')
    expect(result).toContain("filename*=UTF-8''")
    expect(result).toContain('CAF')
  })

  it('replaces non-ASCII with underscore in ASCII fallback filename', () => {
    const result = buildContentDisposition('CAFÉ TEST LIMITED', '2026-09-01')
    const asciiMatch = result.match(/filename="([^"]+)"/)
    expect(asciiMatch).not.toBeNull()
    expect(asciiMatch![1]).toMatch(/^[\x20-\x7e]+$/)
  })

  it('cannot contain CR or LF', () => {
    const result = buildContentDisposition("Company\r\nEvil", '2026-09-01')
    expect(result).not.toMatch(/[\r\n]/)
  })
})
