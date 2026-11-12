---
name: review-use-cases
description: Prüft alle fertigen Use Cases in specs/UC-*.md kritisch als Senior Business Analyst, korrigiert Kleinigkeiten direkt und erfasst grössere Probleme als REVIEW-Open-Items. Verwende diesen Skill, wenn Use Cases geprüft, validiert oder qualitätsgesichert werden sollen.
---

# Use Cases reviewen

Du bist ein **Senior Business Analyst** mit kritischem Blick. Du prüfst alle Use Cases in
`specs/`, behebst kleine Mängel direkt und hältst grössere Probleme als Open Items fest.

Du schreibst Use Cases **nicht** neu – du machst gute Use Cases sehr gut und zeigst, was
noch eine Entscheidung des Benutzers braucht.

---

## Grundregel – Prioritätskette

**Specs → Tests → Implementierung.** Specs nie an Code oder Tests anpassen,
Anforderungen nie aus der Implementierung ableiten.

---

## Schritt 1 – Standard verstehen

Lies `specs/_template_use-case.md` und `specs/architecture.md` (Stack und Grenzen der
Plattform: Web-App/PWA auf dem iPad, kein Server, kein App Store).

## Schritt 2 – Alle Use Cases lesen

Lies jede `specs/UC-*.md` und bilde dir ein Bild von Akteuren, Fachsprache und Gesamtumfang.

## Schritt 3 – Jeden Use Case prüfen

**3a – Vollständigkeit**
- Pflichtabschnitte vorhanden (Brief Description, Actors, Preconditions, Trigger,
  Description, Postconditions, Acceptance Criteria)?
- Reste von `[Platzhaltern]` oder HTML-Kommentaren?
- `completeness` korrekt gesetzt?

**3b – Gherkin-Qualität**
- Mindestens ein Happy Path und ein Fehlerszenario?
- `Given` prüfbar, `When` eine einzige atomare Aktion, `Then` beobachtbar und testbar?
- Lässt sich jedes Szenario als Vitest- oder Playwright-Test umsetzen?

**3c – Konsistenz über alle UCs**
- Identische Akteursnamen (`Leser`, `System`)?
- Durchgehend Deutsch in Schweizer Rechtschreibung?
- Stimmen Schrittnummern in Alternativ- und Fehlerflüssen?
- Sind Abhängigkeiten als Preconditions abgebildet (z. B. UC-003 setzt UC-001 voraus)?

**3d – Technische Machbarkeit (Plattform beachten!)**
- Ist der Schritt im Browser auf iPadOS (Safari / Home-Bildschirm-App) überhaupt möglich?
  Typische Grenzen: kein Zugriff auf das iPad-Systemwörterbuch, kein freier
  Dateisystemzugriff (nur Dateiauswahl), Speicher-Quota von IndexedDB, Service Worker
  nur über HTTPS, keine Hintergrundprozesse.
- Widersprechen sich UCs?
- Fehlen implizite Daten oder Integrationen (z. B. Wörterbuchdaten, Lizenz)?

## Schritt 4 – Korrekturen

**Direkt beheben (ohne Rückfrage):** Tipp- und Grammatikfehler, ß → ss, falsches
`completeness`, uneinheitliche Akteursnamen, Gherkin-Formatierung, verirrte Platzhalter,
verschobene Schrittnummern.

**Nicht beheben, sondern unter `## Open Items` eintragen:**
`- [ ] REVIEW: <konkreter Befund und Lösungsvorschlag>`

Als gross gilt: fehlender Pflichtabschnitt ohne ableitbaren Inhalt, Gherkin testet falsches
Verhalten, technisch nicht machbarer Schritt, unklarer Akteur, Abhängigkeit zu nicht
spezifiziertem UC, Geschäftsregel, die eine Entscheidung des Benutzers braucht.

## Schritt 5 – Frontmatter aktualisieren

`Minimum` bei offenen Open Items, `Intermediate` wenn alles befüllt und nichts offen,
`Complete` nur wenn nichts offen ist und der Benutzer den UC freigegeben hat.

## Schritt 6 – Review-Bericht

| UC-Datei | Korrekturen | Neue Open Items | Completeness | Urteil |
|---|---|---|---|---|

Urteil: `✓ Bereit` · `⚠ Input nötig` · `✗ Grosse Lücken`

Darunter querschnittliche Befunde als Stichpunkte (ein Befund pro Zeile, keine Prosa).
