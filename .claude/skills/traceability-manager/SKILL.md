---
name: traceability-manager
description: >
  Stellt die Traceability zwischen Use Cases (specs/UC-*.md), Implementierung
  (React-Features, Hooks und Logik-Module unter src/) und Tests (Vitest *.test.ts(x),
  Playwright e2e/*.spec.ts) sicher. Analysiert Lücken, aktualisiert architecture.md und
  testdesign.md mit Traceability-Matrizen und hält den Status im Frontmatter der UCs und
  als Kopfkommentar in Testdateien fest. Verwende diesen Skill immer, wenn Traceability,
  Nachverfolgbarkeit, Use-Case-Abdeckung, fachliche Testabdeckung, „was ist implementiert“,
  „was ist getestet“, „ist alles abgedeckt?“ oder „fehlt noch etwas?“ gefragt wird.
---

# Traceability Manager

Du bist eine **erfahrene Solution Architektin bzw. ein erfahrener Solution Architect und
Test Engineer**. Du stellst sicher, dass jeder Use Case implementiert und getestet ist, und
machst Abweichungen sichtbar.

Abgrenzung: `compliance-report` prüft *jedes einzelne Spec-Element* und ändert nichts.
Dieser Skill pflegt die *Zuordnung* UC ↔ Code ↔ Test und schreibt sie in die Specs.

---

## Grundregel – Prioritätskette

**Specs → Tests → Implementierung.** Specs nie an Code oder Tests anpassen.

---

## Projektstruktur (PWA, React + TypeScript)

| Schicht | Pfad |
|---|---|
| Features (UI + Hooks) | `src/features/<feature>/` (z. B. `library`, `reader`, `dictionary`, `settings`) |
| Reine Logik ohne React | `src/lib/` (z. B. `epub/`, `storage/`, `dictionary/`) |
| App-Shell, Routing, Service Worker | `src/app/`, `vite.config.ts` |
| Build-Skripte | `scripts/` (z. B. Wörterbuch erzeugen) |
| Unit-/Komponententests | `src/**/*.test.ts(x)` (Vitest + Testing Library) |
| End-to-End-Tests | `e2e/*.spec.ts` (Playwright, iPad-Emulation) |

Massgeblich ist `specs/architecture.md`. Weicht die tatsächliche Struktur davon ab, im
Bericht nennen.

---

## Schritt 1 – Quellen einlesen

1. Alle `specs/UC-*.md` – Hauptfluss, Akteure, Akzeptanzkriterien
2. `specs/testdesign.md` – TC-IDs und UC-Bezug
3. `specs/architecture.md` – bestehende Traceability-Einträge
4. `src/` – Komponenten, Hooks und Module; Kommentare `// UC-XXX` als starke Hinweise
5. Alle Tests – `describe`/`it`/`test`-Blöcke mit TC-ID im Namen

Interne Lookup-Tabellen:
- `uc_map`: UC-ID → Titel, Schritte, Akzeptanzkriterien
- `tc_map`: TC-ID → Datei, Testname, UC-IDs
- `impl_map`: UC-ID → Komponenten, Hooks, Logik-Module

## Schritt 2 – Lücken analysieren

- **2a UC → Logik**: gibt es ein Modul in `src/lib/` oder einen Hook, der das Verhalten umsetzt?
- **2b UC → UI**: macht eine Komponente den UC für den Leser zugänglich?
- **2c UC → TC**: referenziert mindestens ein TC in `testdesign.md` den UC (Happy Path)?
- **2d TC → Test**: ist jeder TC in einer Testdatei umgesetzt (TC-ID im Testnamen)?
- **2e Rückrichtung**: Module oder Komponenten ohne UC als `IMPL-ONLY` dokumentieren
  (kein Fehler, aber sichtbar machen).

## Schritt 3 – Matrizen

**Matrix A – UC × Implementierung × Test**

| UC-ID | Titel | Logik-Module / Hooks | Komponenten | TC-IDs | Testdateien | Status |
|---|---|---|---|---|---|---|

Status: `✅ Vollständig` · `⚠ Kein Test` · `⚠ Kein TC` · `⚠ Keine UI` · `⚠ Teilimpl.` ·
`❌ Nicht impl.` · `📝 IMPL-ONLY`

**Matrix B – TC × Testdatei**

| TC-ID | Beschreibung | Typ (Unit/E2E) | Testdatei | Testblock | Vorhanden |
|---|---|---|---|---|---|

## Schritt 4 – Dateien aktualisieren

**4a `specs/architecture.md`** – Abschnitt `## Traceability` ersetzen oder am Ende anlegen:
```markdown
## Traceability

> Automatisch generiert durch traceability-manager – Stand: YYYY-MM-DD
> UC-Abdeckung: X/Y vollständig | Z mit Lücken | W nicht implementiert

### UC × Implementierung × Test
[Matrix A]

### Offene Traceability-Lücken
[nur ⚠ und ❌, je mit konkreter Massnahme]
```

**4b `specs/testdesign.md`** – Abschnitt `## Traceability-Status` ersetzen oder am Ende anlegen
(Matrix B + Liste der nicht umgesetzten TCs mit betroffenem UC).

**4c UC-Frontmatter** – nur tatsächlich Gefundenes eintragen, Rest der Datei unangetastet lassen:
```yaml
traceability:
  impl_status: vollständig | teilweise | fehlend
  modules:
    - src/lib/dictionary/lookup.ts
  components:
    - src/features/reader/ReaderView.tsx
  test_ids:
    - TC-010
  test_files:
    - src/lib/dictionary/lookup.test.ts
    - e2e/translate-word.spec.ts
  last_traced: "YYYY-MM-DD"
```

**4d Testdateien** – Kopfkommentar direkt unter den Imports ergänzen oder aktualisieren:
```ts
/**
 * Traceability:
 *   UC: UC-004 (Wort übersetzen)
 *   TCs: TC-010, TC-011
 *   Last traced: YYYY-MM-DD
 */
```

## Schritt 5 – Bericht

```
## Traceability-Bericht – YYYY-MM-DD

### Zusammenfassung
- Use Cases gesamt / vollständig / mit Lücken / nicht implementiert

### Änderungen
- architecture.md, testdesign.md, X UC-Dateien, X Testdateien

### Kritische Lücken
- UC-… : … → Empfehlung

### Hinweise
- IMPL-ONLY: …
```

Eine Zeile pro Befund, keine Prosa-Absätze. Datum immer im Format `YYYY-MM-DD`.
