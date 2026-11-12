/**
 * Traceability:
 *   UC: UC-001, UC-002, UC-003, UC-005
 *   TCs: TC-004, TC-008, TC-019
 */
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, LibraryStore, percentOf, type StoredBook } from './db';

let counter = 0;
const stores: LibraryStore[] = [];

async function freshStore(): Promise<LibraryStore> {
  const store = await LibraryStore.open(`test-${counter++}`);
  stores.push(store);
  return store;
}

afterEach(() => {
  stores.splice(0).forEach((store) => store.close());
});

const book = (overrides: Partial<StoredBook> = {}): StoredBook => ({
  id: 'b1',
  title: 'Moby Dick',
  author: 'Herman Melville',
  language: 'en',
  identifier: 'urn:moby',
  toc: [],
  chapterCount: 10,
  importedAt: 1,
  ...overrides,
});

describe('Bibliotheksspeicher', () => {
  it('TC-004 – findet Duplikate über die EPUB-Kennung, sonst über Titel und Autor', async () => {
    const store = await freshStore();
    await store.saveBook(book(), new ArrayBuffer(1));
    await store.saveBook(book({ id: 'b2', identifier: '', title: 'Ohne Kennung' }), new ArrayBuffer(1));
    expect((await store.findDuplicate('urn:moby', 'egal', 'egal'))?.id).toBe('b1');
    expect((await store.findDuplicate('', 'Ohne Kennung', 'Herman Melville'))?.id).toBe('b2');
    expect(await store.findDuplicate('urn:other', 'Moby Dick', 'Herman Melville')).toBeUndefined();
  });

  it('TC-008 – löscht Buch, Datei und Lesefortschritt', async () => {
    const store = await freshStore();
    await store.saveBook(book(), new ArrayBuffer(1));
    await store.saveProgress({ bookId: 'b1', chapterIndex: 2, position: 0.5, percent: 25, lastReadAt: 5 });
    await store.deleteBook('b1');
    expect(await store.getBook('b1')).toBeUndefined();
    expect(await store.getBookFile('b1')).toBeUndefined();
    expect(await store.getProgress('b1')).toBeUndefined();
  });

  it('TC-019 – speichert Einstellungen dauerhaft', async () => {
    const store = await freshStore();
    expect(await store.getSettings()).toEqual(DEFAULT_SETTINGS);
    await store.saveSettings({ fontSize: 4, colorScheme: 'dark', fontFamily: 'sans' });
    expect(await store.getSettings()).toEqual({ fontSize: 4, colorScheme: 'dark', fontFamily: 'sans' });
  });

  it('UC-003 – berechnet den Gesamtfortschritt', () => {
    expect(percentOf(0, 0, 10)).toBe(0);
    expect(percentOf(4, 0.5, 10)).toBe(45);
    expect(percentOf(9, 1, 10)).toBe(100);
  });
});
