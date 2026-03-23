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

### 1.5 Job-Alerts
- Benachrichtigungen bei neuen Jobs, die den Suchkriterien entsprechen
- Push-Benachrichtigungen (Browser), E-Mail-Alerts, Webhook-Notifications
- Konfigurierbar pro Automation (Frequenz, Schwellenwert, Kanal)

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

### 4.4 Unterschrift
- Upload einer bestehenden Unterschrift (Bild/SVG)
- Zeicheneingabe direkt in der App (Canvas/Touch)
- Automatische Platzierung in Bewerbungsunterlagen (Anschreiben, CV)
- Automatisierte Unterschriftenerstellung (Name → Schrift-Rendering)

### 4.5 Automatisches Datum
- Aktuelles Datum wird automatisch in Bewerbungsunterlagen eingefügt
- Lokalisiertes Format je nach Zielland (z.B. "23. März 2026" für DE, "March 23, 2026" für EN)

### 4.6 Video-Vorstellung
- Bewerber können ein kurzes Vorstellungsvideo aufnehmen oder hochladen
- Einbettbar in Bewerbungsunterlagen als QR-Code/Link
- Optional: KI-gestützte Transkription und Zusammenfassung

### 4.7 Landingpage für Unternehmen
- Personalisierte Bewerber-Landingpage pro Bewerbung
- Enthält: Video-Vorstellung, CV, Portfolio, Skills, Kontaktdaten
- Teilbar per Link oder QR-Code
- Tracking: Aufrufe, Verweildauer (optional)

### 4.8 Städte: Verdienst-Index
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

### 5.5 Dateiexplorer-Integration
- CRM ist direkt mit dem Dateiexplorer (Sektion 2.5) verbunden
- Bewerbungsunterlagen, E-Mails, Notizen und Anhänge pro Kontakt/Job sichtbar
- Drag & Drop von Dateien in CRM-Einträge
- Automatische Zuordnung von generierten Dokumenten (CV, Anschreiben) zum jeweiligen Job/Kontakt

### 5.6 Backlog
- Kanban-Board für Bewerbungspipeline (Backlog → In Bearbeitung → Gesendet → Follow-Up → Abgeschlossen)
- Backlog für geplante Bewerbungen, Recherche-Aufgaben, Kontaktaufnahmen
- Priorisierung und Sortierung nach Deadline, Match-Score, Unternehmensbewertung
- Verknüpfung mit Kalender (Deadlines) und Automatisierung (Follow-Ups)

### 5.7 Kontakt- & Unternehmens-Extraktion
- Automatische Extraktion von Unternehmen, Kontaktpersonen und Ansprechpartnern aus:
  - Jobbeschreibungen (NLP/Regex: "Ansprechpartner: ...", "Kontakt: ...")
  - E-Mails (Signaturen parsen)
  - Websites (Impressum, Team-Seiten)
- Automatische Zuordnung zum CRM-Datensatz (Job → Unternehmen → Kontakt)
- Dublettenprüfung: gleicher Kontakt bei verschiedenen Jobs erkennen
- Anreicherung: LinkedIn-Profil, XING, Unternehmenswebsite verknüpfen

---

## 6. Datenschutz & Compliance

### 6.1 DSGVO-Konformität
- **Datenminimierung:** Nur für die Bewerbung notwendige Daten erfassen
- **Einwilligungsmanagement:** Nutzer stimmen der Datenverarbeitung explizit zu
- **Löschkonzept:**
  - Automatische Löschung abgelaufener Bewerbungsdaten nach konfigurierbarer Frist
  - "Recht auf Vergessenwerden": Vollständige Datenlöschung auf Anfrage (Account + alle verknüpften Daten)
  - Löschprotokoll für Nachweisbarkeit
- **Datenexport:** Vollständiger Export aller Nutzerdaten in maschinenlesbarem Format (JSON/CSV) — Art. 20 DSGVO Datenportabilität
- **Verschlüsselung:**
  - API-Keys bereits verschlüsselt gespeichert (AES)
  - Personenbezogene Daten (Name, E-Mail, Kontakte) verschlüsselt at-rest
  - TLS für alle externen API-Aufrufe
- **Audit-Log:** Protokollierung von Datenzugriffen und -änderungen
- **Impressum:** Konfigurierbare Impressum-Seite (Pflicht in DE/AT/CH)
  - Betreiber-Angaben, Kontaktdaten, Verantwortlicher i.S.d. § 55 RStV
  - Für Self-Hosted: Nutzer pflegt eigene Angaben in den Settings
- **Datenschutzerklärung:**
  - Vollständige Datenschutzerklärung als eigene Seite (Art. 13/14 DSGVO)
  - Auflistung aller verarbeiteten Daten, Zweck, Rechtsgrundlage, Speicherdauer
  - Auflistung aller Drittanbieter (EURES, ESCO, Eurostat, LLM-Provider, Kununu, etc.)
  - Lokalisiert in allen unterstützten Sprachen
- **Cookie-Banner:**
  - Consent-Management für Cookies und lokale Speicherung
  - Unterscheidung: technisch notwendig (Session, NEXT_LOCALE) vs. optional (Analytics)
  - Opt-In für nicht-essentielle Cookies (DSGVO Art. 7)
  - Einstellungen jederzeit widerrufbar
- **Self-Hosted First:** Alle Daten bleiben auf dem eigenen Server — keine Cloud-Abhängigkeit für Kerndaten
- **LLM-Datenschutz:** Konfigurierbar, ob Daten an externe LLM-APIs gesendet werden dürfen (Opt-In pro Provider)

---

## 7. Experimentell

### 6.1 CareerBERT
- Integration und Optimierung von [CareerBERT](https://github.com/julianrosenberger/careerbert)
- Spezialisiertes NLP-Modell für Karriere- und Jobtexte (basierend auf BERT)
- **Anwendungsfälle:**
  - Semantisches Matching zwischen CV-Skills und Job-Anforderungen (besser als Keyword-Match)
  - Automatische Skill-Extraktion aus Jobbeschreibungen und Lebensläufen
  - Ähnlichkeitssuche: "Jobs ähnlich zu diesem" basierend auf Beschreibungstext
  - Klassifikation von Jobs nach ESCO/ISCO Taxonomie
  - Ranking von Bewerbungen nach semantischer Relevanz
- **Technisch:**
  - Self-hosted Inference (z.B. via ONNX Runtime oder Hugging Face Transformers)
  - Optional: Finetuning auf eigene Jobdaten für bessere Ergebnisse
  - API-Endpunkt für Embedding-Generierung und Similarity-Search
  - Integration mit dem bestehenden AI Match-Score System
- **Ressourcen:**
  - https://github.com/julianrosenberger/careerbert

---

## 7. API & Dokumentation

### 7.1 Automatische API-Dokumentation
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
