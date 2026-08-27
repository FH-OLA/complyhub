import type { FilingGuidance } from './types'

// ---------------------------------------------------------------------------
// Annual Accounts guidance
//
// Reviewed against GOV.UK "File your company's annual accounts with
// Companies House" and related Companies House guidance.
//
// Last reviewed: 2026-08-27
// Source: https://www.gov.uk/file-your-company-annual-accounts
// ---------------------------------------------------------------------------

export const accountsGuidance: FilingGuidance = {
  filingType:  'accounts',
  displayName: 'Annual Accounts',
  version:     '1.0',

  purpose:
    'Companies must file annual accounts at Companies House showing the company\'s ' +
    'financial position at the end of each financial year. The type of accounts ' +
    'required (micro-entity, abridged small, full, or dormant) depends on the size ' +
    'and nature of the company. All accounts must be approved by the board and signed ' +
    'by a director before filing.',

  preparationChecklist: [
    'Determine which accounts type applies to your company (micro-entity, small, ' +
    'medium, large, or dormant) — this affects what you must include',
    'Prepare or obtain the completed and signed accounts from your accountant or director',
    'Confirm the accounts cover the correct financial year (check the period shown ' +
    'on Companies House)',
    'Ensure the accounts have been approved by the board and signed by a director',
    'Obtain your Companies House authentication code if you plan to file online',
    'For online iXBRL filing (medium/large companies): ensure accounts are in the ' +
    'correct tagged XBRL format',
    'Review the accounts for accuracy and completeness before filing',
  ],

  informationRequired: [
    'Company Registration Number (CRN)',
    'Companies House authentication code (required for online filing)',
    'Signed annual accounts document (PDF for micro-entity/small; iXBRL for larger companies)',
    'The company\'s financial year end date (must match Companies House records)',
    'Approving director\'s name and signature',
    'Accountant or auditor details (if the accounts have been audited or prepared by an accountant)',
  ],

  officialDestinations: [
    {
      label: 'Companies House — File accounts using WebFiling',
      url:   'https://ewf.companieshouse.gov.uk/',
      notes: 'For micro-entity, small, and dormant company accounts. ' +
             'Upload accounts as a PDF or use the online forms provided.',
    },
    {
      label: 'GOV.UK — File your company\'s annual accounts with Companies House',
      url:   'https://www.gov.uk/file-your-company-annual-accounts',
      notes: 'Full guidance covering accounts types, deadlines, filing routes, ' +
             'and late-filing penalties.',
    },
    {
      label: 'GOV.UK — Prepare annual accounts for a private limited company',
      url:   'https://www.gov.uk/prepare-file-annual-accounts-for-limited-company',
      notes: 'Guidance on preparing accounts, including the differences between ' +
             'micro-entity, small company, and full accounts. Note: Corporation Tax ' +
             'filing with HMRC is a separate obligation not covered here.',
    },
  ],

  importantLimitations: [
    'ComplyHub does not file accounts on your behalf.',
    'The filing route, format, and content requirements depend on your company size ' +
    'and type. Verify which accounts type applies before filing.',
    'Micro-entity and small company accounts have simplified disclosure options. ' +
    'An accountant can advise which applies to your company.',
    'Accounts must be filed by a director of the company.',
    'Late filing results in automatic financial penalties from Companies House, ' +
    'which increase the later the accounts are filed.',
    'This guidance covers Companies House filing only. Filing accounts with HMRC ' +
    'for Corporation Tax purposes is a separate, related obligation.',
  ],

  lastReviewed:    '2026-08-27',
  sourceLabel:     'Companies House — File your company\'s annual accounts',
  sourceReference: 'https://www.gov.uk/file-your-company-annual-accounts',

  relatedObligations: [
    'Corporation Tax return and accounts (HMRC — separate obligation)',
    'Confirmation statement filing',
    'Audit requirements (if applicable)',
  ],
}
