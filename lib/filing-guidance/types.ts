// ---------------------------------------------------------------------------
// FilingGuidance — application-owned, human-reviewed procedural guidance.
//
// This is ComplyHub's controlled source of truth for Companies House filing
// procedures. The AI model is strictly forbidden from supplementing or
// replacing this content with its pre-trained regulatory knowledge.
//
// Update process:
//   1. Update the relevant guidance file (confirmation-statement.ts / accounts.ts).
//   2. Bump the `version` field (semver or simple integer).
//   3. Update `lastReviewed` to today's date in YYYY-MM-DD format.
//   4. Update `sourceReference` if the authoritative source URL has changed.
// ---------------------------------------------------------------------------

export type FilingType = 'confirmation_statement' | 'accounts'

export interface OfficialDestination {
  /** Human-readable name of the official service or guidance page. */
  label: string
  /** Reviewed GOV.UK or Companies House URL. Never hardcode this in other files. */
  url: string
  /** Eligibility notes or context (e.g. "For micro-entity and small companies"). */
  notes?: string
}

export interface FilingGuidance {
  filingType: FilingType

  /** Display name shown in the UI and passed to the AI model. */
  displayName: string

  /**
   * Revision identifier. Increment when the guidance content changes.
   * Allows engineers and operators to track which version of guidance
   * was used to generate a specific response (future: store with usage event).
   * Optional so that guidance objects added before this field was introduced
   * remain valid.
   */
  version?: string

  /** Plain-English description of what this filing is and what it confirms. */
  purpose: string

  /** Numbered checklist of steps the user should complete before filing. */
  preparationChecklist: string[]

  /** Information the user must have to hand before filing. */
  informationRequired: string[]

  /**
   * One or more official GOV.UK / Companies House destinations for this filing.
   * The filing route can vary by company type/size, so multiple entries are
   * supported. Use the first entry as the primary destination.
   */
  officialDestinations: OfficialDestination[]

  /** Known limitations, caveats, and disclaimers specific to this filing type. */
  importantLimitations: string[]

  /**
   * ISO date (YYYY-MM-DD) when this guidance was last reviewed against its
   * authoritative source. Surface in the UI to communicate freshness.
   * The architecture uses this field to support future review-age warnings
   * without requiring structural changes.
   */
  lastReviewed: string

  /** Short label for the authoritative source, shown in the UI and AI response. */
  sourceLabel: string

  /** URL of the authoritative source used to compile this guidance. */
  sourceReference: string

  /**
   * Related filing obligations or compliance areas not covered in Sprint 10.
   * Reserved for future expansion (e.g. Corporation Tax, VAT, Self Assessment).
   * Not used by the AI model or UI in the current sprint.
   */
  relatedObligations?: string[]
}
