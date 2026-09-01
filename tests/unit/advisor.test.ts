import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildAdvisorContext, buildSystemPrompt } from '@/lib/ai/advisor'
import { buildReportData } from '@/lib/report'
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
// buildAdvisorContext
// ─────────────────────────────────────────────────────────────────────────────

describe('buildAdvisorContext', () => {
  it('includes company name and number in the header', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    const context = buildAdvisorContext(report)
    expect(context).toContain('Active Test Ltd')
    expect(context).toContain('#12345678')
  })

  it('includes company status', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    const context = buildAdvisorContext(report)
    expect(context).toContain('Company status: active')
  })

  it('includes health score and tier', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    const context = buildAdvisorContext(report)
    expect(context).toContain('Health score:   100/100 (healthy)')
  })

  it('shows "None — all obligations are on track" when no actions required', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    const context = buildAdvisorContext(report)
    expect(context).toContain('None — all obligations are on track')
  })

  it('lists actions when obligations are overdue', () => {
    const report = buildReportData(trackedRow, activeCompany, overdueCompliance)
    const context = buildAdvisorContext(report)
    expect(context).toContain('Confirmation Statement')
    expect(context).toContain('Accounts Filing')
  })

  it('includes today\'s date matching the pinned test date', () => {
    const report = buildReportData(trackedRow, activeCompany, healthyCompliance)
    const context = buildAdvisorContext(report)
    expect(context).toContain("Today's date: 2026-01-01")
  })

  it('includes CS and accounts status fields', () => {
    const report = buildReportData(trackedRow, activeCompany, attentionCompliance)
    const context = buildAdvisorContext(report)
    expect(context).toContain('CONFIRMATION STATEMENT:')
    expect(context).toContain('ACCOUNTS FILING:')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// buildSystemPrompt
// ─────────────────────────────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {
  it('embeds the context string into the system prompt', () => {
    const report  = buildReportData(trackedRow, activeCompany, healthyCompliance)
    const context = buildAdvisorContext(report)
    const prompt  = buildSystemPrompt(context)
    expect(prompt).toContain(context)
  })

  it('contains the STRICT RULES section', () => {
    const report  = buildReportData(trackedRow, dissolvedCompany, dissolvedCompliance)
    const context = buildAdvisorContext(report)
    const prompt  = buildSystemPrompt(context)
    expect(prompt).toContain('STRICT RULES')
  })

  it('contains the COMPLIANCE CONTEXT section header', () => {
    const report  = buildReportData(trackedRow, activeCompany, healthyCompliance)
    const context = buildAdvisorContext(report)
    const prompt  = buildSystemPrompt(context)
    expect(prompt).toContain('COMPLIANCE CONTEXT')
  })
})
