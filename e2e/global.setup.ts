/**
 * Global Clerk setup for real-browser E2E.
 *
 * Fetches a Clerk "Testing Token" once per run so Clerk's bot/anti-automation
 * protection is bypassed for our test sign-ins (this is the supported way — it
 * does NOT disable security for real users). Requires Clerk keys in the env
 * (loaded from .env.local / .env.e2e by playwright.config.ts):
 *
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
 *   CLERK_SECRET_KEY
 *
 * Docs: https://clerk.com/docs/testing/playwright/overview
 */
import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'

setup('clerk testing token', async () => {
  await clerkSetup({
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  })
})
