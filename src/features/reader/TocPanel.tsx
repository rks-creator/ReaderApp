import type { TocEntry } from '../../lib/epub/types';

interface Props {
  toc: TocEntry[];
  currentChapter: number;
  onSelect: (chapterIndex: number) => void;
  onClose: () => void;
}

/** UC-003, A1: Inhaltsverzeichnis; das aktuelle Kapitel ist markiert. */
export function TocPanel({ toc, currentChapter, onSelect, onClose }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <nav className="sheet sheet--toc" aria-label="Inhaltsverzeichnis" onClick={(event) => event.stopPropagation()}>
        <h2 className="sheet__title">Inhalt</h2>
        {toc.length === 0 && <p className="popup__muted">Dieses Buch hat kein Inhaltsverzeichnis.</p>}
        <ol className="toc">
          {toc.map((entry, index) => (
            <li key={`${entry.chapterIndex}-${index}`} style={{ paddingLeft: `${entry.depth * 1.25}rem` }}>
              <button
                type="button"
                className="toc__entry"
                aria-current={entry.chapterIndex === currentChapter ? 'true' : undefined}
                onClick={() => onSelect(entry.chapterIndex)}
              >
                {entry.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
