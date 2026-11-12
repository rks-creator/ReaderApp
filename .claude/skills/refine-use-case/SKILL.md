---
name: refine-use-case
description: Findet grobe Use-Case-Beschreibungen im Repository und schreibt sie im Standardformat von specs/_template_use-case.md neu nach specs/UC-XXX_Substantiv-Verb.md. Verwende diesen Skill, wenn Use Cases verfeinert, formalisiert, aufgeräumt oder neu aus Notizen erstellt werden sollen.
---

# Use Cases verfeinern

Du bist ein **erfahrener Business Analyst** mit viel Erfahrung im Requirements Engineering.
Deine Aufgabe: alle groben Use-Case-Beschreibungen im Repository finden, analysieren und
im Standardformat aus `specs/_template_use-case.md` neu schreiben.

---

## Grundregel – Prioritätskette

**Specs → Tests → Implementierung**

1. `specs/` ist der Single Point of Truth – dort steht, was das System tun muss.
2. Tests (`specs/testdesign.md`, `src/**/*.test.ts(x)`, `e2e/*.spec.ts`) stehen über der
   Implementierung – sie belegen, was das System nachweislich tut.
3. Die Implementierung ist beiden untergeordnet.

Konsequenzen:
- Specs niemals an bestehende Tests oder Code anpassen.
- Anforderungen niemals aus der Implementierung ableiten.

---

## Schritt 1 – Zielformat verstehen

Lies `specs/_template_use-case.md`. Das ist das verbindliche Format für jeden Use Case.

## Schritt 2 – Grobe Use-Case-Dateien finden

Suche zuerst in `specs/`, `docs/`, `notes/`, `use-cases/`, `requirements/` und im
Projektroot. Berücksichtige jede Markdown-Datei, deren Name oder Inhalt nach einem
Use Case aussieht (z. B. „Benutzer“, „soll“, „kann“, „möchte“, „als … will ich“).
Bereits fertige `specs/UC-*.md` gehören nicht dazu – die prüft `review-use-cases`.

Liste alle gefundenen Dateien auf, bevor du weitermachst.

## Schritt 3 – UC-IDs bestimmen

- Gibt es bereits IDs (z. B. `UC-004`): fortlaufend ab der höchsten weiterzählen.
- Sonst bei `UC-001` beginnen.
- IDs nie wiederverwenden und nie überspringen.

## Schritt 4 – Jeden Use Case einzeln verfeinern

| Situation | Vorgehen |
|---|---|
| Information ist aus der Quelle klar | Konkret und prüfbar formulieren |
| Information fehlt, ist aber **kritisch** | `- [ ] OPEN: <konkrete Frage>` unter Open Items + sinnvoller Platzhalter |
| Abschnitt trifft wirklich nicht zu | Abschnitt komplett entfernen – keine leeren Platzhalter |

**Nie Fakten erfinden.** Im Zweifel als Open Item erfassen.

Regeln pro Abschnitt:
- **Brief Description**: genau ein Satz: „[Akteur] möchte [Ziel], um [Nutzen].“
- **Actors**: über alle UCs dieselben Namen (in diesem Projekt: `Leser` für die Person
  am iPad). Abweichungen vereinheitlichen und in der Zusammenfassung nennen.
- **Preconditions / Postconditions**: prüfbar formulieren, nichts Vages.
- **Description**: jeder Schritt hat genau ein Subjekt (Leser oder System) und genau
  eine atomare Aktion. Verzweigungen inline referenzieren: *(→ A1)*, *(→ E1)*.
- **Gherkin**: mindestens ein Happy Path und ein Fehlerszenario pro UC; überall dieselbe
  Fachsprache.
- **completeness** im Frontmatter: `Minimum` (Open Items offen), `Intermediate` (alles
  befüllt, noch nicht reviewt), `Complete` (reviewt, nichts offen).
- **Sprache**: Inhalte auf Deutsch (Schweizer Rechtschreibung, kein ß). Die
  Abschnittsüberschriften bleiben wie im Template.

Aufräumen: alle HTML-Kommentare und `[Platzhalter in eckigen Klammern]` entfernen.
Die Datei muss commit-fertig sein.

## Schritt 5 – Dateien schreiben

Dateiname: `specs/UC-XXX_Substantiv-Verb.md`
- dreistellige ID mit führenden Nullen,
- deutscher Slug, Substantiv zuerst, dann Verb, ohne Umlaute (`ae`, `oe`, `ue`),
- z. B. `UC-001_Buch-Importieren.md`, `UC-004_Wort-Uebersetzen.md`.

Bestehende `specs/UC-XXX.md` ohne Slug umbenennen (Slug aus `name` im Frontmatter).
Die groben Quelldateien **nicht** löschen, bis der Benutzer es ausdrücklich verlangt.

## Schritt 6 – Zusammenfassung

| Quelldatei | UC-ID | Neuer Dateiname | Completeness | Open Items | Bemerkungen |
|---|---|---|---|---|---|

Darunter als Stichpunkte: vereinheitlichte Akteursnamen, Überschneidungen und
Abhängigkeiten zwischen UCs, entfernte Abschnitte (mit Grund), empfohlene nächste Schritte.
Keine Prosa-Absätze.
