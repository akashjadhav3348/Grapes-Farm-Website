import { test, expect } from '@playwright/test';

test('shared dashboard shell opens every separated page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Browser-test-only-2026');
  await page.getByRole('button', { name: 'Sign in securely' }).click();

  const pages = [
    ['Team directory', 'team'], ['Family tree', 'family-tree'], ['Members', 'members'],
    ['My profile', 'profile'], ['Settings', 'settings'], ['Tasks & calendar', 'tasks'],
    ['Notifications', 'notifications'], ['Netlify activity', 'activity'], ['Homepage', 'hero'],
    ['Farm', 'farm'], ['Crops', 'crops'], ['Gallery', 'gallery'], ['Family', 'family'], ['Contact', 'visit'],
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

test('dashboard controls adapt across desktop and mobile and profile form fits the viewport', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Browser-test-only-2026');
  await page.getByRole('button', { name: 'Sign in securely' }).click();
  await expect(page.locator('#dashboard')).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('.mobile-menu-button')).toBeHidden();
  await expect(page.locator('.sidebar-close')).toBeHidden();
  await page.getByRole('button', { name: 'My profile', exact: true }).click();
  await expect(page.locator('.profile-form')).toBeVisible();
  await page.getByLabel('Display name').fill('Dashboard test profile');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.locator('.swal2-container.swal2-top-end')).toContainText('Profile updated');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator('.mobile-menu-button')).toBeVisible();
  await page.getByRole('button', { name: 'Sections', exact: true }).click();
  await expect(page.locator('.admin-sidebar')).toHaveAttribute('data-open', 'true');
  await page.locator('.sidebar-close').click();
  await expect(page.locator('.admin-sidebar')).toHaveAttribute('data-open', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.mobile-menu-button')).toBeVisible();
  await page.getByRole('button', { name: 'Sections', exact: true }).click();
  await expect(page.locator('.admin-sidebar')).toHaveAttribute('data-open', 'true');
  await page.locator('.sidebar-close').click();
  await expect(page.locator('.admin-sidebar')).toHaveAttribute('data-open', 'false');
  await page.getByRole('button', { name: 'Sections', exact: true }).click();
  await page.getByRole('button', { name: 'My profile', exact: true }).click();
  await expect(page.locator('.profile-form')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const themeToggle = page.getByRole('button', { name: /Switch to dark theme|Switch to light theme/ });
  const previous = await themeToggle.getAttribute('aria-pressed');
  await themeToggle.click();
  await expect(themeToggle).toHaveAttribute('aria-pressed', previous === 'true' ? 'false' : 'true');
});
