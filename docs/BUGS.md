# Bug Tracker — Collected 2026-03-24, Updated 2026-03-25

**Total: 48 bugs found, 48 fixed, 0 remaining**

### Status: ✅ All bugs are fixed.

## Critical (7) — ALL FIXED

| ID | Bug | File |
|----|-----|------|
| A1 | `handleError()` returns `undefined` for non-Error exceptions (~80 callsites) | `src/lib/utils.ts:40` |
| A2 | Path traversal in resume download API (user-supplied filePath read from disk) | `src/app/api/profile/resume/route.ts:96` |
| A3 | Toast race condition in AddJob — success fires before server response | `src/components/myjobs/AddJob.tsx:149` |
| A4 | API route handlers return `undefined` on non-Error exceptions | `src/app/api/profile/resume/route.ts:65,138` |
| A5 | CSV export error response never sent to client (dead code) | `src/app/api/jobs/export/route.ts:82` |
| B1 | NEXTAUTH_URL=localhost:3000 but server runs on :3737 | `.env:9` |
| -- | Prisma engines missing after /tmp clear | FIXED in Stage 1 |

## High (9) — ALL FIXED

| ID | Bug | File |
|----|-----|------|
| A6 | Loose equality (`!=`) for authorization checks | `job.actions.ts:337`, `company.actions.ts:162` |
| A7 | Non-null assertion on potentially undefined params | `profile.actions.ts:250` |
| A8 | Redundant non-null assertion after null check | `profile.actions.ts:220` |
| A9 | `path.join(filePath)` is a no-op, does not sanitize | `resume/route.ts:106` |
| A10 | Hardcoded PBKDF2 salt for API key encryption | `encryption.ts:15` |
| B2 | `/api/eures/occupations` missing auth check | `eures/occupations/route.ts` |
| B3 | `/api/jobs/export` missing auth check | `jobs/export/route.ts` |
| C11 | `new Date()` in render path causes hydration mismatch | `JobDetails.tsx:93`, `MyJobsTable.tsx:130` |
| C14 | No error boundaries at any app level | `src/app/error.tsx` MISSING |

## Medium (19) — ALL FIXED

