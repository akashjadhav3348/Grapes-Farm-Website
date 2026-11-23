import { test, expect } from '@playwright/test';

test('reference dashboard actions open forms and task status persists', async ({page}) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByLabel('Password', {exact:true}).fill('Browser-test-only-2026');
  await page.getByRole('button', {name:'Sign in securely'}).click();
  const quick = page.locator('.overview-quick-actions');
  await quick.getByRole('button', {name:'Add Family Member'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', {name:'Cancel',exact:true}).click();
  await page.getByRole('navigation').getByRole('button',{name:'Overview',exact:true}).click();
  await quick.getByRole('button', {name:'Add Farm',exact:true}).click();
  await expect(page.getByLabel('Farm name *',{exact:true})).toBeVisible();
  await page.getByRole('navigation').getByRole('button',{name:'Overview',exact:true}).click();
  await quick.getByRole('button', {name:'Add Crop',exact:true}).click();
  await expect(page.locator('#create-crop input').first()).toBeFocused();
  await page.getByRole('navigation').getByRole('button',{name:'Overview',exact:true}).click();
  await quick.getByRole('button', {name:'Create Task',exact:true}).click();
  const form = page.locator('.task-form');
  await form.getByLabel('Task',{exact:true}).fill('Check irrigation');
  await form.getByLabel('Due date',{exact:true}).fill('2099-01-01');
  await form.getByRole('combobox',{name:'Status',exact:true}).selectOption('in-progress');
  await form.getByRole('button',{name:'Add task',exact:true}).click();
  await page.reload();
  await expect(page.locator('.admin-table')).toContainText('Check irrigation');
  await page.getByRole('navigation').getByRole('button',{name:'Overview',exact:true}).click();
  await expect(page.locator('.task-status-legend li').filter({hasText:'In progress'})).toContainText('1');
});
