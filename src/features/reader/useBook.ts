import { useEffect, useState } from 'react';
import { useServices } from '../../app/services';
import { openEpub, type EpubBook } from '../../lib/epub/parse';
import { resolvePath } from '../../lib/epub/paths';
import { sanitizeChapter } from '../../lib/epub/sanitize';
import type { ReadingProgress, StoredBook } from '../../lib/storage/db';

export interface OpenBook {
  record: StoredBook;
  epub: EpubBook;
  initialProgress?: ReadingProgress;
}

type Loaded<T> = { key: string; value: T } | { key: string; error: true };

const IMAGE_PATTERN = /<img[^>]+src="([^"]+)"|<image[^>]+(?:xlink:)?href="([^"]+)"/g;

/** Liefert den Wert nur, wenn er zum aktuellen Schlüssel gehört – sonst gilt „lädt noch“. */
function current<T>(loaded: Loaded<T> | null, key: string) {
  if (!loaded || loaded.key !== key) return { value: null, error: false };
  return 'error' in loaded ? { value: null, error: true } : { value: loaded.value, error: false };
}

/** Lädt ein Buch aus IndexedDB und öffnet es (UC-003, Schritte 1–2). */
export function useBook(bookId: string) {
  const { store } = useServices();
  const [loaded, setLoaded] = useState<Loaded<OpenBook> | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!store) throw new Error('kein Speicher');
      const [record, file, initialProgress] = await Promise.all([
        store.getBook(bookId),
        store.getBookFile(bookId),
        store.getProgress(bookId),
      ]);
      if (!record || !file) throw new Error('Buch nicht gefunden');
      const epub = await openEpub(file);
      if (active) setLoaded({ key: bookId, value: { record, epub, initialProgress } });
    })().catch((cause: unknown) => {
      console.error(cause);
      if (active) setLoaded({ key: bookId, error: true });
    });
    return () => {
      active = false;
    };
  }, [store, bookId]);

  const { value, error } = current(loaded, bookId);
  return { book: value, error };
}

/** Lädt und bereinigt ein Kapitel; Bilder werden als blob:-URLs eingebunden und beim Wechsel freigegeben. */
export function useChapter(epub: EpubBook, index: number) {
  const [loaded, setLoaded] = useState<Loaded<string> | null>(null);
  const key = String(index);

  useEffect(() => {
    let active = true;
    const urls: string[] = [];

    (async () => {
      const item = epub.spine[index];
      if (!item) throw new Error(`Kapitel ${index} fehlt`);
      const xhtml = await epub.chapterText(index);
      const images = new Map<string, string>();
      for (const match of xhtml.matchAll(IMAGE_PATTERN)) {
        const path = resolvePath(item.path, match[1] ?? match[2] ?? '');
        if (images.has(path)) continue;
        const blob = await epub.resource(path);
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        urls.push(url);
        images.set(path, url);
      }
      const html = sanitizeChapter(xhtml, item.path, (path) => images.get(path));
      if (active) setLoaded({ key: String(index), value: html });
    })().catch((cause: unknown) => {
      console.error(cause);
      if (active) setLoaded({ key: String(index), error: true });
    });

    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [epub, index]);

  const { value, error } = current(loaded, key);
  return { html: value, error };
}
