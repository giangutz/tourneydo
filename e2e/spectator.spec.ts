import { test, expect } from '@playwright/test';

test.describe('Spectator Flow', () => {
  test('should view public tournament list', async ({ page }) => {
    // Go to the public tournaments page
    await page.goto('/tournaments');

    // Check if the page title or header is visible
    await expect(page.getByRole('heading', { name: /Tournaments/i })).toBeVisible();

    // Check if the tournament list is present (or empty state)
    // We assume there might be an empty state or a list
    const list = page.getByTestId('tournament-list');
    const emptyState = page.getByText(/No tournaments found/i);

    // Either list or empty state should be visible
    await expect(list.or(emptyState)).toBeVisible();
  });

  test('should view tournament details', async ({ page }) => {
    // Navigate to a specific tournament if we knew the ID, 
    // but since we don't, we'll try to click the first one if it exists
    await page.goto('/tournaments');

    const firstTournament = page.locator('a[href^="/tournaments/"]').first();

    if (await firstTournament.isVisible()) {
      await firstTournament.click();

      // Verify we are on the details page
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Check for tabs (Overview, Bracket, etc.)
      await expect(page.getByRole('tab', { name: /Bracket/i })).toBeVisible();

      // Click Bracket tab
      await page.getByRole('tab', { name: /Bracket/i }).click();

      // Verify bracket view
      // It should show "Bracket has not been generated yet." OR round labels like "Finals", "Semi-Finals", "Round of X"
      await expect(
        page.getByText(/Round of|Quarter-Finals|Semi-Finals|Finals/i).first().or(
          page.getByText(/Bracket has not been generated yet/i)
        )
      ).toBeVisible();
    } else {
      console.log('No tournaments found to test details view');
    }
  });
});
