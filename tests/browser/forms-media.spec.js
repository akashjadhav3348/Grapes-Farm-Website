import { test, expect } from '@playwright/test';
import path from 'node:path';

async function signIn(page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByLabel('Password', {exact:true}).fill('Browser-test-only-2026');
  await page.getByRole('button',{name:'Sign in securely'}).click();
  await expect(page.locator('#dashboard')).toBeVisible();
}

async function saveAndWait(page) {
  await page.locator('.editor-save-panel').getByRole('button',{name:'Save in browser',exact:true}).click();
  const toast = page.locator('.swal2-toast');
  await expect(toast).toBeVisible();
  await expect(page.locator('.dashboard-swal-layer')).toHaveJSProperty('popover','manual');
  expect(await page.locator('.dashboard-swal-layer').evaluate(element =>
    getComputedStyle(element,'::before').backdropFilter)).toContain('blur');
  await expect(page.locator('#root')).toHaveJSProperty('inert',true);
  await expect(toast).toBeHidden({timeout:5000});
  await expect(page.locator('#root')).toHaveJSProperty('inert',false);
}

test('required editor fields, crop without image and timed blurred toast',async({page})=>{
  await signIn(page);
  await page.goto('/admin/hero');
  const title = page.getByLabel('Main title',{exact:true});
  const original = await title.inputValue();
  await title.fill('');
  await page.locator('.editor-save-panel').getByRole('button',{name:'Save in browser',exact:true}).click();
  await expect(page.locator('.swal2-toast')).toContainText('Unable to save changes');
  await expect(page.locator('.swal2-toast')).toBeHidden({timeout:5000});
  await title.fill(original);
  await saveAndWait(page);
  await page.goto('/admin/crops');
  await expect(page.locator('.admin-page-content input[type=file]:not(.sr-only)')).toHaveCount(0);
  const crop = page.locator('#create-crop');
  await crop.getByRole('button',{name:'Add crop to draft'}).click();
  await expect(crop.getByRole('alert')).toContainText('Enter a crop name');
  await crop.getByLabel('Crop name *',{exact:true}).fill('Local test crop');
  await crop.getByRole('button',{name:'Add crop to draft'}).click();
  await saveAndWait(page);
  await page.reload();
  await expect(page.getByLabel('Crop name',{exact:true}).last()).toHaveValue('Local test crop');
});

test('gallery accepts a video, persists it and renders preview after reload',async({page})=>{
  await signIn(page);
  await page.goto('/admin/gallery');
  await page.locator('#gallery-upload input').setInputFiles(path.resolve('public/assets/farm/12.mp4'));
  const preview = page.locator('.admin-page-content video');
  await expect(preview.last()).toHaveAttribute('src',/^data:video\/mp4;base64,/);
  await saveAndWait(page);
  await page.reload();
  await expect(preview.last()).toHaveAttribute('src',/^data:video\/mp4;base64,/);
});

test('SweetAlert confirmation cancels or deletes a stored task',async({page})=>{
  await signIn(page);
  await page.goto('/admin/tasks');
  const form = page.locator('.task-form');
  await form.getByLabel('Task',{exact:true}).fill('Confirmation task');
  await form.getByLabel('Due date',{exact:true}).fill('2099-02-01');
  await form.getByRole('button',{name:'Add task',exact:true}).click();
  await expect(page.locator('.swal2-toast')).toBeHidden({timeout:5000});
  const row = page.locator('tbody tr').filter({hasText:'Confirmation task'});
  await row.getByRole('button',{name:'Delete',exact:true}).click();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(row).toBeVisible();
  await row.getByRole('button',{name:'Delete',exact:true}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(row).toHaveCount(0);
  await expect(page.locator('.swal2-toast')).toBeHidden({timeout:5000});
  await expect(page.locator('#root')).toHaveJSProperty('inert',false);
  await page.reload();
  await expect(page.locator('tbody')).not.toContainText('Confirmation task');
});
