import type { ColorScheme, FontFamily, FontSizeStep, ReaderSettings } from '../../lib/storage/db';

const FONT_SIZES: FontSizeStep[] = [1, 2, 3, 4, 5];
const SCHEMES: { value: ColorScheme; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'auto', label: 'Automatisch' },
];
const FAMILIES: { value: FontFamily; label: string }[] = [
  { value: 'serif', label: 'Mit Serifen' },
  { value: 'sans', label: 'Ohne Serifen' },
];

interface Props {
  settings: ReaderSettings;
  saveFailed: boolean;
  onChange: (change: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

/** UC-005: Schriftgrösse, Farbschema und Schriftart. */
export function SettingsPanel({ settings, saveFailed, onChange, onClose }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-label="Leseeinstellungen" onClick={(event) => event.stopPropagation()}>
        <h2 className="sheet__title">Leseeinstellungen</h2>

        <fieldset className="choice">
          <legend>Schriftgrösse</legend>
          <div className="segmented">
            <button
              type="button"
              aria-label="Schrift kleiner"
              disabled={settings.fontSize === 1}
              onClick={() => onChange({ fontSize: (settings.fontSize - 1) as FontSizeStep })}
            >
              A−
            </button>
            <span aria-live="polite" className="segmented__value">
              Stufe {settings.fontSize} von {FONT_SIZES.length}
            </span>
            <button
              type="button"
              aria-label="Schrift grösser"
              disabled={settings.fontSize === 5}
              onClick={() => onChange({ fontSize: (settings.fontSize + 1) as FontSizeStep })}
            >
              A+
            </button>
          </div>
        </fieldset>

        <fieldset className="choice">
          <legend>Farbschema</legend>
          <div className="segmented">
            {SCHEMES.map((scheme) => (
              <button
                key={scheme.value}
                type="button"
                aria-pressed={settings.colorScheme === scheme.value}
                onClick={() => onChange({ colorScheme: scheme.value })}
              >
                {scheme.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="choice">
          <legend>Schriftart</legend>
          <div className="segmented">
            {FAMILIES.map((family) => (
              <button
                key={family.value}
                type="button"
                aria-pressed={settings.fontFamily === family.value}
                onClick={() => onChange({ fontFamily: family.value })}
              >
                {family.label}
              </button>
            ))}
          </div>
        </fieldset>

        {saveFailed && (
          <p role="alert" className="notice notice--error">
            Einstellungen konnten nicht gespeichert werden.
          </p>
        )}
      </section>
    </div>
  );
}
