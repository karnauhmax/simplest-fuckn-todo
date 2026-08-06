import { expect, test } from '@playwright/test';
import { SECRET, SECRET_KEY } from './helpers.js';

test('a missing secret leaves the app locked and the API refusing', async ({ page, request }) => {
  await page.goto('/');

  await expect(page.getByLabel('Secret')).toBeVisible();
  await expect(page.getByLabel('Board', { exact: true })).toHaveCount(0);

  const anonymous = await request.get('/api/boards');
  expect(anonymous.status()).toBe(401);
});

test('a wrong secret is rejected and nothing is stored', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Secret').fill('not-the-secret');
  await page.getByRole('button', { name: 'Unlock' }).click();

  await expect(page.getByRole('alert')).toHaveText('Wrong secret.');
  await expect(page.getByLabel('Secret')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), SECRET_KEY)).toBeNull();
});

test('the correct secret unlocks, and the unlock survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Secret').fill(SECRET);
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByLabel('Board', { exact: true })).toBeVisible();

  await page.reload();

  await expect(page.getByLabel('Board', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Secret')).toHaveCount(0);
});

test('a secret the server no longer accepts locks the app again', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'stale-secret'), SECRET_KEY);
  await page.goto('/');

  await expect(page.getByLabel('Secret')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), SECRET_KEY)).toBeNull();
});
