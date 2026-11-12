import type { DictionaryShard, IrregularForms, PartOfSpeech, Translation } from './types';

/**
 * Wandelt die Ding-Wörterbuchdatei (Deutsch :: Englisch) in ein Englisch→Deutsch-Wörterbuch um.
 *
 * Zeilenformat: `Haus {n} | Häuser {pl} :: house | houses`
 * - ` :: ` trennt Deutsch und Englisch
 * - ` | ` trennt einander entsprechende Teileinträge (Grundform, Flexion, Beispiele)
 * - `; ` trennt Synonyme
 * - `{…}` Grammatik, `[…]` Fachgebiet/Region, `(…)` Erläuterung
 */

export const MAX_TRANSLATIONS = 5;
const MAX_KEY_WORDS = 4;
const MAX_GERMAN_LENGTH = 80;
const KEY_PATTERN = /^[a-z][a-z' .-]*$/;
const SENTENCE_END = /[.!?]["'“”‘’]?$/;
/** Abkürzungen wie „TIR“ oder „UN“ behalten ihre Grossschreibung, damit „tired“ nicht zu „tir“ wird. */
export const ACRONYM_PATTERN = /^[A-Z][A-Z0-9&.-]*[A-Z0-9.]$/;
/** Platzhalter wie „sth.“ oder „sb.'s“, die für das Nachschlagen keine Rolle spielen. */
const ENGLISH_PLACEHOLDER = /(^|\s)(sb\.\/sth\.|sth\.\/sb\.|sb\.|sth\.)('s)?(?=\s|$)/g;
const GERMAN_PLACEHOLDER = /^((etw|jdn|jdm|jds)\.(\/(etw|jdn|jdm|jds)\.)?\s+)+/;

interface Candidate {
  german: string;
  pos: PartOfSpeech;
  score: number;
  order: number;
}

export interface DingDictionary {
  entries: DictionaryShard;
  forms: IrregularForms;
}

/** Teilt an einem Trennzeichen, aber nicht innerhalb von (), [], {}. */
export function splitOutsideBrackets(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (char === '(' || char === '[' || char === '{') depth++;
    if (char === ')' || char === ']' || char === '}') depth = Math.max(0, depth - 1);
    if (char === separator && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

function cleanGerman(text: string): string {
  return stripAnnotations(text).replace(GERMAN_PLACEHOLDER, '');
}

function stripAnnotations(text: string): string {
  return text
    .replace(/\{[^}]*\}/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function germanPartOfSpeech(germanSynonym: string): PartOfSpeech {
  const tags = germanSynonym.match(/\{([^}]*)\}/g)?.join(' ') ?? '';
  if (/\{(m|f|n|pl)\}/.test(tags)) return 'noun';
  if (/\{v[itr]*\}/.test(tags)) return 'verb';
  if (/\{adj\}/.test(tags)) return 'adj';
  if (/\{adv\}/.test(tags)) return 'adv';
  return '';
}

/** Normalisiert einen englischen Ausdruck zu einem Nachschlage-Schlüssel oder `null`. */
export function toKey(englishSynonym: string): { key: string; isVerb: boolean } | null {
  const original = stripAnnotations(englishSynonym).replace(/\([^)]*\)/g, '').trim();
  if (ACRONYM_PATTERN.test(original)) return { key: original, isVerb: false };
  let text = original.toLowerCase();
  text = text.replace(/[’‘]/g, "'").replace(ENGLISH_PLACEHOLDER, ' ').replace(/\s+/g, ' ').trim();
  const isVerb = text.startsWith('to ');
  if (isVerb) text = text.slice(3);
  if (text.length === 0 || SENTENCE_END.test(text) && text.includes(' ')) return null;
  if (!KEY_PATTERN.test(text)) return null;
  if (text.split(' ').length > MAX_KEY_WORDS) return null;
  return { key: text, isVerb };
}

/** Liest unregelmässige Formen aus `to go {went; gone}`. */
function irregularFormsOf(englishSynonym: string): string[] {
  const match = englishSynonym.match(/^to [^{]+\{([^}]*)\}/);
  if (!match?.[1]) return [];
  return match[1]
    .split(/[;,/]/)
    .map((form) => form.trim().toLowerCase())
    .filter((form) => /^[a-z]+$/.test(form));
}

function hasDomainTag(text: string): boolean {
  return /\[[^\]]*\.\]/.test(text) && !/\[(ugs|coll|Br|Am|Austr|Schw|Dt|veraltend)\.?\]/.test(text);
}

function scoreOf(partIndex: number, synonymIndex: number, germanSide: string, englishSynonym: string): number {
  let score = synonymIndex + (partIndex > 0 ? 2 : 0);
  if (hasDomainTag(germanSide) || hasDomainTag(englishSynonym)) score += DOMAIN_PENALTY;
  if (/\((?!sich)[^)]*\)/.test(englishSynonym)) score += 1;
  if (/\([^)]*\)/.test(germanSide)) score += EXPLANATION_PENALTY;
  return score;
}

const GERMAN_WORD = /[A-Za-zÄÖÜäöüß]{3,}/g;

/**
 * Wie oft ein deutsches Wort in Ding vorkommt – ein Ersatz für Worthäufigkeit, die Ding nicht
 * enthält. Häufige Wörter („Haus“) sind meist die gesuchte Übersetzung, seltene
 * („Rohpostkapsel“) eher Fachbegriffe.
 */
function countGermanWords(lines: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const germanSide = line.split(' :: ')[0] ?? '';
    for (const word of stripAnnotations(germanSide).match(GERMAN_WORD) ?? []) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return counts;
}

const GERMAN_FUNCTION_WORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
  'sich', 'mit', 'von', 'vom', 'zum', 'zur', 'auf', 'für', 'und', 'oder', 'aus', 'bei', 'nach',
  'über', 'unter', 'etw', 'jdn', 'jdm', 'jds', 'nicht', 'sein', 'haben', 'werden', 'machen',
]);

