# ADR-004: App ↔ Connector ↔ Module (ACL) Architecture

## Status
Accepted

## Context

JobSync discovers job vacancies by querying external job boards (EURES, Bundesagentur für Arbeit, JSearch/RapidAPI). Each board has a distinct wire protocol, response schema, and failure mode. Early implementations placed board-specific logic directly in the automation runner, which caused several problems: a schema change on one board broke all boards, error handling was inconsistent, and adding a new board required editing the runner itself.

External APIs crash, change their contracts, apply rate limits, and time out. The domain model must be insulated from these instabilities. This is the canonical use case for an Anti-Corruption Layer (ACL) in Domain-Driven Design.

## Decision

Adopt a three-layer architecture: **App ↔ Connector ↔ Module**.

**Modules** (Bounded Contexts) each encapsulate one external system's protocol:
- `src/lib/scraper/eures/` — EURES API (`jvProfiles`, `locationCodes`, `requestLanguage`)
- `src/lib/scraper/arbeitsagentur/` — Bundesagentur API (`arbeitsort`, `beruf`, `refnr`)
- `src/lib/scraper/jsearch/` — RapidAPI/Google Jobs (`job_city`, `employer_name`)

Each Module implements the `DataSourceConnector` interface (`src/lib/scraper/types.ts`):

```ts
interface DataSourceConnector {
  readonly id: string;
  search(params: SearchParams): Promise<ConnectorResult<DiscoveredVacancy[]>>;
  getDetails?(externalId: string): Promise<ConnectorResult<DiscoveredVacancy>>;
}
```

**The Connector layer** is the shared domain layer: `types.ts`, `registry.ts`, and `runner.ts` in `src/lib/scraper/`. It owns the `ConnectorRegistry` (factory map keyed by module id), the `runAutomation` orchestrator, and the `ConnectorResult<T>` discriminated union that prevents raw exceptions from reaching the App layer.

**The App layer** (`src/actions/automation.actions.ts`, API routes) interacts exclusively with `ConnectorResult<T>` and the domain Value Object `DiscoveredVacancy`. It never imports Module-internal types such as `EuresVacancyDetail`.

Each Module owns its own `resilience.ts` implementing circuit breaker, bulkhead, and timeout patterns. Module failures are caught and translated to typed `ConnectorError` variants (`blocked`, `rate_limited`, `network`, `parse`) before surfacing to the runner.

The roadmap target is `src/lib/connector/modules/` with the same structure; the current `src/lib/scraper/` layout is the pre-migration form.

## Consequences

### Positive
- A Module crash or API change is isolated: it cannot affect other Modules or the App layer.
- Adding a new job board requires only creating `src/lib/scraper/{name}/` and registering it in `registry.ts`.
- `DiscoveredVacancy` is the sole cross-context type; Module-internal schemas never leak into domain code.
- Resilience policies (circuit breaker, retry) are per-Module, so a flaky board does not degrade a healthy one.

### Negative
- Adds indirection: debugging a failed search requires tracing through runner → registry → module → resilience.
- Each new Module must duplicate the `resilience.ts` scaffolding until a shared resilience library is extracted.

### Neutral
- The `ConnectorRegistry` uses a factory pattern (`() => DataSourceConnector`) so Modules are instantiated per-run, not as long-lived singletons. This simplifies state management at the cost of a small allocation per automation run.
