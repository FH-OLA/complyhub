/**
 * E2E — upgrade page UI.
 *
 * Verifies the upgrade page renders correctly for a free-tier user.
 * Does NOT click through to Stripe checkout (avoids external service calls).
 */

import { test, expect } from '@playwright/test'

test('upgrade page is accessible from the dashboard', async ({ page }) => {
  await page.goto('/dashboard')

  // There should be an upgrade link/button somewhere on the dashboard
  const upgradeLink = page.getByRole('link', { name: /upgrade|pro/i })
    .or(page.getByRole('button', { name: /upgrade|go pro/i }))
  await expect(upgradeLink.first()).toBeVisible({ timeout: 10_000 })
})

test('upgrade page shows Pro plan features', async ({ page }) => {
  await page.goto('/upgrade')

  // Should show Pro plan benefits
  await expect(
    page.getByText(/pro|unlimited|pdf|ai advisor/i).first(),
  ).toBeVisible({ timeout: 10_000 })
})

test('upgrade page renders a call-to-action button', async ({ page }) => {
  await page.goto('/upgrade')

  await expect(
    page.getByRole('button', { name: /upgrade|get pro|subscribe/i })
      .or(page.getByRole('link', { name: /upgrade|get pro|subscribe/i })),
  ).toBeVisible({ timeout: 10_000 })
})
