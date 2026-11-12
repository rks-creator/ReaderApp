import type { IrregularForms } from './types';

/** Häufige unregelmässige Formen, die Ding nicht als `{went; gone}` angibt. */
const BUILT_IN_IRREGULAR: IrregularForms = {
  mice: 'mouse', geese: 'goose', feet: 'foot', teeth: 'tooth', men: 'man', women: 'woman',
  children: 'child', people: 'person', lice: 'louse', oxen: 'ox',
  is: 'be', am: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be',
  has: 'have', had: 'have', having: 'have', does: 'do', did: 'do', done: 'do',
  better: 'good', best: 'good', worse: 'bad', worst: 'bad',
};

const CONSONANT = '[bcdfghjklmnpqrstvwxz]';
const DOUBLED_CONSONANT = new RegExp(`(${CONSONANT})\\1$`);

/**
 * Liefert mögliche Grundformen einer englischen Wortform, wahrscheinlichste zuerst.
 * Die Form selbst ist nicht enthalten.
 */
export function baseFormsOf(word: string, irregular: IrregularForms): string[] {
  const forms: string[] = [];
  const add = (form: string | undefined) => {
    if (form && form.length > 1 && form !== word && !forms.includes(form)) forms.push(form);
  };

  add(irregular[word]);
  add(BUILT_IN_IRREGULAR[word]);

  if (word.endsWith("'s")) add(word.slice(0, -2));
  if (word.endsWith('ies')) add(`${word.slice(0, -3)}y`);
  if (word.endsWith('ves')) {
    add(`${word.slice(0, -3)}f`);
    add(`${word.slice(0, -3)}fe`);
  }
  if (/(s|x|z|ch|sh)es$/.test(word)) add(word.slice(0, -2));
  if (word.endsWith('s') && !word.endsWith('ss')) add(word.slice(0, -1));

  for (const suffix of ['ing', 'ed', 'er', 'est']) {
    if (!word.endsWith(suffix)) continue;
    const stem = word.slice(0, -suffix.length);
    if (stem.length < 2) continue;
    if (suffix !== 'ing' && stem.endsWith('i')) add(`${stem.slice(0, -1)}y`);
    if (DOUBLED_CONSONANT.test(stem)) add(stem.slice(0, -1));
    add(stem);
    add(`${stem}e`);
  }
  if (word.endsWith('ly')) {
    const stem = word.slice(0, -2);
    if (stem.endsWith('i')) add(`${stem.slice(0, -1)}y`);
    add(stem);
  }
  return forms;
}
