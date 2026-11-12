import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { TocEntry } from '../epub/types';

export interface StoredBook {
  id: string;
  title: string;
  author: string;
  language: string;
  identifier: string;
  /** Titelbild als Bytes – Blobs in IndexedDB sind in Safari unzuverlässig. */
  cover?: { data: ArrayBuffer; type: string };
  toc: TocEntry[];
  chapterCount: number;
  importedAt: number;
}

export interface ReadingProgress {
  bookId: string;
  chapterIndex: number;
  /** Scrollposition im Kapitel, 0 = Anfang, 1 = Ende. */
  position: number;
  /** Gesamtfortschritt 0–100. */
  percent: number;
  lastReadAt: number;
}

export type FontSizeStep = 1 | 2 | 3 | 4 | 5;
export type ColorScheme = 'light' | 'sepia' | 'dark' | 'auto';
export type FontFamily = 'serif' | 'sans';

export interface ReaderSettings {
  fontSize: FontSizeStep;
  colorScheme: ColorScheme;
  fontFamily: FontFamily;
}

export const DEFAULT_SETTINGS: ReaderSettings = { fontSize: 3, colorScheme: 'auto', fontFamily: 'serif' };

interface ReaderDb extends DBSchema {
  books: { key: string; value: StoredBook };
  bookFiles: { key: string; value: { bookId: string; file: ArrayBuffer } };
  progress: { key: string; value: ReadingProgress };
  settings: { key: string; value: ReaderSettings };
}

export class StorageUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Der lokale Speicher ist nicht verfügbar.', { cause });
    this.name = 'StorageUnavailableError';
  }
}

export class StorageFullError extends Error {
  constructor(cause?: unknown) {
    super('Nicht genug Speicherplatz.', { cause });
    this.name = 'StorageFullError';
  }
}

const DB_NAME = 'readerapp';
const DB_VERSION = 1;
const SETTINGS_KEY = 'reader';

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
}

export class LibraryStore {
  private constructor(private readonly db: IDBPDatabase<ReaderDb>) {}

  static async open(name = DB_NAME): Promise<LibraryStore> {
    try {
      const db = await openDB<ReaderDb>(name, DB_VERSION, {
        upgrade(database) {
          database.createObjectStore('books', { keyPath: 'id' });
          database.createObjectStore('bookFiles', { keyPath: 'bookId' });
          database.createObjectStore('progress', { keyPath: 'bookId' });
          database.createObjectStore('settings');
        },
      });
      return new LibraryStore(db);
    } catch (error) {
      throw new StorageUnavailableError(error);
    }
  }

  close(): void {
    this.db.close();
  }

  listBooks(): Promise<StoredBook[]> {
    return this.db.getAll('books');
  }

  getBook(id: string): Promise<StoredBook | undefined> {
    return this.db.get('books', id);
  }

  async getBookFile(id: string): Promise<ArrayBuffer | undefined> {
    return (await this.db.get('bookFiles', id))?.file;
  }

  /** UC-001, A2: gleiches Buch über EPUB-Kennung oder, ohne Kennung, Titel und Autor. */
  async findDuplicate(identifier: string, title: string, author: string): Promise<StoredBook | undefined> {
    const books = await this.listBooks();
    return books.find((book) =>
      identifier ? book.identifier === identifier : !book.identifier && book.title === title && book.author === author,
    );
  }

  /** Speichert Buch und Datei in einer Transaktion – entweder beides oder nichts (UC-001, E2). */
  async saveBook(book: StoredBook, file: ArrayBuffer): Promise<void> {
    try {
      const tx = this.db.transaction(['books', 'bookFiles'], 'readwrite');
      await Promise.all([
        tx.objectStore('books').put(book),
        tx.objectStore('bookFiles').put({ bookId: book.id, file }),
        tx.done,
      ]);
    } catch (error) {
      if (isQuotaError(error) || isQuotaError((error as { cause?: unknown })?.cause)) throw new StorageFullError(error);
      throw error;
    }
  }

  async deleteBook(id: string): Promise<void> {
    const tx = this.db.transaction(['books', 'bookFiles', 'progress'], 'readwrite');
    await Promise.all([
      tx.objectStore('books').delete(id),
      tx.objectStore('bookFiles').delete(id),
      tx.objectStore('progress').delete(id),
      tx.done,
    ]);
  }

  getProgress(bookId: string): Promise<ReadingProgress | undefined> {
    return this.db.get('progress', bookId);
  }

  listProgress(): Promise<ReadingProgress[]> {
    return this.db.getAll('progress');
  }

  async saveProgress(progress: ReadingProgress): Promise<void> {
    await this.db.put('progress', progress);
  }

  async getSettings(): Promise<ReaderSettings> {
    return { ...DEFAULT_SETTINGS, ...(await this.db.get('settings', SETTINGS_KEY)) };
  }

  async saveSettings(settings: ReaderSettings): Promise<void> {
    await this.db.put('settings', settings, SETTINGS_KEY);
  }
}

/** Gesamtfortschritt in Prozent aus Kapitel und Position im Kapitel. */
export function percentOf(chapterIndex: number, position: number, chapterCount: number): number {
  if (chapterCount <= 0) return 0;
  const raw = ((chapterIndex + Math.min(1, Math.max(0, position))) / chapterCount) * 100;
  return Math.round(Math.min(100, Math.max(0, raw)));
}
