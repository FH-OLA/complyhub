export { confirmationStatementGuidance } from './confirmation-statement'
export { accountsGuidance } from './accounts'
export type { FilingGuidance, FilingType, OfficialDestination } from './types'

import type { FilingGuidance, FilingType } from './types'
import { confirmationStatementGuidance } from './confirmation-statement'
import { accountsGuidance } from './accounts'

/**
 * Ordered list of filing types supported by the Filing Assistant.
 * Add new filing types here only after adding the corresponding guidance file.
 * The API route imports this array for request validation — adding an entry
 * here automatically makes that filing type valid without any route code change.
 */
export const SUPPORTED_FILING_TYPES = [
  'confirmation_statement',
  'accounts',
] as const satisfies ReadonlyArray<FilingType>

/**
 * Application-owned guidance for every supported filing type.
 * The AI model may only interpret the content of the matching entry;
 * it must not supplement it with pre-trained regulatory knowledge.
 */
export const FILING_GUIDANCE: Record<FilingType, FilingGuidance> = {
  confirmation_statement: confirmationStatementGuidance,
  accounts:               accountsGuidance,
}
