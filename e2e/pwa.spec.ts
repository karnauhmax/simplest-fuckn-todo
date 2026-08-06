import { expect, test } from '@playwright/test';

// Runs against the production build served by `vite preview`; the dev server
// registers no service worker.
test('the built app is installable and registers a service worker', async ({ page, request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.status()).toBe(200);

  const parsed = (await manifest.json()) as {
    display: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };
  expect(parsed.display).toBe('standalone');
  expect(parsed.icons.map((icon) => icon.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(parsed.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

  for (const icon of parsed.icons) {
    expect((await request.get(icon.src)).status(), `${icon.src} is served`).toBe(200);
  }
  expect((await request.get('/apple-touch-icon.png')).status()).toBe(200);

  await page.goto('/');
  const registration = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return { scope: reg.scope, active: !!reg.active };
  });
  expect(registration.active).toBe(true);
  expect(registration.scope).toContain('/');
});

test('the service worker precaches the shell and never the API', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);

  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls: string[] = [];
    for (const name of names) {
      const keys = await caches.open(name).then((cache) => cache.keys());
      urls.push(...keys.map((request) => new URL(request.url).pathname));
    }
    return urls;
  });

  expect(cached.some((url) => url === '/index.html' || url === '/')).toBe(true);
  expect(cached.some((url) => url.endsWith('.css'))).toBe(true);
  expect(cached.filter((url) => url.startsWith('/api'))).toEqual([]);
});

test('a deep link still boots the app through the navigation fallback', async ({ page }) => {
  const response = await page.goto('/board/does-not-matter');

  expect(response?.status()).toBe(200);
  await expect(page.getByLabel('Secret')).toBeVisible();
});
