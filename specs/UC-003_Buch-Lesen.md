---
id: UC-003
type: Use Case
name: "Buch lesen"
completeness: Intermediate
---

# UC-003 – Buch lesen

---

## Brief Description

> Der Leser möchte ein importiertes Buch in einer ruhigen Leseansicht lesen und dort weitermachen, wo er aufgehört hat, um ohne Ablenkung voranzukommen.

---

## Actors

| Actor | Type | Role |
|---|---|---|
| Leser | `Human` | Liest, scrollt und navigiert im Buch |
| System | `System` | Stellt die Kapitel dar und speichert den Lesefortschritt |

---

## Context & Background

> Ein EPUB besteht aus mehreren XHTML-Kapiteln. Die ReaderApp stellt immer ein Kapitel als fortlaufend scrollbaren Text dar. Inhalte aus dem EPUB werden vor der Anzeige bereinigt (keine Skripte, keine externen Ressourcen), weil eine EPUB-Datei beliebigen Code enthalten kann. Jedes Wort im Text ist antippbar (UC-004); Scrollen und Antippen müssen sich deshalb sicher unterscheiden lassen.

---

## Preconditions

- Das Buch ist in der Bibliothek (UC-001).
- Der Leser hat das Buch in der Bibliothek angetippt (UC-002).

---

## Trigger

> Der Leser tippt in der Bibliothek auf ein Buch.

---

## Description

1. Das System lädt das Buch aus IndexedDB. *(→ E1)*
2. Das System öffnet das Kapitel des gespeicherten Lesefortschritts und scrollt an die gespeicherte Position; ohne gespeicherten Fortschritt den Anfang des ersten Kapitels.
3. Das System stellt den Kapiteltext mit den aktuellen Leseeinstellungen (UC-005) dar.
4. Der Leser scrollt mit dem Finger durch den Text. *(→ A1, A2)*
5. Das System speichert die aktuelle Position spätestens 2 s nach dem Ende einer Scrollbewegung.
6. Am Kapitelende tippt der Leser auf „Nächstes Kapitel“. *(→ A3)*
7. Das System zeigt den Anfang des nächsten Kapitels.
8. Der Leser tippt auf „Zurück zur Bibliothek“.
9. Das System zeigt die Bibliothek (UC-002) mit aktualisiertem Lesefortschritt.

---

## Alternative Flows

### A1 – Über das Inhaltsverzeichnis springen

> Entry point: Schritt 4 des Hauptflusses

1. A1.1: Der Leser öffnet das Inhaltsverzeichnis.
2. A1.2: Das System zeigt alle Kapitel aus dem EPUB-Inhaltsverzeichnis; das aktuelle Kapitel ist markiert.
3. A1.3: Der Leser tippt auf ein Kapitel.
4. A1.4: Das System zeigt den Anfang dieses Kapitels und speichert die Position.

### A2 – Vorheriges Kapitel

> Entry point: Schritt 4 des Hauptflusses

1. A2.1: Der Leser tippt am Kapitelanfang auf „Vorheriges Kapitel“.
2. A2.2: Das System zeigt das Ende des vorherigen Kapitels.

### A3 – Buch zu Ende gelesen

> Entry point: Schritt 6 des Hauptflusses

1. A3.1: Der Leser ist am Ende des letzten Kapitels.
2. A3.2: Das System zeigt statt „Nächstes Kapitel“ den Hinweis „Ende des Buches“ und setzt den Fortschritt auf 100 %.

---

## Error Scenarios

### E1 – Kapitel nicht lesbar

> Entry point: Schritt 1 des Hauptflusses

1. E1.1: Das System meldet „Dieses Kapitel konnte nicht angezeigt werden.“
2. E1.2: Der Leser kann zum nächsten Kapitel wechseln oder zur Bibliothek zurückkehren.

---

## Postconditions

### Success

- Der Lesefortschritt (Kapitel und Position im Kapitel) ist in IndexedDB gespeichert.
- Beim nächsten Öffnen erscheint dieselbe Textstelle.

### Failure / Abort

- Der zuletzt gespeicherte Lesefortschritt bleibt erhalten.

---

## Acceptance Criteria

```gherkin
Scenario: Weiterlesen an der letzten Stelle
  Given der Leser hat "Alice's Adventures in Wonderland" bis zur Mitte von Kapitel 3 gelesen
  When  der Leser das Buch in der Bibliothek antippt
  Then  zeigt das System Kapitel 3 an der zuletzt gelesenen Stelle

Scenario: Über das Inhaltsverzeichnis springen
  Given das Buch "Alice's Adventures in Wonderland" ist geöffnet
  When  der Leser im Inhaltsverzeichnis "Chapter V" antippt
  Then  zeigt das System den Anfang von "Chapter V"

Scenario: Scrollen öffnet keine Übersetzung
  Given ein Buch ist geöffnet
  When  der Leser mit dem Finger über den Text scrollt
  Then  erscheint kein Übersetzungs-Popup

Scenario: Defektes Kapitel
  Given das Buch enthält ein Kapitel mit fehlerhaftem XHTML
  When  der Leser dieses Kapitel öffnet
  Then  meldet das System "Dieses Kapitel konnte nicht angezeigt werden."
```

---

## Non-Functional Requirements

| Type | Requirement |
|---|---|
| Performance | Ein Kapitel ist in weniger als 1 s dargestellt. |
| Sicherheit | Skripte, Event-Handler-Attribute und externe Ressourcen aus dem EPUB werden nie ausgeführt bzw. geladen. |
| Offline | Lesen funktioniert ohne Internetverbindung. |

---

## Dependencies & References

- **Depends on**: UC-001 (Buch importieren), UC-002 (Bibliothek anzeigen)
- **Included Use Cases**: UC-004 (Wort übersetzen), UC-005 (Leseeinstellungen anpassen)
