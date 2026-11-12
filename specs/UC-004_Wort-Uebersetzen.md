---
id: UC-004
type: Use Case
name: "Wort übersetzen"
completeness: Minimum
---

# UC-004 – Wort übersetzen

---

## Brief Description

> Der Leser möchte durch einfaches Antippen eines englischen Wortes sofort die deutsche Übersetzung sehen, um ohne Unterbrechung weiterlesen zu können.

---

## Actors

| Actor | Type | Role |
|---|---|---|
| Leser | `Human` | Tippt auf ein unbekanntes Wort |
| System | `System` | Ermittelt die Grundform, schlägt im Offline-Wörterbuch nach und zeigt das Ergebnis |

---

## Context & Background

> Das ist die Kernfunktion der ReaderApp. Eine Web-App kann das Systemwörterbuch des iPads nicht aufrufen; das ginge nur über das Kontextmenü („Nachschlagen“), was der Leser ausdrücklich nicht möchte. Deshalb bringt die ReaderApp ein eigenes Englisch-Deutsch-Wörterbuch mit (Ding der TU Chemnitz, Lizenz GPL; Herkunft und Lizenz werden in der App unter „Info“ genannt), das beim ersten Start zusammen mit der App auf dem iPad gespeichert wird und danach offline funktioniert. Im Text stehen Wörter oft in gebeugter Form („running“, „mice“, „went“); das System führt sie auf die Grundform zurück („run“, „mouse“, „go“), bevor es nachschlägt.

---

## Preconditions

- Ein Buch ist in der Leseansicht geöffnet (UC-003).
- Das Offline-Wörterbuch ist auf dem iPad gespeichert (UC-006).

---

## Trigger

> Der Leser tippt einmal kurz auf ein Wort im Buchtext.

---

## Description

1. Der Leser tippt kurz auf ein Wort.
2. Das System bestimmt das angetippte Wort ohne Satzzeichen und hebt es farbig hervor.
3. Das System schlägt das Wort in Kleinschreibung im Wörterbuch nach. *(→ A1)*
4. Das System zeigt direkt beim Wort ein Popup mit dem englischen Wort, der Wortart (falls bekannt) und bis zu 5 deutschen Übersetzungen. Ist das Wort eine gebeugte Form, zeigt es zusätzlich die Grundform mit deren Übersetzungen (→ A1).
5. Der Leser tippt ausserhalb des Popups oder auf ein anderes Wort. *(→ A3)*
6. Das System schliesst das Popup und entfernt die Hervorhebung.

---

## Alternative Flows

### A1 – Wort nur in der Grundform vorhanden

> Entry point: Schritt 3 des Hauptflusses

1. A1.1: Das System ermittelt mögliche Grundformen (unregelmässige Formen aus den Ding-Angaben wie „to go {went; gone}“, regelmässige über Endungsregeln wie -s, -es, -ies, -ed, -ing, -er, -est).
2. A1.2: Das System schlägt die Grundformen der Reihe nach nach und zeigt den ersten Treffer unter der Überschrift „running → run“.
3. A1.3: Gibt es weder für die Form im Text noch für eine Grundform einen Eintrag, gilt E1.

### A2 – Wendung aus mehreren Wörtern

> Entry point: Schritt 3 des Hauptflusses

1. A2.1: Das angetippte Wort bildet mit den Nachbarwörtern einen Wörterbucheintrag (z. B. „give up“, „look forward to“).
2. A2.2: Das System zeigt zuerst die Übersetzung des Einzelworts und darunter die Wendung mit Übersetzung.

### A3 – Anderes Wort antippen

> Entry point: Schritt 5 des Hauptflusses

1. A3.1: Der Leser tippt auf ein anderes Wort, während das Popup offen ist.
2. A3.2: Das System schliesst das alte Popup und fährt mit Schritt 2 für das neue Wort fort.

---

## Error Scenarios

### E1 – Kein Eintrag gefunden

> Entry point: Schritt A1.3

1. E1.1: Das System zeigt im Popup „Kein Eintrag für ‹Wort› gefunden.“
2. E1.2: Der Leser schliesst das Popup und liest weiter.

### E2 – Wörterbuch nicht verfügbar

> Entry point: Schritt 3 des Hauptflusses

1. E2.1: Das Wörterbuch ist noch nicht geladen oder wurde von iPadOS gelöscht.
2. E2.2: Das System zeigt „Das Wörterbuch ist nicht verfügbar. Öffne die App einmal mit Internetverbindung.“

---

## Postconditions

### Success

- Der Leser hat die Übersetzung gesehen; Buch und Lesefortschritt sind unverändert.

### Failure / Abort

- Das Popup ist geschlossen, die Leseposition ist unverändert.

---

## Acceptance Criteria

```gherkin
Scenario: Wort antippen zeigt Übersetzung
  Given ein Buch ist geöffnet und der Text enthält das Wort "house"
  When  der Leser auf "house" tippt
  Then  zeigt ein Popup die Übersetzung "Haus"

Scenario: Unregelmässige Form wird auf Grundform zurückgeführt
  Given der Text enthält das Wort "went"
  When  der Leser auf "went" tippt
  Then  zeigt das Popup "went → go" und die Übersetzung "gehen"

Scenario: Regelmässige Form wird auf Grundform zurückgeführt
  Given der Text enthält das Wort "jumped"
  When  der Leser auf "jumped" tippt
  Then  zeigt das Popup "jumped → jump" und die Übersetzung "springen"

Scenario: Satzzeichen werden ignoriert
  Given der Text enthält "house," mit einem Komma
  When  der Leser auf "house," tippt
  Then  zeigt das Popup die Übersetzung von "house"

Scenario: Unbekanntes Wort
  Given der Text enthält das Fantasiewort "Jabberwocky"
  When  der Leser auf "Jabberwocky" tippt
  Then  zeigt das Popup "Kein Eintrag für Jabberwocky gefunden."

Scenario: Übersetzung offline
  Given das iPad ist im Flugmodus
  When  der Leser auf "house" tippt
  Then  zeigt das Popup die Übersetzung "Haus"
```

---

## Non-Functional Requirements

| Type | Requirement |
|---|---|
| Performance | Das Popup erscheint weniger als 300 ms nach dem Tippen. |
| Offline | Die Übersetzung funktioniert ohne Internetverbindung. |
| Bedienbarkeit | Einfaches Tippen genügt; das System-Kontextmenü von iPadOS erscheint dabei nicht. |
| Umfang | Das Wörterbuch deckt mindestens die 20 000 häufigsten englischen Wörter ab. |

---

## Dependencies & References

- **Depends on**: UC-003 (Buch lesen), UC-006 (App offline nutzen)

---

## Open Items

- [ ] OPEN: Soll man Wörter in einer Vokabelliste speichern können? Vorerst ausserhalb des Umfangs.
