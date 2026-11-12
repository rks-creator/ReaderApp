import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ServicesProvider } from './app/services';
import './app/styles.css';
import { Dictionary, fetchDictionarySource } from './lib/dictionary/lookup';
import { LibraryStore } from './lib/storage/db';

async function start(): Promise<void> {
  const store = await LibraryStore.open().catch(() => null);
  // UC-006: iPadOS darf Daten von Web-Apps löschen; dauerhafter Speicher macht das unwahrscheinlicher.
  void navigator.storage?.persist?.().catch(() => false);
  const dictionary = new Dictionary(fetchDictionarySource(import.meta.env.BASE_URL));

  const root = document.getElementById('root');
  if (!root) throw new Error('#root fehlt');
  createRoot(root).render(
    <StrictMode>
      <ServicesProvider services={{ store, dictionary }}>
        <App />
      </ServicesProvider>
    </StrictMode>,
  );
}

void start();
