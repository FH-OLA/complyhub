import type { FilingGuidance } from './types'

// ---------------------------------------------------------------------------
// Confirmation Statement (CS01) guidance
//
// Reviewed against GOV.UK "File a confirmation statement with Companies House"
// and Companies House WebFiling documentation.
//
// Last reviewed: 2026-08-27
// Source: https://www.gov.uk/file-a-confirmation-statement-with-companies-house
// ---------------------------------------------------------------------------

export const confirmationStatementGuidance: FilingGuidance = {
  filingType:  'confirmation_statement',
  displayName: 'Confirmation Statement (CS01)',
  version:     '1.0',

  purpose:
    'A confirmation statement (form CS01) confirms that the information Companies House ' +
    'holds about your company is accurate and up to date as of a specific date (the ' +
    'confirmation date). It does not replace the annual accounts filing and does not ' +
    'require you to report financial information.',

  preparationChecklist: [
    'Confirm the registered office address is correct',
    'Confirm or update the list of directors and their service addresses',
    'Confirm or update the list of secretaries (if the company has one)',
    'Confirm or update the statement of capital (share classes and total shares issued)',
    'Confirm or update the register of shareholders (register of members)',
    'Confirm or update persons with significant control (PSC) information',
    'Confirm or update the SIC code (Standard Industrial Classification)',
    'Confirm the trading status of the company (trading or non-trading)',
  ],

  informationRequired: [
    'Company Registration Number (CRN)',
    'Companies House authentication code (required for online filing)',
    'Names, service addresses, and appointment dates for all current directors',
    'Secretary details (if applicable)',
    'Current shareholder names, addresses, and share classes held',
    'PSC details: full name, nature of control, date they became a PSC',
    'Current registered office address',
    'Current SIC code',
  ],

  officialDestinations: [
    {
      label: 'Companies House WebFiling — File a confirmation statement',
      url:   'https://ewf.companieshouse.gov.uk/',
      notes: 'Online filing via your Companies House authentication code. ' +
             'Online filing is free; paper filing (form CS01) carries a £34 fee.',
    },
    {
      label: 'GOV.UK — File a confirmation statement with Companies House',
      url:   'https://www.gov.uk/file-a-confirmation-statement-with-companies-house',
      notes: 'Full guidance on what to include, deadlines, and how to file.',
    },
  ],

  importantLimitations: [
    'ComplyHub does not file this statement on your behalf.',
    'You must have a valid Companies House authentication code to file online. ' +
    'If you do not have one, request it from Companies House before your deadline.',
    'This checklist covers the most common requirements. Your company\'s specific ' +
    'circumstances (e.g. recent director changes, share transfers) may require ' +
    'additional steps.',
    'PSC information in particular can be complex. Seek advice from a company ' +
    'secretary or accountant if you are unsure whether any PSC details have changed.',
    'Filing a confirmation statement with inaccurate information is a criminal offence.',
  ],

  lastReviewed:    '2026-08-27',
  sourceLabel:     'Companies House — Confirmation statement (CS01)',
  sourceReference: 'https://www.gov.uk/file-a-confirmation-statement-with-companies-house',

  relatedObligations: [
    'Annual accounts filing',
    'Notification of changes to registered office, directors, or PSC (event-driven)',
  ],
}
