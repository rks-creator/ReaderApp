# ReaderApp – Hinweise für Claude

## Projekt

Web-App (PWA) zum Lesen englischer EPUB-Bücher auf dem iPad. Ein einfaches Antippen eines
Wortes zeigt sofort die deutsche Übersetzung aus einem eingebauten Offline-Wörterbuch.
Auslieferung über GitHub Pages, kein App Store, kein Server, alle Daten lokal auf dem iPad.

## Kommunikation

- Antworten an den Benutzer immer auf Deutsch, Schweizer Rechtschreibung (kein ß).
- Specs, Kommentare und Commit-Messages ebenfalls auf Deutsch; Code-Bezeichner auf Englisch.

## Specs zuerst

- `specs/` ist der Single Point of Truth: **Specs → Tests → Implementierung**.
- Neue Funktion = zuerst Use Case in `specs/` (Skill `refine-use-case`), dann TC in
  `specs/testdesign.md`, dann Code.
- Nicht offensichtliche Regeln im Code mit `// UC-XXX: …` begründen.
- Testnamen beginnen mit der TC-ID.

## Architektur

Siehe `specs/architecture.md`. Wichtigste Regeln:
- `src/lib/` ohne React, vollständig unit-testbar.
- Keine Laufzeit-Requests an fremde Origins; alles muss offline funktionieren.
- EPUB-Inhalte vor dem Rendern immer mit DOMPurify bereinigen.
- Touch-Ziele mindestens 44 × 44 pt.

## Befehle

```bash
npm run dev         # Entwicklungsserver
npm run build       # Produktions-Build
npm run preview     # Build lokal ausliefern
npm test            # Vitest
npm run test:e2e    # Playwright (iPad-Emulation) – mit --trace off
npm run lint
npm run typecheck
```

## Skills in diesem Repository

| Skill | Zweck |
|---|---|
| `refine-use-case` | Grobe Notizen in Use Cases nach Template überführen |
| `review-use-cases` | Use Cases kritisch prüfen, inkl. Machbarkeit auf iPadOS |
| `compliance-report` | Jede Spec-Anforderung gegen den Code prüfen (nur lesend) |
| `traceability-manager` | UC ↔ Code ↔ Test-Zuordnung pflegen |
| `clean-code-review` | Clean Code + Spec-Konformität für TypeScript/React |
| `ipad-pwa-check` | Build mit Playwright in iPad-Emulation prüfen, Offline-Test, Screenshots |
