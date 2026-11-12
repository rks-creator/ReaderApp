---
id: UC-006
type: Use Case
name: "App offline nutzen"
completeness: Minimum
---

# UC-006 – App offline nutzen

---

## Brief Description

> Der Leser möchte die ReaderApp ohne App Store auf den Home-Bildschirm des iPads legen und dauerhaft auch ohne Internetverbindung nutzen, um überall lesen zu können.

---

## Actors

| Actor | Type | Role |
|---|---|---|
| Leser | `Human` | Fügt die App zum Home-Bildschirm hinzu und startet sie |
| System | `System` | Speichert App und Wörterbuch für die Offline-Nutzung und aktualisiert sie |

---

## Context & Background

> Die ReaderApp wird über GitHub Pages ausgeliefert (HTTPS). Ein Service Worker legt beim ersten Aufruf die App und das Wörterbuch im Speicher des iPads ab. Danach startet die App auch im Flugmodus. iPadOS kann den Speicher von Web-Apps löschen, wenn sie lange nicht benutzt wurden oder das Gerät knapp an Speicher ist; die App fordert deshalb dauerhaften Speicher an (`navigator.storage.persist()`), was iPadOS aber nicht garantiert.

---

## Preconditions

- Das iPad hat beim ersten Aufruf eine Internetverbindung.
- Der Leser verwendet Safari.

---

## Trigger

> Der Leser öffnet die Adresse der ReaderApp zum ersten Mal in Safari.

---

## Description

1. Der Leser öffnet die Adresse der ReaderApp in Safari.
2. Das System lädt die App und speichert App-Dateien und Wörterbuch im Speicher des iPads. *(→ E1)*
3. Das System zeigt den Hinweis „Für die Nutzung als App: Teilen → Zum Home-Bildschirm“, solange die App nicht vom Home-Bildschirm gestartet wurde.
4. Der Leser tippt auf „Teilen“ → „Zum Home-Bildschirm“ → „Hinzufügen“.
5. iPadOS legt das ReaderApp-Symbol auf den Home-Bildschirm.
6. Der Leser startet die App über das Symbol.
7. Das System startet im Vollbild ohne Safari-Leisten und zeigt die Bibliothek (UC-002).
8. Das System fordert dauerhaften Speicher an.

---

## Alternative Flows

### A1 – Start ohne Internetverbindung

> Entry point: Schritt 6 des Hauptflusses

1. A1.1: Das iPad hat keine Internetverbindung.
2. A1.2: Das System startet aus dem lokalen Speicher; alle Funktionen (Bibliothek, Lesen, Übersetzen) stehen zur Verfügung.

### A2 – Neue Version verfügbar

> Entry point: Schritt 7 des Hauptflusses

1. A2.1: Das System erkennt bei bestehender Internetverbindung eine neue Version.
2. A2.2: Das System lädt sie im Hintergrund und zeigt „Neue Version verfügbar – Neu laden“.
3. A2.3: Tippt der Leser auf „Neu laden“, startet die neue Version. Bücher, Lesefortschritt und Einstellungen bleiben erhalten.

---

## Error Scenarios

### E1 – Verbindung bricht beim ersten Laden ab

> Entry point: Schritt 2 des Hauptflusses

1. E1.1: Das Wörterbuch konnte nicht vollständig gespeichert werden.
2. E1.2: Das System zeigt „Das Wörterbuch wird geladen, sobald eine Internetverbindung besteht.“ und versucht es beim nächsten Start mit Verbindung erneut.

### E2 – iPadOS hat die Daten gelöscht

> Entry point: Schritt 7 des Hauptflusses

1. E2.1: Die Bibliothek ist leer, obwohl zuvor Bücher importiert waren.
2. E2.2: Das System kann das nicht von einer neuen Installation unterscheiden und zeigt die leere Bibliothek (UC-002, A1).

---

## Postconditions

### Success

- Die ReaderApp liegt als Symbol auf dem Home-Bildschirm und startet im Vollbild, auch ohne Internetverbindung.

### Failure / Abort

- Die App funktioniert im Browser; das Wörterbuch wird beim nächsten Start mit Verbindung nachgeladen.

---

## Acceptance Criteria

```gherkin
Scenario: Start im Flugmodus
  Given der Leser hat die ReaderApp einmal mit Internetverbindung geöffnet
  And   das iPad ist im Flugmodus
  When  der Leser die ReaderApp vom Home-Bildschirm startet
  Then  zeigt das System die Bibliothek
  And   das Antippen eines Wortes zeigt die Übersetzung

Scenario: Update ohne Datenverlust
  Given in der Bibliothek ist das Buch "Moby Dick" mit 40 % Fortschritt
  And   eine neue Version der ReaderApp ist veröffentlicht
  When  der Leser auf "Neu laden" tippt
  Then  ist "Moby Dick" mit 40 % Fortschritt weiterhin in der Bibliothek

Scenario: Verbindungsabbruch beim ersten Laden
  Given das iPad verliert die Verbindung, bevor das Wörterbuch gespeichert ist
  When  der Leser ein Wort antippt
  Then  zeigt das System "Das Wörterbuch ist nicht verfügbar. Öffne die App einmal mit Internetverbindung."
```

---

## Non-Functional Requirements

| Type | Requirement |
|---|---|
| Kosten | Hosting und Nutzung sind kostenlos (GitHub Pages, öffentliches Repository). |
| Datenschutz | Die App sendet keine Daten an Server; es gibt kein Tracking. |
| Grösse | App und Wörterbuch zusammen sind höchstens 30 MB gross; die optionale Satzübersetzung (UC-007) kommt bei Gebrauch mit höchstens 30 MB dazu. |

---

## Open Items

- [ ] OPEN: Soll es eine Export-/Import-Funktion für Bücher und Lesefortschritt geben, damit eine Löschung durch iPadOS (E2) verkraftbar ist?
