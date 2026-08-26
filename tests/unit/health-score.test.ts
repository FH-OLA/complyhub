import { describe, it, expect } from 'vitest'
import { calculateHealthScore, getHealthTier, getCompanyHealthTier } from '@/lib/health-score'
import {
  healthyCompliance,
  overdueCompliance,
  attentionCompliance,
  mixedCompliance,
} from '../helpers/fixtures'

// ─────────────────────────────────────────────────────────────────────────────
// calculateHealthScore
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateHealthScore', () => {
  it('returns 100 when both obligations are ok with plenty of days remaining', () => {
    expect(calculateHealthScore(healthyCompliance)).toBe(100)
  })

  it('returns 0 when both obligations are overdue (capped at 0)', () => {
    // Two overdue obligations → 50 + 50 = 100 penalty → max(0, 100 - 100) = 0
    expect(calculateHealthScore(overdueCompliance)).toBe(0)
  })

  it('returns 80 when obligations are due_soon within 14 and 30 days', () => {
    // attentionCompliance: CS 14 days → penalty 15, accounts 19 days → penalty 5 → 100 - 20 = 80
    expect(calculateHealthScore(attentionCompliance)).toBe(80)
  })

  it('returns 50 when one obligation is overdue and the other is ok', () => {
    // mixedCompliance: CS overdue → 50 penalty, accounts ok → 0 → 100 - 50 = 50
    expect(calculateHealthScore(mixedCompliance)).toBe(50)
  })

  it('applies 25-point penalty when daysRemaining <= 7', () => {
    const urgentCompliance = {
      confirmationStatement: { dueDate: '2026-01-05T00:00:00.000Z', status: 'due_soon' as const, daysRemaining: 5 },
      accounts:              { dueDate: '2026-09-01T00:00:00.000Z', status: 'ok'       as const, daysRemaining: 243 },
    }
    // CS: 5 days → penalty 25, accounts: ok → 0 → 100 - 25 = 75
    expect(calculateHealthScore(urgentCompliance)).toBe(75)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getHealthTier
// ─────────────────────────────────────────────────────────────────────────────

describe('getHealthTier', () => {
  it('returns healthy for score >= 70', () => {
    expect(getHealthTier(100)).toBe('healthy')
    expect(getHealthTier(70)).toBe('healthy')
  })

  it('returns attention for score between 40 and 69', () => {
    expect(getHealthTier(69)).toBe('attention')
    expect(getHealthTier(40)).toBe('attention')
  })

  it('returns action for score < 40', () => {
    expect(getHealthTier(39)).toBe('action')
    expect(getHealthTier(0)).toBe('action')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getCompanyHealthTier
// ─────────────────────────────────────────────────────────────────────────────

describe('getCompanyHealthTier', () => {
  it('returns dissolved for dissolved companies regardless of compliance', () => {
    expect(getCompanyHealthTier('dissolved', healthyCompliance)).toBe('dissolved')
    expect(getCompanyHealthTier('dissolved', overdueCompliance)).toBe('dissolved')
  })

  it('returns healthy for active company with score >= 70', () => {
    expect(getCompanyHealthTier('active', healthyCompliance)).toBe('healthy')
  })

  it('returns action for active company with both obligations overdue', () => {
    expect(getCompanyHealthTier('active', overdueCompliance)).toBe('action')
  })

  it('returns attention for active company with score in 40–69 range', () => {
    // Two obligations with 5 days remaining each → penalty 25 + 25 = 50 → score 50 (attention)
    const urgentBoth = {
      confirmationStatement: { dueDate: '2026-01-06T00:00:00.000Z', status: 'due_soon' as const, daysRemaining: 5 },
      accounts:              { dueDate: '2026-01-06T00:00:00.000Z', status: 'due_soon' as const, daysRemaining: 5 },
    }
    expect(getCompanyHealthTier('active', urgentBoth)).toBe('attention')
  })
})
