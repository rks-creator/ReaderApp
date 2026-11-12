/**
 * Traceability:
 *   UC: UC-007 (Textstelle übersetzen)
 *   TCs: TC-028
 *
 * Braucht das echte Modell unter public/mt/ (npm run build:mt) und einen Build mit BASE_PATH=/readerapp/.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeEpub } from '../tests/fixtures/makeEpub.ts';

const ALICE = /^Alice's Adventures in Wonderland von Lewis Carroll öffnen/;

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element nicht sichtbar');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Lange drücken und bis zum zweiten Wort ziehen (Mauszeiger erzeugt dieselben Pointer-Ereignisse). */
async function select(page: Page, from: Locator, to: Locator): Promise<void> {
  const start = await centerOf(from);
  const end = await centerOf(to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
}

const word = (page: Page, text: string) =>
  page.getByTestId('chapter').locator('span.w', { hasText: new RegExp(`^${text}$`) }).first();

async function openAlice(page: Page): Promise<void> {
  await page.goto('./');
  await page.getByTestId('epub-input').setInputFiles({
    name: 'alice.epub',
    mimeType: 'application/epub+zip',
    buffer: Buffer.from(await makeEpub()),
  });
  await page.getByRole('button', { name: ALICE }).click();
}

async function expectGermanSentence(page: Page): Promise<void> {
  const popup = page.getByRole('dialog', { name: 'Übersetzung der Textstelle' });
  await expect(popup).toContainText('Alice was beginning to get very tired of sitting by her sister');
  const sentence = popup.locator('.popup__sentence');
  await expect(sentence).toBeVisible({ timeout: 90_000 });
  await expect(sentence).toContainText('Alice');
  await expect(sentence).toContainText(/müde/i);
}

test('TC-028 – markierter Satz wird maschinell übersetzt', async ({ page }) => {
  test.setTimeout(120_000);
  await openAlice(page);
  await select(page, word(page, 'Alice'), word(page, 'sister'));
  await expectGermanSentence(page);
});

test('TC-028 – nach dem ersten Laden funktioniert die Satzübersetzung offline', async ({ page, context }) => {
  test.setTimeout(120_000);
  await openAlice(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await page.getByRole('button', { name: ALICE }).click();
  await select(page, word(page, 'Alice'), word(page, 'sister'));
  await expectGermanSentence(page);

  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: ALICE }).click();
  await select(page, word(page, 'Alice'), word(page, 'sister'));
  await expectGermanSentence(page);
  await context.setOffline(false);
});
