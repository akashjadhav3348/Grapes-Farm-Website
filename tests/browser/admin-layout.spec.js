import { test, expect } from '@playwright/test';

test('shared dashboard shell opens every separated page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Browser-test-only-2026');
  await page.getByRole('button', { name: 'Sign in securely' }).click();

  const pages = [
    ['Team directory', 'team'], ['Family tree', 'family-tree'], ['Members', 'members'],
    ['My profile', 'profile'], ['Settings', 'settings'], ['Tasks & calendar', 'tasks'],
    ['Notifications', 'notifications'], ['Netlify activity', 'activity'], ['मुख्यपृष्ठ', 'hero'],
    ['शेती', 'farm'], ['पिके', 'crops'], ['गॅलरी', 'gallery'], ['कुटुंब', 'family'], ['संपर्क', 'visit'],
  ];
  const navigation = page.getByRole('navigation', { name: 'Editor sections' });
  for (const [label, section] of pages) {
    await navigation.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('#dashboard')).toHaveAttribute('data-section', section);
    await expect(page.locator('#admin-title')).toBeVisible();
  }
  await expect(page.locator('.admin-sidebar')).toBeVisible();
  await expect(page.locator('.dashboard-topbar')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
