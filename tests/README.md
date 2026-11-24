# Tests

Every executable test lives here, split by suite first and by the production code it exercises second. The Promptfoo evals are a separate package in `evals/` and are not part of any suite below.

## Suites

| Suite | Directory | Runner | What belongs here |
| --- | --- | --- | --- |
| Unit | `unit/` | Vitest project `unit` | Functions, schemas, server actions and API route handlers, with Prisma and other dependencies mocked |
| Component | `component/` | Vitest project `component` | Components, contexts and hooks rendered with React Testing Library |
| Integration | `integration/` | Vitest project `integration` | Several real layers at a documented boundary; today only the opt-in backup round trip against a real Postgres |
| Property | `property/` | Vitest project `property` (opt-in) | Seeded fast-check suites over pure logic and the job timeline; never run by `npm test` or CI |
| E2E | `tests/e2e/` | Playwright | Browser flows against a running dev server |

Inside `unit/` and `component/`, a spec sits in the directory that mirrors its primary production module's parent, without `src/` — the spec for `src/lib/jobs/resolve.ts` lives in `unit/lib/jobs/`. Exceptions: `unit/project/` holds repository-wide checks (`browserslistFloor`, `postgresQueryParity`, `jobStatusWrites`, `stageResolverTransactions`, `stageOrdering`, `eslintRules`), `unit/scripts/` holds specs for `scripts/`, `component/regressions/` holds cross-feature render regressions, and `unit/proxyMatcher.spec.ts` sits at the suite root because `src/proxy.ts` sits at the `src/` root.

A unit spec that touches Prisma asserts against a mocked client: it proves which query the code builds, not that Postgres accepts it. Only the integration suite runs a real engine.

## Commands

```bash
npm test                  # unit + component (what CI runs)
npm run test:unit
npm run test:component
npm run test:watch        # unit + component, watch mode
npm run test:coverage     # unit + component
npm run test:integration  # opt-in; skips without BACKUP_TEST_DATABASE_URL
npm run test:property     # opt-in; seeded fast-check suites
npm run test:mutation     # opt-in; Stryker over six modules, about 5 minutes
npm run test:e2e          # Playwright, needs the dev server
npm test -- tests/unit/lib/jobs/resolveCompany.spec.ts  # one file
```

Next.js route folders such as `[id]` are mirrored as-is; quote those paths in zsh, which otherwise treats the brackets as a glob and fails with "no matches found": `npm test -- 'tests/unit/app/dashboard/myjobs/[id]/JobDetailsPage.spec.tsx'`.

`npm test`, `test:watch` and `test:coverage` never select the integration or property suites, Playwright or the evals. `test:mutation` runs the unit and property suites against mutated copies of six modules and is never run by CI.

## Property tests

`tests/property/` mirrors `src/` and runs fast-check with a fixed seed (`setup/fastCheck.ts`: 200 runs, seed 20261123). A failure message prints its seed and path; reproduce it with `FC_SEED=<seed> npm run test:property`, and widen a run with `FC_RUNS=2000`. A failing property is a finding: show the counterexample, do not narrow the generator to make it pass. The timeline machine reuses the fake in `unit/lib/jobs/timeline/helpers/`.

## Environments and setup

- Unit defaults to node and component to jsdom; both load `setup/polyfills.ts` then `setup/dom.ts` (jest-dom, observer stubs).
- A unit spec that needs a DOM (`localStorage`, `DOMParser`, HTML parsing) declares `// @vitest-environment jsdom` on its first line; keep that directive when moving a spec.
- Unit and component alias `next-auth`, `next-auth/providers/credentials` and `server-only` to the stubs in `mocks/`.
- Integration runs in Node with only the `@` and `server-only` aliases and no setup files.

## Integration opt-in

`npm run test:integration` loads `.env` when present; exported shell variables take precedence. `integration/backup/backupRoundTrip.spec.ts` skips unless `BACKUP_TEST_DATABASE_URL` is set. When it is, the spec creates a throwaway schema on that server, pushes the Prisma schema into it and drops it afterwards. Point it at a dev database, never production's `jobsync`, and never set the variable in CI:

```bash
BACKUP_TEST_DATABASE_URL=<dev Postgres URL> npm run test:integration
```

## Fixtures and helpers

