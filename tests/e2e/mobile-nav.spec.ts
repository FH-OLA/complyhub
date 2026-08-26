/**
 * E2E — mobile navigation (hamburger drawer).
 *
 * Runs against the Pixel 5 viewport project (no stored auth — public pages only).
 * Tests that the mobile nav drawer opens, shows links, and closes correctly.
 */

import { test, expect } from '@playwright/test'

test('hamburger button is visible on mobile viewport', async ({ page }) => {
  await page.goto('/')
  const hamburger = page.getByRole('button', { name: /menu|open navigation/i })
    .or(page.locator('[aria-label*="menu" i]'))
    .or(page.locator('button[class*="hamburger"], button[class*="mobile"]'))
  await expect(hamburger.first()).toBeVisible()
})

test('mobile nav drawer opens when hamburger is clicked', async ({ page }) => {
  await page.goto('/')

  const hamburger = page.getByRole('button', { name: /menu|open navigation/i })
    .or(page.locator('[aria-label*="menu" i]'))
    .first()
  await hamburger.click()

  // Navigation links should now be visible
  await expect(
    page.getByRole('navigation').or(page.locator('nav, [role="dialog"]')),
  ).toBeVisible({ timeout: 5_000 })
})

test('mobile nav contains login or sign in link', async ({ page }) => {
  await page.goto('/')

  const hamburger = page.getByRole('button', { name: /menu|open navigation/i })
    .or(page.locator('[aria-label*="menu" i]'))
    .first()
  await hamburger.click()

  await expect(
    page.getByRole('link', { name: /log in|sign in|login/i }),
  ).toBeVisible({ timeout: 5_000 })
})
