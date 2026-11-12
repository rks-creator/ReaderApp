import { useRegisterSW } from 'virtual:pwa-register/react';

/** UC-006, A2: neue Version verfügbar – Bücher, Fortschritt und Einstellungen bleiben in IndexedDB erhalten. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <aside className="toast toast--top" role="status">
      <span>Neue Version verfügbar</span>
      <button type="button" className="button" onClick={() => void updateServiceWorker(true)}>
        Neu laden
      </button>
    </aside>
  );
}