Keep helpers and fixtures beside the specs that use them, in a local `helpers/` or `fixtures/` directory (for example `unit/lib/jobs/timeline/helpers/timelineDbFake.ts`). Promote one to a top-level `tests/helpers/`, `tests/fixtures/` or `tests/factories/` only when specs in more than one feature need it. Playwright's shared fixture is `tests/e2e/fixtures.ts`; its conventions are in `tests/e2e/CLAUDE.md`.

## Regression tests

Each row is a behavior a past `fix` commit introduced. "Shown red" is the date the named test failed on its own assertion with only that behavior's production lines reversed; a blank cell is a gap: no test claims the behavior yet. Spec paths are relative to `tests/`.

| Fix | Rule it protects | Spec › test | Shown red |
|---|---|---|---|
| `0cf96845` | Identical concurrent job saves create one job | unit/lib/jobs/createJobFromNames.spec.ts › refuses the second of two identical saves sent at the same time | 2026-11-23 |
| `0cf96845` | A refused duplicate leaves no Library entries | unit/lib/jobs/createJobFromNames.spec.ts › creates no reference records when the save is refused as a duplicate | 2026-11-23 |
| `0cf96845` | The Bearer scheme is case-insensitive, the token is not | unit/lib/mcp/mcpAuth.spec.ts › accepts the scheme in any case and keeps the token's case | 2026-11-23 |
| `0cf96845` | Malformed v1 job JSON names the body | unit/app/api/v1/jobs.spec.ts › returns 400 naming the body for malformed JSON | 2026-11-23 |
| `f919e75d` | Analyze uses the provider's default model | unit/actions/automation/analyzeDiscoveredJob.spec.ts › uses deepseek's default model when none is picked | 2026-11-23 |
| `f919e75d` | A midnight schedule stays at midnight | unit/lib/scraper/automation-run/finalizeRun.spec.ts › keeps a midnight schedule at midnight | 2026-11-23 |
| `77441d08` | Stringified tool arguments are repaired inside the chat turn | unit/app/api/ai/chat/chatTurnCharacterization.spec.ts › 77441d08: repairs a stringified tool argument in place instead of a retry step | 2026-11-23 |
| `67b259a3` | Chat `add_question` replaces only agent-created questions | unit/lib/agent/tools/agentAddQuestionTool.spec.ts › saves under the session user, never a userId from the model's input, and replaces only agent-created questions | 2026-11-23 |
| `6050a011` | Question tag ids are ownership-checked on create | unit/actions/question.actions.spec.ts › createQuestion › should reject a tag owned by another user | 2026-11-23 |
| `6050a011` | Question tag ids are ownership-checked on update | unit/actions/question.actions.spec.ts › updateQuestion › should reject a tag owned by another user | 2026-11-23 |
| `6050a011` | Skill tag ids are ownership-checked on add | unit/actions/profile/resumeSection.actions.spec.ts › addSkillsSection › refuses a tag owned by another user before creating the section | 2026-11-23 |
| `6050a011` | Skill tag ids are ownership-checked on update | unit/actions/profile/resumeSection.actions.spec.ts › updateSkillsSection › refuses a tag owned by another user | 2026-11-23 |
| `6d2eef6f` | Location delete counts only the caller's resume rows | unit/actions/jobLocation.actions.spec.ts › counts only the current user's resume rows using the location | 2026-11-23 |
| `6d2eef6f` | Job title delete counts only the caller's experience rows | unit/actions/jobtitle.actions.spec.ts › counts only the current user's work experience rows | 2026-11-23 |
| `6d2eef6f` | Tag delete counts only the caller's job, question and skill links | unit/actions/tag.actions.spec.ts › counts only the current user's links to the tag | 2026-11-23 |
| `6d2eef6f` | Company delete counts only the caller's experience rows | unit/actions/company/company.actions.spec.ts › counts only the current user's work experience rows | 2026-11-23 |
| `9a2f01fb` | Resume experience title, company and location ids are ownership-checked on add | unit/actions/profile/resumeSection.actions.spec.ts › addExperience rejects an unowned company | 2026-11-23 |
| `9a2f01fb` | Resume experience ids are ownership-checked on update | unit/actions/profile/resumeSection.actions.spec.ts › updateExperience rejects an unowned company | 2026-11-23 |
| `9a2f01fb` | Resume education location id is ownership-checked on add | unit/actions/profile/resumeSection.actions.spec.ts › addEducation rejects an unowned location | 2026-11-23 |
| `9a2f01fb` | Resume education location id is ownership-checked on update | unit/actions/profile/resumeSection.actions.spec.ts › updateEducation rejects an unowned location | 2026-11-23 |
| `a28698cb` | A status change to Applied dates the new stage from the Date Applied | unit/lib/jobs/timeline/jobTimeline.spec.ts › dates the new Applied stage from jobFields.appliedDate | 2026-11-23 |
| `a28698cb` | A new Applied job's first stage is dated from the Date Applied | unit/lib/jobs/timeline/jobTimeline.spec.ts › dates an Applied first stage at the given appliedDate | 2026-11-23 |
| `a28698cb` | Edit Job never resets the job's Added date | unit/actions/job/job.actions.spec.ts › leaves the job's createdAt out of an edit | 2026-11-23 |
| `a4227601` | Resolved names are saved with HTML entities decoded | unit/lib/jobs/resolveCompany.spec.ts › stores a decoded label and value when the name carries HTML entities | 2026-11-23 |
| `a4227601` | The approval card shows the decoded name | component/components/agent/AgentApprovalCard.spec.tsx › shows resolved names decoded, matching what the resolver saves | 2026-11-23 |
| `1a57ac35` | A stage-less job gains no stage on a save that keeps its status | unit/lib/jobs/timeline/jobTimeline.spec.ts › adds no stage to a stage-less job whose status is unchanged | 2026-11-23 |
| `1a57ac35` | A stage type's name cannot clash across statuses | unit/actions/jobStageType.actions.spec.ts › refuses a name already taken under a different status | 2026-11-23 |
| `1a57ac35` | A status-named stage type cannot move under another status | unit/actions/jobStageType.actions.spec.ts › refuses to move a status-named type under another status | 2026-11-23 |
| `1a57ac35` | Retargeting a stage type re-derives every job on it, all or nothing | unit/lib/jobs/timeline/jobTimeline.spec.ts › changeStageTypeStatus › rolls back the type and every job when one job update fails | 2026-11-23 |
| `1a57ac35` | A job commits together with its first stage | unit/lib/jobs/createJobStage.spec.ts › gives every new job exactly one current stage | 2026-11-23 |
| `1a57ac35` | A discovered job commits together with its first stage | unit/lib/scraper/automation-run/persistDiscoveredJobStage.spec.ts › gives a discovered job its first current stage | 2026-11-23 |
| `1a57ac35` | Linking an interviewer and its Contacts-tab entry commit together | unit/actions/jobStage/jobStageInterviewers.spec.ts › 1a57ac35: writes the stage link and its roster entry through one transaction | 2026-11-23 |
| `1a57ac35` | A stage with interviewers or prep questions cannot be retyped away from an interview stage | unit/actions/jobStage/jobStage.actions.spec.ts › 1a57ac35: refuses to retype an interview stage that still has interviewers or prep questions | 2026-11-23 |
| `24e7baff` | Notifications and AI usage are pruned once daily at 03:00, not on every hourly tick | unit/lib/scheduler/scheduler-reaper.spec.ts › 24e7baff: prunes once a day at 03:00, not on every hourly automation tick | 2026-11-23 |
| `9ebb7004` | Job add checks ownership of every referenced id | unit/actions/job/job.actions.spec.ts › rejects another user's company | 2026-11-23 |
| `9ebb7004` | Job update checks ownership of newly attached ids only | unit/actions/job/job.actions.spec.ts › checks only the tags being added | 2026-11-23 |
| `9ebb7004` | Contact create and update check company, location and role ownership | unit/actions/contact/contact.actions.spec.ts › create rejects another user's company | 2026-11-23 |
| `ffc77093` | Mock activity generation looks up only the caller's activity types | unit/actions/generateMockActivities.spec.ts › creates and links the caller's own types, not another user's | 2026-11-23 |
| `f98d5184` | The AI model-list routes answer 401 before resolving a key | unit/app/api/api-auth-contract.spec.ts › GET /api/ai/openai/models -> 401 before resolving a key | 2026-11-23 |
| `9802a22c` | `getOllamaBaseUrl` ignores a client-supplied user id | unit/actions/apiKey.actions.spec.ts › reads the session user's URL, not the passed user's | 2026-11-23 |
| `c522ba47` | The resume download route serves only paths inside the resumes directory | unit/app/api/profile/resume/resume-download-route.spec.ts › refuses a stored path outside the resumes directory | 2026-11-23 |
| `c522ba47` | A resume file entry is created only for a path inside the resumes directory | unit/actions/profile/resumeUpload.actions.spec.ts › refuses a path outside the resumes directory before writing | 2026-11-23 |
| `c522ba47` | Deleting a resume file never unlinks outside the resumes directory | unit/actions/profile/profileFiles.actions.spec.ts › skips the unlink for a stored path outside the directory but still deletes the row | 2026-11-23 |
| `c522ba47` | Backup export and import never read or unlink outside the resumes directory | unit/lib/backup/backupExport.spec.ts › never reads a stored path outside the resumes directory | 2026-11-23 |
| `c522ba47` | The AI resume import route refuses a stored path outside the resumes directory | unit/app/api/ai/resume/import/resumeImportUsage.spec.ts › c522ba47: refuses a stored path outside the resumes directory before reading it | 2026-11-23 |
| `f575a658` | A non-interview stage blanks format, duration and location | unit/actions/jobStage/jobStage.actions.spec.ts › blanks the interview-only fields for a non-interview stage | 2026-11-23 |
| `6c8d8c46` | An Offer status marks the job applied without inventing a date | unit/actions/job/job.actions.spec.ts › marks an Offer job applied without inventing a date | 2026-11-23 |
| `6c8d8c46` | A job that already has a Date Applied is applied whatever its status | unit/lib/jobs/timeline/jobTimeline.spec.ts › 6c8d8c46: marks a job that already has a Date Applied as applied, whatever its status | 2026-11-23 |
| `6c8d8c46` | Clearing the date keeps a job applied when an earlier stage was an applying one | unit/lib/jobs/timeline/jobTimeline.spec.ts › keeps a job applied when an earlier stage was an applying one | 2026-11-23 |
| `6c8d8c46` | A save that keeps the status does not date an Applied job | unit/lib/jobs/timeline/jobTimeline.spec.ts › does not date an Applied job on a save that keeps its status | 2026-11-23 |
| `6c8d8c46` | MCP update with only an appliedDate marks the job applied | unit/lib/jobs/updateJobFromNames.spec.ts › marks the job applied when only an appliedDate is sent | 2026-11-23 |
| `3838cdeb` | `add_question` keeps the turn open while any parallel call is unsettled | unit/lib/agent/tools/agentAddQuestionTool.spec.ts › keeps the turn open when a parallel call came back held | 2026-11-23 |
| `ba94acbf` | A turn ending in an abort writes nothing back | unit/app/api/ai/chat/agentChatRoute.spec.ts › does not write the turn back when it was cancelled | 2026-11-23 |
| `ba94acbf` | A committed result updates the chat and never recreates a cleared one | unit/app/api/ai/chat/chatTurnCharacterization.spec.ts › records the result when the signal aborts mid-write | 2026-11-23 |
| `ba94acbf` | An unreadable AI settings row answers a retryable 503 | unit/app/api/ai/chat/agentChatRoute.spec.ts › answers a retryable 503, not the Settings advice, when the AI settings cannot be read | 2026-11-23 |
| `ba94acbf` | Analyze carries the job's description completeness into the match | unit/actions/automation/analyzeDiscoveredJob.spec.ts › carries the job's own description completeness into the match | 2026-11-23 |
| `ba94acbf` | The history window keeps an answer with its question | unit/lib/agent/agentWindow.spec.ts › keeps a large answer with its question across the follow-up turn | 2026-11-23 |
| `cb86df87` | Stopping after `add_question` still stubs the consumed paste | component/components/agent/AgentChatProvider.spec.tsx › stubs the client-side paste when the user stops after add_question | 2026-11-23 |
| `73220513` | Location filters match whole terms, never a substring | unit/lib/scraper/ats/ats-rank.spec.ts › matches whole terms only, never a substring of a longer word | 2026-11-23 |
| `e6cd1113` | A company label that did not change keeps its stored value and skips the duplicate check | unit/actions/company/company.actions.spec.ts › does not recompute the value or check for duplicates when the label is unchanged | 2026-11-23 |
| `e6cd1113` | Updating a company that is missing or not the caller's fails with "Company not found" | unit/actions/company/company.actions.spec.ts › e6cd1113: fails with Company not found when the company is missing or not the caller's, writing nothing | 2026-11-23 |
| `f4374291` | Cover letter, resume, contact info and experience writes are scoped to the caller | unit/actions/profile/resumeSection.actions.spec.ts › scopes the update through section -> resume -> profile | 2026-11-23 |
| `1171f7ef` | Only `add_job` results consume a paste | unit/lib/agent/agentPaste.spec.ts › ignores a created:true result from a tool that is not add_job | 2026-11-23 |
| `1171f7ef` | The chat provider counts only `add_job` results as created jobs | component/components/agent/AgentChatProvider.spec.tsx › 1171f7ef: does not announce another tool's created:true result as a job write | 2026-11-23 |
| `1171f7ef` | Turn logs report a status-carrying result by its status | unit/app/api/ai/chat/agentChatRoute.spec.ts › logs a status-carrying result from an unrecognised tool by its status | 2026-11-23 |

