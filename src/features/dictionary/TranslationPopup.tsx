import type { LookupResult, PartOfSpeech } from '../../lib/dictionary/types';
import { Popover } from './Popover';

export type PopupState =
  | { status: 'loading'; word: string }
  | { status: 'done'; result: LookupResult }
  | { status: 'unavailable'; word: string };

interface Props {
  state: PopupState;
  /** Position des angetippten Wortes im Viewport. */
  anchor: DOMRect;
}

export const POS_LABEL: Record<PartOfSpeech, string> = { noun: 'Substantiv', verb: 'Verb', adj: 'Adjektiv', adv: 'Adverb', '': '' };

/** UC-004: Übersetzung direkt beim angetippten Wort. */
export function TranslationPopup({ state, anchor }: Props) {
  return (
    <Popover anchor={anchor} label="Übersetzung" contentKey={state}>
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
    </Popover>
  );
}
