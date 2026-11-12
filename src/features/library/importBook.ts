import { openEpub } from '../../lib/epub/parse';
import { DrmProtectedError, InvalidEpubError } from '../../lib/epub/types';
import { StorageFullError, type LibraryStore, type StoredBook } from '../../lib/storage/db';

export type ImportOutcome =
  | { kind: 'added' | 'replaced'; book: StoredBook }
  | { kind: 'skipped'; fileName: string }
  | { kind: 'invalid' | 'drm' | 'full'; fileName: string };

/** Fragt den Leser, ob ein bereits vorhandenes Buch ersetzt werden soll (UC-001, A2). */
export type ConfirmReplace = (title: string) => Promise<boolean>;

function newId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** UC-001: eine EPUB-Datei einlesen und in der Bibliothek speichern. */
export async function importBook(store: LibraryStore, file: File, confirmReplace: ConfirmReplace): Promise<ImportOutcome> {
  try {
    const data = await file.arrayBuffer();
    const epub = await openEpub(data);
    const { title, author, language, identifier } = epub.metadata;
    const existing = await store.findDuplicate(identifier, title, author);
    if (existing && !(await confirmReplace(existing.title))) return { kind: 'skipped', fileName: file.name };

    const book: StoredBook = {
      // UC-001 A2.3: beim Ersetzen dieselbe ID behalten, damit der Lesefortschritt erhalten bleibt.
      id: existing?.id ?? newId(),
      title,
      author,
      language,
      identifier,
      cover: epub.cover ? { data: await epub.cover.arrayBuffer(), type: epub.cover.type } : undefined,
      toc: epub.toc,
      chapterCount: epub.spine.length,
      importedAt: existing?.importedAt ?? Date.now(),
    };
    await store.saveBook(book, data);
    return { kind: existing ? 'replaced' : 'added', book };
  } catch (error) {
    if (error instanceof InvalidEpubError) return { kind: 'invalid', fileName: file.name };
    if (error instanceof DrmProtectedError) return { kind: 'drm', fileName: file.name };
    if (error instanceof StorageFullError) return { kind: 'full', fileName: file.name };
    throw error;
  }
}

export function outcomeMessage(outcome: ImportOutcome): string | undefined {
  switch (outcome.kind) {
    case 'added':
      return 'Buch hinzugefügt';
    case 'replaced':
      return 'Buch ersetzt';
    case 'skipped':
      return undefined;
    case 'invalid':
      return `${outcome.fileName} ist keine gültige EPUB-Datei und wurde nicht importiert.`;
    case 'drm':
      return 'Dieses Buch ist kopiergeschützt und kann nicht geöffnet werden.';
    case 'full':
      return 'Nicht genug Speicherplatz. Entferne Bücher aus der Bibliothek und versuche es erneut.';
  }
}
