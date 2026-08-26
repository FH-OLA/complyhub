import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests run against a production build (next start).
 *
 * Required environment variables (set in .env.local or CI secrets):
 *   PLAYWRIGHT_TEST_BASE_URL   – defaults to http://localhost:3000
 *   PLAYWRIGHT_TEST_EMAIL      – free-tier test account email
 *   PLAYWRIGHT_TEST_PASSWORD   – free-tier test account password
 *   PLAYWRIGHT_PRO_EMAIL       – Pro-tier test account email
 *   PLAYWRIGHT_PRO_PASSWORD    – Pro-tier test account password
 *
 * Test accounts must be pre-created in the Supabase test project.
 * The Pro account must have an active Pro subscription row in user_subscriptions
 * and at least one tracked company.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,            // auth-dependent tests require sequencing
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,                      // single worker to avoid auth-state races
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Auth setup runs first and writes session cookies for downstream specs.
    {
      name: 'setup',
      testMatch: '**/global-setup.ts',
    },

    // Desktop Chrome — uses the free-user session created by setup.
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/free-user.json',
      },
      dependencies: ['setup'],
      testIgnore: ['**/global-setup.ts', '**/mobile-nav.spec.ts'],
    },

    // Mobile Chrome — for mobile navigation tests (no stored auth needed).
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/mobile-nav.spec.ts',
    },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
