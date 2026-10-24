import { test, expect } from '@playwright/test';
for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`slow login survives old 25-second timeout at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(65000);
    await page.setViewportSize(viewport);
    let submissions = 0;
    await page.route('**/api/auth/login', async (route) => {
      submissions++;
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 27000));
      await route.fulfill({ response });
    });
    await page.goto('/login');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('button', { name: /Signing in/ })).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('may be waking up', { timeout: 15000 });
    await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 45000 });
    expect(submissions).toBe(1);
    await expect(page.getByText('timeout of 25000ms exceeded')).toHaveCount(0);
  });
}
