/**
 * E2E — AI Advisor UI (Pro user).
 *
 * Uses the Pro-tier session stored separately via PLAYWRIGHT_PRO_EMAIL /
 * PLAYWRIGHT_PRO_PASSWORD environment variables.
 *
 * These tests verify that the Advisor UI renders and accepts questions.
 * They do NOT assert specific AI response content (non-deterministic).
 */

import { test as base, expect } from '@playwright/test'
import path from 'path'

// Use the Pro user's stored auth state for all tests in this file.
const test = base.extend<object, { storageState: string }>({})
test.use({ storageState: path.join(__dirname, '.auth/pro-user.json') })

test('AI Advisor panel is visible on the dashboard for Pro users', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(
    page.getByText(/ai advisor|ask a question|compliance advisor/i).first(),
  ).toBeVisible({ timeout: 10_000 })
})

test('AI Advisor accepts a question and shows a loading state', async ({ page }) => {
  await page.goto('/dashboard')

  const questionInput = page.getByPlaceholder(/ask|question/i)
    .or(page.getByRole('textbox', { name: /question|ask/i }))
  await expect(questionInput.first()).toBeVisible({ timeout: 10_000 })

  await questionInput.first().fill('What is my compliance status?')
  await page.getByRole('button', { name: /ask|send|submit/i }).click()

  // A loading indicator or disabled button should appear
  await expect(
    page.getByText(/loading|thinking|generating/i)
      .or(page.getByRole('button', { name: /ask|send|submit/i, disabled: true })),
  ).toBeVisible({ timeout: 5_000 })
})

test('free user sees upgrade prompt instead of AI Advisor', async ({ page }) => {
  // Override with free-user session for this specific test
  await page.context().clearCookies()

  // Log in as free user
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.PLAYWRIGHT_TEST_EMAIL!)
  await page.getByLabel(/password/i).fill(process.env.PLAYWRIGHT_TEST_PASSWORD!)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })

  // AI Advisor input should NOT be visible — upgrade prompt should appear instead
  await expect(
    page.getByText(/upgrade|pro plan|unlock/i).first(),
  ).toBeVisible({ timeout: 8_000 })
})