| ID | Bug | File |
|----|-----|------|
| A11 | Salary range data has gaps (110K-120K, 140K-150K missing) | `salaryRangeData.ts:12` |
| A12 | Hardcoded "Note deleted successfully" not translated | `NotesCollapsibleSection.tsx:110` |
| A13 | Unused import: NextApiRequest | `utils.ts:4` |
| A14 | DownloadFileButton has `any` typed parameter | `DownloadFileButton.tsx:4` |
| A15 | Unsanitized user content rendered as HTML (XSS risk) — needs DOMPurify | `QuestionCard.tsx:94` |
| A16 | Dead example file shipped in source | `route.example.ts` |
| A17 | Unused userId variable (ownership check missing) | `resume/route.ts:15,82` |
| B4 | DeepSeek models API returns 500 instead of 401 | `deepseek/models/route.ts` |
| B5 | Missing ENCRYPTION_KEY in .env | `.env` |
| B6 | Middleware only protects /dashboard, not /api/* | `middleware.ts` |
| C1 | EuresLocationCombobox: 6+ hardcoded English strings | `EuresLocationCombobox.tsx` |
| C2 | EuresOccupationCombobox: 10+ hardcoded English strings | `EuresOccupationCombobox.tsx` |
| C3 | Admin containers (3) use hardcoded Loading/Load More | `CompaniesContainer` etc. |
| C4 | "Error!" hardcoded in 12+ toast calls | Multiple components |
| C5 | Hardcoded English success messages in 9+ toasts | Multiple components |
| C6 | SupportDialog entirely untranslated | `SupportDialog.tsx` |
| C9 | `.replace("Last ", "")` English-specific manipulation | `TopActivitiesCard.tsx`, `NumberCardToggle.tsx` |
| C13 | useMemo missing locale dependency | `ActivityForm.tsx:53` |
| C15 | ESCO combobox buttons missing aria-labels | `EuresOccupationCombobox.tsx` |

## Low (13) — ALL FIXED

| ID | Bug | Fix |
|----|-----|-----|
| A18 | Promise any return types on ~80 server actions | Typed all 7 remaining with proper Prisma model types |
| A19 | 5x `as any` casts suppress type checking | Replaced with proper type assertions (`Resume`, `JobResponse`) and removed unnecessary casts |
| A20 | Commented-out time validation allows NaN | Validation restored (throws on invalid time) |
| A21 | 50+ console.log calls in production code | Gated with `debugLog()` utility + Developer Settings UI toggle |
| A22 | Typo: "no user privilages" | Fixed to "no user privileges" |
| A23 | Variable typo: comapnies | Fixed to companies |
| B7 | Ollama verify endpoint potential SSRF | URL validation + defense-in-depth at 3 layers |
| C7 | AuthCard hardcoded subtitle | Translated |
| C8 | TagInput hardcoded fallback error message | Translated |
| C10 | NumberCardToggle hardcoded aria-label | Translated |
| C12 | SupportDialog year hydration risk | Fixed |
| C16 | InfoTooltip button missing aria-label | Added |
| C17 | DownloadFileButton called as function not JSX | Fixed |
| C18 | DownloadFileButton silent failure | Fixed |

## Open — Reported 2026-03-25

**Total: 14 new issues (4 bugs, 8 UX improvements, 2 data gaps)**

### Bugs

| ID | Bug | File | Severity | Status |
|----|-----|------|----------|--------|
| D1 | Tiptap SSR: missing `immediatelyRender: false` causes hydration mismatch | `TiptapEditor.tsx`, `TipTapContentViewer.tsx` | Medium | ✅ Fixed |
| D2 | DialogContent missing `Description` or `aria-describedby` — console warnings | 22 Dialog components | Low | ✅ Fixed |
| D3 | Activity: time validation hardcoded to AM/PM, ignores user locale (DE/FR/ES expect 24h) | `ActivityForm.tsx` | Medium | ✅ Fixed |
| D4 | Activity: duration shows "47 h 5 min" — max 8h validation not enforced in UI | `ActivityForm.tsx` | Medium | ✅ Fixed |

### UX Improvements

| ID | Issue | File | Severity | Status |
|----|-------|------|----------|--------|
| D5 | Add Job: Job Source dropdown missing connector module items | `AddJob.tsx` | Medium | ✅ Fixed |
| D6 | Automations: JSearch option not grayed out when API key missing, no warning | `AutomationWizard.tsx` | Medium | ✅ Fixed |
| D7 | Automations Step 4: no option to disable LLM threshold (collect-only mode) | `AutomationWizard.tsx` | Low | ✅ Fixed |
| D8 | Automations Step 5: limited runtime options (only daily) | `AutomationWizard.tsx` | Low | ✅ Fixed |
| D9 | Automations table: keywords not as chips, locations not resolved (de1,de3), run text not harmonized, div not fully clickable, 3-dot menu | `AutomationList.tsx` | Medium | ✅ Fixed |
| D10 | Admin table: 3-dot menu instead of shared visible buttons pattern | Admin components | Low | ✅ Fixed |
| D11 | Admin New Company: no image upload, no URL preview, no SVG/vector support | `AddCompany.tsx` | Low | ✅ Fixed |
| D12 | Profile cards: 4x hardcoded "Edit" string not translated | Profile cards | Low | ✅ Fixed |

### Data Gaps

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| D13 | Mock data insufficient for all screens | Low | ✅ Fixed |
| D14 | No mock data for connectors/modules | Low | ✅ Fixed |
| D15 | All modals: Tab into Combobox/Select fields should allow typing + Enter to add | Multiple modals | Medium | Open |
| D16 | AddCompany: Logo URL validation too strict — rejects valid URLs like Wikipedia SVG links | `AddCompany.tsx` | Medium | ✅ Fixed |
| D17 | AddCompany: Typo "Unterstutze Formate" — missing ü → "Unterstützte Formate" | `admin.ts` i18n | Low | ✅ Fixed |
