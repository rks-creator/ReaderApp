/**
 * Traceability:
 *   UC: UC-001 (Buch importieren), UC-002 (Bibliothek anzeigen)
 *   TCs: TC-004, TC-006, TC-007, TC-008
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeEpub } from '../../../tests/fixtures/makeEpub';
import { epubFile, freshStore, renderWithServices } from '../../../tests/renderWithServices';
import { LibraryView } from './LibraryView';

afterEach(() => vi.restoreAllMocks());

const ALICE = /^Alice's Adventures in Wonderland von Lewis Carroll öffnen/;

const renderLibrary = async () => {
  const store = await freshStore();
  const onOpenBook = vi.fn();
  renderWithServices(<LibraryView onOpenBook={onOpenBook} onShowInfo={() => undefined} />, store);
  return { store, onOpenBook };
};

const importFiles = (files: File[]) =>
  fireEvent.change(screen.getByTestId('epub-input'), { target: { files } });

describe('Bibliothek', () => {
  it('TC-007 – zeigt einen Hinweis bei leerer Bibliothek', async () => {
    await renderLibrary();
    expect(await screen.findByText(/Noch keine Bücher/)).toBeInTheDocument();
  });

  it('UC-001 – importiert ein Buch und meldet ungültige Dateien', async () => {
    await renderLibrary();
    importFiles([await epubFile(await makeEpub()), new File(['kaputt'], 'kaputt.epub')]);
    expect(await screen.findByRole('button', { name: ALICE })).toBeInTheDocument();
    expect(screen.getByText('kaputt.epub ist keine gültige EPUB-Datei und wurde nicht importiert.')).toBeInTheDocument();
    expect(screen.getByText('Buch hinzugefügt')).toBeInTheDocument();
  });

  it('TC-004 – fragt beim erneuten Import nach und behält den Lesefortschritt', async () => {
    const { store } = await renderLibrary();
    importFiles([await epubFile(await makeEpub())]);
    await screen.findByRole('button', { name: ALICE });
    const [book] = await store.listBooks();
    await store.saveProgress({ bookId: book!.id, chapterIndex: 2, position: 0.5, percent: 50, lastReadAt: 1 });

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    importFiles([await epubFile(await makeEpub())]);
    expect(await screen.findByText('Buch ersetzt')).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledWith("„Alice's Adventures in Wonderland“ ist bereits in der Bibliothek. Ersetzen?");
    expect(await store.listBooks()).toHaveLength(1);
    expect((await store.getProgress(book!.id))?.percent).toBe(50);
  });

  it('TC-006 – sortiert nach „zuletzt gelesen“ und zeigt den Fortschritt', async () => {
    const store = await freshStore();
    const base = { language: 'en', identifier: '', toc: [], chapterCount: 10 };
    await store.saveBook({ ...base, id: 'a', title: 'Alice', author: 'Carroll', importedAt: 2 }, new ArrayBuffer(1));
    await store.saveBook({ ...base, id: 'm', title: 'Moby Dick', author: 'Melville', importedAt: 1 }, new ArrayBuffer(1));
    await store.saveProgress({ bookId: 'm', chapterIndex: 4, position: 0, percent: 40, lastReadAt: 99 });
    renderWithServices(<LibraryView onOpenBook={() => undefined} onShowInfo={() => undefined} />, store);

    const list = await screen.findByRole('list', { name: 'Bücher' });
    const titles = within(list).getAllByRole('button', { name: /öffnen/ }).map((button) => button.getAttribute('aria-label'));
    expect(titles).toEqual(['Moby Dick von Melville öffnen, 40 % gelesen', 'Alice von Carroll öffnen, 0 % gelesen']);
  });

  it('TC-008 – entfernt ein Buch nach Bestätigung', async () => {
    const { store } = await renderLibrary();
    importFiles([await epubFile(await makeEpub())]);
    await screen.findByRole('button', { name: ALICE });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: "Alice's Adventures in Wonderland entfernen" }));
    await waitFor(() => expect(screen.queryByRole('button', { name: ALICE })).not.toBeInTheDocument());
    expect(await store.listBooks()).toHaveLength(0);
  });

  it('UC-002 E1 – meldet fehlenden lokalen Speicher', () => {
    renderWithServices(<LibraryView onOpenBook={() => undefined} onShowInfo={() => undefined} />, null);
    expect(screen.getByRole('alert')).toHaveTextContent('Der lokale Speicher ist nicht verfügbar.');
  });
});