## Mutation testing

`npm run test:mutation` (Stryker, `stryker.config.mjs`) mutates six modules and re-runs the unit and property suites (`vitest.mutation.config.mts`) against each mutant. It is on demand: run it in the foreground after changing one of them, never in CI. There is no gate (`thresholds.break` is null); the table is a baseline to compare against. The HTML report is `reports/mutation/mutation.html`, git-ignored.

Baseline, 2026-11-23 (first run, then after the triage assertions):

| Module | First run | After | Survived or uncovered, all equivalent |
|---|---|---|---|
| `lib/jobs/timeline/derive.ts` | 100.00 | 100.00 | 0 |
| `lib/jobs/timeline/index.ts` | 75.00 | 75.81 | 30 |
| `lib/jobs/timeline/internal.ts` | 50.77 | 50.77 | 32 |
| `lib/jobs/sortStages.ts` | 100.00 | 100.00 | 0 |
| `lib/jobs/canonicalize.ts` | 78.57 | 85.71 | 6 |
| `lib/jobs/resolve.ts` | 75.52 | 92.19 | 15 |
| `lib/jobs/jobDedupe.ts` | 83.33 | 83.33 | 14 |
| `models/apiV1.schema.ts` | 69.62 | 72.15 | 22 |
| All files | 74.92 | 80.99 | 119 |

