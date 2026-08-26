/**
 * Shared test fixtures for unit and API integration tests.
 *
 * Four canonical company types covering all main compliance states:
 *   activeCompany   – active, both obligations on track (healthy)
 *   overdueCompany  – active, both obligations past their due date (action required)
 *   dormantCompany  – active, both obligations approaching within 30 days (attention needed)
 *   dissolvedCompany – dissolved, no compliance obligations
 *
 * All date strings are written relative to the pinned test date 2026-01-01.
 * Unit tests that call calculateCompliance must call vi.useFakeTimers() +
 * vi.setSystemTime(TEST_DATE) to make day-counting deterministic.
 */

import type { CompaniesHouseCompany } from '@/lib/companies-house/client'
import type { ComplianceResult } from '@/lib/compliance'

/** The date pinned across all unit tests that exercise date-dependent logic. */
export const TEST_DATE = new Date('2026-01-01T00:00:00.000Z')

// ─────────────────────────────────────────────────────────────────────────────
// Company fixtures (CompaniesHouseCompany shape)
// ─────────────────────────────────────────────────────────────────────────────

/** Active company with both obligations comfortably on track. */
export const activeCompany: CompaniesHouseCompany = {
  company_name:   'Active Test Ltd',
  company_number: '12345678',
  company_status: 'active',
  company_type:   'private-limited-company',
  date_of_creation: '2018-06-01',
  registered_office_address: {
    address_line_1: '1 Test Street',
    locality:       'London',
    postal_code:    'SW1A 1AA',
    country:        'England',
  },
  sic_codes: ['62012'],
  // CS last filed 2025-06-01 → next due 2026-06-01 → 151 days from TEST_DATE → ok
  confirmation_statement: { last_made_up_to: '2025-06-01', next_due: '2026-06-01' },
  // Accounts next due 2026-09-01 → 243 days from TEST_DATE → ok
  accounts: { next_due: '2026-09-01', last_accounts: { made_up_to: '2025-03-31', type: 'total-exemption-small' } },
}

/** Active company with both obligations overdue. */
export const overdueCompany: CompaniesHouseCompany = {
  company_name:   'Overdue Test Ltd',
  company_number: '87654321',
  company_status: 'active',
  company_type:   'private-limited-company',
  date_of_creation: '2015-03-01',
  registered_office_address: {
    address_line_1: '2 Test Road',
    locality:       'Manchester',
    postal_code:    'M1 1AA',
  },
  sic_codes: ['47910'],
  // CS last filed 2024-06-01 → next due 2025-06-01 → -214 days from TEST_DATE → overdue
  confirmation_statement: { last_made_up_to: '2024-06-01', next_due: '2025-06-01' },
  // Accounts next due 2025-03-01 → -306 days from TEST_DATE → overdue
  accounts: { next_due: '2025-03-01', last_accounts: { made_up_to: '2024-03-31', type: 'full' } },
}

/** Active company with both obligations due within 30 days (attention needed). */
export const dormantCompany: CompaniesHouseCompany = {
  company_name:   'Dormant Test Ltd',
  company_number: '11223344',
  company_status: 'active',
  company_type:   'private-limited-company',
  date_of_creation: '2020-01-10',
  registered_office_address: {
    address_line_1: '3 Quiet Lane',
    locality:       'Bristol',
    postal_code:    'BS1 1AA',
  },
  // CS last filed 2025-01-15 → next due 2026-01-15 → 14 days from TEST_DATE → due_soon
  confirmation_statement: { last_made_up_to: '2025-01-15', next_due: '2026-01-15' },
  // Accounts next due 2026-01-20 → 19 days from TEST_DATE → due_soon
  accounts: { next_due: '2026-01-20', last_accounts: { made_up_to: '2025-01-10', type: 'dormant' } },
}

/** Dissolved company — no compliance obligations. */
export const dissolvedCompany: CompaniesHouseCompany = {
  company_name:   'Dissolved Test Ltd',
  company_number: '99887766',
  company_status: 'dissolved',
  company_type:   'private-limited-company',
  date_of_creation: '2010-01-01',
  registered_office_address: {
    address_line_1: '4 Old Street',
    locality:       'Leeds',
    postal_code:    'LS1 1AA',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Compliance result fixtures (ComplianceResult shape)
// For use in tests that need compliance data but don't go through
// calculateCompliance (e.g. health-score and advisor tests).
// ─────────────────────────────────────────────────────────────────────────────

export const healthyCompliance: ComplianceResult = {
  confirmationStatement: { dueDate: '2026-06-01T00:00:00.000Z', status: 'ok',       daysRemaining: 151 },
  accounts:              { dueDate: '2026-09-01T00:00:00.000Z', status: 'ok',       daysRemaining: 243 },
}

export const overdueCompliance: ComplianceResult = {
  confirmationStatement: { dueDate: '2025-06-01T00:00:00.000Z', status: 'overdue',  daysRemaining: -214 },
  accounts:              { dueDate: '2025-03-01T00:00:00.000Z', status: 'overdue',  daysRemaining: -306 },
}

export const attentionCompliance: ComplianceResult = {
  confirmationStatement: { dueDate: '2026-01-15T00:00:00.000Z', status: 'due_soon', daysRemaining: 14 },
  accounts:              { dueDate: '2026-01-20T00:00:00.000Z', status: 'due_soon', daysRemaining: 19 },
}

/** Mixed: CS overdue, accounts ok — single obligation overdue. */
export const mixedCompliance: ComplianceResult = {
  confirmationStatement: { dueDate: '2025-06-01T00:00:00.000Z', status: 'overdue',  daysRemaining: -214 },
  accounts:              { dueDate: '2026-09-01T00:00:00.000Z', status: 'ok',       daysRemaining: 243 },
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracked company DB row fixture
// ─────────────────────────────────────────────────────────────────────────────

export const trackedRow = {
  id:           'tracked-uuid-123',
  company_name: 'Active Test Ltd',
  company_number: '12345678',
  created_at:   '2025-01-01T00:00:00.000Z',
}
