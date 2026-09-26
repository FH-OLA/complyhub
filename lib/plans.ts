/**
 * Single source of truth for plan names, prices, descriptions, and features.
 * Import this wherever plan data is displayed — never hardcode plan details elsewhere.
 */

export const PLANS = {
  free: {
    name: 'Free',
    price: '£0',
    period: '',
    description: 'For individuals getting started with compliance tracking.',
    features: [
      'Track 1 company',
      'Compliance deadline alerts',
      'Email notifications',
    ],
  },
  pro: {
    name: 'Pro',
    price: '£9',
    period: '/month',
    description: 'For businesses that need full compliance coverage.',
    features: [
      'Track unlimited companies',
      'Deadline alerts for every company you track',
      'Confirmation Statement and Annual Accounts reminders',
      'AI Compliance Advisor',
      'AI Filing Assistant',
    ],
  },
} as const
