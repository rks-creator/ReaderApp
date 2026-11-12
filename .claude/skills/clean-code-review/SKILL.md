---
name: clean-code-review
description: Reviewt den gesamten TypeScript/React-Code inkl. Tests nach Clean-Code-Prinzipien und gegen die Specs, behebt kleine Mängel direkt und setzt bei grösseren Lücken TODO-Kommentare mit UC-Referenz. Verwende diesen Skill, wenn Codequalität, Spec-Konformität, Kommentare oder TODOs geprüft bzw. aufgeräumt werden sollen. Für reine Bug-Suche im aktuellen Diff stattdessen /code-review verwenden.
---

# Clean Code Review (TypeScript / React / PWA)

Du bist eine **erfahrene Senior-Frontend-Entwicklerin bzw. ein erfahrener
Senior-Frontend-Entwickler** mit hohen Ansprüchen an Clean Code, Testbarkeit und an
Web-Apps, die offline auf dem iPad laufen.

Aufgabe: Produktionscode und Tests reviewen, kleine Mängel direkt beheben, grössere als
`// TODO [UC-XXX]: …` im Code und im Bericht festhalten – immer mit Bezug auf die Specs.

---

## Grundregel – Prioritätskette

**Specs → Tests → Implementierung**

- Spec widerspricht Code → der Code ist falsch.
- Spec widerspricht Test → der Test ist falsch.
- Test widerspricht Code → der Code ist falsch.
- Specs nie an Tests oder Code anpassen.

---

## Schritt 1 – Specs laden

1. `specs/architecture.md` – Ordnerstruktur, Schichten, erlaubte Abhängigkeiten
2. Alle `specs/UC-*.md` – Abläufe, Alternativ- und Fehlerflüsse, Akzeptanzkriterien, NFRs
3. `specs/testdesign.md` – TC-IDs und welcher TC welchen UC prüft
4. `CLAUDE.md` – Projektkonventionen

## Schritt 2 – Produktionscode reviewen

Lies alle Dateien unter `src/` (ohne `*.test.*`) und `scripts/`.

**2a – Clean Code**
- *Namen*: sprechend, Fachbegriffe aus den Specs (Buch, Bibliothek, Lesefortschritt,
  Wörterbucheintrag). Keine Namen wie `data`, `tmp`, `obj`, `res`.
- *Single Responsibility*: Komponenten rendern, Hooks steuern Zustand, `src/lib/` enthält
  reine Logik ohne React (EPUB-Parsing, Wörterbuch-Lookup, Speicher). Keine
  IndexedDB-Zugriffe direkt in Komponenten.
- *Funktionen*: kurz (Richtwert ≤ 30 Zeilen), eine Abstraktionsebene, keine versteckten
  Seiteneffekte.
- *Duplikation / Magic Values*: wiederholte Logik zusammenführen, Konstanten benennen.
- *Kommentare*: nur das *Warum*. Kein auskommentierter Code. UC-Referenz erwünscht, wenn
  eine Regel aus einer Spec stammt und nicht offensichtlich ist:
  `// UC-004: Flexionsformen auf die Grundform zurückführen, bevor nachgeschlagen wird`

**2b – TypeScript**
- `strict` aktiv, kein `any` (stattdessen `unknown` + Type Guard), keine `!`-Assertions
  ohne Begründung, keine `@ts-ignore` ohne Kommentar.
- Öffentliche Typen in `types.ts` des jeweiligen Features.

**2c – React**
- Function Components und Hooks, keine Klassen.
- Hook-Regeln eingehalten, vollständige Dependency-Arrays, Effekte räumen auf
  (Event-Listener, `URL.revokeObjectURL`, Abbruch laufender Promises).
- Keine teuren Berechnungen im Render ohne `useMemo`, wo es messbar zählt
  (z. B. Tokenisierung eines Kapitels).
- `key` stabil, nicht der Array-Index bei veränderlichen Listen.

**2d – PWA und iPad**
- Touch-Ziele mindestens 44 × 44 pt, keine reine Hover-Bedienung.
- Wort-Tippen funktioniert mit `pointer`-Events, ohne dass das System-Kontextmenü stört.
- Offline: kein Laufzeit-Request ausser an die eigene Origin; Wörterbuch und App-Shell
  sind im Service-Worker-Cache.
- IndexedDB-Fehler (Quota, privater Modus) werden abgefangen und dem Leser angezeigt.
- Inhalte aus EPUB-Dateien werden bereinigt, bevor sie ins DOM kommen (kein Script,
  keine Event-Handler-Attribute, keine externen Ressourcen).

**2e – Spec-Konformität**
- Gibt es für jeden UC-Schritt, Alternativ- und Fehlerfluss eine Umsetzung?
- Gibt es Funktionen ohne UC (Scope Creep)? Im Bericht nennen.

## Schritt 3 – Tests reviewen

Lies `src/**/*.test.ts(x)` (Vitest) und `e2e/*.spec.ts` (Playwright).

- Jeder Test trägt die TC-ID im Namen: `it('TC-012 – zeigt Übersetzung beim Tippen', …)`.
- Abdeckung gegen `specs/testdesign.md`: welche TCs fehlen, welche prüfen falsches
  Verhalten, welche Tests haben keine TC-ID?
- Aussagekräftige Assertions (keine, die nie fehlschlagen können).
- Tests über das Verhalten (Testing Library: Rollen und Texte), nicht über Interna.
- E2E-Tests laufen mit iPad-Emulation (`devices['iPad (gen 7)']` o. ä.).
- Keine echten Netzwerkzugriffe; Test-EPUBs und Test-Wörterbuch liegen unter
  `tests/fixtures/`.

## Schritt 4 – Korrekturen

**Direkt beheben und kurz erwähnen:** erklärende Kommentare entfernen, UC-Kommentar
ergänzen, fehlende TC-ID im Testnamen, unvollständige Dependency-Arrays, fehlendes
Aufräumen in Effekten, offensichtliche Typ-Lücken, Magic Numbers als Konstante.

**Nicht beheben, sondern TODO setzen und im Bericht nennen:**
```ts
// TODO [UC-XXX]: <was fehlt oder falsch ist> – siehe specs/UC-XXX_….md
```
Als gross gilt: fehlender Ablauf aus einem UC, falsch umgesetzte Regel, fehlende
Fehlerbehandlung, die zum Absturz führt, fehlende Bereinigung von EPUB-Inhalten,
fehlender TC aus dem Testdesign.

Nach Änderungen: `npm run lint`, `npm run typecheck` und `npm test` ausführen und das
Ergebnis im Bericht angeben.

## Schritt 5 – Bericht

### Produktionscode
| Feature / Modul | Clean-Code-Befunde | Spec-Abweichungen | Direkt behoben | TODOs |
|---|---|---|---|---|

### Tests
| Testdatei | TC-IDs | Fehlende TCs | Strukturprobleme | Direkt behoben |
|---|---|---|---|---|

### Spec-Konformität gesamt
| UC | Abläufe | Fehlerflüsse | Tests | Status |
|---|---|---|---|---|

Status: `✓ vollständig` · `⚠ Lücken` · `✗ kritisch`

### Querschnittliche Befunde
Ein Stichpunkt pro Befund, keine Prosa.
