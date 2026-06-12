/**
 * Authenticate as a tournament organizer and persist the session.
 *
 * Uses Clerk's client-side test helper (`clerk.signIn`) rather than driving the
 * hosted sign-in UI — that avoids brittle selectors AND the captcha/bot checks
 * that block automated sign-in (the exact blocker that made the old e2e specs
 * silently skip). The resulting storage state is reused by the organizer specs.
 *
 * Prerequisites (see e2e/README.md):
 *   1. npm i -D @clerk/testing
 *   2. A real Clerk test user with the `tournament-organizer` role + completed
 *      onboarding, whose credentials are in E2E_CLERK_ORGANIZER_EMAIL/PASSWORD.
 */
import { test as setup, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { ORGANIZER_STORAGE_STATE } from './constants'

export { ORGANIZER_STORAGE_STATE }

const email = process.env.E2E_CLERK_ORGANIZER_EMAIL
const password = process.env.E2E_CLERK_ORGANIZER_PASSWORD

setup('authenticate as tournament organizer', async ({ page }) => {
  setup.skip(
    !email || !password,
    'Set E2E_CLERK_ORGANIZER_EMAIL and E2E_CLERK_ORGANIZER_PASSWORD to run real-browser E2E.'
  )

  await setupClerkTestingToken({ page })

  // Load the app first so the Clerk client is available on the page.
  await page.goto('/sign-in')
  await clerk.signIn({
    page,
    signInParams: { strategy: 'password', identifier: email!, password: password! },
  })

  // Confirm the session resolves to the organizer dashboard (proves role + onboarding).
  await page.goto('/dashboard/tournament-organizer')
  await expect(page).toHaveURL(/tournament-organizer/)

  await page.context().storageState({ path: ORGANIZER_STORAGE_STATE })
})
