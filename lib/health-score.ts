import type { ComplianceResult } from '@/lib/compliance'

export type HealthTier = 'healthy' | 'attention' | 'action' | 'dissolved'

export const HEALTH_TIER_CONFIG: Record<HealthTier, { label: string; badge: string }> = {
  healthy: { label: 'Healthy', badge: 'bg-green-100 text-green-700' },
  attention: { label: 'Attention needed', badge: 'bg-amber-100 text-amber-700' },
  action: { label: 'Action required', badge: 'bg-red-100 text-red-700' },
  dissolved: { label: 'Dissolved', badge: 'bg-gray-100 text-gray-500' },
}

function obligationPenalty(
  daysRemaining: number,
  status: 'ok' | 'due_soon' | 'overdue',
): number {
  if (status === 'overdue') return 50
  if (daysRemaining <= 7) return 25
  if (daysRemaining <= 14) return 15
  if (daysRemaining <= 30) return 5
  return 0
}

export function calculateHealthScore(compliance: ComplianceResult): number {
  const penalty =
    obligationPenalty(
      compliance.confirmationStatement.daysRemaining,
      compliance.confirmationStatement.status,
    ) +
    obligationPenalty(
      compliance.accounts.daysRemaining,
      compliance.accounts.status,
    )
  return Math.max(0, 100 - penalty)
}

export function getHealthTier(score: number): Exclude<HealthTier, 'dissolved'> {
  if (score >= 70) return 'healthy'
  if (score >= 40) return 'attention'
  return 'action'
}

// Returns the correct health tier for a company, including the neutral
// 'dissolved' tier for dissolved companies which have no compliance obligations.
export function getCompanyHealthTier(
  companyStatus: string,
  compliance: ComplianceResult,
): HealthTier {
  if (companyStatus === 'dissolved') return 'dissolved'
  return getHealthTier(calculateHealthScore(compliance))
}