Equivalent mutants, each reviewed 2026-11-23:

- **Query shape.** `select: { x: true }` or `_max` flipped to `false` or `{}` (about 68 mutants across `jobDedupe`, `resolve`, `timeline/index`, `timeline/internal`, `apiV1.schema`). The mocks and the timeline fake ignore `select`, and no spec may need a database server; asserting the call shape would pin the line, not a rule.
- **Ownership filters inside the timeline helpers.** The outer `where` of every `promoteStage`, `syncJobFromCurrentStage` and `changeStageTypeStatus` query is killed (by the timeline state machine, or by `setJobCurrentStage › scopes the clear step to the owner`), but the inner `Job: { userId }` (`internal.ts` 36, 51, 99; `index.ts` 118) and the job `where { id, userId }` (`internal.ts` 62, 112) survive. They are defense in depth: callers check ownership first (`internal.ts` D8 comment), and `changeJobStatus` checks twice (`index.ts` 93 and 109), so removing one layer changes nothing observable. A direct cross-user test of the helpers would kill them; nobody has asked for one.
- **Rows the foreign keys guarantee.** `status?.value ?? ""` (`index.ts` 102, 192, 216), `job?.appliedDate` and `(await …)?.statusId` (`internal.ts` 74, 110), and `job.stages[0]?.occurredAt` (`index.ts` 194): the row always exists.
- **`canonicalize.ts` 47, 48, 51, 59.** The suffix pattern needs a space before the suffix, so stripping never empties a label, the `length > 0` guards never fire, and `canonicalizeEntityValue` trims after `decodeHtml` anyway.
- **`appliedDateFromUser === undefined`** (`index.ts` 113): the count it skips is unused on that path.
- **Optional chaining on a thrown Prisma error** (`resolve.ts` 60, 144, 229): Prisma always throws an object.
- **Message wording** (`apiV1.schema.ts` string literals, `JobResolutionError.name`): the v1 contract pins that `message` is a string, not its text. `abort: true` on `min(1)` and `stripLegalSuffix` on `company` change nothing for the same reason as the suffix rule above.
