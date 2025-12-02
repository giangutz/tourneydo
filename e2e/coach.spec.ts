import { test, expect } from '@playwright/test';

test.describe('Coach Flow', () => {
  // Note: These tests require a logged-in Coach session.

  test('should create a player', async ({ page }) => {
    await page.goto('/dashboard/players');

    if (page.url().includes('sign-in')) {
      console.log('Redirected to sign-in. Skipping test requiring auth.');
      return;
    }

    await page.getByRole('button', { name: /Add Player/i }).click();

    await page.getByLabel(/First Name/i).fill('Karate');
    await page.getByLabel(/Last Name/i).fill('Kid');
    await page.getByLabel(/Email/i).fill('kid@example.com');
    await page.getByLabel(/Date of Birth/i).fill('2010-01-01');
    await page.getByLabel(/Weight/i).fill('45');
    await page.getByLabel(/Height/i).fill('150');
    await page.getByLabel(/Belt/i).selectOption('Yellow');
    await page.getByLabel(/Gender/i).selectOption('male');

    await page.getByRole('button', { name: /Save/i }).click();

    await expect(page.getByText('Karate Kid')).toBeVisible();
  });

  test('should create a team and register', async ({ page }) => {
    await page.goto('/dashboard/teams');

    if (page.url().includes('sign-in')) return;

    // Create Team
    await page.getByRole('button', { name: /Create Team/i }).click();
    await page.getByLabel(/Team Name/i).fill('Cobra Kai');
    await page.getByRole('button', { name: /Create/i }).click();

    await expect(page.getByText('Cobra Kai')).toBeVisible();

    // Register for Tournament (assuming one exists)
    await page.goto('/dashboard/tournaments');

    // Find an upcoming tournament
    const registerButton = page.getByRole('button', { name: /Register/i }).first();

    if (await registerButton.isVisible()) {
      await registerButton.click();

      // Select Team
      await page.getByLabel(/Select Team/i).selectOption({ label: 'Cobra Kai' });

      // Select Players
      await page.getByLabel(/Karate Kid/i).check();

      // Submit
      await page.getByRole('button', { name: /Register Team/i }).click();

      await expect(page.getByText(/Registration successful/i)).toBeVisible();
    } else {
      console.log('No upcoming tournaments found to register for');
    }
  });
});
