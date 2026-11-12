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
| Satzübersetzung | Bergamot (`@browsermt/bergamot-translator`, WebAssembly im Web Worker, MPL 2.0) mit Modell Englisch → Deutsch |
| Tests | Vitest + Testing Library (Unit/Komponenten), Playwright mit iPad-Emulation (E2E) |
| Deployment | GitHub Actions → GitHub Pages |

## Ordnerstruktur

```
src/
  app/                  App-Shell, Navigation, Update-Hinweis, Fehlergrenze
  features/
    library/            UC-001, UC-002 – Bibliothek, Import
    reader/             UC-003 – Leseansicht (Scrollen), Inhaltsverzeichnis
    dictionary/         UC-004 – Wort-Erkennung beim Tippen, Popup
    settings/           UC-005 – Leseeinstellungen
    selection/          UC-007 – Textstelle markieren und übersetzen
  lib/
    epub/               EPUB entpacken, Metadaten, Kapitel, Bereinigung
    storage/            IndexedDB-Schema und Zugriffe
    dictionary/         Wörterbuch laden, Lookup, Grundformbildung (Lemmatisierung)
    translation/        Satzübersetzung (Bergamot) hinter einer schmalen Schnittstelle
scripts/
  build-dictionary.ts   erzeugt public/dict/ aus der Wörterbuchquelle (im CI)
  fetch-translation-model.ts  lädt Engine und Modell nach public/mt/ (im CI)
tests/fixtures/         Test-EPUBs, kleines Test-Wörterbuch
e2e/                    Playwright-Tests
```

Regeln:
- `src/lib/` kennt kein React und ist vollständig mit Vitest testbar.
- Komponenten greifen nie direkt auf IndexedDB zu, sondern über Hooks des Features.
- Zur Laufzeit gibt es keine Requests an fremde Origins.

## Wort-Tippen (Kernmechanik)

1. Der Kapiteltext wird bereinigt und in einen Container gerendert.
2. Beim Rendern wird jedes Wort (`Intl.Segmenter`, `granularity: 'word'`) in ein
   `<span class="w">` gelegt; das angetippte Wort ist damit direkt `event.target`.
3. Ein kurzes Tippen (< 500 ms, Bewegung < 10 px) gilt als Wort-Tippen; jede grössere
   Bewegung oder ein `pointercancel` (Browser übernimmt das Scrollen) nicht.
4. `user-select: none` und `-webkit-touch-callout: none` auf dem Lesecontainer verhindern
   das System-Kontextmenü.
5. Lookup: exakte Form → Grundformen (unregelmässige Formen aus Ding + Endungsregeln) →
   Wendungen mit Nachbarwörtern.

## Wörterbuch

- Quelle: Ding (TU Chemnitz, `de-en.txt`, GPL). Sie wird beim Build im GitHub-Actions-Workflow
  heruntergeladen und von `scripts/build-dictionary.ts` in kompakte JSON-Dateien umgewandelt
  (aufgeteilt nach Anfangsbuchstaben, damit der Start schnell bleibt).
- Ohne Internetzugang verwendet das Skript das kleine Test-Wörterbuch aus `tests/fixtures/`.
- Die Dateien liegen unter `public/dict/` und sind im Precache des Service Workers.
- Lizenz und Herkunft werden in der App unter „Info“ angezeigt.

## Satzübersetzung (UC-007)

- Engine: `@browsermt/bergamot-translator` (WebAssembly, ein Web Worker, keine Threads –
  braucht daher kein `SharedArrayBuffer` und keine COOP/COEP-Header, die GitHub Pages nicht setzen kann).
- Modell Englisch → Deutsch von Mozilla (`model.ende.intgemm.alphas.bin`, `lex.50.50.ende.s2t.bin`,
  `vocab.deen.spm`, zusammen ca. 22 MB). `scripts/fetch-translation-model.ts` lädt die Dateien beim
  Build, prüft die SHA-256-Prüfsummen und legt sie mit einer eigenen `registry.json` unter `public/mt/` ab.
- Engine und Modell sind **nicht** im Precache, sondern werden beim ersten Gebrauch geladen und vom
  Service Worker per Cache-First gespeichert. So bleibt der erste Start klein.
- Markieren: Langes Drücken (0,5 s ohne Bewegung) startet die Auswahl; ab dann verhindert ein
  nicht-passiver `touchmove`-Listener das Scrollen, bis der Finger gehoben wird.

## Datenmodell (IndexedDB `readerapp`)

| Store | Schlüssel | Inhalt |
|---|---|---|
| `books` | `id` (UUID) | Titel, Autor, Sprache, EPUB-Kennung, Titelbild (Blob), Inhaltsverzeichnis, Importdatum |
| `bookFiles` | `bookId` | Original-EPUB als Blob |
| `progress` | `bookId` | Kapitelindex, Position im Kapitel (0–1), Gesamtfortschritt in %, zuletzt gelesen |
| `settings` | `'reader'` | Schriftgrösse, Farbschema, Schriftart |

## Traceability

> Wird durch den Skill `traceability-manager` gepflegt, sobald Code existiert.
