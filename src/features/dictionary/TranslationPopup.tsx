import { useLayoutEffect, useRef, useState } from 'react';
import type { LookupResult, PartOfSpeech } from '../../lib/dictionary/types';

export type PopupState =
  | { status: 'loading'; word: string }
  | { status: 'done'; result: LookupResult }
  | { status: 'unavailable'; word: string };

const POS_LABEL: Record<PartOfSpeech, string> = { noun: 'Substantiv', verb: 'Verb', adj: 'Adjektiv', adv: 'Adverb', '': '' };
const GAP = 8;
const MARGIN = 12;

interface Props {
  state: PopupState;
  /** Position des angetippten Wortes im Viewport. */
  anchor: DOMRect;
}

/** UC-004: Übersetzung direkt beim angetippten Wort. */
export function TranslationPopup({ state, anchor }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: anchor.bottom + GAP, left: anchor.left });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    const fitsBelow = anchor.bottom + GAP + height <= window.innerHeight - MARGIN;
    const top = fitsBelow ? anchor.bottom + GAP : Math.max(MARGIN, anchor.top - GAP - height);
    const left = Math.min(Math.max(MARGIN, anchor.left + anchor.width / 2 - width / 2), window.innerWidth - width - MARGIN);
    setPosition({ top, left });
  }, [anchor, state]);

  return (
    <div
      ref={ref}
      className="popup"
      role="dialog"
      aria-label="Übersetzung"
      style={{ top: position.top, left: position.left }}
      onPointerUp={(event) => event.stopPropagation()}
    >
      {state.status === 'loading' && <p className="popup__muted">{state.word} …</p>}
      {state.status === 'unavailable' && (
        <p className="popup__muted">Das Wörterbuch ist nicht verfügbar. Öffne die App einmal mit Internetverbindung.</p>
      )}
      {state.status === 'done' && state.result.groups.length === 0 && (
        <p className="popup__muted">Kein Eintrag für {state.result.word} gefunden.</p>
      )}
      {state.status === 'done' &&
        state.result.groups.map((group) => (
          <section key={group.headword} className="popup__group">
            <h3 className="popup__headword">
              {group.inflectedFrom ? `${group.inflectedFrom} → ${group.headword}` : group.headword}
            </h3>
            <ul className="popup__list">
              {group.translations.map(([german, pos]) => (
                <li key={german}>
                  {german}
                  {pos && <span className="popup__pos"> · {POS_LABEL[pos]}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
