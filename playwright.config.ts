import { defineConfig, devices } from '@playwright/test';

const API = 'http://localhost:3001';
const APP = 'http://localhost:5173';
const PREVIEW = 'http://localhost:4173';

export default defineConfig({
  testDir: 'e2e',
  // One database behind every spec, so specs must not race each other.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: APP,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/touch.spec.ts', '**/pwa.spec.ts'],
    },
    {
      // Safari's engine on an iPhone profile: the closest thing to the real
      // delivery risk that runs in CI.
      name: 'webkit-iphone',
      use: { ...devices['iPhone 13'] },
      testMatch: '**/touch.spec.ts',
    },
    {
      // Service workers only exist in the production build.
      name: 'pwa',
      use: { ...devices['Desktop Chrome'], baseURL: PREVIEW },
      testMatch: '**/pwa.spec.ts',
    },
  ],
  webServer: [
    {
      command: 'npm run dev:api',
      // 401 counts as up: the adapter answers, it just refuses anonymous callers.
      url: `${API}/api/boards`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      url: APP,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: `${PREVIEW}/manifest.webmanifest`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
