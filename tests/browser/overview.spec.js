import { test, expect } from '@playwright/test';
import { seedFamily } from '../../netlify/functions/family-store.mjs';

for (const width of [390, 768, 1366]) {
  test(`overview dashboard and family insights at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : width === 768 ? 1024 : 844 });
    await page.goto('/login');
    // Keep the chart fixture independent of members created by the CRUD suite.
    await page.route('**/api/admin/family', route => route.request().method() === 'GET'
      ? route.fulfill({ json: seedFamily() }) : route.continue());
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Browser-test-only-2026');
    await page.getByRole('button', { name: 'Sign in securely' }).click();

    await expect(page.getByRole('heading', { name: /Welcome back,/ })).toBeVisible();
    await expect(page.locator('.overview-kpi')).toHaveCount(6);
    await expect(page.locator('.overview-kpi-wave path')).toHaveCount(6);
    await expect(page.getByRole('heading', { name: 'Land distribution' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Media by collection' })).toHaveCount(0);
    const kpiColors = await page.locator('.overview-kpi').evaluateAll((cards) =>
      cards.map((card) => getComputedStyle(card).getPropertyValue('--kpi-accent').trim()),
    );
    expect(new Set(kpiColors).size).toBe(6);
    await expect(page.locator('.dashboard-overview-rail')).toBeVisible();
    if (width >= 768) {
      const navbarHeight = await page.locator('.dashboard-topbar').evaluate((element) => element.getBoundingClientRect().height);
      expect(navbarHeight).toBeLessThanOrEqual(50);
    }
    await page.screenshot({ path: `test-results/dashboard-top-${width}.png` });
    if (width >= 1024) {
      await page.getByRole('button', { name: 'Collapse sidebar' }).click();
      await expect(page.locator('.admin-shell')).toHaveAttribute('data-sidebar-collapsed', 'true');
      await page.getByRole('button', { name: 'Expand sidebar' }).click();
    }

    await expect(page.getByRole('heading', { name: 'Farm & Crop Overview' })).toBeVisible();
    const overview = page.getByRole('region', { name: 'Family analytics overview' });
    await expect(overview.getByRole('heading', { name: 'Generations at a glance' })).toBeVisible();
    await expect(overview.getByRole('heading', { name: 'Family composition' })).toBeVisible();
    await expect(overview.getByRole('heading', { name: 'Family calendar' })).toBeVisible();
    await expect(overview.locator('.fa-growth .fa-pill')).toHaveText('20 people');
    await expect(overview.locator('.fa-area-chart')).toHaveAttribute(
      'aria-label',
      'Members by generation: Generation 1: 2, Generation 2: 6, Generation 3: 9, Generation 4: 3',
    );
    await expect(overview.locator('.fa-donut')).toHaveAttribute('aria-label', '10 male, 10 female, 0 unspecified');
    await expect(overview.locator('.fa-donut strong')).toHaveText('20');
    const month = overview.locator('.fa-month strong');
    const originalMonth = await month.textContent();
    await overview.getByRole('button', { name: 'Next month', exact: true }).click();
    await expect(month).not.toHaveText(originalMonth);
    await overview.getByRole('button', { name: 'Previous month', exact: true }).click();
    await expect(month).toHaveText(originalMonth);
    await overview.getByRole('button', { name: 'Today', exact: true }).click();
    await expect(overview.locator('.fa-days button[aria-pressed=true]')).toHaveCount(1);
    const directory = overview.locator('.fa-directory');
    await expect(directory).toBeVisible();
    await expect(directory.getByRole('heading', { name: 'Member directory' })).toBeVisible();
    await expect(directory.getByRole('button', { name: 'Manage members' })).toBeVisible();
    await expect(directory.getByLabel('Search members', { exact: true })).toBeVisible();
    await expect(directory.getByLabel('Sort members')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Activities' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
    const firstName = await directory.locator('tbody tr .fa-member strong').first().textContent();
    await directory.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(directory.locator('.fa-pagination')).toContainText('Page 2');
    await directory.getByLabel('Search members', { exact: true }).fill('no-member-matches-123');
    await expect(directory.locator('tbody')).toContainText('No members match');
    await directory.getByLabel('Search members', { exact: true }).fill(firstName);
    await expect(directory.locator('tbody')).toContainText(firstName);
    await directory.getByLabel('Sort members').selectOption('generation');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/family-insights-${width}.png`, fullPage: true });
    await directory.getByRole('button', { name: `View profile of ${firstName}`, exact: true }).first().click();
    await expect(page).toHaveURL(/\/admin\/members\?member=/);
  });
}
