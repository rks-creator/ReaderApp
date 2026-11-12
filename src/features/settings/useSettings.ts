import { useCallback, useEffect, useRef, useState } from 'react';
import { useServices } from '../../app/services';
import { DEFAULT_SETTINGS, type ReaderSettings } from '../../lib/storage/db';

export function useSettings() {
  const { store } = useServices();
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const current = useRef(settings);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let active = true;
    store
      ?.getSettings()
      .then((loaded) => {
        if (!active) return;
        current.current = loaded;
        setSettings(loaded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [store]);

  /** UC-005: sofort anwenden, danach speichern; schlägt das fehl, gilt die Änderung nur bis zum Neustart. */
  const update = useCallback(
    (change: Partial<ReaderSettings>) => {
      const next = { ...current.current, ...change };
      current.current = next;
      setSettings(next);
      if (!store) {
        setSaveFailed(true);
        return;
      }
      store
        .saveSettings(next)
        .then(() => setSaveFailed(false))
        .catch(() => setSaveFailed(true));
    },
    [store],
  );

  return { settings, update, saveFailed };
}
