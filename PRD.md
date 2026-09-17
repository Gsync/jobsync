# PRD — Dual-Workspace Application Tracker (School + Job)

**Product:** Application Tracker (working name: *Tracker*)
**Base:** JobSync (MIT) — deployed at https://jobba.up.railway.app
**Repo:** `D:\my apps\reclip\jobsync` · Railway project `jobsync-tracker`
**UI source (only):** [opensourceui.in](https://opensourceui.in) — MIT, copy-paste React/Next.js, Tailwind v4, Lucide
**Owner:** Samuel Danquah Ankapong
**Status:** Planning — implement next session

---

## 1. Vision

One self-hosted application tracker that handles **two kinds of applications** in **separate workspaces**:

- **School workspace** — PhD / Master's applications: universities, professors (PIs), programmes, funding, deadlines, documents (CV, SOP, transcripts), cold-email outreach, interviews.
- **Job workspace** — jobs: companies, roles, recruiters, sources, CV variants, applications, interviews, offers.

Same engine, two skins and two field-sets. Switch between them instantly.

**Why:** Samuel is running ~8 live PhD applications and a job search in parallel. Generic trackers model only *jobs*. Nothing models *"emailed Prof X about paper Y on date Z, follow up on date W, funding status, SOP version"* — which is the real PhD workflow.

---

## 2. Goals / Non-goals

### Goals
1. **Workspace switch** between School and Job with independent pipelines and fields.
2. Model **academic entities** natively: University, Programme, Professor/PI, Funding, Deadline, Document (SOP/CV/transcript/proposal), Outreach.
3. Track the **cold-email lifecycle** (sent → follow-up due → replied → meeting → outcome).
4. Unified **deadline dashboard** across both workspaces.
5. UI overhauled using **only opensourceui.in components** + Tailwind.
6. Keep it **self-hosted**, cheap, and agent-friendly (MCP).

### Non-goals (v1)
- No auto-apply / auto-email sending (recruiters detect it; also unethical for academia).
- No multi-user teams/orgs. Single user.
- No job-board scraping (JobOps does that; not needed now).
- No native mobile app — responsive web only.

---

## 3. Current state (baseline)

| Item | Value |
|---|---|
| App | JobSync (Next.js 15, React, Prisma + SQLite, NextAuth, Vercel AI SDK, MCP server) |
| Auth | NextAuth, email+password, `AUTH_SECRET`, `AUTH_TRUST_HOST=true` |
| DB | SQLite at `/data/dev.db`, 5 GB Railway volume `jobsync-volume` |
| Deploy | Railway, Dockerfile build, domain https://jobba.up.railway.app |
| Styling | Tailwind + shadcn/ui (being replaced) |
| MCP | Built-in MCP server (`/api/mcp`), tokens in Settings |

Existing Prisma models we inherit: `User, Job, JobTitle, Location, Company, JobSource, Contact, ContactRole, Profile, Activity, ActivityType, Task, Automation, UserSettings, ApiKey, Note, Tag, Question, McpAccessToken, ChatConversation`.

---

## 4. Core concept — Workspaces

```
User
 └── Workspace (type: SCHOOL | JOB)
      ├── Pipeline (ordered Stages)
      ├── Applications
      │    ├── Organization (University | Company)
      │    ├── Contacts (PIs/Professors | Recruiters)
      │    ├── Documents (CV/SOP/Transcript | CV variants)
      │    ├── Outreach (cold emails)
      │    ├── Tasks & Deadlines
      │    └── Notes / Questions
      └── Settings (fields, stages, scoring)
```

**Workspace switcher** is the top-level nav control (opensourceui.in `workspace-switcher`).

### Pipeline defaults (editable)

| Stage | SCHOOL | JOB |
|---|---|---|
| 1 | Researching | Saved |
| 2 | Outreach sent | Applied |
| 3 | Applied | Screening |
| 4 | Interview | Interview |
| 5 | Offer | Offer |
| 6 | Rejected / Withdrawn | Rejected / Withdrawn |

---

## 5. Domain model changes (Prisma)

### 5.1 New models

```prisma
model Workspace {
  id        String   @id @default(uuid())
  userId    String
  name      String
  type      WorkspaceType          // SCHOOL | JOB
  createdAt DateTime @default(now())
  user      User     @relation(fields:[userId], references:[id])
  apps      Application[]
  stages    Stage[]
  fields    WorkspaceField[]       // custom field defs per workspace
}

enum WorkspaceType { SCHOOL JOB }

model Stage {
  id          String @id @default(uuid())
  workspaceId String
  name        String
  order       Int
  isTerminal  Boolean @default(false)
  color       String?
}
```

### 5.2 Generalise the application record

Rename `Job` → **`Application`** (keep a compatibility view during migration).

```prisma
model Application {
  id           String  @id @default(uuid())
  workspaceId  String
  orgId        String?              // University | Company
  title        String               // Role title | Programme name
  kind         String?              // phd | masters | fellowship | fulltime | internship
  stageId      String
  deadline     DateTime?
  appliedAt    DateTime?
  sourceUrl    String?
  location     String?
  // SCHOOL-specific
  fundingStatus String?             // funded | self-funded | scholarship | unknown
  stipendAmount String?
  supervisorId  String?             // primary PI (Contact)
  programmeRef  String?             // e.g. vacancy ref 2592
  // shared
  matchScore    Int?
  notes         Note[]
  tasks         Task[]
  docs          DocumentLink[]
  contacts      ContactRole[]
  outreach      Outreach[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Organization {              // was Company
  id       String  @id @default(uuid())
  name     String
  type     String?                  // university | institute | company
  country  String?
  website  String?
  notes    String?
}

model Document {                  // was Profile/resume, generalised
  id        String   @id @default(uuid())
  name      String
  kind      String                    // cv | sop | transcript | proposal | cover_letter
  version   Int      @default(1)
  filePath  String?
  content   String?                   // markdown/text
  createdAt DateTime @default(now())
}

model DocumentLink {             // attach a doc+version to an application
  applicationId String
  documentId    String
  role          String?            // submitted | tailored | reference
}

model Outreach {                  // NEW — the cold-email lifecycle
  id            String   @id @default(uuid())
  applicationId String
  contactId     String
  channel       String   @default("email")
  subject       String?
  body          String?
  paperCited    String?             // which paper the email referenced
  sentAt        DateTime?
  followUpDue   DateTime?
  repliedAt     DateTime?
  outcome       String?             // no_reply | positive | negative | meeting | offer
  createdAt     DateTime @default(now())
}

model WorkspaceField {            // user-defined custom fields
  id          String @id @default(uuid())
  workspaceId String
  key         String
  label       String
  type        String                 // text | number | date | select | url
  options     String?                // JSON for select
}
```

### 5.3 Reuse as-is
`Contact`, `ContactRole`, `Note`, `Tag`, `Task`, `Activity`, `ActivityType`, `Question`, `ApiKey`, `UserSettings`, `McpAccessToken`, `ChatConversation`.

### 5.4 Migration plan
1. Add `Workspace`; backfill **one JOB workspace** per user.
2. `Job` → `Application` via Prisma rename + `workspaceId` backfill.
3. `Company` → `Organization`.
4. `Profile` → `Document` (kind=`cv`).
5. SQLite is fine through migration; consider **Postgres** later for concurrency (Railway add `postgres`, swap `DATABASE_URL`).

---

## 6. Feature spec per workspace

### 6.1 Shared (both)
- Applications table with **server-side sort/filter/search**, column visibility, saved views.
- Pipeline **board view** (kanban by stage).
- **Deadline calendar** (month + week) with countdown.
- Application detail page: overview, contacts, documents, outreach, tasks, notes, activity.
- Document library with **versions** and per-application links.
- Task/deadline engine with reminders (email or toast).
- Global **command palette** (⌘K).
- Dashboard: counts by stage, upcoming deadlines, stale applications, response rate.
- MCP server for agent-driven creates/updates.

### 6.2 School-specific
- **Professor/PI directory** — contact role = PI; fields: research area, lab, papers read, outreach history.
- **Funding tracker** — funded / self-funded / scholarship, stipend, fee waiver, visa rules.
- **Programme metadata** — degree, duration, start date, application portal, reference code.
- **Outreach pipeline** (the differentiator): each application can hold many `Outreach` rows — one per professor emailed — with paper cited, date sent, follow-up due, reply outcome.
- **Document set** — SOP per programme, CV, transcripts, research proposal, referees.
- **Eligibility notes** — bachelor's vs master's requirement, English test, ECTS.

### 6.3 Job-specific
- **Recruiter/referee contacts**, referral tracking.
- **CV tailoring** per role (document variants).
- **Source tracking** (LinkedIn, referral, company site) + response rates per source.
- Salary/comp fields.

---

## 7. UI overhaul — design language

**Source:** opensourceui.in only. Copy-paste into `components/osui/*`; we own the files.

**Aesthetic commitment:** opensourceui.in is **light-only** ("paper white, ink text, quiet borders"). Adopting it means JobSync goes **light-first**. We add a dark variant ourselves later if needed — the library itself ships none.

**Stack alignment check (do first):** JobSync must be on **Tailwind v4**. If it's v3, run the v3→v4 migration before copying components.

**Rules we adopt:** hairline borders, neutral stage, accents only for state; focus = border change not coloured ring; motion respects `prefers-reduced-motion`; responsive with `md:` base (not `sm:`).

---

## 8. Component mapping (opensourceui.in → screens)

### 8.1 App shell / navigation

| Need | opensourceui.in component |
|---|---|
| Workspace switch (School ↔ Job) | [`workspace-switcher`](https://opensourceui.in/components/workspace-switcher) |
| Account menu | [`user-menu`](https://opensourceui.in/components/user-menu) |
| Notifications tray | [`notification`](https://opensourceui.in/components/notification) |
| Command palette (⌘K) | [`spotlight-bar`](https://opensourceui.in/components/spotlight-bar) |
| View-mode switch (Table/Board/Calendar) | [`segmented-toggle-button`](https://opensourceui.in/components/segmented-toggle-button) |
| Bottom/stage nav (desktop) | [`mac-dock`](https://opensourceui.in/components/mac-dock), [`app-dock`](https://opensourceui.in/components/app-dock) |
| Collaborator presence | [`presence-dock`](https://opensourceui.in/components/presence-dock) |

### 8.2 Applications list & board

| Need | Component |
|---|---|
| Applications table (checkbox, assignee, due date) | [`tasks-table`](https://opensourceui.in/components/tasks-table) |
| Alternative dense list | [`orders-table`](https://opensourceui.in/components/orders-table) |
| Bulk-select rows | [`users-select-table`](https://opensourceui.in/components/users-select-table) |
| Contact/people list | [`team-members-table`](https://opensourceui.in/components/team-members-table) |
| Row actions (⋯) | [`kebab-actions`](https://opensourceui.in/components/kebab-actions) |
| Column/field menu | [`file-menu`](https://opensourceui.in/components/file-menu) |
| Filter / sort control | [`filter-sort`](https://opensourceui.in/components/filter-sort), [`select-field-input`](https://opensourceui.in/components/select-field-input) |
| Progress across stages | [`progress-ring`](https://opensourceui.in/components/progress-ring) |

### 8.3 Deadlines & calendar

| Need | Component |
|---|---|
| Full month view | [`month-picker-calendar`](https://opensourceui.in/components/month-picker-calendar) |
| Week strip | [`week-strip-calendar`](https://opensourceui.in/components/week-strip-calendar) |
| Date range (e.g. intake window) | [`date-range-picker`](https://opensourceui.in/components/date-range-picker) |
| Slot booking (interview) | [`booking-slot-calendar`](https://opensourceui.in/components/booking-slot-calendar) |
| Deadline countdown card | [`event-countdown-card`](https://opensourceui.in/components/event-countdown-card) |
| Activity heatmap | [`daily-activity-calendar`](https://opensourceui.in/components/daily-activity-calendar), [`github-contribution`](https://opensourceui.in/components/github-contribution) |

### 8.4 Forms (create/edit application, PI, outreach)

| Need | Component |
|---|---|
| Text | [`text-field-input`](https://opensourceui.in/components/text-field-input) |
| Long text / notes | [`textarea-field-input`](https://opensourceui.in/components/textarea-field-input) |
| Select (stage, funding) | [`select-field-input`](https://opensourceui.in/components/select-field-input) |
| Searchable select (university/PI) | [`combobox-field-input`](https://opensourceui.in/components/combobox-field-input) |
| Date (deadline) | [`date-field-input`](https://opensourceui.in/components/date-field-input) |
| URL with prefix | [`input-group-field`](https://opensourceui.in/components/input-group-field) |
| Attach files (CV/SOP/transcript) | [`file-upload-field-input`](https://opensourceui.in/components/file-upload-field-input) |
| Checkbox / Radio / Switch | [`checkbox-field-input`](https://opensourceui.in/components/checkbox-field-input), [`radio-group-field-input`](https://opensourceui.in/components/radio-group-field-input), [`switch-field-input`](https://opensourceui.in/components/switch-field-input) |
| Quick filter search | [`search-input`](https://opensourceui.in/components/search-input) |
| Floating-label form | [`floating-label-field-input`](https://opensourceui.in/components/floating-label-field-input) |

### 8.5 Auth

| Need | Component |
|---|---|
| Login | [`login-form`](https://opensourceui.in/components/login-form) |
| Signup | [`signup-form`](https://opensourceui.in/components/signup-form) |
| Password reset | [`forgot-password-form`](https://opensourceui.in/components/forgot-password-form) |
| 2FA / email code | [`otp-boxed-input`](https://opensourceui.in/components/otp-boxed-input), [`otp-underline-input`](https://opensourceui.in/components/otp-underline-input) |

### 8.6 Contacts — recruiters & professors

| Need | Component |
|---|---|
| PI / recruiter detail card | [`contact-profile`](https://opensourceui.in/components/contact-profile) |
| Roster / directory | [`editorial-staff-profile`](https://opensourceui.in/components/editorial-staff-profile), [`team-member-profile-grid`](https://opensourceui.in/components/team-member-profile-grid) |
| Individual profile | [`user-profile`](https://opensourceui.in/components/user-profile), [`blob-profile`](https://opensourceui.in/components/blob-profile) |
| Professional profile | [`linked-in-profile`](https://opensourceui.in/components/linked-in-profile) |

### 8.7 Documents (CV, SOP, transcripts, proposals)

| Need | Component |
|---|---|
| Document row / filing card | [`ink-stamp-document`](https://opensourceui.in/components/ink-stamp-document) |
| Folder grouping | [`stacked-folder-card`](https://opensourceui.in/components/stacked-folder-card), [`opensource-folder-tab-card`](https://opensourceui.in/components/opensource-folder-tab-card) |
| CV/editor preview | [`journal-writing`](https://opensourceui.in/components/journal-writing) (word count, save indicator) |

### 8.8 Feedback / states

| Need | Component |
|---|---|
| Toasts ("Applied saved") | [`toast-notification`](https://opensourceui.in/components/toast-notification) |
| Alert banner | [`system-alert`](https://opensourceui.in/components/system-alert) |
| Loading | [`spin-loader`](https://opensourceui.in/components/spin-loader), [`text-loader`](https://opensourceui.in/components/text-loader) |
| Empty states | [`diagonal-box-pattern`](https://opensourceui.in/components/diagonal-box-pattern), [`dot-grid-pattern`](https://opensourceui.in/components/dot-grid-pattern) as backdrop |
| Buttons | [`3d-button`](https://opensourceui.in/components/3d-button), [`depth-outline-button`](https://opensourceui.in/components/depth-outline-button), [`soft-pill-button`](https://opensourceui.in/components/soft-pill-button), [`slide-to-confirm-button`](https://opensourceui.in/components/slide-to-confirm-button) (destructive) |
| Danger confirm ("Delete application") | [`hold-to-delete-button`](https://opensourceui.in/components/hold-to-delete-button), [`slide-to-confirm-button`](https://opensourceui.in/components/slide-to-confirm-button) |

### 8.9 Dashboard widgets

| Need | Component |
|---|---|
| Tasks today | [`minimal-agenda`](https://opensourceui.in/components/minimal-agenda) |
| Stat tile | [`step-count`](https://opensourceui.in/components/step-count) |
| Countdown / timer | [`pomodoro`](https://opensourceui.in/components/pomodoro), [`stopwatch`](https://opensourceui.in/components/stopwatch) |
| Notifications feed | [`email-notification`](https://opensourceui.in/components/email-notification), [`calendar-reminder-notification`](https://opensourceui.in/components/calendar-reminder-notification), [`deploy-notification`](https://opensourceui.in/components/deploy-notification) |
| Backgrounds for hero sections | [`aurora-background`](https://opensourceui.in/components/aurora-background), [`frost-mesh-background`](https://opensourceui.in/components/frost-mesh-background), [`dot-grid-pattern`](https://opensourceui.in/components/dot-grid-pattern), [`graph-paper-pattern`](https://opensourceui.in/components/graph-paper-pattern) |

---

## 9. Screen inventory (build list)

| # | Screen | Key components |
|---|---|---|
| 1 | Sign in / Sign up | `login-form`, `signup-form` |
| 2 | **Workspace picker** | `workspace-switcher` |
| 3 | Dashboard (per workspace) | `step-count`, `minimal-agenda`, `event-countdown-card`, `progress-ring`, `toast-notification` |
| 4 | Applications — Table view | `tasks-table`, `filter-sort`, `search-input`, `kebab-actions` |
| 5 | Applications — Board view | own kanban, cards from `ink-stamp-document` style |
| 6 | Applications — Calendar view | `month-picker-calendar`, `week-strip-calendar` |
| 7 | Application detail | `contact-profile`, `ink-stamp-document`, `journal-writing`, `kebab-actions` |
| 8 | New/Edit application | full form component set (§8.4) |
| 9 | **Contacts / PIs directory** | `team-member-profile-grid`, `editorial-staff-profile` |
| 10 | Contact detail | `contact-profile`, `linked-in-profile` |
| 11 | **Outreach log** (cold emails) | `tasks-table` variant, `event-countdown-card` for follow-ups |
| 12 | Documents library | `stacked-folder-card`, `ink-stamp-document` |
| 13 | Tasks & deadlines | `minimal-agenda`, `tasks-table` |
| 14 | Question bank | `tasks-table` / note list |
| 15 | Settings (workspace, stages, fields, MCP) | `segmented-toggle-button`, form set |
| 16 | Global search / ⌘K | `spotlight-bar` |

---

## 10. Technical architecture

- **Framework:** Next.js 15 App Router (inherited).
- **DB:** Prisma + SQLite (v1). Optional Postgres on Railway when concurrency/reporting grows.
- **Auth:** NextAuth (inherited).
- **Styling:** Tailwind v4 + opensourceui.in components copied into `components/osui/`.
- **State/data:** React Server Components + server actions; TanStack Table for the data grid logic (styled with osui).
- **Files:** Railway volume `/data/files/…`.
- **Jobs/reminders:** a small cron (Railway cron or a `/api/cron` route) that scans `Task.dueAt` and `Outreach.followUpDue` and emails reminders.
- **MCP:** extend the inherited MCP server with tools: `create_application`, `log_outreach`, `set_deadline`, `add_contact`, `update_stage`.
- **Railway:** same project; add a cron service + (later) Postgres.

---

## 11. Cold-email → tracker integration

This closes the loop on the work already done in `CAS-cold-emails/` and `other-cold-emails/`:

- Each cold email becomes an **Outreach** row linked to an Application + Contact.
- Fields captured: professor, paper cited, subject, body, sent date, **follow-up due (sent + 10–14 days)**, reply, outcome.
- The tracker surfaces **"follow-up due today"** — which is exactly the rule from the Reddit research (one follow-up, 10–14 days).
- Auto-create Applications from the 8 drafted emails: Vanderbilt/Dong, NYU/Su, Dresden/Speidel, Twente/Misra, KU Leuven/VanderPoorten, Utah/George, Northeastern/Shepherd (+ Imperial & HERON marked CLOSED).

---

## 12. Roadmap

### Phase 0 — prep (½ day)
- [ ] Confirm Tailwind version; migrate to v4 if needed.
- [ ] Create `components/osui/` and copy the shell + form + table components from §8.
- [ ] Set the light "paper/ink" theme tokens.

### Phase 1 — data model (1 day)
- [ ] Prisma: add `Workspace, Stage, Outreach, Document, DocumentLink, Organization, WorkspaceField`; rename `Job→Application`, `Company→Organization`, `Profile→Document`.
- [ ] Migrate + backfill; seed default stages per workspace type.
- [ ] Create the two workspaces for Samuel's user.

### Phase 2 — shell + workspaces (1 day)
- [ ] `workspace-switcher` in header; workspace-scoped routing `/w/[workspaceId]/…`.
- [ ] Dashboard with counts + upcoming deadlines.

### Phase 3 — applications CRUD (2 days)
- [ ] Table view (sort/filter/search/saved views) with `tasks-table` styling.
- [ ] Board view (kanban by stage, drag-drop).
- [ ] Calendar view (month/week) reading `deadline` + `followUpDue`.
- [ ] Detail page + full create/edit form.

### Phase 4 — school-specific (2 days)
- [ ] PI/professor directory + contact roles.
- [ ] Funding + programme fields.
- [ ] **Outreach log** with follow-up engine.
- [ ] Document library with versions (SOP/CV/transcript/proposal).

### Phase 5 — polish + agent (1 day)
- [ ] Command palette, toasts, empty states, destructive confirms.
- [ ] MCP tools for create/log-outreach/update-stage.
- [ ] Import Samuel's 8 applications from the email drafts.

### Phase 6 — deploy (½ day)
- [ ] Railway redeploy; add cron service for reminders; verify SUCCESS + HTTP 200.

**Total: ~8 working days.**

---

## 13. Risks & decisions

| Risk / decision | Notes |
|---|---|
| **opensourceui.in is light-only** | Committing to a light UI. Accept, or add our own dark tokens later (library won't provide them). |
| **It's a presentational catalog, not an app kit** | No sidebar/data-grid/kanban logic. We compose the app shell and use TanStack Table for logic; osui supplies the visuals. |
| **Tailwind v4 requirement** | Verify JobSync's Tailwind version first — v3→v4 is a migration. |
| **Prisma rename is destructive** | Do it on a DB backup; the Railway volume snapshot is our rollback. |
| **SQLite concurrency** | Fine single-user; move to Postgres if we add background jobs writing concurrently. |
| **Emails not auto-sent** | Deliberate — academia and recruiters penalise automation. Tracker logs and reminds; human sends. |

---

## 14. Open questions

1. Should **Documents** hold file binaries (Railway volume) or text/markdown only in v1?
2. Do we want **Postgres** from the start to simplify later phases?
3. Should the **Job workspace** keep JobSync's AI features (CV match, cover letter) or strip them for v1?
4. Reminders: **email** (needs SMTP creds) or in-app **toast/badge** only for v1?
5. Do we keep JobSync's **Automation** (job-board scraping) or disable it in v1?

---

## Appendix A — current deployments

| | |
|---|---|
| URL | https://jobba.up.railway.app |
| Project | `jobsync-tracker` — `592d3a70-61ea-4c85-b0b4-66c0767802f8` |
| Service | `jobsync` — `49eccc92-9bc6-4755-9238-ec1c42c6cb28` |
| Volume | `jobsync-volume` (5 GB, `/data`) — `9a6d8cd7-a540-44fb-947e-7360141c9cee` |
| Fix applied | `docker-entrypoint.sh` CRLF→LF + `.gitattributes` |

## Appendix C — storage: Bucket, not Volume (built 2026-09-17)

**Decision — no DuckDB engine swap:** Prisma (100+ call sites) has no DuckDB
provider, so replacing SQLite with DuckDB means rewriting the whole data
layer for zero single-user benefit. The DB stays **SQLite-on-Prisma**;
durability moves from the Railway Volume to the Railway Bucket.

| | |
|---|---|
| Bucket | `jobsync-db` (sjc) → S3 name `jobsync-db-ubyp0zs-jz9ytn` |
| Object | `db/dev.db` (+ `-wal`/`-shm` sidecars when present) |
| Boot | `scripts/sync-db-bucket.mjs download` before `prisma migrate deploy` |
| Runtime | background upload every 5 min + final upload on SIGTERM/SIGINT |
| Client | dep-free SigV4 over `fetch` (no AWS SDK — keeps the slim runner lean) |
| Style | virtual-hosted (`S3_PATH_STYLE=false`, per Railway credentials) |
| Volume | `jobsync-volume` detached after first successful bucket-backed deploy |
| Tests | `__tests__/bucket-sync.spec.ts` (17 tests, mocked fetch) |

Phase 1 also built: `Workspace/Stage/WorkspaceField/Outreach` models +
migration `dual_workspace_outreach`, workspace + outreach server actions,
`WorkspaceSwitcher` osui component, `seed-school-workspace.mjs` (7 PIs).

Phases 2–5 also built (same branch):
- Header workspace switcher (cookie-persisted, defaults ensured on load).
- Dashboard `Follow-ups due` + `Upcoming deadlines` cards.
- `/dashboard/outreach` page: log table, log dialog (application/contact/subject/paper/notes), follow-ups filter, mark-replied.
- Jobs list scoped by active workspace (`workspaceId` through `getJobsList` → `useJobsList` → `JobsContainer`).
- `Job.fundingStatus` (+ migration `job_funding_status`): Add/Edit form field, details card row.
- Job details `Outreach` tab per application.
- MCP `log_outreach` tool (jobs:write scope).
- 114 tests passing, `tsc` clean. Pre-existing red suites (`JobsContainer`, `JobDetails` render specs) were already failing on the base commit — untouched.

## Appendix B — live application targets to seed

| Deadline | Target | Status |
|---|---|---|
| 1 Oct 2026 | Twente — Prof. Misra (micro-robotics) | OPEN |
| 15 Oct 2026 | Vanderbilt — Prof. Dong (surgical/magnetic robots) | OPEN |
| 30 Oct 2026 | KU Leuven — Prof. Vander Poorten (catheterization) | OPEN |
| 1 Dec 2026 | NYU — Prof. Hao Su (surgical + wearable) | OPEN |
| rolling | Dresden — Prof. Speidel (CAS / shared autonomy) | OPEN |
| before 1 Jan | Utah — Dr George (neurorobotics) | OPEN |
| any time | Northeastern — Dr Shepherd (wearable) | OPEN |
| — | Imperial (Hamlyn), HERON/NTUA | **CLOSED** |
