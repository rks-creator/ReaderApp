import { useEffect, useState } from 'react';

interface DictionaryMeta {
  source: 'ding' | 'fixture';
  version: string;
  entries: number;
}

/** Herkunft und Lizenz des Wörterbuchs (GPL verlangt die Nennung). */
export function InfoDialog({ onClose }: { onClose: () => void }) {
  const [meta, setMeta] = useState<DictionaryMeta | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}dict/meta.json`)
      .then((response) => (response.ok ? (response.json() as Promise<DictionaryMeta>) : null))
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-label="Info" onClick={(event) => event.stopPropagation()}>
        <h2 className="sheet__title">ReaderApp</h2>
        <p>Englische Bücher lesen – Wort antippen, Übersetzung sehen. Deine Bücher bleiben auf diesem Gerät.</p>
        <h3>Wörterbuch</h3>
        <p>
          Ding – Deutsch-Englisch-Wörterbuch der TU Chemnitz, © Frank Richter, lizenziert unter der GNU General Public
          License, Version 2 oder später. <span lang="en">https://dict.tu-chemnitz.de/</span>
        </p>
        {meta && (
          <p className="popup__muted">
            {meta.source === 'ding' ? `Version ${meta.version}` : 'Test-Wörterbuch'} ·{' '}
            {meta.entries.toLocaleString('de-CH')} Einträge
          </p>
        )}
        <button type="button" className="button" onClick={onClose}>
          Schliessen
        </button>
      </section>
    </div>
  );
}
