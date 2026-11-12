---
id: UC-002
type: Use Case
name: "Bibliothek anzeigen"
completeness: Intermediate
---

# UC-002 – Bibliothek anzeigen

---

## Brief Description

> Der Leser möchte alle importierten Bücher auf einen Blick sehen, um ein Buch zum Lesen auszuwählen oder nicht mehr benötigte Bücher zu entfernen.

---

## Actors

| Actor | Type | Role |
|---|---|---|
| Leser | `Human` | Sieht die Bibliothek ein, öffnet und entfernt Bücher |
| System | `System` | Lädt die Bücher aus IndexedDB und zeigt sie an |

---

## Context & Background

> Die Bibliothek ist der Startbildschirm der ReaderApp. Sie zeigt die Bücher als Raster mit Titelbild, Titel, Autor und Lesefortschritt in Prozent. Alle Daten stammen aus dem lokalen Speicher des iPads.

---

## Preconditions

- Die ReaderApp wurde gestartet (im Browser oder vom Home-Bildschirm).

---

## Trigger

> Der Leser startet die ReaderApp oder kehrt aus der Leseansicht zurück.

---

## Description

1. Das System lädt alle Bücher aus IndexedDB. *(→ E1)*
2. Das System zeigt die Bücher sortiert nach „zuletzt gelesen“ an; nie geöffnete Bücher folgen nach Importdatum. *(→ A1)*
3. Das System zeigt pro Buch Titelbild, Titel, Autor und Lesefortschritt in Prozent.
4. Der Leser tippt auf ein Buch. *(→ A2)*
5. Das System öffnet das Buch in der Leseansicht (UC-003).

---

## Alternative Flows

### A1 – Bibliothek leer

> Entry point: Schritt 2 des Hauptflusses

1. A1.1: Das System zeigt „Noch keine Bücher. Tippe auf ‚Buch hinzufügen‘, um eine EPUB-Datei zu importieren.“

### A2 – Buch entfernen

> Entry point: Schritt 4 des Hauptflusses

1. A2.1: Der Leser drückt lange auf ein Buch und wählt „Entfernen“.
2. A2.2: Das System fragt: „‹Titel› wirklich entfernen? Der Lesefortschritt geht verloren.“
3. A2.3: Bestätigt der Leser, löscht das System Buch und Lesefortschritt aus IndexedDB und aktualisiert die Bibliothek. Sonst bleibt alles unverändert.

### A3 – Buch ohne Titelbild

> Entry point: Schritt 3 des Hauptflusses

1. A3.1: Das System zeigt ein neutrales Platzhalterbild mit Titel und Autor.

---

## Error Scenarios

### E1 – Lokaler Speicher nicht verfügbar

> Entry point: Schritt 1 des Hauptflusses

1. E1.1: Das System meldet „Der lokale Speicher ist nicht verfügbar. Ist der private Modus aktiv?“
2. E1.2: Import und Lesen sind deaktiviert, bis die App neu gestartet wird.

---

## Postconditions

### Success

- Die Bibliothek zeigt genau die in IndexedDB gespeicherten Bücher.

### Failure / Abort

- Es werden keine Daten verändert.

---

## Acceptance Criteria

```gherkin
Scenario: Bibliothek mit Büchern anzeigen
  Given in der Bibliothek sind die Bücher "Alice's Adventures in Wonderland" und "Moby Dick"
  And   "Moby Dick" wurde zuletzt gelesen
  When  der Leser die ReaderApp startet
  Then  steht "Moby Dick" an erster Stelle
  And   bei jedem Buch ist der Lesefortschritt in Prozent sichtbar

Scenario: Leere Bibliothek
  Given die Bibliothek ist leer
  When  der Leser die ReaderApp startet
  Then  zeigt das System "Noch keine Bücher. Tippe auf ‚Buch hinzufügen‘, um eine EPUB-Datei zu importieren."

Scenario: Buch entfernen
  Given das Buch "Moby Dick" ist in der Bibliothek
  When  der Leser "Moby Dick" entfernt und bestätigt
  Then  ist "Moby Dick" nicht mehr in der Bibliothek
```

---

## Non-Functional Requirements

| Type | Requirement |
|---|---|
| Performance | Die Bibliothek mit 100 Büchern ist in weniger als 1 s sichtbar. |
| Bedienbarkeit | Alle Touch-Ziele sind mindestens 44 × 44 pt gross. |
