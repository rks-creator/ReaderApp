---
id: UC-007
type: Use Case
name: "Textstelle übersetzen"
completeness: Intermediate
---

# UC-007 – Textstelle übersetzen

---

## Brief Description

> Der Leser möchte mehrere zusammenhängende Wörter oder einen ganzen Satz markieren und die deutsche Übersetzung sehen, um auch Wendungen und schwierige Sätze ohne Unterbrechung zu verstehen.

---

## Actors

| Actor | Type | Role |
|---|---|---|
| Leser | `Human` | Markiert eine Textstelle durch langes Drücken und Ziehen |
| System | `System` | Schlägt die Auswahl im Wörterbuch nach und übersetzt sie maschinell |

---

## Context & Background

> UC-004 übersetzt ein einzelnes angetipptes Wort. Für mehrere Wörter gibt es zwei Stufen. Stufe 1 nutzt das Ding-Wörterbuch: Ist die Auswahl eine bekannte Wendung (z. B. „give up“), kommt deren Übersetzung, sonst die Übersetzung jedes einzelnen Wortes. Stufe 2 ist eine maschinelle Übersetzung des ganzen Textes mit der Offline-Übersetzungs-Engine Bergamot (dieselbe Technik wie die eingebaute Übersetzung von Firefox, Lizenz MPL 2.0). Das Übersetzungsmodell Englisch → Deutsch ist rund 22 MB gross; es wird beim ersten Gebrauch geladen und danach auf dem iPad gespeichert, damit die App für Leser ohne Satzübersetzung klein bleibt.

---

## Preconditions

- Ein Buch ist in der Leseansicht geöffnet (UC-003).
- Das Ding-Wörterbuch ist gespeichert (UC-006).

---

## Trigger

> Der Leser drückt mindestens 0,5 s auf ein Wort, ohne den Finger zu bewegen.

---

## Description

1. Der Leser drückt mindestens 0,5 s auf ein Wort.
2. Das System markiert das Wort als Anfang der Auswahl; Scrollen ist ab jetzt bis zum Loslassen gesperrt.
3. Der Leser zieht den Finger über weitere Wörter vorwärts oder rückwärts.
4. Das System markiert laufend alle Wörter zwischen Anfangs- und aktuellem Wort. *(→ A1)*
5. Der Leser hebt den Finger.
6. Das System zeigt beim markierten Text ein Popup mit dem englischen Text.
7. Das System zeigt im Popup unter „Wörterbuch“ die Übersetzung aus Ding: die Wendung, falls die Auswahl ein Ding-Eintrag ist (auch in der Grundform, z. B. „gave up“ → „give up“), sonst für jedes Wort die erste Übersetzung. *(→ A2)*
8. Das System übersetzt den markierten Text maschinell und zeigt das Ergebnis unter „Übersetzung“. *(→ A3, E1, E2)*
9. Der Leser tippt ausserhalb des Popups.
10. Das System schliesst das Popup und entfernt die Markierung.

---

## Alternative Flows

### A1 – Auswahl über mehr als 60 Wörter

> Entry point: Schritt 4 des Hauptflusses

1. A1.1: Das System begrenzt die Auswahl auf 60 Wörter ab dem Anfangswort.

### A2 – Auswahl ist ein einzelnes Wort

> Entry point: Schritt 7 des Hauptflusses

1. A2.1: Der Leser hat nach dem langen Drücken den Finger nicht bewegt.
2. A2.2: Das System zeigt für dieses Wort das Popup wie in UC-004 und ergänzt die maschinelle Übersetzung nicht.

### A3 – Übersetzungsmodell wird zum ersten Mal verwendet

> Entry point: Schritt 8 des Hauptflusses

1. A3.1: Das System zeigt unter „Übersetzung“ „Übersetzungsmodell wird geladen (ca. 22 MB) …“; die Wörterbuch-Übersetzung aus Schritt 7 ist bereits sichtbar.
2. A3.2: Das System lädt das Modell, speichert es auf dem iPad und fährt mit Schritt 8 fort.

---

## Error Scenarios

### E1 – Modell nicht verfügbar und keine Internetverbindung

> Entry point: Schritt A3.2

1. E1.1: Das System zeigt unter „Übersetzung“: „Die Satzübersetzung ist noch nicht auf diesem iPad. Öffne sie einmal mit Internetverbindung.“
2. E1.2: Die Wörterbuch-Übersetzung aus Schritt 7 bleibt sichtbar.

### E2 – Übersetzung schlägt fehl

> Entry point: Schritt 8 des Hauptflusses

1. E2.1: Das System zeigt unter „Übersetzung“: „Die Satzübersetzung ist fehlgeschlagen.“
2. E2.2: Die Wörterbuch-Übersetzung aus Schritt 7 bleibt sichtbar.

---

## Postconditions

### Success

- Der Leser hat Wörterbuch- und maschinelle Übersetzung der Textstelle gesehen; Buch und Lesefortschritt sind unverändert.
- Nach dem ersten erfolgreichen Laden ist das Übersetzungsmodell auf dem iPad gespeichert und offline nutzbar.

### Failure / Abort

- Popup und Markierung sind entfernt, die Leseposition ist unverändert.

---

## Acceptance Criteria

```gherkin
Scenario: Wendung markieren
  Given ein Buch ist geöffnet und der Text enthält "she gave up the search"
  When  der Leser lange auf "gave" drückt und bis "up" zieht
  Then  zeigt das Popup unter "Wörterbuch" die Wendung "give up" mit der Übersetzung "aufgeben"

Scenario: Beliebige Wortgruppe markieren
  Given ein Buch ist geöffnet und der Text enthält "the white rabbit"
  When  der Leser lange auf "the" drückt und bis "rabbit" zieht
  Then  zeigt das Popup unter "Wörterbuch" je eine Übersetzung für "the", "white" und "rabbit"

Scenario: Satz maschinell übersetzen
  Given das Übersetzungsmodell ist auf dem iPad gespeichert
  When  der Leser den Satz "Alice was beginning to get very tired." markiert
  Then  zeigt das Popup unter "Übersetzung" einen deutschen Satz, der "Alice" und "müde" enthält

Scenario: Scrollen bleibt möglich
  Given ein Buch ist geöffnet
  When  der Leser den Finger sofort nach dem Aufsetzen bewegt
  Then  scrollt der Text und es wird nichts markiert

Scenario: Erstes Laden ohne Internet
  Given das Übersetzungsmodell ist noch nicht gespeichert
  And   das iPad ist im Flugmodus
  When  der Leser eine Textstelle markiert
  Then  zeigt das Popup die Wörterbuch-Übersetzung
  And   unter "Übersetzung" den Hinweis "Die Satzübersetzung ist noch nicht auf diesem iPad. Öffne sie einmal mit Internetverbindung."
```

---

## Non-Functional Requirements

| Type | Requirement |
|---|---|
| Performance | Die Wörterbuch-Übersetzung erscheint weniger als 300 ms nach dem Loslassen; die maschinelle Übersetzung eines Satzes bis 30 Wörter bei geladenem Modell in weniger als 3 s. |
| Offline | Nach dem ersten Laden funktioniert die Satzübersetzung ohne Internetverbindung. |
| Datenschutz | Der markierte Text verlässt das iPad nie; Modell und Engine laufen lokal. |
| Grösse | Engine und Modell zusammen höchstens 30 MB, nur bei Gebrauch geladen. |

---

## Dependencies & References

- **Depends on**: UC-003 (Buch lesen), UC-004 (Wort übersetzen), UC-006 (App offline nutzen)
