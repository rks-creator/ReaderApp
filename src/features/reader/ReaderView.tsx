import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { useServices } from '../../app/services';
import { wrapWords } from '../../lib/epub/wrapWords';
import { percentOf, type ReaderSettings } from '../../lib/storage/db';
import { TranslationPopup } from '../dictionary/TranslationPopup';
import { useWordTap } from '../dictionary/useWordTap';
import { SelectionPopup } from '../selection/SelectionPopup';
import { useTextSelection } from '../selection/useTextSelection';
import { SettingsPanel } from '../settings/SettingsPanel';
import { useSettings } from '../settings/useSettings';
import { firstVisibleWord, scrollFraction, scrollToElement, scrollToFraction } from './scrollAnchor';
import { TocPanel } from './TocPanel';
import { useBook, useChapter, type OpenBook } from './useBook';

/** UC-003 Schritt 5: Position spätestens 2 s nach dem Scrollen speichern. */
const SAVE_DELAY_MS = 1000;
const FONT_SIZE_PX: Record<ReaderSettings['fontSize'], number> = { 1: 16, 2: 18, 3: 20, 4: 23, 5: 26 };

function BookReader({ book, onBack }: { book: OpenBook; onBack: () => void }) {
  const { store } = useServices();
  const { settings, update, saveFailed } = useSettings();
  const chapterCount = book.epub.spine.length;
  const [chapterIndex, setChapterIndex] = useState(() =>
    Math.min(book.initialProgress?.chapterIndex ?? 0, chapterCount - 1),
  );
  const { html, error } = useChapter(book.epub, chapterIndex);
  const [panel, setPanel] = useState<'toc' | 'settings' | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const pendingPosition = useRef<number>(book.initialProgress?.position ?? 0);
  /** Zuletzt bekannte Leseposition, für das Speichern beim Verlassen. */
  const position = useRef({ chapterIndex, fraction: book.initialProgress?.position ?? 0 });
  const anchorWord = useRef<HTMLElement | undefined>(undefined);
  const saveTimer = useRef<number | undefined>(undefined);
  const tap = useWordTap(content);
  const selection = useTextSelection(content, {
    onBegin: tap.close,
    onSingleWord: (word) => void tap.translateWord(word),
  });
  const closePopup = () => {
    tap.close();
    selection.close();
  };
  // UC-004 (Tippen) und UC-007 (lange drücken und ziehen) teilen sich die Zeiger-Ereignisse.
  const textHandlers = {
    onPointerDown: (event: PointerEvent) => {
      tap.handlers.onPointerDown(event);
      selection.handlers.onPointerDown(event);
    },
    onPointerMove: selection.handlers.onPointerMove,
    onPointerUp: (event: PointerEvent) => {
      if (selection.handlers.onPointerUp()) return;
      selection.close();
      tap.handlers.onPointerUp(event);
    },
    onPointerCancel: () => {
      tap.handlers.onPointerCancel();
      selection.handlers.onPointerUp();
    },
  };

  const saveProgress = useCallback(
    (index: number, position: number) => {
      window.clearTimeout(saveTimer.current);
      void store
        ?.saveProgress({
          bookId: book.record.id,
          chapterIndex: index,
          position,
          percent: percentOf(index, position, chapterCount),
          lastReadAt: Date.now(),
        })
        .catch((cause: unknown) => console.error(cause));
    },
    [store, book.record.id, chapterCount],
  );

  // Kapitel rendern, Wörter antippbar machen, gespeicherte Position wiederherstellen.
  useLayoutEffect(() => {
    const container = content.current;
    const scrollElement = scroller.current;
    if (!container || !scrollElement || html === null) return;
    container.innerHTML = html;
    wrapWords(container, book.record.language || 'en');
    scrollToFraction(scrollElement, pendingPosition.current);
    position.current = { chapterIndex, fraction: pendingPosition.current };
  }, [html, book.record.language, chapterIndex]);

  // UC-005: nach einer Änderung der Darstellung bleibt die erste sichtbare Textstelle sichtbar.
  useLayoutEffect(() => {
    const scrollElement = scroller.current;
    if (scrollElement && anchorWord.current?.isConnected) scrollToElement(scrollElement, anchorWord.current);
    anchorWord.current = undefined;
  }, [settings]);

  // Beim Verlassen der Leseansicht die zuletzt bekannte Position sofort speichern.
  const saveRef = useRef(saveProgress);
  useEffect(() => {
    saveRef.current = saveProgress;
  }, [saveProgress]);
  useEffect(
    () => () => {
      saveRef.current(position.current.chapterIndex, position.current.fraction);
    },
    [],
  );

  const goToChapter = (index: number, target: number) => {
    closePopup();
    setPanel(null);
    pendingPosition.current = target;
    if (index === chapterIndex && scroller.current) scrollToFraction(scroller.current, target);
    position.current = { chapterIndex: index, fraction: target };
    setChapterIndex(index);
    saveProgress(index, target);
  };

  const onScroll = () => {
    closePopup();
    const scrollElement = scroller.current;
    if (!scrollElement) return;
    const fraction = scrollFraction(scrollElement);
    position.current = { chapterIndex, fraction };
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveProgress(chapterIndex, fraction), SAVE_DELAY_MS);
  };

  const changeSettings = (change: Partial<ReaderSettings>) => {
    if (scroller.current) anchorWord.current = firstVisibleWord(scroller.current);
    update(change);
  };

  const isLastChapter = chapterIndex === chapterCount - 1;
  const chapterTitle = book.record.toc.find((entry) => entry.chapterIndex === chapterIndex)?.title;

  return (
    <div
      className="reader"
      data-theme={settings.colorScheme}
      data-font={settings.fontFamily}
      style={{ ['--reader-font-size' as string]: `${FONT_SIZE_PX[settings.fontSize]}px` }}
    >
      <header className="bar reader__bar">
        <button type="button" className="button button--ghost" onClick={onBack} aria-label="Zurück zur Bibliothek">
          ‹ Bibliothek
        </button>
        <span className="bar__title reader__title">{chapterTitle ?? book.record.title}</span>
        <button type="button" className="button button--ghost" onClick={() => setPanel('toc')} aria-label="Inhaltsverzeichnis">
          ☰
        </button>
        <button type="button" className="button button--ghost" onClick={() => setPanel('settings')} aria-label="Leseeinstellungen">
          Aa
        </button>
      </header>

      <div ref={scroller} className="reader__scroll" onScroll={onScroll} data-testid="reader-scroll">
        <article className="reader__page">
          {chapterIndex > 0 && (
            <button type="button" className="button button--chapter" onClick={() => goToChapter(chapterIndex - 1, 1)}>
              Vorheriges Kapitel
            </button>
          )}
          {error && (
            <p role="alert" className="notice notice--error">
              Dieses Kapitel konnte nicht angezeigt werden.
            </p>
          )}
          <div
            ref={content}
            className="reader__text"
            lang={book.record.language || 'en'}
            data-testid="chapter"
            hidden={error}
            {...textHandlers}
          />
          {isLastChapter ? (
            <p className="reader__end">Ende des Buches</p>
          ) : (
            <button type="button" className="button button--chapter" onClick={() => goToChapter(chapterIndex + 1, 0)}>
              Nächstes Kapitel
            </button>
          )}
        </article>
      </div>

      {tap.popup && <TranslationPopup state={tap.popup.state} anchor={tap.popup.anchor} />}
      {selection.popup && <SelectionPopup state={selection.popup} />}
      {panel === 'toc' && (
        <TocPanel
          toc={book.record.toc}
          currentChapter={chapterIndex}
          onSelect={(index) => goToChapter(index, 0)}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'settings' && (
        <SettingsPanel settings={settings} saveFailed={saveFailed} onChange={changeSettings} onClose={() => setPanel(null)} />
      )}
    </div>
  );
}

/** UC-003: Leseansicht. */
export function ReaderView({ bookId, onBack }: { bookId: string; onBack: () => void }) {
  const { book, error } = useBook(bookId);
  if (error) {
    return (
      <main className="library">
        <p role="alert" className="notice notice--error">
          Dieses Buch konnte nicht geöffnet werden.
        </p>
        <button type="button" className="button" onClick={onBack}>
          Zurück zur Bibliothek
        </button>
      </main>
    );
  }
  if (!book) return <p className="loading">Buch wird geöffnet …</p>;
  return <BookReader book={book} onBack={onBack} />;
}
