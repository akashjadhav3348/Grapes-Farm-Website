import { test, expect } from '@playwright/test';

test('shared dashboard shell opens every separated page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Browser-test-only-2026');
  await page.getByRole('button', { name: 'Sign in securely' }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await page.locator('.dashboard-topbar').evaluate((element) => element.getBoundingClientRect().height)).toBe(44);
  expect(await page.locator('.dashboard-search').evaluate((element) => element.getBoundingClientRect().height)).toBe(32);

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
    const pageIcon = page.locator('.dashboard-page-icon');
    await expect(pageIcon).toBeVisible();
    const iconColor = await pageIcon.evaluate((element) => getComputedStyle(element).color);
    expect(iconColor).not.toBe('rgb(255, 255, 255)');
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
  expect(await page.locator('.dashboard-topbar').evaluate((element) => element.getBoundingClientRect().height)).toBe(44);
  expect(await page.locator('.dashboard-search').evaluate((element) => element.getBoundingClientRect().height)).toBe(32);
  await page.getByRole('button', { name: 'My profile', exact: true }).click();
  await expect(page.locator('.profile-form')).toBeVisible();
  await page.getByLabel('Display name').fill('Dashboard test profile');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.locator('.swal2-container.swal2-top-end')).toContainText('Profile updated');
  await expect(page.locator('.swal2-container.swal2-top-end')).toContainText('Saved at');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.locator('.dashboard-topbar').evaluate((element) => element.getBoundingClientRect().height)).toBe(44);
  expect(await page.locator('.dashboard-search').evaluate((element) => element.getBoundingClientRect().height)).toBe(32);
  await expect(page.locator('.mobile-menu-button')).toBeVisible();
  await page.getByRole('button', { name: 'Sections', exact: true }).click();
  await expect(page.locator('.admin-sidebar')).toHaveAttribute('data-open', 'true');
  await page.locator('.sidebar-close').click();
  await expect(page.locator('.admin-sidebar')).toHaveAttribute('data-open', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator('.dashboard-search').evaluate((element) => element.getBoundingClientRect().height)).toBe(36);
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

test('homepage editor fields adapt to columns with a rounded save footer inside the form', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Browser-test-only-2026');
  await page.getByRole('button', { name: 'Sign in securely' }).click();
  await page.getByRole('navigation', { name: 'Editor sections' })
    .getByRole('button', { name: 'Homepage', exact: true }).click();

  const form = page.locator('.homepage-editor-form');
  const savePanel = form.locator('.editor-save-panel');
  await expect(form).toBeVisible();
  await expect(savePanel).toHaveCount(1);
  await expect(savePanel.getByRole('button', { name: 'Save in browser' })).toBeVisible();
  await expect(savePanel.getByRole('button', { name: 'Download JSON' })).toBeVisible();
  expect(await savePanel.evaluate((element) => element.getBoundingClientRect().top))
    .toBeGreaterThan(await form.locator('input:not([type="file"])').last()
      .evaluate((element) => element.getBoundingClientRect().bottom));
  expect(await savePanel.locator('.editor-save-primary').evaluate((element) => getComputedStyle(element).borderRadius))
    .toBe('9999px');

  await savePanel.getByRole('button', { name: 'Save in browser' }).click();
  await expect(savePanel.locator('time')).toBeVisible();
  const savedAt = await savePanel.locator('time').getAttribute('datetime');
  expect(savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  await expect(page.locator('.swal2-container.swal2-top-end')).toContainText('Saved at');
  await page.reload();
  await expect(page.locator('.editor-save-panel time')).toHaveAttribute('datetime', savedAt);

  for (const [width, columns] of [[1440, 3], [768, 2], [390, 1]]) {
    await page.setViewportSize({ width, height: 900 });
    const columnCount = await form.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(columnCount).toBe(columns);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true, `Horizontal overflow at ${width}px`);
  }
});
