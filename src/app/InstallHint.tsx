import { useState } from 'react';

const DISMISSED_KEY = 'readerapp.installHintDismissed';

function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** UC-006 Schritt 3: Hinweis, solange die App nicht vom Home-Bildschirm gestartet wurde. */
export function InstallHint() {
  const [visible, setVisible] = useState(() => !isStandalone() && !wasDismissed());
  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Ohne Speicher erscheint der Hinweis beim nächsten Start wieder – das ist in Ordnung.
    }
    setVisible(false);
  };

  return (
    <aside className="toast" role="note">
      <span>Für die Nutzung als App: Teilen → „Zum Home-Bildschirm“</span>
      <button type="button" className="button button--ghost" onClick={dismiss} aria-label="Hinweis schliessen">
        ✕
      </button>
    </aside>
  );
}
