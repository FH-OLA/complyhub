import { describe, it, expect, beforeAll } from 'vitest'
import { buildFilingContext, buildFilingSystemPrompt } from '@/lib/ai/filing-assistant'
import { FILING_GUIDANCE, SUPPORTED_FILING_TYPES } from '@/lib/filing-guidance'
import { confirmationStatementGuidance } from '@/lib/filing-guidance/confirmation-statement'
import { accountsGuidance } from '@/lib/filing-guidance/accounts'
import type { ReportData } from '@/lib/report'

// ---------------------------------------------------------------------------
// Minimal ReportData fixture for testing pure functions
// ---------------------------------------------------------------------------

const baseReportData: ReportData = {
  reportId:    'CHR-20260101-AABBCC',
  version:     '1.0',
  generatedAt: '2026-01-01T00:00:00.000Z',
  company: {
    name:              'Filing Test Ltd',
    number:            '12345678',
    status:            'active',
    type:              'private limited company',
    incorporationDate: '2018-06-01',
    registeredAddress: '1 Test Street, London, SW1A 1AA',
    sicCodes:          ['62012'],
  },
  compliance: {
    healthScore: 90,
    healthTier:  'healthy',
    confirmationStatement: {
      status:        'ok',
      dueDate:       '2026-06-01',
      daysRemaining: 151,
      lastFiled:     '2025-06-01',
    },
    accounts: {
      status:           'ok',
      dueDate:          '2026-09-01',
      daysRemaining:    243,
      lastFiled:        '2025-03-31',
      lastAccountsType: 'total-exemption-small',
    },
  },
  actionsRequired: [],
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Guidance layer structure (5 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('Filing guidance layer', () => {
  it('SUPPORTED_FILING_TYPES contains confirmation_statement and accounts', () => {
    expect(SUPPORTED_FILING_TYPES).toContain('confirmation_statement')
    expect(SUPPORTED_FILING_TYPES).toContain('accounts')
  })

  it('FILING_GUIDANCE map has an entry for every supported filing type', () => {
    for (const type of SUPPORTED_FILING_TYPES) {
      expect(FILING_GUIDANCE[type]).toBeDefined()
    }
  })

  it('CS01 guidance has all required fields with valid values', () => {
    const g = confirmationStatementGuidance
    expect(g.filingType).toBe('confirmation_statement')
    expect(g.displayName).toBeTruthy()
    expect(g.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(g.preparationChecklist.length).toBeGreaterThan(0)
    expect(g.informationRequired.length).toBeGreaterThan(0)
    expect(g.officialDestinations.length).toBeGreaterThan(0)
    expect(g.importantLimitations.length).toBeGreaterThan(0)
    expect(g.sourceLabel).toBeTruthy()
    expect(g.sourceReference).toMatch(/^https:\/\//)
  })

  it('Accounts guidance has all required fields with valid values', () => {
    const g = accountsGuidance
    expect(g.filingType).toBe('accounts')
    expect(g.displayName).toBeTruthy()
    expect(g.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(g.preparationChecklist.length).toBeGreaterThan(0)
    expect(g.informationRequired.length).toBeGreaterThan(0)
    expect(g.officialDestinations.length).toBeGreaterThan(0)
    expect(g.importantLimitations.length).toBeGreaterThan(0)
    expect(g.sourceLabel).toBeTruthy()
    expect(g.sourceReference).toMatch(/^https:\/\//)
  })

  it('all official destination URLs are well-formed HTTPS', () => {
    for (const type of SUPPORTED_FILING_TYPES) {
      for (const dest of FILING_GUIDANCE[type].officialDestinations) {
        expect(dest.url).toMatch(/^https:\/\//)
        expect(dest.label).toBeTruthy()
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. buildFilingContext (3 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('buildFilingContext', () => {
  it('includes company name and number in the context block', () => {
    const ctx = buildFilingContext(baseReportData, 'confirmation_statement')
    expect(ctx).toContain('Filing Test Ltd')
    expect(ctx).toContain('#12345678')
  })

  it('includes CS-specific fields for confirmation_statement and excludes accounts block', () => {
    const ctx = buildFilingContext(baseReportData, 'confirmation_statement')
    expect(ctx).toContain('CONFIRMATION STATEMENT')
    expect(ctx).toContain('2026-06-01')
    expect(ctx).toContain('151')
    expect(ctx).not.toContain('ACCOUNTS FILING')
  })

  it('includes accounts-specific fields for accounts and excludes CS block', () => {
    const ctx = buildFilingContext(baseReportData, 'accounts')
    expect(ctx).toContain('ACCOUNTS FILING')
    expect(ctx).toContain('2026-09-01')
    expect(ctx).toContain('243')
    expect(ctx).toContain('total-exemption-small')
    expect(ctx).not.toContain('CONFIRMATION STATEMENT')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. buildFilingSystemPrompt (8 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('buildFilingSystemPrompt', () => {
  let prompt: string

  beforeAll(() => {
    const context = buildFilingContext(baseReportData, 'confirmation_statement')
    prompt = buildFilingSystemPrompt(context, confirmationStatementGuidance)
  })

  it('contains the VERIFIED COMPANY CONTEXT section with company data', () => {
    expect(prompt).toContain('VERIFIED COMPANY CONTEXT')
    expect(prompt).toContain('Filing Test Ltd')
  })

  it('contains the COMPLYHUB FILING GUIDANCE section with display name', () => {
    expect(prompt).toContain('COMPLYHUB FILING GUIDANCE')
    expect(prompt).toContain(confirmationStatementGuidance.displayName)
  })

  it('contains all official destination URLs from the guidance layer', () => {
    for (const dest of confirmationStatementGuidance.officialDestinations) {
      expect(prompt).toContain(dest.url)
    }
  })

  it('does not contain URLs not present in the guidance layer', () => {
    const g = confirmationStatementGuidance
    const knownUrls = [
      ...g.officialDestinations.map((d) => d.url),
      g.sourceReference,
    ]
    const urlMatches = prompt.match(/https?:\/\/[^\s"'\n]+/g) ?? []
    for (const url of urlMatches) {
      const isKnown = knownUrls.some(
        (known) => url.startsWith(known) || known.startsWith(url),
      )
      expect(isKnown, `Unexpected URL in system prompt: ${url}`).toBe(true)
    }
  })

  it('contains the lastReviewed date from guidance metadata', () => {
    expect(prompt).toContain(confirmationStatementGuidance.lastReviewed)
  })

  it('contains the sourceLabel from guidance metadata', () => {
    expect(prompt).toContain(confirmationStatementGuidance.sourceLabel)
  })

  it('contains the permanent disclaimer verbatim', () => {
    expect(prompt).toContain(
      'ComplyHub does not file on your behalf. This guidance is for informational purposes only.',
    )
  })

  it('explicitly prohibits pre-trained knowledge in the strict rules', () => {
    expect(prompt).toContain('pre-trained')
  })
})
