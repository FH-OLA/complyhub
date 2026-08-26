/**
 * E2E — company search and track flow.
 *
 * Uses the free-tier session (stored by global-setup.ts).
 * Requires: PLAYWRIGHT_TEST_COMPANY_NUMBER — a valid UK company number.
 */

import { test, expect } from '@playwright/test'

test('company search returns results for a valid company number', async ({ page }) => {
  await page.goto('/dashboard')

  const companyNumber = process.env.PLAYWRIGHT_TEST_COMPANY_NUMBER ?? '00000006'
  await page.getByPlaceholder(/company number|search/i).fill(companyNumber)
  await page.getByRole('button', { name: /search|look up/i }).click()

  // Compliance card or company name should appear
  await expect(
    page.getByText(/confirmation statement|accounts filing|health score/i),
  ).toBeVisible({ timeout: 15_000 })
})

test('company search shows an error for an invalid company number', async ({ page }) => {
  await page.goto('/dashboard')

  await page.getByPlaceholder(/company number|search/i).fill('XXXXXXXX')
  await page.getByRole('button', { name: /search|look up/i }).click()

  await expect(
    page.getByText(/not found|invalid|error/i),
  ).toBeVisible({ timeout: 10_000 })
})

test('track button appears after a successful search', async ({ page }) => {
  await page.goto('/dashboard')

  const companyNumber = process.env.PLAYWRIGHT_TEST_COMPANY_NUMBER ?? '00000006'
  await page.getByPlaceholder(/company number|search/i).fill(companyNumber)
  await page.getByRole('button', { name: /search|look up/i }).click()

  await expect(
    page.getByRole('button', { name: /track|already tracking/i }),
  ).toBeVisible({ timeout: 15_000 })
})
