---
id: UC-001
type: Use Case
name: "Buch importieren"
completeness: Intermediate
---

# UC-001 – Buch importieren

---

## Brief Description

> Der Leser möchte eine EPUB-Datei vom iPad in die ReaderApp laden, um das Buch danach jederzeit offline lesen zu können.

---

## Actors

| Actor | Type | Role |
|---|---|---|
| Leser | `Human` | Wählt eine EPUB-Datei aus der Dateien-App oder iCloud Drive aus |
| System | `System` | Liest die EPUB-Datei ein, extrahiert Metadaten und speichert das Buch lokal |

---

## Context & Background

> Die ReaderApp ist eine Web-App (PWA), die vom Home-Bildschirm des iPads gestartet wird. Eine Web-App hat keinen freien Zugriff auf das Dateisystem; Dateien gelangen nur über die Dateiauswahl von iPadOS in die App. Das Buch wird vollständig im Browser-Speicher (IndexedDB) des iPads abgelegt und verlässt das Gerät nie.

---

## Preconditions

- Die ReaderApp ist geöffnet und zeigt die Bibliothek (UC-002).
- Auf dem iPad oder in iCloud Drive liegt mindestens eine Datei mit der Endung `.epub`.

---

## Trigger

> Der Leser tippt in der Bibliothek auf „Buch hinzufügen“.

---

## Description

1. Der Leser tippt auf „Buch hinzufügen“.
2. Das System öffnet die Dateiauswahl von iPadOS, gefiltert auf EPUB-Dateien.
3. Der Leser wählt eine oder mehrere EPUB-Dateien aus. *(→ A1)*
4. Das System prüft jede Datei auf ein gültiges EPUB-Format. *(→ E1)*
5. Das System liest Titel, Autor, Sprache, Inhaltsverzeichnis und, falls vorhanden, das Titelbild aus.
6. Das System prüft, ob das Buch bereits in der Bibliothek ist. *(→ A2)*
7. Das System speichert das Buch in IndexedDB. *(→ E2)*
8. Das System zeigt das neue Buch in der Bibliothek an und meldet „Buch hinzugefügt“.

---

## Alternative Flows

### A1 – Auswahl abgebrochen

> Entry point: Schritt 3 des Hauptflusses

1. A1.1: Der Leser schliesst die Dateiauswahl ohne Auswahl.
2. A1.2: Das System kehrt ohne Meldung zur Bibliothek zurück.

### A2 – Buch bereits vorhanden

> Entry point: Schritt 6 des Hauptflusses

1. A2.1: Das System erkennt ein Buch mit gleicher EPUB-Kennung (`dc:identifier`) oder, falls keine vorhanden, gleichem Titel und Autor.
2. A2.2: Das System fragt: „Dieses Buch ist bereits in der Bibliothek. Ersetzen?“
3. A2.3: Bestätigt der Leser, ersetzt das System das Buch; der Lesefortschritt bleibt erhalten. Sonst wird der Import dieser Datei übersprungen.

---

## Error Scenarios

### E1 – Keine gültige EPUB-Datei

> Entry point: Schritt 4 des Hauptflusses

1. E1.1: Das System meldet „‹Dateiname› ist keine gültige EPUB-Datei und wurde nicht importiert.“
2. E1.2: Weitere ausgewählte Dateien werden normal verarbeitet.

### E2 – Speicher voll

> Entry point: Schritt 7 des Hauptflusses

1. E2.1: Das System meldet „Nicht genug Speicherplatz. Entferne Bücher aus der Bibliothek und versuche es erneut.“
2. E2.2: Das System speichert nichts Halbfertiges.

### E3 – Kopiergeschütztes Buch (DRM)

> Entry point: Schritt 4 des Hauptflusses

1. E3.1: Das System erkennt eine Verschlüsselung (`META-INF/encryption.xml` mit verschlüsselten Inhaltsdateien).
2. E3.2: Das System meldet „Dieses Buch ist kopiergeschützt und kann nicht geöffnet werden.“

---

## Postconditions

### Success

- Das Buch ist in IndexedDB gespeichert und erscheint in der Bibliothek.
- Das Buch lässt sich ohne Internetverbindung öffnen.

### Failure / Abort

- Die Bibliothek ist unverändert; es bleiben keine Teildaten zurück.

---

## Acceptance Criteria

```gherkin
Scenario: Gültige EPUB-Datei importieren
  Given die Bibliothek ist leer
  When  der Leser die Datei "alice.epub" importiert
  Then  zeigt die Bibliothek das Buch "Alice's Adventures in Wonderland" mit Autor "Lewis Carroll"

Scenario: Ungültige Datei importieren
  Given die Bibliothek ist leer
  When  der Leser die Datei "kaputt.epub" importiert, die kein gültiges EPUB ist
  Then  meldet das System "kaputt.epub ist keine gültige EPUB-Datei und wurde nicht importiert."
  And   die Bibliothek bleibt leer

Scenario: Buch erneut importieren
  Given das Buch "Alice's Adventures in Wonderland" ist in der Bibliothek
  When  der Leser die Datei "alice.epub" importiert
  Then  fragt das System "Dieses Buch ist bereits in der Bibliothek. Ersetzen?"
```

---

## Non-Functional Requirements

| Type | Requirement |
|---|---|
| Performance | Eine EPUB-Datei bis 5 MB ist auf einem iPad (ab 2019) in weniger als 3 s importiert. |
| Datenschutz | Das Buch wird nie an einen Server übertragen. |

---

## Dependencies & References

- **Depends on**: UC-002 (Bibliothek anzeigen)
