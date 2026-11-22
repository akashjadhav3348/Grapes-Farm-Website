import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`overview charts, calendar and directory at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/login');
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Browser-test-only-2026');
    await page.getByRole('button', { name: 'Sign in securely' }).click();
    const overview = page.getByRole('region', { name: 'Family analytics overview' });
    await expect(overview).toBeVisible();
    await expect(overview.getByRole('heading', { name: 'Generations at a glance' })).toBeVisible();
    const month = overview.locator('.fa-month strong');
    const originalMonth = await month.textContent();
    await overview.getByRole('button', { name: 'Next month', exact: true }).click();
    await expect(month).not.toHaveText(originalMonth);
    await overview.getByRole('button', { name: 'Previous month', exact: true }).click();
    await expect(month).toHaveText(originalMonth);
    await overview.getByRole('button', { name: 'Today', exact: true }).click();
    await expect(overview.locator('.fa-days button[aria-pressed=true]')).toHaveCount(1);
    const firstName = await overview.locator('tbody tr .fa-member strong').first().textContent();
    await overview.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(overview.locator('.fa-pagination')).toContainText('Page 2');
    await overview.getByLabel('Search members', { exact: true }).fill('no-member-matches-123');
    await expect(overview.locator('tbody')).toContainText('No members match');
    await overview.getByLabel('Search members', { exact: true }).fill(firstName);
    await expect(overview.locator('tbody')).toContainText(firstName);
    await overview.getByLabel('Sort members').selectOption('generation');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/overview-${width}.png`, fullPage: true });
    await overview.getByRole('button', { name: `View profile of ${firstName}`, exact: true }).first().click();
    await expect(page).toHaveURL(/\/admin\/members\?member=/);
  });
}
