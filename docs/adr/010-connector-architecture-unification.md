# ADR-010: Connector Architecture Unification (Roadmap 0.1)

## Status
Accepted

## Context

JobSync had two separate integration layers for external systems:

1. **Job discovery** (`src/lib/scraper/`) -- the Anti-Corruption Layer connecting to job boards (EURES, Arbeitsagentur, JSearch). Modules lived as direct subdirectories (`eures/`, `arbeitsagentur/`, `jsearch/`) alongside the shared files (`types.ts`, `registry.ts`, `runner.ts`, `mapper.ts`).
2. **AI providers** (`src/lib/ai/`) -- the Vercel AI SDK integration supporting Ollama, OpenAI, and DeepSeek. Each provider had its own configuration but no formal module structure.

This separation caused several problems:

- **Inconsistent terminology**: The `scraper/` directory name did not match the DDD ubiquitous language established in CLAUDE.md, which uses "Connector" and "Module" rather than "scraper".
- **No structural separation between shared and module code**: Module directories (`eures/`, `arbeitsagentur/`) sat at the same level as shared files (`types.ts`, `registry.ts`), making it unclear which files were part of the ACL kernel and which were pluggable implementations.
- **AI providers lacked the ACL pattern**: Job board integrations had a formal `DataSourceConnector` interface with registry, resilience, and error handling, while AI providers did not follow the same pattern despite being equally external and equally prone to failures.
- **Marketplace readiness**: The planned Connector Marketplace (Roadmap 2.7) needs a unified activation/deactivation model for all external integrations. Having two separate structures with different patterns would complicate the marketplace implementation.

Three restructuring approaches were considered:

1. **Rename only** (`scraper/` to `connector/`): Fixes the naming but does not address the flat module layout or the AI provider gap.
2. **Separate hierarchies** (`connector/job-discovery/` and `connector/ai-provider/` as independent trees): Clean separation but no shared connector infrastructure.
3. **Unified connector architecture** (chosen): Both integration types live under `src/lib/connector/` with parallel structures and analogous interfaces.

## Decision

Unify all external integrations under `src/lib/connector/` with two connector types:

```
src/lib/connector/
  job-discovery/                  <- Job board connectors
    types.ts                      <- DataSourceConnector interface, ConnectorResult<T>
    registry.ts                   <- ConnectorRegistry (factory map)
    runner.ts                     <- Automation orchestration
    mapper.ts                     <- mapDiscoveredVacancyToJobRecord
    utils.ts                      <- Text processing utilities
    connectors.ts                 <- Module registration
    modules/
      eures/                      <- EURES Bounded Context
      arbeitsagentur/             <- Arbeitsagentur Bounded Context
      jsearch/                    <- JSearch Bounded Context

  ai-provider/                    <- AI provider connectors
    modules/
      ollama/                     <- Ollama (local LLM)
      openai/                     <- OpenAI (cloud LLM)
      deepseek/                   <- DeepSeek (cloud LLM)
```

Key structural decisions:

- **`modules/` subdirectory**: Module implementations are nested under a `modules/` directory within each connector type, clearly separating them from the shared ACL kernel files.
- **`AIProviderConnector` mirrors `DataSourceConnector`**: The AI provider modules follow the same interface pattern (registry, typed results, resilience) as job discovery modules, enabling consistent error handling and marketplace activation.
- **Rename `mapScrapedJobToJobRecord` to `mapDiscoveredVacancyToJobRecord`**: Aligns the mapper function name with the ubiquitous language. The domain type has always been `DiscoveredVacancy`; the function name now matches.
- **All imports updated**: `@/lib/scraper/` becomes `@/lib/connector/job-discovery/`; `@/lib/ai/` becomes `@/lib/connector/ai-provider/`.

## Consequences

### Positive
- **Consistent DDD terminology**: Directory names now match the ubiquitous language (`Connector`, `Module`, `DiscoveredVacancy`). No more "scraper" in the codebase.
- **Unified ACL pattern**: Both job boards and AI providers follow the same Connector/Module architecture with typed results and resilience, making the system easier to reason about.
- **Clear shared-vs-module separation**: The `modules/` subdirectory makes it immediately obvious which code is a pluggable implementation and which is the ACL kernel.
- **Marketplace-ready activation**: A single activation/deactivation model can manage all external integrations uniformly, simplifying the Connector Marketplace (Roadmap 2.7).
- **New module onboarding**: Contributors adding a new job board or AI provider follow the same steps: create a directory under the appropriate `modules/`, implement the interface, register in the registry.

### Negative
- **Import churn**: All files importing from `@/lib/scraper/` or `@/lib/ai/` require path updates. This is a one-time cost.
- **Longer import paths**: `@/lib/connector/job-discovery/modules/eures/` is more verbose than the previous `@/lib/scraper/eures/`. The added clarity is considered worth the verbosity.
- **Documentation update required**: All C4 architecture documents, ADRs, and CLAUDE.md must be updated to reflect the new paths.

### Neutral
- The `ConnectorRegistry` factory pattern and `ConnectorResult<T>` error model are unchanged. Only the filesystem layout and import paths are affected; runtime behavior is identical.
- Existing tests continue to pass after import path updates; no behavioral changes are introduced.

## Related Decisions
- ADR-004: ACL Connector/Module Architecture -- the original ACL pattern decision that this ADR extends
- ADR-008: Environment-Based Debug Logging -- references runner paths updated by this restructuring
