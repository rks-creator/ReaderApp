# ReaderApp

Englische EPUB-Bücher auf dem iPad lesen – ein Wort antippen und sofort die deutsche
Übersetzung sehen. Offline, ohne App Store, ohne Konto, ohne Tracking.

> Status: erste Version (UC-001 bis UC-006 umgesetzt).

## Auf dem iPad nutzen

1. Die Adresse der App in **Safari** öffnen: https://rks-creator.github.io/ReaderApp/
2. **Teilen** → **Zum Home-Bildschirm** → **Hinzufügen**.
3. Die App über das neue Symbol starten. Ab jetzt funktioniert sie auch im Flugmodus.

Deine Bücher werden nur auf deinem iPad gespeichert und nie hochgeladen.

Beim ersten Öffnen lädt die App das Wörterbuch (rund 6 MB übertragen, 23 MB im Speicher).
Danach funktioniert alles offline.

## Wörterbuch

Ding – Deutsch-Englisch-Wörterbuch der TU Chemnitz (© Frank Richter, GPL Version 2 oder später,
https://dict.tu-chemnitz.de/). Es wird beim Build heruntergeladen und nicht im Repository gespeichert.

## Entwicklung

Siehe [`CLAUDE.md`](CLAUDE.md) für Befehle und Konventionen und [`specs/`](specs/) für die
Anforderungen.

| Use Case | Titel |
|---|---|
| UC-001 | Buch importieren |
| UC-002 | Bibliothek anzeigen |
| UC-003 | Buch lesen |
| UC-004 | Wort übersetzen |
| UC-005 | Leseeinstellungen anpassen |
| UC-006 | App offline nutzen |
