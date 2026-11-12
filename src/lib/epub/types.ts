export interface TocEntry {
  title: string;
  /** Index im Spine (Lesereihenfolge). */
  chapterIndex: number;
  depth: number;
}

export interface BookMetadata {
  title: string;
  author: string;
  language: string;
  /** `dc:identifier` aus dem OPF; leer, wenn nicht vorhanden. */
  identifier: string;
}

export interface SpineItem {
  /** Pfad innerhalb des ZIP-Archivs. */
  path: string;
  mediaType: string;
}

export class InvalidEpubError extends Error {
  constructor(message = 'Keine gültige EPUB-Datei.') {
    super(message);
    this.name = 'InvalidEpubError';
  }
}

export class DrmProtectedError extends Error {
  constructor() {
    super('Dieses Buch ist kopiergeschützt.');
    this.name = 'DrmProtectedError';
  }
}

export class ChapterUnreadableError extends Error {
  constructor(path: string, cause?: unknown) {
    super(`Kapitel ${path} konnte nicht gelesen werden.`, { cause });
    this.name = 'ChapterUnreadableError';
  }
}
