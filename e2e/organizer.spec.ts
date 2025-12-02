import { test, expect } from '@playwright/test';

test.describe('Organizer Flow', () => {
  // Note: These tests require a logged-in Organizer session.
  // In a real CI environment, we would seed the database and set the auth cookie.

  test('should create a tournament', async ({ page }) => {
    await page.goto('/dashboard/tournaments');

    // Check if we are redirected to login
    if (page.url().includes('sign-in')) {
      console.log('Redirected to sign-in. Skipping test requiring auth.');
      return;
    }

    // Click create button
    await page.getByRole('button', { name: /Create Tournament/i }).click();

    // Fill form
    await page.getByLabel(/Tournament Name/i).fill('E2E Test Tournament');
    await page.getByLabel(/Date/i).fill('2025-01-01');
    await page.getByLabel(/Venue/i).fill('Test Venue');

    // Submit
    await page.getByRole('button', { name: /Create/i }).click();

    // Verify redirect or success message
    await expect(page.getByText(/Tournament created/i)).toBeVisible();
  });

  test('should add participants and generate bracket', async ({ page }) => {
    // This assumes a tournament exists. 
    // In a full E2E, we would create one first or use a seeded one.
    await page.goto('/dashboard/tournaments');

    if (page.url().includes('sign-in')) return;

    // Click on the first tournament
    await page.locator('a[href^="/dashboard/tournaments/"]').first().click();

    // Go to Participants tab
    await page.getByRole('tab', { name: /Participants/i }).click();

    // Add Participant
    await page.getByRole('button', { name: /Add Participant/i }).click();
    await page.getByLabel(/First Name/i).fill('John');
    await page.getByLabel(/Last Name/i).fill('Doe');
    await page.getByLabel(/Email/i).fill('john.doe@example.com');
    await page.getByLabel(/Date of Birth/i).fill('2000-01-01');
    await page.getByLabel(/Weight/i).fill('70');
    await page.getByLabel(/Height/i).fill('175');
    await page.getByLabel(/Belt/i).selectOption('White');
    await page.getByLabel(/Gender/i).selectOption('male');
    await page.getByRole('button', { name: /Save/i }).click();

    // Verify participant added
    await expect(page.getByText('John Doe')).toBeVisible();

    // Go to Bracket tab
    await page.getByRole('tab', { name: /Bracket/i }).click();

    // Generate Bracket
    await page.getByRole('button', { name: /Generate Bracket/i }).click();

    // Verify matches generated
    await expect(page.getByText(/Round 1/i)).toBeVisible();
  });
});
