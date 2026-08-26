/**
 * Playwright global setup — runs once before any test spec.
 *
 * Logs in with the free-tier test account and writes the resulting session
 * cookies to tests/e2e/.auth/free-user.json so downstream specs can reuse
 * them without re-logging in on every test.
 *
 * Required environment variables:
 *   PLAYWRIGHT_TEST_EMAIL    — free-tier test account email
 *   PLAYWRIGHT_TEST_PASSWORD — free-tier test account password
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'

const FREE_USER_AUTH = path.join(__dirname, '.auth/free-user.json')

setup('authenticate as free user', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_TEST_EMAIL!)
  await page.getByLabel(/password/i).fill(process.env.PLAYWRIGHT_TEST_PASSWORD!)
  await page.getByRole('button', { name: /sign in|log in/i }).click()

  // Wait for redirect to dashboard after successful login
  await page.waitForURL('**/dashboard**', { timeout: 15_000 })
  await expect(page).toHaveURL(/dashboard/)

  // Persist session state for downstream specs
  await page.context().storageState({ path: FREE_USER_AUTH })
})
