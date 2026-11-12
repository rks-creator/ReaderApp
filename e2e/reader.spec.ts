/**
 * Traceability:
 *   UC: UC-001, UC-003, UC-004, UC-006
 *   TCs: TC-005, TC-009, TC-017, TC-020, TC-021
 *
 * Voraussetzung: `BASE_PATH=/readerapp/ npm run build` (das Wörterbuch ist Ding oder das Test-Wörterbuch;
 * die geprüften Wörter sind in beiden enthalten).
 */
import { expect, test, type Page } from '@playwright/test';
import { makeEpub } from '../tests/fixtures/makeEpub.ts';

const ALICE = /^Alice's Adventures in Wonderland von Lewis Carroll öffnen/;

async function importAlice(page: Page): Promise<void> {
  const buffer = Buffer.from(await makeEpub());
  await page.getByTestId('epub-input').setInputFiles({ name: 'alice.epub', mimeType: 'application/epub+zip', buffer });
  await expect(page.getByRole('button', { name: ALICE })).toBeVisible();
}

/** UC-006: Der Service Worker übernimmt die Seite erst beim nächsten Laden – wie beim zweiten Öffnen auf dem iPad. */
async function waitForOfflineReady(page: Page): Promise<void> {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          let dictFiles = 0;
          for (const name of await caches.keys()) {
            const keys = await (await caches.open(name)).keys();
            dictFiles += keys.filter((request) => request.url.includes('/dict/')).length;
          }
          return dictFiles;
        }),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(2);
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
}

const chapterWord = (page: Page, word: string) =>
  page.getByTestId('chapter').locator('span.w', { hasText: new RegExp(`^${word}$`) }).first();

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
  await page.goto('./');
});

test('TC-021 – Manifest, Icons und Apple-Meta-Tags sind vorhanden', async ({ page, request }) => {
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifest = await (await request.get(manifestHref!)).json();
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/readerapp/', scope: '/readerapp/' });
  for (const icon of manifest.icons as { src: string }[]) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect((await request.get(touchIcon!)).ok()).toBe(true);
});

test('TC-005 / TC-017 – Buch importieren, Wort antippen, Übersetzung sehen', async ({ page }) => {
  await expect(page.getByText(/Noch keine Bücher/)).toBeVisible();
  await importAlice(page);
  await page.getByRole('button', { name: ALICE }).click();

  const word = chapterWord(page, 'tired');
  await expect(word).toBeVisible();
  const started = Date.now();
  await word.tap();
  const popup = page.getByRole('dialog', { name: 'Übersetzung' });
  await expect(popup).toContainText('müde');
  expect(Date.now() - started).toBeLessThan(1500); // inkl. Playwright-Overhead; Ziel im Gerät: < 300 ms

  await chapterWord(page, 'went').tap();
  await expect(popup).toContainText('went → go');
  await expect(popup).toContainText('gehen');
});

test('TC-009 – Weiterlesen an der zuletzt gelesenen Stelle', async ({ page }) => {
  await importAlice(page);
  await page.getByRole('button', { name: ALICE }).click();
  const scroller = page.getByTestId('reader-scroll');
  await expect(chapterWord(page, 'tired')).toBeVisible();
  await scroller.evaluate((element) => {
    element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
    element.dispatchEvent(new Event('scroll'));
  });
  await page.getByRole('button', { name: 'Zurück zur Bibliothek' }).click();
  await expect(page.getByRole('button', { name: ALICE })).toHaveAccessibleName(/[1-9]\d? % gelesen/);

  await page.reload();
  await page.getByRole('button', { name: ALICE }).click();
  await expect(chapterWord(page, 'tired')).toBeAttached();
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop / (element.scrollHeight - element.clientHeight)))
    .toBeGreaterThan(0.4);
});

test('TC-020 – Start ohne Internet zeigt Bibliothek und übersetzt', async ({ page, context }) => {
  await importAlice(page);
  await waitForOfflineReady(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: ALICE })).toBeVisible();
  await page.getByRole('button', { name: ALICE }).click();
  await chapterWord(page, 'house').tap();
  await expect(page.getByRole('dialog', { name: 'Übersetzung' })).toContainText('Haus');
  await context.setOffline(false);
});
