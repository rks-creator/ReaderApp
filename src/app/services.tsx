import { createContext, useContext, type ReactNode } from 'react';
import type { Dictionary } from '../lib/dictionary/lookup';
import type { LibraryStore } from '../lib/storage/db';
import type { SentenceTranslator } from '../lib/translation/translator';

export interface AppServices {
  /** `null`, wenn IndexedDB nicht verfügbar ist (UC-002, E1). */
  store: LibraryStore | null;
  dictionary: Dictionary;
  /** UC-007 Stufe 2: maschinelle Übersetzung. */
  translator: SentenceTranslator;
}

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({ services, children }: { services: AppServices; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices ausserhalb von ServicesProvider');
  return services;
}
