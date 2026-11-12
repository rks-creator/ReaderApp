/**
 * Traceability:
 *   UC: UC-004 (Wort übersetzen)
 *   TCs: TC-013, TC-014, TC-015, TC-016, TC-022
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDing, splitIntoShards, splitOutsideBrackets, toKey } from './ding';
import { baseFormsOf } from './lemmatize';
import { Dictionary, DictionaryUnavailableError, normalizeWord, type DictionarySource } from './lookup';

const sample = parseDing(readFileSync('tests/fixtures/ding-sample.txt', 'utf8'));

function memorySource(): DictionarySource {
  const shards = splitIntoShards(sample.entries);
  return {
    loadShard: async (name) => shards[name] ?? {},
    loadForms: async () => sample.forms,
  };
}

const firstTranslations = (groupIndex: number, result: Awaited<ReturnType<Dictionary['lookup']>>) =>
  result.groups[groupIndex]?.translations.map(([german]) => german) ?? [];

describe('Ding-Umwandlung', () => {
  it('TC-022 – trennt Synonyme nicht innerhalb von Klammern', () => {
    expect(splitOutsideBrackets('to go {went; gone}; to walk', ';')).toEqual(['to go {went; gone}', 'to walk']);
  });

  it('TC-022 – normalisiert Schlüssel: „to“, Platzhalter und Annotationen entfernt', () => {
    expect(toKey('to say sth. {said; said}')).toEqual({ key: 'say', isVerb: true });
    expect(toKey('vest [Am.]')).toEqual({ key: 'vest', isVerb: false });
    expect(toKey('I go home.')).toBeNull();
  });

  it('TC-022 – speichert Abkürzungen in Grossschreibung, getrennt von normalen Wörtern', () => {
    const parsed = parseDing('Zollbegleitscheinheft {n} :: TIR\nmüde {adj} :: tired');
    expect(parsed.entries.TIR?.[0]?.[0]).toBe('Zollbegleitscheinheft');
    expect(parsed.entries.tir).toBeUndefined();
  });

  it('TC-022 – ordnet Teileinträge einander zu und erkennt die Wortart', () => {
    expect(sample.entries.house?.[0]).toEqual(['Haus', 'noun']);
    expect(sample.entries.houses?.[0]).toEqual(['Häuser', 'noun']);
    expect(sample.entries.go?.[0]).toEqual(['gehen', 'verb']);
    expect(sample.entries.say?.[0]).toEqual(['sagen; äußern', 'verb']);
  });

  it('TC-022 – liest unregelmässige Formen aus den geschweiften Klammern', () => {
    expect(sample.forms).toMatchObject({ went: 'go', gone: 'go', said: 'say', gave: 'give', given: 'give' });
  });

  it('TC-022 – stellt allgemeine Bedeutungen vor Fachbegriffe', () => {
    expect(sample.entries.house?.map(([german]) => german)).toEqual(['Haus', 'Geschlecht; Familie']);
  });
});

describe('Grundformen', () => {
  it('TC-014 – leitet regelmässige Formen ab', () => {
    expect(baseFormsOf('jumped', {})).toContain('jump');
    expect(baseFormsOf('cities', {})).toContain('city');
    expect(baseFormsOf('happiest', {})).toContain('happy');
    expect(baseFormsOf('running', {})).toContain('run');
    expect(baseFormsOf('watches', {})).toContain('watch');
  });

  it('TC-014 – bevorzugt unregelmässige Formen aus Ding', () => {
    expect(baseFormsOf('went', { went: 'go' })[0]).toBe('go');
  });
});

describe('Nachschlagen', () => {
  it('TC-013 – findet die exakte Form', async () => {
    const result = await new Dictionary(memorySource()).lookup('house');
    expect(firstTranslations(0, result)[0]).toBe('Haus');
  });

  it('TC-014 – zeigt die Grundform bei unregelmässiger Form', async () => {
    const result = await new Dictionary(memorySource()).lookup('went');
    const lemma = result.groups.find((group) => group.inflectedFrom === 'went');
    expect(lemma?.headword).toBe('go');
    expect(lemma?.translations[0]?.[0]).toBe('gehen');
  });

  it('TC-014 – zeigt die Grundform bei regelmässiger Form', async () => {
    const result = await new Dictionary(memorySource()).lookup('jumped');
    expect(result.groups.some((group) => group.headword === 'jump' && group.inflectedFrom === 'jumped')).toBe(true);
  });

  it('TC-015 – ignoriert Satzzeichen und Grossschreibung', async () => {
    expect(normalizeWord('“House,”')).toBe('house');
    const result = await new Dictionary(memorySource()).lookup('House,');
    expect(firstTranslations(0, result)[0]).toBe('Haus');
  });

  it('TC-016 – liefert keine Gruppen für unbekannte Wörter', async () => {
    const result = await new Dictionary(memorySource()).lookup('Jabberwocky');
    expect(result).toEqual({ word: 'jabberwocky', groups: [] });
  });

  it('UC-004 A2 – findet Wendungen mit den folgenden Wörtern', async () => {
    const result = await new Dictionary(memorySource()).lookup('give', ['up', 'the']);
    expect(result.groups.map((group) => group.headword)).toContain('give up');
  });

  it('UC-004 E2 – meldet ein nicht verfügbares Wörterbuch', async () => {
    const failing: DictionarySource = {
      loadShard: () => Promise.reject(new Error('offline')),
      loadForms: () => Promise.reject(new Error('offline')),
    };
    await expect(new Dictionary(failing).lookup('house')).rejects.toBeInstanceOf(DictionaryUnavailableError);
  });
});
