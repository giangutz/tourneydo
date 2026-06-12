import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'
import { ORGANIZER_STORAGE_STATE } from './e2e/constants'

/**
 * Playwright config for TourneyDo real-browser E2E.
 *
 * Auth model: Clerk blocks automated sign-in (bot protection), so we use the
 * official @clerk/testing helpers. Two setup projects run first —
 *   1. "clerk setup"      → fetches a Testing Token (global.setup.ts)
 *   2. "organizer auth"   → signs in a test organizer, saves storage state
 * — and the authenticated specs reuse that state. The whole authenticated lane
 * only activates when organizer credentials are present, so the public lane
 * still runs with zero setup.
 *
 * See e2e/README.md for the one-time setup (install + env + test account).
 */

// Load local env, then allow .env.e2e to override with test-only values.
dotenv.config({ path: path.resolve(__dirname, '.env.local') })
dotenv.config({ path: path.resolve(__dirname, '.env.e2e'), override: true })

const hasOrganizerCreds = Boolean(
  process.env.E2E_CLERK_ORGANIZER_EMAIL && process.env.E2E_CLERK_ORGANIZER_PASSWORD
)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // ── Public lane (no auth) — always runs ────────────────────────────────────
    {
      name: 'public',
      testMatch: /spectator\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Authenticated organizer lane — only when credentials are configured ─────
    ...(hasOrganizerCreds
      ? [
          {
            name: 'clerk setup',
            testMatch: /global\.setup\.ts/,
          },
          {
            name: 'organizer auth',
            testMatch: /auth\.setup\.ts/,
            dependencies: ['clerk setup'],
          },
          {
            name: 'organizer',
            testMatch: /organizer-lifecycle\.spec\.ts/,
            use: {
              ...devices['Desktop Chrome'],
              storageState: ORGANIZER_STORAGE_STATE,
            },
            dependencies: ['organizer auth'],
          },
        ]
      : []),
  ],

  // Boot the app for the duration of the run (reuses an already-running dev server).
  webServer: {
    command: 'npm run dev',
    url: process.env.BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
