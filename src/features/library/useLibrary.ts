import { useCallback, useEffect, useState } from 'react';
import { useServices } from '../../app/services';
import type { LibraryStore, ReadingProgress, StoredBook } from '../../lib/storage/db';
import { importBook, outcomeMessage, type ConfirmReplace } from './importBook';

export interface LibraryEntry {
  book: StoredBook;
  progress?: ReadingProgress;
}

/** UC-002: zuletzt gelesene Bücher zuerst, nie geöffnete danach nach Importdatum. */
export function sortLibrary(entries: LibraryEntry[]): LibraryEntry[] {
  return [...entries].sort((a, b) => {
    const readA = a.progress?.lastReadAt ?? 0;
    const readB = b.progress?.lastReadAt ?? 0;
    if (readA !== readB) return readB - readA;
    return b.book.importedAt - a.book.importedAt;
  });
}

async function loadLibrary(store: LibraryStore): Promise<LibraryEntry[]> {
  const [books, progress] = await Promise.all([store.listBooks(), store.listProgress()]);
  const byBook = new Map(progress.map((entry) => [entry.bookId, entry]));
  return sortLibrary(books.map((book) => ({ book, progress: byBook.get(book.id) })));
}

export function useLibrary(confirmReplace: ConfirmReplace) {
  const { store } = useServices();
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (store) setEntries(await loadLibrary(store));
  }, [store]);

  useEffect(() => {
    let active = true;
    if (store) void loadLibrary(store).then((loaded) => active && setEntries(loaded));
    return () => {
      active = false;
    };
  }, [store]);

  const importFiles = useCallback(
    async (files: File[]) => {
      if (!store || files.length === 0) return;
      setBusy(true);
      const newMessages: string[] = [];
      try {
        for (const file of files) {
          const message = outcomeMessage(await importBook(store, file, confirmReplace));
          if (message) newMessages.push(message);
        }
      } finally {
        setMessages(newMessages);
        setBusy(false);
        await reload();
      }
    },
    [store, confirmReplace, reload],
  );

  const removeBook = useCallback(
    async (id: string) => {
      if (!store) return;
      await store.deleteBook(id);
      await reload();
    },
    [store, reload],
  );

  return { entries, messages, busy, importFiles, removeBook, dismissMessages: () => setMessages([]) };
}
