import { defineConfig, devices } from '@playwright/test';

const BASE_PATH = '/readerapp/';
const PORT = 4173;
const OFFLINE = /TC-020/;
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
    { name: 'iPad hoch', use: { ...devices['iPad (gen 7)'], browserName }, grepInvert: OFFLINE },
    { name: 'iPad quer', use: { ...devices['iPad (gen 7) landscape'], browserName }, grepInvert: OFFLINE },
    // Playwrights WebKit bricht beim Neuladen im Offline-Modus mit Service Worker ab („internal error“).
    // Der Offline-Test läuft deshalb mit Chromium im iPad-Profil; auf dem echten iPad: Checkliste im Skill ipad-pwa-check.
    { name: 'iPad offline', use: { ...devices['iPad (gen 7)'], browserName: 'chromium' }, grep: OFFLINE },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    env: { BASE_PATH },
  },
});
