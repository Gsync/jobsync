# JobSync Roadmap

## 0. Infrastruktur-Refactoring (Priorität)

### 0.1 App ↔ Connector ↔ Module Umstellung
Bestehende Infrastruktur auf das ACL-Pattern (Anti-Corruption Layer) migrieren.

Der **Connector** ist die gemeinsame Schnittstelle (ACL). **Module** sind die konkreten Anbindungen an externe Systeme.

```
src/lib/connector/              ← DER Connector (Shared Domain)
  types.ts                      ← ConnectorResult<T>, DiscoveredVacancy, SearchParams
  connector.ts                  ← DataSourceConnector Interface (der ACL-Vertrag)
  registry.ts                   ← Context Map (Module-Name → Factory)
  runner.ts                     ← App-Layer Orchestrierung

  modules/                      ← Konkrete Anbindungen (je ein Bounded Context)
    eures/                      ← Module: EURES API
      index.ts                    (implementiert DataSourceConnector)
      types.ts                    (EURES-spezifische Typen)
      resilience.ts               (Circuit Breaker, Retry)
    arbeitsagentur/             ← Module: Arbeitsagentur API
    jsearch/                    ← Module: JSearch/Google Jobs API
```

- **Migration:** `src/lib/scraper/` → `src/lib/connector/`
  - Shared files (`types.ts`, `registry.ts`, `runner.ts`, `mapper.ts`) → `src/lib/connector/`
  - Module-Ordner (`eures/`, `arbeitsagentur/`, `jsearch/`) → `src/lib/connector/modules/`
- **Imports aktualisieren:** `@/lib/scraper/` → `@/lib/connector/`
- **Tests anpassen:** 748+ Tests müssen bestehen

### 0.2 ActionResult<T> Typisierung vervollständigen
- Pattern A (55 Funktionen): `Promise<any>` → `Promise<ActionResult<unknown>>` (in Arbeit)
- Pattern B (6 Funktionen): Caller-Refactoring damit auch `getAllX` ActionResult nutzt
- Pattern C (Dashboard): Custom Return-Types statt `any`
- Endziel: `ActionResult<DomainType>` mit spezifischen Prisma-aligned Domain-Models
- Siehe `specs/action-result.allium` für die vollständige Klassifikation

### 0.3 Domain-Model Alignment
- Prisma-generierte Typen und Domain-Model Interfaces (`src/models/`) synchronisieren
- Ermöglicht `ActionResult<Job>` statt `ActionResult<unknown>`
- Voraussetzung für automatische API-Dokumentation (Roadmap 8.1)

---

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

### 1.6 Dokumentenworkflow Connector
- **Modul: Paperless-ngx**
  - Dokumente aus JobSync an Paperless-ngx senden/empfangen
  - Automatische Ablage von Bewerbungsunterlagen nach Paperless-ngx Tags/Correspondent-Schema
  - Bidirektionale Synchronisation

### 1.7 Kalender Integration
- **Modul: CalDAV** — Standardprotokoll für Kalender-Anbindung
- **Modul: Google Kalender** — OAuth2-Authentifizierung, Events erstellen/lesen
- **Modul: Outlook** — Microsoft Graph API, Events + Erinnerungen

### 1.8 Arbeitgeber-Bewertungsportale
- **Modul: Kununu** — Unternehmensbewertungen abrufen und in Jobdetails anzeigen
- **Modul: Weitere Portale** — Glassdoor, Indeed Reviews, etc.

### 1.9 Arbeitsagenturen (Multi-Land)
- **Modul: arbeitsagentur.de (Erweitert)**
  - Authentifizierung / Login (ggf. Browser-Instanz mit Playwright)
  - Sitzung aktiv halten (Timeout nach 30 Min Inaktivität)
  - **Nachrichten:** Empfangen und senden mit Anhang
  - **Tracking:**
    - Termine (Arbeitsvermittler Video-Call / vor Ort) + Kalender-Integration (→ 1.7)
    - Fristen (aus Dokumenten extrahieren)
    - Eingelegte Widersprüche
    - Bewerbungsvorschläge vom Arbeitsvermittler
  - **Dokumentenverwaltung:**
    - Dokumente abrufen, verwalten, teilen/weiterleiten
    - Paperless-ngx Integration (→ 1.6)
  - **Formulare ausfüllen:**
    - PDF Formulare und Online Formulare
    - "Lokale Bewerbungsbemühungen" automatisch ausfüllen
    - Tag für "Bewerbung Online" / "Bewerbung Persönlich"
    - Übersetzungen der Formulare anbieten
