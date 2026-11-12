---
name: ipad-pwa-check
description: Baut die ReaderApp, startet sie lokal und prüft sie mit Playwright in iPad-Emulation – Home-Bildschirm-Tauglichkeit (Manifest, Icons, Vollbild), Offline-Betrieb über den Service Worker, Wort-Tippen mit Übersetzungs-Popup, Touch-Ziele und Konsolenfehler. Verwende diesen Skill, wenn geprüft werden soll, ob die App auf dem iPad funktioniert, vor einem Release, oder wenn nach „läuft das offline?“, „funktioniert das auf dem iPad?“ oder nach Screenshots gefragt wird.
---

# iPad- und PWA-Check

Ziel: mit möglichst realistischen Mitteln belegen, dass die App auf einem iPad als
Home-Bildschirm-App funktioniert. Das Ergebnis ist ein kurzer Bericht mit Screenshots.
Du änderst dabei **keinen** Produktionscode – Befunde meldest du nur.

Grenze ehrlich benennen: Playwright emuliert das iPad mit WebKit, ersetzt aber keinen Test
auf dem echten Gerät (z. B. Verhalten des System-Kontextmenüs, Speicherlöschung durch iPadOS).

---

## Schritt 1 – Bauen und starten

```bash
npm ci
npm run build
npm run preview -- --port 4173 --strictPort &
```
Warte, bis `http://localhost:4173` antwortet. Der Service Worker funktioniert auf
`localhost` auch ohne HTTPS.

Ist WebKit nicht verfügbar, mit Chromium und `devices['iPad Pro 11']` weitermachen und das
im Bericht vermerken.

## Schritt 2 – Prüfungen (ein Playwright-Skript im Scratchpad)

Verwende `devices['iPad (gen 7)']` im Hoch- und `devices['iPad (gen 7) landscape']` im
Querformat.

| # | Prüfung | Erwartung |
|---|---|---|
| P1 | Manifest | `<link rel="manifest">` vorhanden, `display: standalone`, `name`, `start_url` und `scope` passen zum `base`-Pfad, Icons 180/192/512 px erreichbar |
| P2 | Apple-Meta-Tags | `apple-mobile-web-app-capable`, `apple-touch-icon`, `viewport` mit `viewport-fit=cover` |
| P3 | Service Worker | registriert und `activated`; Wörterbuchdatei und App-Shell im Cache |
| P4 | Offline-Start | `context.setOffline(true)`, Seite neu laden → Bibliothek erscheint, keine Fehlerseite |
| P5 | Import | Test-EPUB aus `tests/fixtures/` über das Datei-Input importieren → Buch in der Bibliothek |
| P6 | Lesen | Buch öffnen → erster Kapiteltext sichtbar, Blättern bzw. Scrollen funktioniert |
| P7 | Wort-Tippen | `tap` auf ein bekanntes Wort (z. B. „house“) → Popup mit deutscher Übersetzung in < 300 ms, auch offline |
| P8 | Unbekanntes Wort | `tap` auf ein Fantasiewort → Hinweis „Kein Eintrag gefunden“, kein Fehler |
| P9 | Touch-Ziele | interaktive Elemente mindestens 44 × 44 CSS-Pixel |
| P10 | Fortschritt | Seite neu laden → Buch öffnet an der zuletzt gelesenen Stelle |
| P11 | Konsole | keine Fehler und keine Requests an fremde Origins (`page.on('request')`) |

Screenshots mit `deviceScaleFactor` des Geräteprofils (nicht überschreiben) im Scratchpad
speichern: Bibliothek, Leseansicht, Übersetzungs-Popup, Offline-Start.

## Schritt 3 – Aufräumen

Preview-Server beenden. Keine Dateien im Repository zurücklassen.

## Schritt 4 – Bericht

| # | Prüfung | Ergebnis | Befund |
|---|---|---|---|
| P1 | Manifest | ✅ / ⚠️ / ❌ | … |

Darunter:
- Screenshots (vollständige Pfade im Scratchpad) und dem Benutzer per Datei senden
- was nur auf dem echten iPad geprüft werden kann, als kurze Checkliste für den Benutzer:
  1. Seite in Safari öffnen → Teilen → „Zum Home-Bildschirm“
  2. App vom Home-Bildschirm starten, Flugmodus einschalten, App neu starten
  3. Ein Buch importieren und mehrere Wörter antippen
