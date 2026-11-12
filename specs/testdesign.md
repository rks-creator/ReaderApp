# Testdesign – ReaderApp

## Scope

Abgedeckte Use Cases: UC-001 bis UC-006.

Ausserhalb des Scope:
- Tests auf echten iPads – werden manuell anhand der Checkliste im Skill `ipad-pwa-check`
  durchgeführt.
- Inhaltliche Qualität der Wörterbuchquelle.

---

## Testumgebung

| Komponente | Annahme |
|---|---|
| Unit/Komponenten | Vitest mit jsdom und `fake-indexeddb` |
| E2E | Playwright gegen `npm run preview`, Geräteprofil `iPad (gen 7)` (WebKit) |
| Testdaten | `tests/fixtures/`: `alice.epub` (gemeinfrei), `kaputt.epub`, `drm.epub`, kleines Test-Wörterbuch |

## Teststrategie

| Typ | Kürzel | Scope | Werkzeug |
|---|---|---|---|
| Unit Test | `UT` | Reine Logik in `src/lib/` (EPUB-Parsing, Lookup, Lemmatisierung, Speicher) | Vitest |
| Komponententest | `CT` | Einzelne Features mit gerenderter UI | Vitest + Testing Library |
| End-to-End | `E2E` | Vollständige Abläufe inkl. Service Worker und Offline | Playwright |

Testnamen beginnen immer mit der TC-ID: `it('TC-010 – …')`.

---

## Test Cases

| TC-ID | UC | Typ | Beschreibung |
|---|---|---|---|
| TC-001 | UC-001 | UT | Gültiges EPUB: Titel, Autor, Sprache, Inhaltsverzeichnis werden ausgelesen |
| TC-002 | UC-001 | UT | Ungültige Datei wird mit Fehlermeldung abgelehnt |
| TC-003 | UC-001 | UT | DRM-geschütztes EPUB wird erkannt und abgelehnt |
| TC-004 | UC-001 | CT | Erneuter Import fragt nach „Ersetzen?“ und behält den Lesefortschritt |
| TC-005 | UC-001 | E2E | Import über Datei-Input → Buch erscheint in der Bibliothek |
| TC-006 | UC-002 | CT | Sortierung nach „zuletzt gelesen“, Fortschritt in % sichtbar |
| TC-007 | UC-002 | CT | Leere Bibliothek zeigt Hinweistext |
| TC-008 | UC-002 | CT | Buch entfernen nach Bestätigung löscht Buch und Fortschritt |
| TC-009 | UC-003 | E2E | Weiterlesen öffnet die zuletzt gelesene Stelle |
| TC-010 | UC-003 | CT | Inhaltsverzeichnis springt zum gewählten Kapitel |
| TC-011 | UC-003 | UT | Bereinigung entfernt Skripte, Event-Handler und externe Ressourcen |
| TC-012 | UC-003 | E2E | Kurzes Tippen auf ein Wort blättert nicht |
| TC-013 | UC-004 | UT | Lookup exakter Form („house“ → „Haus“) |
| TC-014 | UC-004 | UT | Lemmatisierung: „mice“ → „mouse“, „running“ → „run“, „went“ → „go“ |
| TC-015 | UC-004 | UT | Satzzeichen und Grossschreibung werden ignoriert |
| TC-016 | UC-004 | UT | Unbekanntes Wort liefert „kein Eintrag“ |
| TC-017 | UC-004 | E2E | Tippen auf Wort zeigt Popup in < 300 ms, auch offline |
| TC-018 | UC-005 | CT | Schriftgrösse ändern hält die erste sichtbare Textstelle sichtbar |
| TC-019 | UC-005 | CT | Farbschema bleibt nach Neustart erhalten |
| TC-020 | UC-006 | E2E | Start offline nach erstem Laden zeigt Bibliothek und übersetzt |
| TC-021 | UC-006 | E2E | Manifest, Icons und Apple-Meta-Tags vorhanden |