- **Weitere Länder:** Modulare Architektur für Arbeitsagenturen anderer EU-Länder

### 1.10 Architekturprinzip: App ↔ Connector ↔ Module (ACL)

Alle externen Integrationen folgen dem **Anti-Corruption Layer** Pattern:

```
App (Kernlogik) ↔ Connector (ACL) ↔ Module (Externes System)
```

- **Module:** Die externe API/Service (EURES, Arbeitsagentur, Paperless-ngx, CalDAV). Kann crashen, Timeouts haben, API-Änderungen durchlaufen.
- **Connector:** Übersetzt zwischen Module-Protokoll und App-Domäne. Implementiert Resilience (Circuit Breaker, Retry, Rate Limit). Wenn ein Module abstürzt, gibt der Connector einen sauberen Fehler zurück.
- **App:** Sieht nur `ConnectorResult<T>` — unabhängig davon ob das Module eine REST API, Browser-Instanz oder lokaler Service ist.

**Vorteile:** Fehler-Isolation, Module austauschbar, unabhängiges Testing, klare Verträge.

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

### 2.6 Unified Add Automation Workflow
- Einheitlicher Wizard für alle Connectors (JSearch, EURES, Arbeitsagentur, zukünftige)
- Connector-spezifische Felder werden dynamisch basierend auf dem gewählten Connector geladen
- Gemeinsame Felder (Name, Resume, Threshold, Schedule) bleiben einheitlich
- Connector-spezifische Widgets (z.B. EURES: NUTS-Combobox, Arbeitsagentur: Umkreis-Slider)

### 2.7 Connector Settings
- **Connector-Verwaltung in Settings:**
  - Übersicht aller verfügbaren Connectors mit Status (aktiv/inaktiv)
  - Toggle zum Aktivieren/Deaktivieren einzelner Connectors
  - Deaktivierte Connectors erscheinen nicht im Automation Wizard
- **Connector-spezifische Einstellungen:**
  - API-Keys pro Connector (falls benötigt, z.B. RapidAPI für JSearch)
  - Default-Parameter pro Connector (z.B. Standard-Umkreis für Arbeitsagentur, Standard-Sprache für EURES)
  - Rate-Limit-Konfiguration
  - Proxy-Einstellungen
- **Connector Health Check:**
  - Status-Anzeige ob der Connector erreichbar ist
  - Letzte erfolgreiche Verbindung
  - Fehlerlog pro Connector

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
- **Passwortschutz für Bewerbungsunterlagen (externer Zugriff):**
  - Geteilte Dokumente und Landingpages per Passwort schützen
  - Zeitlich begrenzte Zugangslinks (expiring share links)
  - Zugriffs-Log: wer hat wann auf welches Dokument zugegriffen
  - Optional: Wasserzeichen mit Empfängername in geteilten PDFs
- **Self-Hosted First:** Alle Daten bleiben auf dem eigenen Server — keine Cloud-Abhängigkeit für Kerndaten
- **LLM-Datenschutz:** Konfigurierbar, ob Daten an externe LLM-APIs gesendet werden dürfen (Opt-In pro Provider)

### 6.2 API Security (Best Practices)
- **Authentifizierung:** Alle API-Routes erfordern Session-Auth (bereits implementiert für ESCO/EURES)
- **Rate Limiting:** Request-Limits pro User/IP (bereits für manuelle Automation-Runs)
  - Erweiterung: globales Rate Limiting via Redis/Memory für alle Endpunkte
- **Input Validation:**
  - Zod-Schema-Validierung auf allen Eingaben (bereits implementiert)
  - URI-Whitelist für externe API-Proxies (SSRF-Schutz, bereits für ESCO)
  - Maximale Payload-Größe begrenzen
- **CORS:** Strikte Origin-Policy, nur eigene Domain erlauben
- **CSRF-Schutz:** Next.js Server Actions haben eingebauten CSRF-Schutz; API-Routes absichern
- **Content Security Policy (CSP):** Strikte CSP-Header für XSS-Schutz
- **Dependency Security:** Regelmäßige Audits (`bun audit`), Dependabot/Renovate
- **Secrets Management:**
  - API-Keys verschlüsselt in DB (AES, bereits implementiert)
  - Keine Secrets in Git (`.env` gitignored)
  - Environment Variables für Server-Secrets
- **Logging & Monitoring:**
  - Fehlgeschlagene Auth-Versuche loggen
  - Anomalie-Erkennung bei API-Nutzung
  - Optional: Sentry/OpenTelemetry Integration

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
