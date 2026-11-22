import {test,expect} from '@playwright/test';
import {seedFamily} from '../../netlify/functions/family-store.mjs';

test('device family restores and persists with admin APIs unavailable',async({page})=>{
  await page.route('**/api/admin/**',route=>route.abort());
  await page.goto('/login');
  await page.getByRole('button',{name:'Open device workspace'}).click();
  await page.goto('/admin/settings');
  const family=seedFamily();
  family.members[0].name='Device migration test';
  await page.getByLabel('Preview family backup').setInputFiles({
    name:'family.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({format:'aishwary-family-v1',family})),
  });
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Restore family on this device'}).click();
  await expect(page.getByRole('status').filter({hasText:'Family restored on this device.'})).toBeVisible();
  await page.goto('/admin/family-tree');
  await page.reload();
  await page.getByLabel('Search family').fill('Device migration test');
  await expect(page.locator('.family-search-results')).toContainText('Device migration test');
});
