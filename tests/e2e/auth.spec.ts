/**
 * E2E — authentication flows.
 *
 * Covers: login, logout, and unauthenticated redirect.
 * These tests use no stored auth state (each test starts logged out).
 */

import { test, expect } from '@playwright/test'

// Override the storageState set by the chromium project — auth tests start
// from a clean (logged-out) state.
test.use({ storageState: { cookies: [], origins: [] } })

test('unauthenticated visit to /dashboard redirects to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/login/)
})

test('login with valid credentials navigates to dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_TEST_EMAIL!)
  await page.getByLabel(/password/i).fill(process.env.PLAYWRIGHT_TEST_PASSWORD!)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
})

test('login with invalid credentials shows an error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('invalid@example.com')
  await page.getByLabel(/password/i).fill('wrongpassword')
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  // Should stay on login page and show an error message
  await expect(page).toHaveURL(/login/)
  await expect(page.getByRole('alert').or(page.locator('[data-error]')).or(page.getByText(/invalid|incorrect|error/i))).toBeVisible({ timeout: 8_000 })
})

test('logout redirects to login or home page', async ({ page }) => {
  // Log in first
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_TEST_EMAIL!)
  await page.getByLabel(/password/i).fill(process.env.PLAYWRIGHT_TEST_PASSWORD!)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })

  // Log out
  await page.getByRole('button', { name: /sign out|log out/i }).click()
  await expect(page).toHaveURL(/login|^\/$/, { timeout: 8_000 })
})
