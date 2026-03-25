# ADR-002: ActionResult<unknown> over Specific Prisma Types

## Status
Accepted (temporary, until domain models align with Prisma schema)

## Context

JobSync has approximately 80 server actions in `src/actions/` that serve as Repositories for the Job, Automation, Profile, and related aggregates. Before the A18 refactoring, most of these returned `Promise<any | undefined>`, providing no type safety at call sites and masking mismatches between what the function body actually returned and what callers expected.

The ideal generic would be `ActionResult<PrismaJob>` or `ActionResult<Job[]>`. However, Prisma-generated types (e.g. `Prisma.JobGetPayload<...>`) do not structurally match the domain model interfaces defined in `src/models/`. Prisma includes relation fields conditionally based on `include` clauses, making a precise generic parameter verbose and brittle. Any attempt to use specific Prisma types at this stage would require either duplicating type definitions or introducing complex conditional types across ~55 functions simultaneously.

The formal specification for this pattern is in `specs/action-result.allium`, which classifies all 80 functions into Pattern A (ActionResult wrapper), Pattern B (raw return, keep `any`), and Pattern C (custom dashboard shapes).

## Decision

Type Pattern A functions as `Promise<ActionResult<unknown>>` rather than `Promise<any | undefined>`. The `ActionResult<T>` interface is defined in `src/models/actionResult.ts`:

```ts
interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  total?: number;
  message?: string;
}
```

Call sites use `as any` casts when destructuring `data` (e.g. `result.data as Job[]`). This is an explicit, localized acknowledgement of the type gap rather than a silent `any` on the function signature itself.

Pattern B functions (`getAllCompanies`, `getAllJobTitles`, etc.) remain `Promise<any>` because their bodies return raw arrays and changing the annotation without changing the body would cause cascading type errors.

## Consequences

### Positive
- Eliminates `Promise<any | undefined>` on ~55 function signatures, making the success/failure contract visible at the type level.
- Callers can now check `result.success` before accessing `result.data` without TypeScript suppression.
- Incremental — can be tightened to specific types one aggregate at a time as domain models stabilize.
- The `total` field on `ActionResult` standardizes pagination metadata, replacing ad-hoc fields like `totalQuestions` and `totalTasks`.

### Negative
- `as any` casts at call sites delay rather than eliminate type unsafety; they can hide bugs until runtime.
- Pattern B functions remain untyped, creating an inconsistent experience across the actions layer.
- Callers must know which pattern a given function uses (documented in `specs/action-result.allium`).

### Neutral
- The open questions in the spec — whether Pattern B and Pattern C functions should eventually adopt `ActionResult` — remain unresolved and deferred to a future PR.
