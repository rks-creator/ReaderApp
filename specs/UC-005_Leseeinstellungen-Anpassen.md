---
id: UC-005
type: Use Case
name: "Leseeinstellungen anpassen"
completeness: Intermediate
---

# UC-005 – Leseeinstellungen anpassen

---

## Brief Description

> Der Leser möchte Schriftgrösse und Farbschema der Leseansicht anpassen, um bei jedem Licht angenehm lesen zu können.

---

## Actors

| Actor | Type | Role |
|---|---|---|
| Leser | `Human` | Ändert die Einstellungen |
| System | `System` | Wendet die Einstellungen sofort an und speichert sie |

---

## Context & Background

> Die Einstellungen gelten für alle Bücher und werden lokal gespeichert. Ändert sich die Schriftgrösse, verschiebt sich der Seitenumbruch; die aktuell gelesene Textstelle muss dabei sichtbar bleiben.

---

## Preconditions

- Ein Buch ist in der Leseansicht geöffnet (UC-003) und die Bedienleiste ist eingeblendet.

---

## Trigger

> Der Leser tippt in der Bedienleiste auf „Einstellungen“ (Symbol „Aa“).

---

## Description

1. Der Leser tippt auf „Aa“.
2. Das System zeigt die Einstellungen: Schriftgrösse (5 Stufen), Farbschema (Hell, Sepia, Dunkel, Automatisch nach iPad-Einstellung) und Schriftart (mit Serifen, ohne Serifen).
3. Der Leser ändert eine Einstellung.
4. Das System wendet die Änderung sofort auf den Text an; die erste sichtbare Textstelle bleibt sichtbar.
5. Das System speichert die Einstellungen lokal. *(→ E1)*
6. Der Leser tippt ausserhalb des Einstellungsfensters.
7. Das System schliesst das Einstellungsfenster.

---

## Error Scenarios

### E1 – Einstellungen nicht speicherbar

> Entry point: Schritt 5 des Hauptflusses

1. E1.1: Die Änderung gilt für die laufende Sitzung; beim nächsten Start gelten die Standardwerte.
2. E1.2: Das System meldet „Einstellungen konnten nicht gespeichert werden.“

---

## Postconditions

### Success

- Die Einstellungen gelten für alle Bücher, auch nach einem Neustart der App.

### Failure / Abort

- Die Einstellungen gelten nur bis zum Neustart.

---

## Acceptance Criteria

```gherkin
Scenario: Schriftgrösse erhöhen
  Given die Schriftgrösse ist auf Stufe 3
  When  der Leser die Schriftgrösse auf Stufe 4 stellt
  Then  ist der Text grösser
  And   die zuvor erste sichtbare Textstelle ist weiterhin sichtbar

Scenario: Dunkles Farbschema bleibt nach Neustart
  Given das Farbschema ist "Hell"
  When  der Leser "Dunkel" wählt und die App neu startet
  Then  wird das Buch mit hellem Text auf dunklem Hintergrund angezeigt

Scenario: Speichern schlägt fehl
  Given der lokale Speicher ist nicht beschreibbar
  When  der Leser das Farbschema "Sepia" wählt
  Then  wird "Sepia" sofort angewendet
  And   das System meldet "Einstellungen konnten nicht gespeichert werden."
```

---

## Non-Functional Requirements

| Type | Requirement |
|---|---|
| Barrierefreiheit | Alle Farbschemas erfüllen ein Kontrastverhältnis von mindestens 4,5 : 1 (WCAG AA). |
