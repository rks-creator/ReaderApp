import { Popover } from '../dictionary/Popover';
import { POS_LABEL } from '../dictionary/TranslationPopup';
import type { DictionaryPart, SelectionPopupState, TranslationPart } from './useTextSelection';

const MAX_SHOWN_CHARS = 240;

function DictionarySection({ part }: { part: DictionaryPart }) {
  if (part.status === 'loading') return <p className="popup__muted">…</p>;
  if (part.status === 'unavailable') {
    return <p className="popup__muted">Das Wörterbuch ist nicht verfügbar. Öffne die App einmal mit Internetverbindung.</p>;
  }
  const { phrase, words } = part.result;
  if (phrase) {
    return (
      <>
        <p className="popup__headword">{phrase.inflectedFrom ? `${phrase.inflectedFrom} → ${phrase.headword}` : phrase.headword}</p>
        <ul className="popup__list">
          {phrase.translations.map(([german, pos]) => (
            <li key={german}>
              {german}
              {pos && <span className="popup__pos"> · {POS_LABEL[pos]}</span>}
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <dl className="popup__words">
      {words.map(({ word, translation }, index) => (
        <div key={`${word}-${index}`} className="popup__word">
          <dt>{word}</dt>
          <dd className={translation ? undefined : 'popup__muted'}>{translation?.[0] ?? '–'}</dd>
        </div>
      ))}
    </dl>
  );
}

function TranslationSection({ part }: { part: TranslationPart }) {
  switch (part.status) {
    case 'loading-model':
      return <p className="popup__muted">Übersetzungsmodell wird geladen (ca. 22 MB) …</p>;
    case 'translating':
      return <p className="popup__muted">Wird übersetzt …</p>;
    case 'done':
      return <p className="popup__sentence">{part.text}</p>;
    case 'unavailable':
      return (
        <p className="popup__muted">Die Satzübersetzung ist noch nicht auf diesem iPad. Öffne sie einmal mit Internetverbindung.</p>
      );
    case 'failed':
      return <p className="popup__muted">Die Satzübersetzung ist fehlgeschlagen.</p>;
  }
}

/**
 * UC-007: maschinelle Übersetzung (Stufe 2) und Wörterbuch (Stufe 1) einer markierten Textstelle.
 * Die Übersetzung steht oben, damit sie auch bei langen Wortlisten ohne Scrollen sichtbar ist.
 */
export function SelectionPopup({ state }: { state: SelectionPopupState }) {
  const shown = state.text.length > MAX_SHOWN_CHARS ? `${state.text.slice(0, MAX_SHOWN_CHARS)} …` : state.text;
  return (
    <Popover anchor={state.anchor} label="Übersetzung der Textstelle" contentKey={state} className="popup--selection">
      <p className="popup__source" lang="en">
        {shown}
      </p>
      <section className="popup__group" aria-label="Satzübersetzung">
        <h3 className="popup__section">Übersetzung</h3>
        <TranslationSection part={state.translation} />
      </section>
      <section className="popup__group" aria-label="Wörterbuch">
        <h3 className="popup__section">Wörterbuch</h3>
        <DictionarySection part={state.dictionary} />
      </section>
    </Popover>
  );
}
