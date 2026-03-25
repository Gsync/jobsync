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
