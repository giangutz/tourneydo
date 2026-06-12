/**
 * Tournament lifecycle — real-browser E2E (authenticated organizer).
 *
 * Runs against the live app using a pre-authenticated Clerk session (see
 * auth.setup.ts). This is the browser counterpart to
 * __tests__/integration/tournament-lifecycle.test.ts and specifically
 * reproduces the field bugs that prompted this suite:
 *
 *   • the create wizard must NOT create a tournament until the organizer
 *     explicitly clicks "Create Tournament" on the final step;
 *   • adding a participant from the Participants page must actually work.
 *
 * Selectors track the real components (TournamentCreateWizard, PlayerFormDialog,
 * AddParticipantDialog). If the markup changes, adjust here — the deterministic
 * guarantees live in the Jest integration test; this proves the wiring in a
 * real browser end to end.
 */
import { test, expect, type Page } from '@playwright/test'

const NEW_TOURNAMENT = '/dashboard/tournament-organizer/tournaments/new'
const TOURNAMENT_DETAIL = /\/dashboard\/tournament-organizer\/tournaments\/[0-9a-fA-F-]{16,}$/

// Future, internally-consistent dates (matches the schema's cross-field rules).
const DATES = {
  start: '2026-09-01',
  end: '2026-09-02',
  weighInStart: '2026-08-30',
  weighInEnd: '2026-08-31',
  registrationDeadline: '2026-08-20',
}

/** Fill steps 1–2 and stop on step 3 (Competition Rules) without submitting. */
async function fillWizardToFinalStep(page: Page, name: string): Promise<void> {
  await page.goto(NEW_TOURNAMENT)

  // Step 1 — Basic Info
  await page.getByLabel('Tournament Name').fill(name)
  await page.getByLabel('Start Date').fill(DATES.start)
  await page.getByLabel('End Date').fill(DATES.end)
  await page.getByLabel('Weigh-In Start').fill(DATES.weighInStart)
  await page.getByLabel('Weigh-In End').fill(DATES.weighInEnd)
  await page.getByRole('button', { name: 'Next' }).click()

  // Step 2 — Logistics
  await page.getByLabel('Venue').fill('City Sports Complex')
  await page.getByLabel('Registration Deadline').fill(DATES.registrationDeadline)
  await page.getByRole('button', { name: 'Next' }).click()

  // Step 3 — Competition Rules
  await expect(page.getByText('Gender Configuration')).toBeVisible()
}

/** Complete the wizard and return the new tournament's id (from the URL). */
async function createTournament(page: Page, name: string): Promise<string> {
  await fillWizardToFinalStep(page, name)
  await page.getByRole('button', { name: 'Create Tournament' }).click()
  await expect(page).toHaveURL(TOURNAMENT_DETAIL)
  const url = new URL(page.url())
  return url.pathname.split('/').pop()!
}

test.describe('Organizer · create wizard', () => {
  // The original bug: Radix RadioCard/Checkbox buttons defaulted to submit, so
  // toggling options on step 3 created the tournament before the organizer was done.
  test('does NOT create the tournament until "Create Tournament" is clicked', async ({ page }) => {
    await fillWizardToFinalStep(page, 'E2E Premature Submit Guard')

    // Interact with step-3 controls — none of these may trigger creation/navigation.
    await page.getByText('Male Only').click()
    await page.getByRole('checkbox', { name: 'Beginner' }).click()
    await page.getByRole('checkbox', { name: /Cadet/ }).click()

    // Still on the wizard — no redirect to a tournament detail page occurred.
    await expect(page).toHaveURL(/\/tournaments\/new$/)
    await expect(page.getByRole('button', { name: 'Create Tournament' })).toBeVisible()

    // Only the explicit action creates it.
    await page.getByRole('button', { name: 'Create Tournament' }).click()
    await expect(page).toHaveURL(TOURNAMENT_DETAIL)
  })

  test('creates a tournament from a complete wizard', async ({ page }) => {
    const id = await createTournament(page, 'E2E Lifecycle Open')
    expect(id).toBeTruthy()
  })
})

test.describe('Organizer · participants', () => {
  test('adds a new participant from the Participants page', async ({ page }) => {
    const id = await createTournament(page, 'E2E Participants Tournament')

    await page.goto(`/dashboard/tournament-organizer/tournaments/${id}/participants`)

    // Open the add flow → choose "Create New Player".
    await page.getByRole('button', { name: 'Add Participant' }).click()
    await page.getByRole('button', { name: 'Create New Player' }).click()

    // PlayerFormDialog
    await page.getByLabel('First Name').fill('Aaron')
    await page.getByLabel('Last Name').fill('Reyes')
    await page.getByLabel('Email').fill('aaron.reyes@example.com')
    await page.getByLabel('Date of Birth').fill('2000-01-01')

    await page.getByRole('combobox', { name: 'Gender' }).click()
    await page.getByRole('option', { name: 'Male' }).click()

    // Team is required; pick the first available team.
    await page.getByRole('combobox', { name: 'Team' }).click()
    await page.getByRole('option').first().click()

    await page.getByRole('combobox', { name: 'Belt Level' }).click()
    await page.getByRole('option', { name: 'Blue' }).click()

    await page.getByLabel('Weight (kg)').fill('70')

    // Submit (PlayerFormDialog submit button label for add mode).
    await page.getByRole('button', { name: 'Add Participant' }).click()

    // The new participant shows up in the list (and no error toast).
    await expect(page.getByText('Aaron Reyes')).toBeVisible()
    await expect(page.getByText(/Failed to add participant/i)).toHaveCount(0)
  })
})

test.describe('Organizer · bracket', () => {
  // Smoke check that the bracket workspace is reachable and exposes the control.
  // Full weigh-in → generation is asserted deterministically in the Jest
  // integration test (the UI weigh-in flow is long and covered there).
  test('exposes the Generate Bracket control', async ({ page }) => {
    const id = await createTournament(page, 'E2E Bracket Tournament')
    await page.goto(`/dashboard/tournament-organizer/tournaments/${id}/bracket`)
    await expect(page.getByRole('button', { name: /Generate Bracket/i })).toBeVisible()
  })
})