/**
 * Bewertet die erste Übersetzung: ihr seltenstes Inhaltswort bestimmt, wie gebräuchlich sie ist,
 * und jedes zusätzliche Wort macht sie spezieller („Haus“ vor „Haus mit Cannabisplantage“).
 */
function commonness(german: string, counts: Map<string, number>): number {
  const firstSynonym = (german.split('; ')[0] ?? '').replace(/\([^)]*\)/g, '');
  const words = firstSynonym.match(GERMAN_WORD) ?? [];
  const contentWords = words.filter((word) => !GERMAN_FUNCTION_WORDS.has(word.toLowerCase()));
  if (contentWords.length === 0) return 0;
  const rarest = Math.min(...contentWords.map((word) => counts.get(word) ?? 0));
  return COMMONNESS_WEIGHT * Math.log2(1 + rarest) - EXTRA_WORD_PENALTY * (words.length - 1);
}

const COMMONNESS_WEIGHT = 0.6;
const EXTRA_WORD_PENALTY = 0.8;
const COMPOUND_PENALTY = 3;
const DOMAIN_PENALTY = 2;
const EXPLANATION_PENALTY = 2;

function addCandidate(candidates: Map<string, Candidate[]>, key: string, candidate: Candidate): void {
  const list = candidates.get(key);
  if (list) list.push(candidate);
  else candidates.set(key, [candidate]);
}

export function parseDing(text: string): DingDictionary {
  const candidates = new Map<string, Candidate[]>();
  const forms: IrregularForms = {};
  let order = 0;
  const lines = text.split('\n').filter((line) => !line.startsWith('#') && line.includes(' :: '));
  const counts = countGermanWords(lines);

  for (const line of lines) {
    const [germanSide, englishSide] = line.split(' :: ');
    if (!germanSide || !englishSide) continue;
    const germanParts = splitOutsideBrackets(germanSide, '|');
    const englishParts = splitOutsideBrackets(englishSide, '|');
    const partCount = Math.min(germanParts.length, englishParts.length);

    for (let partIndex = 0; partIndex < partCount; partIndex++) {
      const germanPart = germanParts[partIndex] ?? '';
      const englishPart = englishParts[partIndex] ?? '';
      const germanSynonyms = splitOutsideBrackets(germanPart, ';');
      const german = germanSynonyms.map(cleanGerman).filter(Boolean).join('; ');
      if (german.length === 0 || german.length > MAX_GERMAN_LENGTH) continue;
      const germanPos = germanSynonyms.map(germanPartOfSpeech).find((pos) => pos !== '') ?? '';

      splitOutsideBrackets(englishPart, ';').forEach((englishSynonym, synonymIndex) => {
        const parsed = toKey(englishSynonym);
        if (!parsed) return;
        if (parsed.isVerb) {
          for (const form of irregularFormsOf(englishSynonym)) {
            if (form !== parsed.key && !(form in forms)) forms[form] = parsed.key;
          }
        }
        const pos: PartOfSpeech = parsed.isVerb ? 'verb' : germanPos;
        const score = scoreOf(partIndex, synonymIndex, germanPart, englishSynonym) - commonness(german, counts);
        addCandidate(candidates, parsed.key, { german, pos, score, order: order++ });
        // Ding kennt manche Grundwörter nur in Zusammensetzungen („domestic rabbit“ → Kaninchen).
        const words = parsed.key.split(' ');
        if (words.length === 2 && pos === 'noun' && partIndex === 0 && words[1]) {
          addCandidate(candidates, words[1], { german, pos, score: score + COMPOUND_PENALTY, order: order++ });
        }
      });
    }
  }

  const entries: DictionaryShard = {};
  for (const [key, list] of candidates) {
    list.sort((a, b) => a.score - b.score || a.german.length - b.german.length || a.order - b.order);
    const seen = new Set<string>();
    const best: Translation[] = [];
    for (const candidate of list) {
      if (seen.has(candidate.german)) continue;
      seen.add(candidate.german);
      best.push([candidate.german, candidate.pos]);
      if (best.length === MAX_TRANSLATIONS) break;
    }
    entries[key] = best;
  }
  return { entries, forms };
}

/** Shard-Name für einen Schlüssel: Anfangsbuchstabe a–z, sonst "_". */
export function shardOf(key: string): string {
  const first = key.charAt(0);
  return first >= 'a' && first <= 'z' ? first : '_';
}

export function splitIntoShards(entries: DictionaryShard): Record<string, DictionaryShard> {
  const shards: Record<string, DictionaryShard> = {};
  for (const key of Object.keys(entries).sort()) {
    const shard = (shards[shardOf(key)] ??= {});
    shard[key] = entries[key] ?? [];
  }
  return shards;
}
