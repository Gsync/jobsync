# JobSync Roadmap

## 1. Connectors

### 1.1 Arbeitsagentur Jobsuche (Bundesagentur für Arbeit)
- Integration der Jobsuche API der Bundesagentur für Arbeit
- **Ressourcen:**
  - https://github.com/bundesAPI/deutschland/blob/main/docs/jobsuche/README.md
  - https://github.com/bundesAPI/jobsuche-api
  - https://jobsuche.api.bund.dev/

### 1.2 n8n Integration
- Connector für n8n Workflow-Automatisierung
- Ermöglicht komplexe Multi-Step Workflows (z.B. Job gefunden → CV anpassen → Bewerbung senden)

### 1.3 Webhooks
- Eingehende Webhooks: Externe Systeme können Jobs/Events an JobSync pushen
- Ausgehende Webhooks: JobSync sendet Events (neuer Job, Statusänderung) an externe Systeme

### 1.4 Connector → JOB_SOURCES Sync
- Installierte Connectors aktualisieren automatisch die JOB_SOURCES für die Job-Tabelle und Job-Details/Metadaten

---

## 2. UX/UI

### 2.1 Kununu & Glassdoor Integration
- Unternehmensbewertungen und Gehaltsinformationen in den Jobdetails anzeigen
- Filter für Bewertungen und Gehaltsinformationen für fundierte Bewerbungsentscheidungen
- LLM-gestützte Analyse und Zusammenfassung von Bewertungen (Vor-/Nachteile eines Unternehmens)

### 2.2 Lokalisierung (Erweiterung)
- Sprachumschaltung (bereits implementiert: EN, DE, FR, ES)
- Sprachspezifische Anpassungen: Datumsformat, Adressformat, Kommata/Punkt
- EURES/ISCO/ESCO Suchanpassungen pro Sprache

### 2.3 Input Fields Verbesserungen
- Passende Icons für alle Input-Felder
- Date Picker: Datumseingabe als Text mit Validierung nach Lokalisation
- Text Input: Enter-Taste fügt Objekte hinzu (Chip-Pattern)

### 2.4 Job-Tinder
- Swipe/Icon Click/Pfeiltasten Navigation
- Aktionen: Kein Match (Archiv) / Match / Favorit / Mehr Details
- Kartenbasierte Darstellung der entdeckten Jobs

### 2.5 Datei-Management
- **Upload:** CV, Anschreiben, Zertifikate etc.
- **Dateiexplorer:** Verwaltung von Bewerbungsunterlagen (organisieren, umbenennen, löschen)
- **Teilen:**
  - Bewerbungsunterlagen direkt per E-Mail oder Bewerbungsportale versenden
  - QR-Code für Kontaktdaten und Unterlagen (z.B. auf Job-Messen)

---

## 3. Quality of Life

### 3.1 Job-Gruppierung
- Jobs mit gleichem Titel und Anbieter (z.B. "Krankenpfleger in Berlin/München/Bern") werden in einem Eltern-Element zusammengefasst
- Einzelne Bewerbungen pro Stadt möglich

### 3.2 Duplikat-Erkennung
- Duplikate von verschiedenen Quellen finden und zusammenführen/löschen

### 3.3 Copy & Paste
- Anführungszeichen "• " konvertieren im WYSIWYG Text Editor

### 3.4 Input Fields (Lokalisiert)
- Location: Zugriff auf Städte-Liste (Autocomplete)
- Degree: Liste von Abschlüssen (lokalisiert)

### 3.5 CV-PDF Parsing
- Extrahiert Informationen aus hochgeladenem CV
- Erstellt basierend auf ESCO- und NACE-Codes eine Liste von Skills und Tags
- Vorschläge für Skills die in Bewerbungsunterlagen hervorgehoben werden sollten

---

## 4. Bewerbungsunterlagen

### 4.1 Skillsets
- Verwaltung von Skill-Profilen basierend auf ESCO/NACE Taxonomien

### 4.2 Dokumenten-Generatoren
- LLM-gestützte Erstellung basierend auf CV + Jobanforderungen
- Templates für verschiedene Länder und Branchen
- Output in mehreren Sprachen
- **Dokumenttypen:**
  - Titelblatt
  - CV / Lebenslauf
  - Anschreiben
  - Motivationsschreiben
  - Exposé
  - Anhänge (Zertifikate)

### 4.3 Output-Struktur (Paperless-ngx Style)
Dynamische Dateipfade und Dateinamen:
- **Ordner:** `<Unternehmen>/<LANG>/<Jobtitel>/`
- **Dateiname:** `<Datum> <Bewerbername> - <Jobtitel>` oder `<Datum> <Bewerbername> - <Unternehmen> - <Jobtitel>`

### 4.4 Städte: Verdienst-Index
- Gehaltsvergleich nach Stadt/Region

---

## 5. CRM

### 5.1 Kommunikation
- **PBX Anbindung:** Telefonie-Integration
- **E-Mail Anbindung:** Bewerbungs-E-Mails senden/empfangen

### 5.2 Kalender
- Kalender-Anbindung (Google Calendar, CalDAV, etc.)
- Interviews, Follow-Ups automatisch eintragen

### 5.3 Job Status Workflow
- Bewerbung → Interview → Angebot → Abgelehnt etc.
- Notizen pro Status-Übergang

### 5.4 Automatisierung
- Automatisierte Follow-Ups (Erinnerungen, Nachfass-E-Mails)
- Automatisierte Terminvereinbarungen

---

## 6. API & Dokumentation

### 6.1 Automatische API-Dokumentation
- OpenAPI/Swagger Dokumentation für alle API-Endpunkte
- Auto-generiert aus den Next.js API Routes

---

## Implementierte Features (Stand: 2026-03-23)

| Feature | Status |
|---|---|
| EURES Connector (EU Jobs) | ✅ Implementiert |
| JSearch Connector (Google Jobs) | ✅ Upstream |
| EURES Location Combobox (NUTS + Flags) | ✅ Implementiert |
| ESCO Occupation Combobox (Multi-Select + Details) | ✅ Implementiert |
| i18n (EN, DE, FR, ES) — 496 Keys | ✅ Implementiert |
| Locale-aware Date/Number Formatting | ✅ Implementiert |
| EU API Language Integration | ✅ Implementiert |
| User Language Settings | ✅ Implementiert |
