/** Wortart, abgeleitet aus den Ding-Annotationen. */
export type PartOfSpeech = 'noun' | 'verb' | 'adj' | 'adv' | '';

/** Eine deutsche Übersetzung, kompakt gespeichert als [Text, Wortart]. */
export type Translation = [german: string, pos: PartOfSpeech];

/** Ein Shard des Wörterbuchs: englischer Schlüssel (klein) → Übersetzungen, beste zuerst. */
export type DictionaryShard = Record<string, Translation[]>;

/** Unregelmässige Formen: Form → Grundform (z. B. "went" → "go"). */
export type IrregularForms = Record<string, string>;

export interface LookupGroup {
  /** Das nachgeschlagene englische Wort bzw. die Grundform. */
  headword: string;
  /** Gesetzt, wenn `headword` eine Grundform der angetippten Form ist. */
  inflectedFrom?: string;
  translations: Translation[];
}

export interface LookupResult {
  word: string;
  groups: LookupGroup[];
}
