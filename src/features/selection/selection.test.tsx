/**
 * Traceability:
 *   UC: UC-007 (Textstelle übersetzen)
 *   TCs: TC-025, TC-026, TC-027
 */
import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeEpub } from '../../../tests/fixtures/makeEpub';
import { epubFile, fakeTranslator, freshStore, renderWithServices } from '../../../tests/renderWithServices';
import { ModelUnavailableError, type SentenceTranslator } from '../../lib/translation/translator';
import { importBook } from '../library/importBook';
import { ReaderView } from '../reader/ReaderView';
import { LONG_PRESS_MS, MAX_SELECTION_WORDS } from './useTextSelection';

const CHAPTER = [
  {
    title: 'Chapter I',
    body: `<p>Alice was beginning to get very tired. She gave up the search for the white rabbit.</p><p>${Array.from(
      { length: 80 },
      (_, i) => `w${i}`,
    ).join(' ')}</p>`,
  },
];

async function openReader(translator: SentenceTranslator = fakeTranslator()) {
  const store = await freshStore();
  const outcome = await importBook(store, await epubFile(await makeEpub({ chapters: CHAPTER })), async () => true);
  if (outcome.kind !== 'added') throw new Error('Import fehlgeschlagen');
  renderWithServices(<ReaderView bookId={outcome.book.id} onBack={() => undefined} />, store, translator);
  await screen.findByText('Alice');
}

const word = (text: string) => within(screen.getByTestId('chapter')).getAllByText(text)[0]!;
const selected = () =>
  Array.from(screen.getByTestId('chapter').querySelectorAll('.w--selected')).map((element) => element.textContent);

/** jsdom kennt kein Layout; `elementFromPoint` liefert das Wort, über dem der Finger „liegt“. */
function fingerOver(element: Element | null) {
  document.elementFromPoint = () => element;
}

async function longPress(start: Element) {
  fireEvent.pointerDown(start, { clientX: 100, clientY: 100 });
  await act(() => new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 50)));
}

function dragTo(target: Element) {
  fingerOver(target);
  fireEvent.pointerMove(target, { clientX: 300, clientY: 140 });
}

afterEach(() => vi.restoreAllMocks());

describe('Textstelle markieren', () => {
  it('TC-025 – markiert beim Ziehen alle Wörter dazwischen, vorwärts und rückwärts', async () => {
    await openReader();
    await longPress(word('gave'));
    expect(selected()).toEqual(['gave']);

    dragTo(word('search'));
    expect(selected()).toEqual(['gave', 'up', 'the', 'search']);

    dragTo(word('very'));
    expect(selected()).toEqual(['very', 'tired', 'She', 'gave']);
  });

  it('TC-025 – begrenzt die Auswahl auf 60 Wörter', async () => {
    await openReader();
    await longPress(word('w0'));
    dragTo(word('w79'));
    expect(selected()).toHaveLength(MAX_SELECTION_WORDS);
    expect(selected().at(-1)).toBe('w59');
  });

  it('TC-026 – Bewegung vor Ablauf der Wartezeit markiert nichts', async () => {
    await openReader();
    fireEvent.pointerDown(word('gave'), { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(word('gave'), { clientX: 100, clientY: 160 });
    await act(() => new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 50)));
    expect(selected()).toEqual([]);
  });

  it('TC-027 – zeigt Wendung aus dem Wörterbuch und die Satzübersetzung', async () => {
    await openReader();
    await longPress(word('gave'));
    dragTo(word('up'));
    fireEvent.pointerUp(word('up'), { clientX: 300, clientY: 140 });

    const popup = await screen.findByRole('dialog', { name: 'Übersetzung der Textstelle' });
    expect(within(popup).getByText('gave up')).toHaveClass('popup__source');
    expect(await within(popup).findByText('gave up → give up')).toBeInTheDocument();
    expect(within(popup).getByText('aufgeben')).toBeInTheDocument();
    expect(await within(popup).findByText('DE: gave up')).toBeInTheDocument();
  });

  it('TC-027 – übersetzt eine Wortgruppe ohne Wendung Wort für Wort', async () => {
    await openReader();
    await longPress(word('white'));
    dragTo(word('rabbit'));
    fireEvent.pointerUp(word('rabbit'));
    const popup = await screen.findByRole('dialog', { name: 'Übersetzung der Textstelle' });
    expect(await within(popup).findByText('Kaninchen')).toBeInTheDocument();
    expect(within(popup).getByText('white').nextElementSibling).toHaveTextContent('–');
  });

  it('TC-027 – zeigt Ladehinweis beim ersten Gebrauch und Meldung ohne Internet', async () => {
    let fail: (error: Error) => void = () => undefined;
    const translator = fakeTranslator({
      isModelStored: async () => false,
      translate: () => new Promise((_, reject) => (fail = reject)),
    });
    await openReader(translator);
    await longPress(word('gave'));
    dragTo(word('up'));
    fireEvent.pointerUp(word('up'));

    const popup = await screen.findByRole('dialog', { name: 'Übersetzung der Textstelle' });
    expect(await within(popup).findByText('Übersetzungsmodell wird geladen (ca. 22 MB) …')).toBeInTheDocument();
    await act(async () => fail(new ModelUnavailableError()));
    expect(
      within(popup).getByText('Die Satzübersetzung ist noch nicht auf diesem iPad. Öffne sie einmal mit Internetverbindung.'),
    ).toBeInTheDocument();
    expect(within(popup).getByText('aufgeben')).toBeInTheDocument();
  });

  it('UC-007 A2 – langes Drücken ohne Ziehen zeigt das Wort-Popup', async () => {
    await openReader();
    await longPress(word('tired'));
    fingerOver(word('tired'));
    fireEvent.pointerUp(word('tired'));
    const popup = await screen.findByRole('dialog', { name: 'Übersetzung' });
    expect(await within(popup).findByText('müde')).toBeInTheDocument();
  });
});
