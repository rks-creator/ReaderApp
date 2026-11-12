import { useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { useServices } from '../../app/services';
import { useLibrary, type LibraryEntry } from './useLibrary';

const LONG_PRESS_MS = 600;

const confirmReplace = async (title: string) =>
  window.confirm(`„${title}“ ist bereits in der Bibliothek. Ersetzen?`);

function Cover({ entry }: { entry: LibraryEntry }) {
  const cover = entry.book.cover;
  const url = useMemo(
    () => (cover ? URL.createObjectURL(new Blob([cover.data], { type: cover.type })) : undefined),
    [cover],
  );
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  if (url) return <img className="cover" src={url} alt="" />;
  // UC-002 A3: Platzhalter mit Titel und Autor
  return (
    <div className="cover cover--placeholder" aria-hidden="true">
      <span className="cover__title">{entry.book.title}</span>
      <span className="cover__author">{entry.book.author}</span>
    </div>
  );
}

function BookCard({ entry, onOpen, onRemove }: { entry: LibraryEntry; onOpen: () => void; onRemove: () => void }) {
  const pressTimer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);
  const percent = entry.progress?.percent ?? 0;

  const startPress = () => {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      onRemove();
    }, LONG_PRESS_MS);
  };
  const endPress = () => window.clearTimeout(pressTimer.current);

  return (
    <li className="book">
      <button
        type="button"
        className="book__open"
        onClick={() => !longPressed.current && onOpen()}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onContextMenu={(event) => event.preventDefault()}
        aria-label={`${entry.book.title} von ${entry.book.author} öffnen, ${percent} % gelesen`}
      >
        <Cover entry={entry} />
        <span className="book__title">{entry.book.title}</span>
        <span className="book__author">{entry.book.author}</span>
        <span className="book__progress">
          <span className="progress" aria-hidden="true">
            <span className="progress__bar" style={{ width: `${percent}%` }} />
          </span>
          {percent} %
        </span>
      </button>
      <button type="button" className="book__remove" onClick={onRemove} aria-label={`${entry.book.title} entfernen`}>
        ⋯
      </button>
    </li>
  );
}

export function LibraryView({ onOpenBook, onShowInfo }: { onOpenBook: (id: string) => void; onShowInfo: () => void }) {
  const { store } = useServices();
  const { entries, messages, busy, importFiles, removeBook, dismissMessages } = useLibrary(confirmReplace);
  const fileInput = useRef<HTMLInputElement>(null);

  const onFilesChosen = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void importFiles(files);
  };

  const confirmRemove = (entry: LibraryEntry) => {
    if (window.confirm(`„${entry.book.title}“ wirklich entfernen? Der Lesefortschritt geht verloren.`)) {
      void removeBook(entry.book.id);
    }
  };

  if (!store) {
    return (
      <main className="library">
        <p role="alert" className="notice notice--error">
          Der lokale Speicher ist nicht verfügbar. Ist der private Modus aktiv?
        </p>
      </main>
    );
  }

  return (
    <main className="library">
      <header className="bar">
        <h1 className="bar__title">Bibliothek</h1>
        <button type="button" className="button button--ghost" onClick={onShowInfo} aria-label="Info">
          ⓘ
        </button>
        <button type="button" className="button" onClick={() => fileInput.current?.click()} disabled={busy}>
          {busy ? 'Importiere …' : 'Buch hinzufügen'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".epub,application/epub+zip"
          multiple
          hidden
          data-testid="epub-input"
          onChange={onFilesChosen}
        />
      </header>

      {messages.length > 0 && (
        <div role="status" className="notice" onClick={dismissMessages}>
          {messages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      {entries && entries.length === 0 && (
        <p className="empty">Noch keine Bücher. Tippe auf „Buch hinzufügen“, um eine EPUB-Datei zu importieren.</p>
      )}

      {entries && entries.length > 0 && (
        <ul className="books" aria-label="Bücher">
          {entries.map((entry) => (
            <BookCard
              key={entry.book.id}
              entry={entry}
              onOpen={() => onOpenBook(entry.book.id)}
              onRemove={() => confirmRemove(entry)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
