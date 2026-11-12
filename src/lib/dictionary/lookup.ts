import { ACRONYM_PATTERN, shardOf } from './ding';
import { baseFormsOf } from './lemmatize';
import type { DictionaryShard, IrregularForms, LookupGroup, LookupResult } from './types';

/** Lädt Wörterbuchdateien; in der App per `fetch`, in Tests aus dem Speicher. */
export interface DictionarySource {
  loadShard(name: string): Promise<DictionaryShard>;
  loadForms(): Promise<IrregularForms>;
}

export class DictionaryUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Das Wörterbuch ist nicht verfügbar.', { cause });
    this.name = 'DictionaryUnavailableError';
  }
}

const EDGE_PUNCTUATION = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

/** UC-004: Satzzeichen am Rand entfernen, typografische Apostrophe vereinheitlichen, klein schreiben. */
export function normalizeWord(raw: string): string {
  return raw.replace(/[’‘]/g, "'").replace(EDGE_PUNCTUATION, '').toLowerCase();
}

export class Dictionary {
  private readonly shards = new Map<string, Promise<DictionaryShard>>();
  private forms: Promise<IrregularForms> | undefined;

  constructor(private readonly source: DictionarySource) {}

  private shard(name: string): Promise<DictionaryShard> {
    let shard = this.shards.get(name);
    if (!shard) {
      shard = this.source.loadShard(name);
      shard.catch(() => this.shards.delete(name));
      this.shards.set(name, shard);
    }
    return shard;
  }

  private irregularForms(): Promise<IrregularForms> {
    if (!this.forms) {
      this.forms = this.source.loadForms();
      this.forms.catch(() => (this.forms = undefined));
    }
    return this.forms;
  }

  private async entry(key: string): Promise<LookupGroup['translations'] | undefined> {
    const shard = await this.shard(shardOf(key));
    return Object.hasOwn(shard, key) ? shard[key] : undefined;
  }

  /**
   * Schlägt ein angetipptes Wort nach: zuerst die Form im Text, dann die erste gefundene
   * Grundform (UC-004, A1), dann Wendungen mit den folgenden Wörtern (UC-004, A2).
   */
  async lookup(rawWord: string, followingWords: string[] = []): Promise<LookupResult> {
    const word = normalizeWord(rawWord);
    const groups: LookupGroup[] = [];
    if (word.length === 0) return { word, groups };

    try {
      const stripped = rawWord.replace(EDGE_PUNCTUATION, '');
      if (ACRONYM_PATTERN.test(stripped)) {
        const acronym = await this.entry(stripped);
        if (acronym?.length) groups.push({ headword: stripped, translations: acronym });
      }

      const exact = await this.entry(word);
      if (exact?.length) groups.push({ headword: word, translations: exact });

      for (const base of baseFormsOf(word, await this.irregularForms())) {
        const translations = await this.entry(base);
        if (translations?.length) {
          groups.push({ headword: base, inflectedFrom: word, translations });
          break;
        }
      }

      const next = followingWords.map(normalizeWord).filter(Boolean);
      const lemma = groups.find((group) => group.inflectedFrom)?.headword ?? word;
      for (let length = Math.min(3, next.length); length >= 1; length--) {
        const phrase = [lemma, ...next.slice(0, length)].join(' ');
        const translations = await this.entry(phrase);
        if (translations?.length) {
          groups.push({ headword: phrase, translations });
          break;
        }
      }
    } catch (error) {
      throw new DictionaryUnavailableError(error);
    }
    return { word, groups };
  }
}

/** Lädt das Wörterbuch aus `<base>dict/`, wie es `scripts/build-dictionary.ts` erzeugt. */
export function fetchDictionarySource(baseUrl: string): DictionarySource {
  const load = async <T>(file: string): Promise<T> => {
    const response = await fetch(`${baseUrl}dict/${file}`);
    if (!response.ok) throw new Error(`HTTP ${response.status} für ${file}`);
    return (await response.json()) as T;
  };
  return {
    loadShard: (name) => load<DictionaryShard>(`${name}.json`),
    loadForms: () => load<IrregularForms>('forms.json'),
  };
}
