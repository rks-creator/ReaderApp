import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ServicesProvider } from '../src/app/services';
import { parseDing, splitIntoShards } from '../src/lib/dictionary/ding';
import { Dictionary } from '../src/lib/dictionary/lookup';
import { LibraryStore } from '../src/lib/storage/db';
import type { SentenceTranslator } from '../src/lib/translation/translator';

let dbCounter = 0;

export function sampleDictionary(): Dictionary {
  const { entries, forms } = parseDing(readFileSync('tests/fixtures/ding-sample.txt', 'utf8'));
  const shards = splitIntoShards(entries);
  return new Dictionary({ loadShard: async (name) => shards[name] ?? {}, loadForms: async () => forms });
}

export async function freshStore(): Promise<LibraryStore> {
  return LibraryStore.open(`component-test-${dbCounter++}`);
}

/** Übersetzer für Tests: liefert „DE: <Text>“, ohne Modell. */
export function fakeTranslator(overrides: Partial<SentenceTranslator> = {}): SentenceTranslator {
  return {
    isModelStored: async () => true,
    translate: async (text) => `DE: ${text}`,
    ...overrides,
  };
}

export function renderWithServices(ui: ReactElement, store: LibraryStore | null, translator = fakeTranslator()) {
  return render(
    <ServicesProvider services={{ store, dictionary: sampleDictionary(), translator }}>{ui}</ServicesProvider>,
  );
}

export async function epubFile(bytes: Uint8Array, name = 'alice.epub'): Promise<File> {
  return new File([new Uint8Array(bytes)], name, { type: 'application/epub+zip' });
}
