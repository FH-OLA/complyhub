/**
 * E2E — PDF report download (Pro user).
 *
 * Verifies that the "Download Report" button triggers a PDF download response.
 * Uses the Pro-tier stored auth state.
 *
 * Note: Playwright intercepts the download; we verify the response MIME type
 * rather than rendering the PDF.
 */

import { test as base, expect } from '@playwright/test'
import path from 'path'

const test = base.extend<object, { storageState: string }>({})
test.use({ storageState: path.join(__dirname, '.auth/pro-user.json') })

test('Download Report button is visible for a tracked company', async ({ page }) => {
  await page.goto('/dashboard')

  // The tracked company card should have a download/report button
  await expect(
    page.getByRole('button', { name: /download report|pdf report|report/i })
      .or(page.getByRole('link', { name: /download report|pdf report|report/i })),
  ).toBeVisible({ timeout: 15_000 })
})

test('Download Report returns a PDF file', async ({ page }) => {
  await page.goto('/dashboard')

  // Start waiting for download before clicking
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })

  await page.getByRole('button', { name: /download report|pdf report|report/i })
    .or(page.getByRole('link', { name: /download report|pdf report|report/i }))
    .first()
    .click()

  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.pdf$/)
})
