/**
 * Traceability:
 *   UC: UC-003 (Buch lesen), UC-004 (Wort übersetzen), UC-005 (Leseeinstellungen anpassen)
 *   TCs: TC-010, TC-012, TC-018
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeEpub } from '../../../tests/fixtures/makeEpub';
import { epubFile, freshStore, renderWithServices } from '../../../tests/renderWithServices';
import type { LibraryStore } from '../../lib/storage/db';
import { importBook } from '../library/importBook';
import { ReaderView } from './ReaderView';

async function openAlice(): Promise<{ store: LibraryStore; bookId: string }> {
  const store = await freshStore();
  const outcome = await importBook(store, await epubFile(await makeEpub()), async () => true);
  if (outcome.kind !== 'added') throw new Error('Import fehlgeschlagen');
  renderWithServices(<ReaderView bookId={outcome.book.id} onBack={() => undefined} />, store);
  await screen.findByText('Alice');
  return { store, bookId: outcome.book.id };
}

function tap(element: Element, move = 0) {
  fireEvent.pointerDown(element, { clientX: 10, clientY: 10 });
  fireEvent.pointerUp(element, { clientX: 10 + move, clientY: 10 + move });
}

const word = (text: string) => within(screen.getByTestId('chapter')).getAllByText(text)[0]!;

describe('Leseansicht', () => {
  it('TC-010 – springt über das Inhaltsverzeichnis zu einem Kapitel', async () => {
    const { store, bookId } = await openAlice();
    fireEvent.click(screen.getByRole('button', { name: 'Inhaltsverzeichnis' }));
    const toc = screen.getByRole('navigation', { name: 'Inhaltsverzeichnis' });
    expect(within(toc).getByRole('button', { name: 'Chapter I' })).toHaveAttribute('aria-current', 'true');
    fireEvent.click(within(toc).getByRole('button', { name: 'Chapter V' }));
    expect(await screen.findByText('Caterpillar')).toBeInTheDocument();
    await waitFor(async () => expect((await store.getProgress(bookId))?.chapterIndex).toBe(4));
  });

  it('TC-012 – kurzes Tippen übersetzt, eine Wischbewegung nicht', async () => {
    await openAlice();
    tap(word('tired'), 40);
    expect(screen.queryByRole('dialog', { name: 'Übersetzung' })).not.toBeInTheDocument();

    tap(word('tired'));
    const popup = await screen.findByRole('dialog', { name: 'Übersetzung' });
    expect(await within(popup).findByText('müde')).toBeInTheDocument();
    expect(word('tired')).toHaveClass('w--active');
  });

  it('UC-004 – zeigt Grundform und meldet unbekannte Wörter', async () => {
    await openAlice();
    tap(word('went'));
    expect(await screen.findByText('went → go')).toBeInTheDocument();

    tap(word('Alice'));
    expect(await screen.findByText('Kein Eintrag für alice gefunden.')).toBeInTheDocument();
  });

  it('TC-018 – ändert die Schriftgrösse und speichert sie', async () => {
    const { store } = await openAlice();
    fireEvent.click(screen.getByRole('button', { name: 'Leseeinstellungen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Schrift grösser' }));
    expect(screen.getByText('Stufe 4 von 5')).toBeInTheDocument();
    await waitFor(async () => expect((await store.getSettings()).fontSize).toBe(4));
  });

  it('UC-003 E1 – meldet ein nicht lesbares Kapitel', async () => {
    const store = await freshStore();
    const outcome = await importBook(store, await epubFile(await makeEpub({ missingChapter: 0 })), async () => true);
    if (outcome.kind !== 'added') throw new Error('Import fehlgeschlagen');
    renderWithServices(<ReaderView bookId={outcome.book.id} onBack={() => undefined} />, store);
    expect(await screen.findByText('Dieses Kapitel konnte nicht angezeigt werden.')).toBeInTheDocument();
  });
});
