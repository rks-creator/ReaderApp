# Architektur – ReaderApp

## Ziel

Eine Web-App zum Lesen englischer EPUB-Bücher auf dem iPad, bei der ein einfaches Antippen
eines Wortes sofort die deutsche Übersetzung zeigt – offline, ohne App Store, ohne Server.

## Plattform-Entscheidungen

| Entscheidung | Begründung |
|---|---|
| Progressive Web App statt nativer App | Kein App Store, kein Apple-Entwicklerkonto, keine 7-Tage-Neuinstallation. Installation über Safari → „Zum Home-Bildschirm“. |
| Eigenes Offline-Wörterbuch | Web-Apps können das iPad-Systemwörterbuch nicht aufrufen. Der Weg über das Kontextmenü ist ausdrücklich nicht gewünscht. |
| Hosting auf GitHub Pages | Kostenlos bei öffentlichem Repository, HTTPS automatisch (Pflicht für Service Worker), Deployment per GitHub Actions. |
| Alle Daten lokal (IndexedDB) | Bücher verlassen das iPad nie; kein Backend nötig. |

## Stack

| Bereich | Technologie |
|---|---|
| Build | Vite + TypeScript (strict) |
| UI | React 18 |
| PWA | `vite-plugin-pwa` (Workbox) – Precache von App-Shell und Wörterbuch, Update-Hinweis |
| EPUB | `JSZip` zum Entpacken, eigener Parser für OPF/NCX/Navigation (DOMParser) |
| Bereinigung | `DOMPurify` für Kapitel-XHTML |
| Speicher | IndexedDB über `idb` |
| Tests | Vitest + Testing Library (Unit/Komponenten), Playwright mit iPad-Emulation (E2E) |
| Deployment | GitHub Actions → GitHub Pages |

## Ordnerstruktur

```
src/
  app/                  App-Shell, Navigation, Update-Hinweis, Fehlergrenze
  features/
    library/            UC-001, UC-002 – Bibliothek, Import
    reader/             UC-003 – Leseansicht, Blättern, Inhaltsverzeichnis
    dictionary/         UC-004 – Wort-Erkennung beim Tippen, Popup
    settings/           UC-005 – Leseeinstellungen
  lib/
    epub/               EPUB entpacken, Metadaten, Kapitel, Bereinigung
    storage/            IndexedDB-Schema und Zugriffe
    dictionary/         Wörterbuch laden, Lookup, Grundformbildung (Lemmatisierung)
scripts/
  build-dictionary.ts   erzeugt public/dict/ aus der Wörterbuchquelle (im CI)
tests/fixtures/         Test-EPUBs, kleines Test-Wörterbuch
e2e/                    Playwright-Tests
```

Regeln:
- `src/lib/` kennt kein React und ist vollständig mit Vitest testbar.
- Komponenten greifen nie direkt auf IndexedDB zu, sondern über Hooks des Features.
- Zur Laufzeit gibt es keine Requests an fremde Origins.

## Wort-Tippen (Kernmechanik)

1. Der Kapiteltext wird bereinigt und in einen Container gerendert.
2. Ein `pointerup`-Handler am Container ermittelt über `document.caretRangeFromPoint`
   die Position und erweitert sie auf Wortgrenzen (`Intl.Segmenter` mit `granularity: 'word'`).
3. Ein kurzes Tippen (< 300 ms, Bewegung < 10 px) gilt als Wort-Tippen; Wischen blättert.
4. `user-select: none` und `-webkit-touch-callout: none` auf dem Lesecontainer verhindern
   das System-Kontextmenü.
5. Lookup: exakte Form → Grundformen (Liste unregelmässiger Formen + Endungsregeln) →
   Wendungen mit Nachbarwörtern.

## Wörterbuch

- Quelle wird beim Build im GitHub-Actions-Workflow heruntergeladen und in kompakte
  JSON-Dateien umgewandelt (aufgeteilt nach Anfangsbuchstaben, damit der Start schnell bleibt).
- Die Dateien liegen unter `public/dict/` und sind im Precache des Service Workers.
- Lizenz und Herkunft werden in der App unter „Info“ angezeigt.
- Offene Entscheidung zur Quelle: siehe UC-004, Open Items.

## Datenmodell (IndexedDB `readerapp`)

| Store | Schlüssel | Inhalt |
|---|---|---|
| `books` | `id` (UUID) | Titel, Autor, Sprache, EPUB-Kennung, Titelbild (Blob), Inhaltsverzeichnis, Importdatum |
| `bookFiles` | `bookId` | Original-EPUB als Blob |
| `progress` | `bookId` | Kapitelindex, Position im Kapitel (0–1), Gesamtfortschritt in %, zuletzt gelesen |
| `settings` | `'reader'` | Schriftgrösse, Farbschema, Schriftart |

## Traceability

> Wird durch den Skill `traceability-manager` gepflegt, sobald Code existiert.
