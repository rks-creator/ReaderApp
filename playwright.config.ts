import { defineConfig, devices } from '@playwright/test';

const BASE_PATH = '/readerapp/';
const PORT = 4173;
// Auf dem iPad läuft WebKit; lokal ohne WebKit kann PW_BROWSER=chromium gesetzt werden.
const browserName = (process.env.PW_BROWSER ?? 'webkit') as 'webkit' | 'chromium';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'off',
    serviceWorkers: 'allow',
  },
  projects: [
    { name: 'iPad hoch', use: { ...devices['iPad (gen 7)'], browserName } },
    { name: 'iPad quer', use: { ...devices['iPad (gen 7) landscape'], browserName } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    env: { BASE_PATH },
  },
});
