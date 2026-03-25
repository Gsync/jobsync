# C4 Code Level: Connector Layer (ACL Pattern)

## Overview

- **Name**: JobSync Connector Layer (Anti-Corruption Layer)
- **Description**: Shared connector abstraction that decouples external job board APIs from the application core. Implements the DataSourceConnector interface, manages resilience patterns (circuit breaker, retry, rate limiting, bulkhead), and coordinates multi-module searches and job matching workflows.
- **Location**: `/home/pascal/projekte/jobsync/src/lib/scraper/`
- **Language**: TypeScript
- **Purpose**: Provides a unified interface for integrating external job board APIs (EURES, Arbeitsagentur, JSearch) while isolating network failures, rate limits, and API-specific details from the application layer. Orchestrates job discovery automation pipelines.
- **Architecture Pattern**: Anti-Corruption Layer (ACL) / Adapter Pattern
- **Target Refactoring**: Will be renamed to `src/lib/connector/modules/` as part of Roadmap 0.1

---

## Code Elements

### Shared Connector Layer

#### Interfaces & Types

**`types.ts`** — Canonical domain types for connector contracts

- `DiscoveredVacancy` (interface)
  - **Description**: Canonical domain type representing a job discovered by automation. All external APIs must be translated to this type.
  - **Location**: `src/lib/scraper/types.ts:2-17`
  - **Properties**:
    - `title: string` — Job title
    - `employerName: string` — Company/employer name
    - `location: string` — Job location (city, region, or country)
    - `description: string` — Job description (HTML-stripped)
    - `sourceUrl: string` — URL to the job on the source board
    - `sourceBoard: string` — Connector ID ("eures", "arbeitsagentur", "jsearch")
    - `postedAt?: Date` — Publication date/time
    - `salary?: string` — Salary range or description
    - `employmentType?: "full_time" | "part_time" | "contract"` — Employment classification
    - `externalId?: string` — Unique ID from the external API (e.g., refnr from Arbeitsagentur)
    - `applicationDeadline?: string` — ISO 8601 date string (format varies by connector)
    - `applicationInstructions?: string` — Free-text application instructions (HTML-stripped, multi-paragraph)

- `ConnectorError` (discriminated union type)
  - **Description**: Typed error responses from connector operations.
  - **Location**: `src/lib/scraper/types.ts:19-23`
  - **Variants**:
    - `{ type: "blocked"; reason: string }` — Access blocked by API (e.g., invalid key)
    - `{ type: "rate_limited"; retryAfter?: number }` — Rate limit exceeded (retryAfter in seconds)
    - `{ type: "network"; message: string }` — Network failure, timeout, or connectivity issue
    - `{ type: "parse"; message: string }` — JSON parsing or response validation error

- `ConnectorResult<T>` (discriminated union type)
  - **Description**: Result type for all connector operations. Provides type-safe error handling.
  - **Location**: `src/lib/scraper/types.ts:25-27`
  - **Variants**:
    - `{ success: true; data: T }` — Successful operation
    - `{ success: false; error: ConnectorError }` — Failed operation with typed error

- `SearchParams` (interface)
  - **Description**: Input parameters for connector search operations.
  - **Location**: `src/lib/scraper/types.ts:29-33`
  - **Properties**:
    - `keywords: string` — Search terms (may include || delimiters for EURES multi-keyword)
    - `location: string` — Location filter (format varies by connector)
    - `connectorParams?: Record<string, unknown>` — Connector-specific configuration (e.g., EURES language, Arbeitsagentur filters)

- `DataSourceConnector` (interface)
  - **Description**: Main contract for all connector modules. Defines the unified API that all external integrations must implement.
  - **Location**: `src/lib/scraper/types.ts:35-41`
  - **Methods**:
    - `readonly id: string` — Unique identifier ("eures", "arbeitsagentur", "jsearch")
    - `readonly name: string` — Human-readable name for UI display
    - `readonly requiresApiKey: boolean` — Whether the connector requires user-provided API keys
    - `search(params: SearchParams): Promise<ConnectorResult<DiscoveredVacancy[]>>` — Search for jobs matching parameters; supports pagination by calling multiple times with offset
    - `getDetails?(externalId: string): Promise<ConnectorResult<DiscoveredVacancy>>` — Optional method to fetch full job details by external ID (used for enrichment post-search)

#### Registry

**`registry.ts`** — Factory registry for connector instantiation

- `ConnectorRegistry` (class)
  - **Description**: Registry that maps connector IDs to factory functions. Enables runtime instantiation of connectors without hard-coded dependencies.
  - **Location**: `src/lib/scraper/registry.ts:5-27`
  - **Constructor**: `new ConnectorRegistry()`
  - **Methods**:
    - `register(id: string, factory: ConnectorFactory): void`
      - **Description**: Register a connector factory by ID. Called during initialization.
      - **Parameters**:
        - `id: string` — Unique connector identifier ("eures", "arbeitsagentur", "jsearch")
        - `factory: () => DataSourceConnector` — Function that creates a new connector instance
      - **Returns**: void
      - **Throws**: None (overwrites if ID already exists)

    - `create(id: string): DataSourceConnector`
      - **Description**: Create and return a new connector instance by ID.
      - **Parameters**:
        - `id: string` — Connector identifier
      - **Returns**: `DataSourceConnector` instance
      - **Throws**: `Error` if ID not found (includes list of available connectors)

    - `has(id: string): boolean`
      - **Description**: Check if a connector is registered.
      - **Parameters**:
        - `id: string` — Connector identifier
      - **Returns**: `true` if registered, `false` otherwise

    - `availableConnectors(): string[]`
      - **Description**: Get list of all registered connector IDs.
      - **Returns**: Array of connector IDs

- `connectorRegistry` (singleton)
  - **Description**: Global ConnectorRegistry instance used throughout the application.
  - **Location**: `src/lib/scraper/registry.ts:29`
  - **Type**: `ConnectorRegistry`
  - **Usage**: `connectorRegistry.create("eures")` to instantiate a connector

#### Runner & Orchestration

**`runner.ts`** — Automation execution engine

- `runAutomation(automation: Automation): Promise<RunnerResult>`
  - **Description**: Main orchestrator that executes a job search automation. Coordinates connector search, deduplication, detail enrichment, AI matching, and database persistence.
  - **Location**: `src/lib/scraper/runner.ts:118-472`
  - **Parameters**:
    - `automation: Automation` — Automation configuration (keywords, location, jobBoard, matchThreshold, etc.)
  - **Returns**: `RunnerResult` with execution metrics and status
  - **Flow**:
    1. Create `AutomationRun` record in database
    2. Fetch user's resume with all sections and contact info
    3. Create connector via `connectorRegistry.create(automation.jobBoard)`
    4. Call `connector.search({ keywords, location, connectorParams })`
    5. If search succeeds:
       a. Filter results against existing jobs (deduplication)
       b. Cap to `MAX_JOBS_PER_RUN` (10 jobs) to limit API calls
       c. Optionally enrich via `connector.getDetails()` (if available)
       d. For each job, call `matchJobToResume()` with AI matching
       e. Filter matched jobs by `automation.matchThreshold`
       f. Map to domain model via `mapScrapedJobToJobRecord()`
       g. Persist matched jobs to database
    6. Update `AutomationRun` with final metrics
    7. Calculate next run time via `calculateNextRunAt()`
  - **Error Handling**:
    - Catches `ConnectorError` and maps to `AutomationRunStatus` ("blocked", "rate_limited", "failed", "completed_with_errors")
    - Logs all errors to automation logger
    - Resume fetch failures → "failed" status
    - Search failures → maps error type to status, logs reason
    - AI matching failures → logs warning, continues (resilient)
    - Database save failures → logs error, continues (optimistic)
  - **Side Effects**:
    - Reads from database: automation, resume, existing jobs
    - Writes to database: automationRun, jobs, jobTitles, locations, companies, jobSources
    - Calls external APIs via connector
    - Calls AI provider for job matching
  - **Dependencies**:
    - `connectorRegistry` — to instantiate connector
    - `mapScrapedJobToJobRecord()` — to translate DiscoveredVacancy to Job database record
    - `getModel()` — to get AI provider instance
    - `automationLogger` — for structured logging
    - `db` (Prisma) — for database operations

- `matchJobToResume(job: DiscoveredVacancy, resume: ResumeWithSections, aiSettings: AiSettings, userId: string): Promise<MatchResult>`
  - **Description**: Uses AI to score job-resume match (0-100).
  - **Location**: `src/lib/scraper/runner.ts:496-557`
  - **Parameters**:
    - `job: DiscoveredVacancy` — The discovered job to evaluate
    - `resume: ResumeWithSections` — User's resume with structured sections
    - `aiSettings: AiSettings` — AI provider and model configuration
    - `userId: string` — For logging and provider context
  - **Returns**: `MatchResult` with success flag, score (0-100), and optional match data
  - **Flow**:
    1. Convert resume to markdown text via `convertResumeForMatch()`
    2. Format job details (title, company, description, salary, deadline, instructions)
    3. Get AI model via `getModel(provider, modelName, userId)`
    4. Call `generateText()` with `JobMatchSchema` for structured output
    5. Extract `matchScore` from result
  - **Error Handling**:
    - Network errors (ECONNREFUSED, fetch failed, ENOTFOUND) → return `{ success: false, error: "ai_unavailable" }`
    - Other errors → return `{ success: false, error: message }`
    - Does NOT throw (returns error in result object)

- `convertResumeForMatch(resume: ResumeWithSections): Promise<string>`
  - **Description**: Converts structured resume to markdown text for AI processing.
  - **Location**: `src/lib/scraper/runner.ts:559-611`
  - **Parameters**:
    - `resume: ResumeWithSections` — Structured resume data
  - **Returns**: Markdown-formatted resume text
  - **Format**:
    ```
    # Resume Title
    ## CONTACT
    Name: ...
    Email: ...
    ...
    ## SUMMARY
    ...
    ## EXPERIENCE
    Company: ... Job Title: ...
    ...
    ## EDUCATION
    Institution: ...
    ```

- `getExistingJobUrls(userId: string): Promise<Set<string>>`
  - **Description**: Fetches all previously discovered job URLs for deduplication.
  - **Location**: `src/lib/scraper/runner.ts:474-487`
  - **Parameters**:
    - `userId: string` — User ID
  - **Returns**: Set of normalized job URLs
  - **Dependencies**: `db.job.findMany()`, `normalizeJobUrl()`

- `finalizeRun(runId: string, data: FinalizeData): Promise<RunnerResult>`
  - **Description**: Persists final run metrics and updates automation schedule.
  - **Location**: `src/lib/scraper/runner.ts:635-673`
  - **Parameters**:
    - `runId: string` — AutomationRun ID
    - `data: FinalizeData` — Final metrics (jobsSearched, jobsMatched, etc.)
  - **Returns**: RunnerResult with all metrics
  - **Side Effects**:
    - Updates `automationRun` with status, error message, metrics, completedAt
    - Updates `automation` with lastRunAt and calculates nextRunAt

#### Mapper

**`mapper.ts`** — Domain translation from API types to database types

- `mapScrapedJobToJobRecord(input: MapperInput): Promise<MapperOutput>`
  - **Description**: Translates DiscoveredVacancy (domain type) to Job database record. Handles findOrCreate logic for job titles, locations, companies, and job sources.
  - **Location**: `src/lib/scraper/mapper.ts:33-62`
  - **Parameters**:
    - `input: MapperInput` with:
      - `vacancy: DiscoveredVacancy` — The discovered job
      - `userId: string` — For user-scoped entities
      - `automationId: string` — Associated automation
      - `matchScore: number` — AI match score
      - `matchData: string` — Serialized AI match details
  - **Returns**: `MapperOutput` (database record ready for `db.job.create()`)
  - **Side Effects**:
    - Calls `findOrCreateJobTitle()`, `findOrCreateLocation()`, `findOrCreateCompany()`, `getOrCreateJobSource()`
    - Each performs database lookups and creates new records if not found
  - **Database Records Created**:
    - `jobTitle` — Normalized job title (findOrCreate by normalized value or keyword match)
    - `location` — Job location (findOrCreate by normalized value or city name)
    - `company` — Employer name (findOrCreate by normalized value or keyword match)
    - `jobSource` — Source board ("eures", "arbeitsagentur", "jsearch")
    - `jobStatus` — Default "new" status (findOrCreate)

- `findOrCreateJobTitle(title: string, userId: string): Promise<string>`
  - **Description**: Finds or creates a job title entity. Uses fuzzy matching on keywords to group similar titles.
  - **Location**: `src/lib/scraper/mapper.ts:64-100`
  - **Parameters**:
    - `title: string` — Job title from API
    - `userId: string` — User ID for scoping
  - **Returns**: Job title ID
  - **Logic**:
    1. Normalize title via `normalizeForSearch()`
    2. Try exact match on normalized value
    3. Extract keywords via `extractKeywords()` and try fuzzy match
    4. Create new record if not found
  - **Database**: `db.jobTitle.findFirst()`, `db.jobTitle.create()`

- `findOrCreateLocation(location: string, userId: string): Promise<string | null>`
  - **Description**: Finds or creates a location entity. Returns null if location is empty.
  - **Location**: `src/lib/scraper/mapper.ts:102-142`
  - **Parameters**:
    - `location: string` — Location from API (e.g., "Berlin, Germany")
    - `userId: string` — User ID for scoping
  - **Returns**: Location ID or null
  - **Logic**:
    1. Return null if location is empty
    2. Normalize location
    3. Extract city name via `extractCityName()`
    4. Try exact match, then fuzzy match on city name
    5. Create new record if not found
  - **Database**: `db.location.findFirst()`, `db.location.create()`

- `findOrCreateCompany(company: string, userId: string): Promise<string>`
  - **Description**: Finds or creates a company/employer entity. Uses fuzzy keyword matching.
  - **Location**: `src/lib/scraper/mapper.ts:144-180`
  - **Parameters**:
    - `company: string` — Company name from API
    - `userId: string` — User ID for scoping
  - **Returns**: Company ID
  - **Logic**: Same as job title (normalize, exact match, fuzzy match, create)
  - **Database**: `db.company.findFirst()`, `db.company.create()`

- `getOrCreateJobSource(sourceBoard: string, userId: string): Promise<string>`
  - **Description**: Gets or creates a job source record. Sources are global (not user-scoped internally) but stored with user creation context.
  - **Location**: `src/lib/scraper/mapper.ts:182-203`
  - **Parameters**:
    - `sourceBoard: string` — Source identifier ("eures", "arbeitsagentur", "jsearch")
    - `userId: string` — User ID for tracking
  - **Returns**: Job source ID
  - **Database**: `db.jobSource.findFirst()`, `db.jobSource.create()`

- `getDefaultJobStatus(): Promise<string>`
  - **Description**: Gets or creates the default "new" job status.
  - **Location**: `src/lib/scraper/mapper.ts:205-215`
  - **Returns**: Status ID
  - **Database**: `db.jobStatus.findFirst()`, `db.jobStatus.create()`

#### Utilities

**`utils.ts`** — Shared utility functions for text processing

- `normalizeJobUrl(url: string): string`
  - **Description**: Removes tracking parameters (UTM, ref, fbclid, etc.) from job URLs to enable deduplication.
  - **Location**: `src/lib/scraper/utils.ts:17-27`
  - **Parameters**: `url: string`
  - **Returns**: Normalized URL without tracking params
  - **Implementation**: Parses URL, deletes TRACKING_PARAMS (utm_*, ref, fbclid, gclid, msclkid, tk, from, vjk), reconstructs

- `normalizeForSearch(str: string): string`
  - **Description**: Converts text to lowercase, removes extra spaces, replaces special chars with hyphens. Used for database search fields.
  - **Location**: `src/lib/scraper/utils.ts:29-35`
  - **Parameters**: `str: string`
  - **Returns**: Normalized string (e.g., "Senior Developer" → "senior-developer")
  - **Implementation**: toLowerCase → trim → replace spaces with hyphen → remove non-alphanumeric

- `extractKeywords(str: string): string[]`
  - **Description**: Extracts meaningful keywords from text by splitting on delimiters and filtering stop words.
  - **Location**: `src/lib/scraper/utils.ts:54-59`
  - **Parameters**: `str: string`
  - **Returns**: Array of keywords (length > 2, not in STOP_WORDS)
  - **Stop Words**: "senior", "jr", "junior", "sr", "inc", "llc", "ltd", "corp", "corporation", "the", "a", "an", "co", "company"

- `extractCityName(location: string): string | null`
  - **Description**: Extracts the first city name from a comma-separated location string.
  - **Location**: `src/lib/scraper/utils.ts:61-67`
  - **Parameters**: `location: string` (e.g., "Berlin, Germany")
  - **Returns**: City name or null if not found
  - **Implementation**: Splits on comma, lowercases first part

---

### EURES Module

#### Overview

- **Name**: EURES Connector Module
- **Location**: `src/lib/scraper/eures/`
- **External API**: EURES Job Search Engine (europa.eu/eures/api)
- **Base URL**: `https://europa.eu/eures/api/jv-searchengine/public`
- **Connector ID**: "eures"
- **API Key Required**: No (public API)
- **Resilience**: Circuit breaker (5 consecutive failures, 30s half-open), retry (3x exponential backoff), timeout (15s cooperative), bulkhead (5 concurrent, queue 10), rate limiting (3 tokens per 500ms)

#### Connector Factory

**`index.ts`** — EURES DataSourceConnector implementation

- `createEuresConnector(): DataSourceConnector`
  - **Description**: Factory function that creates the EURES connector instance. Registers metadata and implements search/getDetails.
  - **Location**: `src/lib/scraper/eures/index.ts:98-257`
  - **Returns**: DataSourceConnector instance with id="eures"
  - **Properties**:
    - `id: "eures"`
    - `name: "EURES"`
    - `requiresApiKey: false`

- `search(params: SearchParams): Promise<ConnectorResult<DiscoveredVacancy[]>>`
  - **Description**: Searches EURES for jobs. Supports pagination and multi-location queries.
  - **Location**: `src/lib/scraper/eures/index.ts:104-211`
  - **Parameters**:
    - `params.keywords` — Search terms (supports || delimited multi-keyword)
    - `params.location` — Comma-separated location codes (e.g., "de-ns,fr-ile")
    - `params.connectorParams.language` — Preferred language (default: "en")
  - **Returns**: `ConnectorResult<DiscoveredVacancy[]>`
  - **Flow**:
    1. Parse connectorParams (language, location codes)
    2. Convert location codes: "de-ns" → "DE-NS" format expected by API
    3. Split keywords on "||", map to `{ keyword, specificSearchCode: "EVERYWHERE" }`
    4. Build `EuresSearchRequest` with:
       - resultsPerPage: 50
       - sortSearch: "MOST_RECENT"
       - publicationPeriod: "LAST_WEEK"
       - Empty occupation/skill/sector filters
       - sessionId for tracking
       - requestLanguage for translations
    5. Paginate through results via `resilientFetch()` to POST `/search`
    6. Translate each vacancy via `translateEuresVacancy()`
    7. Stop when no more results or all vacancies collected
  - **Error Handling**:
    - `BrokenCircuitError` → `{ type: "network", message: "circuit breaker open" }`
    - `BulkheadRejectedError` → `{ type: "rate_limited", retryAfter: 30 }`
    - `TaskCancelledError` → `{ type: "network", message: "request timed out" }`
    - Generic `Error` → `{ type: "network", message: error.message }`

- `getDetails(externalId: string): Promise<ConnectorResult<DiscoveredVacancy>>`
  - **Description**: Fetches full job details by EURES vacancy ID. Enriches with application deadline and instructions.
  - **Location**: `src/lib/scraper/eures/index.ts:213-255`
  - **Parameters**:
    - `externalId: string` — EURES vacancy ID (stored in `DiscoveredVacancy.externalId`)
  - **Returns**: `ConnectorResult<DiscoveredVacancy>`
  - **Flow**:
    1. Call GET `/jv-searchengine/public/jv/id/{externalId}`
    2. Translate response via `translateDetail(detail, "en")`
  - **Error Handling**: Same as search

#### Detail Translation

- `translateDetail(detail: EuresVacancyDetail, language: string): DiscoveredVacancy`
  - **Description**: Translates EURES detail response to DiscoveredVacancy. Handles missing jvProfiles gracefully.
  - **Location**: `src/lib/scraper/eures/index.ts:30-67`
  - **Parameters**:
    - `detail: EuresVacancyDetail` — API response
    - `language: string` — Preferred profile language
  - **Returns**: DiscoveredVacancy
  - **Logic**:
    1. Try to get profile for requested language
    2. Fall back to first available profile if not found
    3. Return minimal stub if no profiles exist (API inconsistency)
    4. Extract location from profile, fall back to country code
    5. Strip HTML from description and application instructions
    6. Map positionScheduleCode to employment type

- `stripDetailHtml(html: string): string`
  - **Description**: Removes HTML tags and entities from detail text.
  - **Location**: `src/lib/scraper/eures/index.ts:69-83`
  - **Converts**: `<br/>` → `\n`, `</p>` → `\n\n`, `</li>` → `\n`, `&amp;` → `&`, etc.

- `mapDetailScheduleCode(codes?: string[]): "full_time" | "part_time" | "contract" | undefined`
  - **Description**: Maps EURES schedule codes to canonical employment types.
  - **Location**: `src/lib/scraper/eures/index.ts:85-96`
  - **Mapping**: "FullTime" → "full_time", "PartTime"/"FlexTime" → "part_time", others → undefined

#### Translator (Search Results)

**`translator.ts`** — Translates EURES search-result vacancies

- `translateEuresVacancy(jv: EuresJobVacancy, requestLanguage: string): DiscoveredVacancy`
  - **Description**: Translates EURES search-result vacancy (not detail) to DiscoveredVacancy. Used for search results; detail response handled by `translateDetail()`.
  - **Location**: `src/lib/scraper/eures/translator.ts:13-33`
  - **Parameters**:
    - `jv: EuresJobVacancy` — Search result from API
    - `requestLanguage: string` — Language to use for translations
  - **Returns**: DiscoveredVacancy
  - **Logic**:
    1. Try `jv.translations[requestLanguage]`, fall back to base fields
    2. Format location from locationMap
    3. Strip HTML from description
    4. Map schedule codes to employment type
    5. No applicationDeadline or applicationInstructions (only in detail response)

- `formatLocation(locationMap: Record<string, string[]>): string`
  - **Description**: Formats country→cities map to readable location string.
  - **Location**: `src/lib/scraper/eures/translator.ts:51-61`
  - **Format**: "City, Country; City2, Country2" or "Europe" if empty

- `mapScheduleCode(codes: string[]): "full_time" | "part_time" | "contract" | undefined`
  - **Description**: Maps EURES schedule codes (lowercase variants).
  - **Location**: `src/lib/scraper/eures/translator.ts:63-77`
  - **Mapping**: "fulltime" → "full_time", "parttime"/"flextime" → "part_time"

#### Resilience

**`resilience.ts`** — Fault tolerance patterns for EURES API

- `resilientFetch<T>(url: string, init: RequestInit): Promise<T>`
  - **Description**: Wraps fetch with cockatiel resilience policies (retry, circuit breaker, timeout, bulkhead, rate limiting).
  - **Location**: `src/lib/scraper/eures/resilience.ts:64-81`
  - **Parameters**:
    - `url: string` — API endpoint URL
    - `init: RequestInit` — Fetch options
  - **Returns**: `Promise<T>` (parsed JSON response)
  - **Flow**:
    1. Acquire rate limit token via `euresRateLimiter.acquire()`
    2. Execute through `euresPolicy` (composite resilience policy)
    3. Fetch with abort signal
    4. Throw `EuresApiError` if not ok
    5. Parse and return JSON
  - **Throws**: `EuresApiError`, `BrokenCircuitError`, `TaskCancelledError`, `BulkheadRejectedError`

- `EuresApiError` (class)
  - **Description**: Custom error for EURES API responses.
  - **Location**: `src/lib/scraper/eures/resilience.ts:21-28`
  - **Constructor**: `new EuresApiError(status: number, message: string)`
  - **Properties**: `status: number` (HTTP status code)

- `euresPolicy` (composite policy)
  - **Description**: Stacked resilience policies applied to all EURES requests.
  - **Location**: `src/lib/scraper/eures/resilience.ts:30-60`
  - **Policies** (in order):
    1. **Retry** (`euresRetry`): Retry on 5xx, 429, or network errors. Max 3 attempts with exponential backoff.
    2. **Circuit Breaker** (`euresBreaker`): Open after 5 consecutive 5xx errors. Half-open after 30s.
    3. **Timeout** (`euresTimeout`): Cooperative timeout of 15 seconds per request.
    4. **Bulkhead** (`euresBulkhead`): Max 5 concurrent requests with queue of 10 pending.
  - **Rate Limiter**: 3 tokens per 500ms (6 requests per second)

#### Rate Limiter

**`rate-limiter.ts`** — Token bucket for request pacing

- `TokenBucketRateLimiter` (class)
  - **Description**: Simple token bucket rate limiter. Allows bursts up to capacity, then paces requests.
  - **Location**: `src/lib/scraper/eures/rate-limiter.ts:8-43`
  - **Constructor**: `new TokenBucketRateLimiter(capacity: number, refillRateMs: number)`
    - `capacity: number` — Tokens available before rate limiting
    - `refillRateMs: number` — Milliseconds to refill one token
  - **Methods**:
    - `async acquire(): Promise<void>`
      - **Description**: Acquires one token. Waits if no tokens available.
      - **Behavior**: If tokens > 0, consume immediately. Else wait for refill, then consume.
    - `private refill(): void`
      - **Description**: Calculates and adds new tokens based on elapsed time.
      - **Behavior**: `newTokens = floor(elapsed / refillRateMs)`, capped at capacity

---

### Arbeitsagentur Module

#### Overview

- **Name**: Arbeitsagentur (German Federal Employment Agency) Connector Module
- **Location**: `src/lib/scraper/arbeitsagentur/`
- **External API**: Arbeitsagentur Jobsuche REST API v4 (rest.arbeitsagentur.de/jobboerse/jobsuche-service)
- **Base URL**: `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4`
- **Connector ID**: "arbeitsagentur"
- **API Key Required**: No (public API, uses X-API-Key header: "jobboerse-jobsuche")
- **Resilience**: Same as EURES (circuit breaker, retry, timeout, bulkhead, rate limiting)

#### Connector Factory

**`index.ts`** — Arbeitsagentur DataSourceConnector implementation

- `createArbeitsagenturConnector(): DataSourceConnector`
  - **Description**: Factory function for Arbeitsagentur connector.
  - **Location**: `src/lib/scraper/arbeitsagentur/index.ts:170-271`
  - **Returns**: DataSourceConnector with id="arbeitsagentur"
  - **Properties**:
    - `id: "arbeitsagentur"`
    - `name: "Arbeitsagentur"`
    - `requiresApiKey: false`

- `search(params: SearchParams): Promise<ConnectorResult<DiscoveredVacancy[]>>`
  - **Description**: Searches Arbeitsagentur for jobs in Germany.
  - **Location**: `src/lib/scraper/arbeitsagentur/index.ts:176-232`
  - **Parameters**:
    - `params.keywords` — Search query (single string, not multi-keyword)
    - `params.location` — City or postal code
    - `params.connectorParams`:
      - `umkreis: number` — Search radius in km
      - `veroeffentlichtseit: number` — Days since published (e.g., 7, 14, 30)
      - `arbeitszeit: "vz" | "tz"` — "vz" (full-time) or "tz" (part-time)
      - `befristung: 1 | 2` — 1 (fixed-term) or 2 (permanent)
  - **Returns**: `ConnectorResult<DiscoveredVacancy[]>`
  - **Flow**:
    1. Build search params via `buildSearchParams()` (was, wo, page, size, optional filters)
    2. Call GET `/jobs?{params}` via `resilientFetch()`
    3. Translate jobs via `translateJob()`
    4. Paginate: increment page, stop if no jobs returned or all results collected (based on maxErgebnisse)
  - **Error Handling**:
    - 429 (rate limited) → `{ type: "rate_limited", retryAfter: 60 }`
    - Other API errors → `{ type: "network", message: "..." }`
    - Generic errors → `{ type: "network", message: "..." }`

- `getDetails(externalId: string): Promise<ConnectorResult<DiscoveredVacancy>>`
  - **Description**: Fetches full job details by reference number (refnr).
  - **Location**: `src/lib/scraper/arbeitsagentur/index.ts:235-269`
  - **Parameters**:
    - `externalId: string` — Job reference number (refnr)
  - **Returns**: `ConnectorResult<DiscoveredVacancy>`
  - **Flow**:
    1. Call GET `/jobdetails/{refnr}` via `resilientFetch()`
    2. Translate via `translateDetail(detail)`
    3. Include full `stellenbeschreibung` (description) and `bewerbung` (application instructions)
  - **Error Handling**: Same as search

#### Translation & URL Building

- `buildDetailUrl(hashId?: string, refnr?: string): string`
  - **Description**: Constructs public detail URL for Arbeitsagentur job portal.
  - **Location**: `src/lib/scraper/arbeitsagentur/index.ts:30-38`
  - **Parameters**:
    - `hashId?: string` — Used if available (from detail response)
    - `refnr?: string` — Fallback (reference number)
  - **Returns**: `https://www.arbeitsagentur.de/jobsuche/suche?id={hashId}` or `?was={refnr}` or base URL
  - **Logic**: Prefer hashId, fall back to refnr, else base URL

- `mapEmploymentType(arbeitszeit?: string): "full_time" | "part_time" | "contract" | undefined`
  - **Description**: Maps Arbeitsagentur employment type codes to canonical types.
  - **Location**: `src/lib/scraper/arbeitsagentur/index.ts:49-61`
  - **Mapping**:
    - "vz" (Vollzeit) → "full_time"
    - "tz" (Teilzeit) → "part_time"
    - Others → undefined

- `buildLocationString(arbeitsort: ArbeitsagenturJob["arbeitsort"]): string`
  - **Description**: Formats location object to readable string.
  - **Location**: `src/lib/scraper/arbeitsagentur/index.ts:66-73`
  - **Returns**: "City, Region" or "Deutschland" if empty
  - **Logic**: Combines ort and region if different, else defaults to "Deutschland"

- `stripHtml(html: string): string`
  - **Description**: Removes HTML tags and entities (same as EURES).
  - **Location**: `src/lib/scraper/arbeitsagentur/index.ts:78-92`

- `translateJob(job: ArbeitsagenturJob): DiscoveredVacancy`
  - **Description**: Translates search-result job to DiscoveredVacancy. Note: search response includes brief "beruf" field, not full description.
  - **Location**: `src/lib/scraper/arbeitsagentur/index.ts:99-113`
  - **Parameters**: `job: ArbeitsagenturJob`
  - **Returns**: DiscoveredVacancy with description set to beruf (teaser, not full)
  - **Details**: Uses hashId or refnr for URL, maps arbeitszeit, stores refnr as externalId

- `translateDetail(detail: ArbeitsagenturJobDetail): DiscoveredVacancy`
  - **Description**: Translates detail response to DiscoveredVacancy with full description and application instructions.
  - **Location**: `src/lib/scraper/arbeitsagentur/index.ts:118-140`
  - **Parameters**: `detail: ArbeitsagenturJobDetail`
  - **Returns**: DiscoveredVacancy with full stellenbeschreibung and bewerbung
  - **Details**: Prefers stellenbeschreibung over beruf for description, includes salary and application instructions

- `buildSearchParams(params: SearchParams, page: number): URLSearchParams`
  - **Description**: Constructs URL search parameters for Arbeitsagentur API.
  - **Location**: `src/lib/scraper/arbeitsagentur/index.ts:151-168`
  - **Parameters**:
    - `params: SearchParams` — Keywords, location, connectorParams
    - `page: number` — 0-based page index
  - **Returns**: URLSearchParams
  - **Fields Set**:
    - `was` (keywords)
    - `wo` (location)
    - `page` (0-based)
    - `size` (50)
    - Optional: `umkreis`, `veroeffentlichtseit`, `arbeitszeit`, `befristung`

#### Resilience

**`resilience.ts`** — Fault tolerance for Arbeitsagentur API

- `resilientFetch<T>(url: string, init: RequestInit): Promise<T>`
  - **Description**: Wraps fetch with Arbeitsagentur resilience policy.
  - **Location**: `src/lib/scraper/arbeitsagentur/resilience.ts:76-93`
  - **Parameters**:
    - `url: string` — API endpoint
    - `init: RequestInit` — Fetch options (must include X-API-Key header)
  - **Returns**: `Promise<T>` (parsed JSON)
  - **Flow**: Same as EURES (rate limit token, execute policy, throw on error, parse JSON)

- `ArbeitsagenturApiError` (class)
  - **Description**: Custom error for Arbeitsagentur API responses.
  - **Location**: `src/lib/scraper/arbeitsagentur/resilience.ts:21-28`
  - **Constructor**: `new ArbeitsagenturApiError(status: number, message: string)`

- `arbeitsagenturPolicy` (composite policy)
  - **Description**: Resilience policy for Arbeitsagentur requests.
  - **Location**: `src/lib/scraper/arbeitsagentur/resilience.ts:30-64`
  - **Policies**:
    1. Retry: 3 attempts on 5xx/429/network errors, exponential backoff
    2. Circuit Breaker: Open after 5 consecutive 5xx, half-open after 30s
    3. Timeout: 15s cooperative timeout
    4. Bulkhead: 5 concurrent, queue 10
    5. Rate Limiter: 3 tokens per 500ms (same as EURES)

#### Types

**`types.ts`** — TypeScript types for Arbeitsagentur API responses

- `ArbeitsagenturSearchResponse` (interface)
  - **Description**: Top-level search response envelope.
  - **Location**: `src/lib/scraper/arbeitsagentur/types.ts:8-13`
  - **Properties**:
    - `stellenangebote: ArbeitsagenturJob[]` — Array of job listings
    - `maxErgebnisse: number` — Total available results
    - `page: number` — Current page (0-based)
    - `size: number` — Results per page

- `ArbeitsagenturJob` (interface)
  - **Description**: Single job listing from search response.
  - **Location**: `src/lib/scraper/arbeitsagentur/types.ts:16-43`
  - **Key Properties**:
    - `refnr: string` — Reference number (unique ID)
    - `hashId?: string` — Hash ID for public URL
    - `titel: string` — Job title
    - `arbeitgeber: string` — Employer name
    - `arbeitsort: ArbeitsagenturArbeitsort` — Location details
    - `arbeitszeit?: string` — Employment type ("vz", "tz", "snw", "mj", "ho")
    - `aktuelleVeroeffentlichungsdatum: string` — Publication date (ISO 8601)
    - `beruf?: string` — Brief description/teaser (HTML possible)
    - `ausbildung?: boolean` — Apprenticeship flag

- `ArbeitsagenturArbeitsort` (interface)
  - **Description**: Location details.
  - **Location**: `src/lib/scraper/arbeitsagentur/types.ts:46-59`
  - **Properties**: `ort` (city), `region` (state), `plz` (postal code), `land` (country), `lat`/`lon` (coordinates)

- `ArbeitsagenturJobDetail` (interface)
  - **Description**: Detail response for single job (GET /jobdetails/{refnr}).
  - **Location**: `src/lib/scraper/arbeitsagentur/types.ts:62-80`
  - **Additional Properties**:
    - `stellenbeschreibung?: string` — Full job description (HTML)
    - `verguetung?: string` — Salary/compensation description
    - `bewerbung?: string` — Application instructions (HTML)

---

### JSearch Module

#### Overview

- **Name**: JSearch Connector Module (RapidAPI/Google Jobs)
- **Location**: `src/lib/scraper/jsearch/`
- **External API**: JSearch via RapidAPI (jsearch.p.rapidapi.com)
- **Base URL**: `https://jsearch.p.rapidapi.com`
- **Connector ID**: "jsearch"
- **API Key Required**: Yes (RAPIDAPI_KEY environment variable)
- **Resilience**: None (no custom resilience; relies on native fetch error handling)

#### Connector Factory

**`index.ts`** — JSearch DataSourceConnector implementation

- `createJSearchConnector(): DataSourceConnector`
  - **Description**: Factory function for JSearch connector.
  - **Location**: `src/lib/scraper/jsearch/index.ts:37-112`
  - **Returns**: DataSourceConnector with id="jsearch"
  - **Properties**:
    - `id: "jsearch"`
    - `name: "JSearch"`
    - `requiresApiKey: true`

- `search(params: SearchParams): Promise<ConnectorResult<DiscoveredVacancy[]>>`
  - **Description**: Searches JSearch (Google Jobs API) for jobs. Returns only first page (100 jobs).
  - **Location**: `src/lib/scraper/jsearch/index.ts:43-110`
  - **Parameters**:
    - `params.keywords` — Job title/keywords
    - `params.location` — City or region
  - **Returns**: `ConnectorResult<DiscoveredVacancy[]>`
  - **Flow**:
    1. Check RAPIDAPI_KEY env var, return error if missing
    2. Build search query: `"{keywords} in {location}"`
    3. Call GET `/search?query={query}&page=1&num_pages=1&date_posted=week` with RapidAPI headers
    4. Check response status:
       - 403 → `{ type: "blocked", reason: "API access denied" }`
       - 429 → `{ type: "rate_limited", retryAfter: 60 }`
       - Other non-ok → `{ type: "network", message: "..." }`
    5. Translate each job via `translateJSearchJob()`
    6. Return all vacancies from single page
  - **Limitation**: JSearch connector does NOT support pagination (only fetches first page, 100 results)
  - **Error Handling**: Maps HTTP status to ConnectorError types

#### Translation

- `translateJSearchJob(job: JSearchJob): DiscoveredVacancy`
  - **Description**: Translates JSearch result to DiscoveredVacancy.
  - **Location**: `src/lib/scraper/jsearch/index.ts:114-129`
  - **Parameters**: `job: JSearchJob`
  - **Returns**: DiscoveredVacancy
  - **Details**: Includes full description (JSearch returns complete job details), formats salary via `formatSalary()`

- `mapEmploymentType(raw?: string): "full_time" | "part_time" | "contract" | undefined`
  - **Description**: Maps JSearch employment type strings to canonical types.
  - **Location**: `src/lib/scraper/jsearch/index.ts:131-150`
  - **Mapping**:
    - "fulltime"/"full_time"/"full-time" → "full_time"
    - "parttime"/"part_time"/"part-time" → "part_time"
    - "contractor"/"contract" → "contract"

- `formatSalary(job: JSearchJob): string | undefined`
  - **Description**: Formats min/max salary to readable string.
  - **Location**: `src/lib/scraper/jsearch/index.ts:152-171`
  - **Returns**: "$X - $Y per {period}" or "$X+" or "Up to $Y" or undefined
  - **Format**: Uses job_salary_period (default: "year"), localizes numbers

#### Types (Inline)

- `JSearchJob` (interface)
  - **Description**: Single job from JSearch response.
  - **Location**: `src/lib/scraper/jsearch/index.ts:11-29`
  - **Key Properties**:
    - `job_id: string` — Unique job ID (used as externalId)
    - `job_title: string` — Job title
    - `employer_name: string` — Company name
    - `job_employment_type: string` — Employment type (mapped to canonical)
    - `job_apply_link: string` — URL to apply
    - `job_description: string` — Full job description
    - `job_city: string`, `job_state: string`, `job_country: string` — Location
    - `job_posted_at_datetime_utc: string` — Posted time (ISO 8601)
    - `job_min_salary: number | null`, `job_max_salary: number | null` — Salary range

- `JSearchResponse` (interface)
  - **Description**: Top-level response envelope.
  - **Location**: `src/lib/scraper/jsearch/index.ts:31-35`
  - **Properties**:
    - `status: string` — Response status ("success")
    - `request_id: string` — Request ID for debugging
    - `data: JSearchJob[]` — Array of job results

---

### Connector Registration

**`connectors.ts`** — Global connector initialization

- **Description**: Registers all available connectors in the global registry.
- **Location**: `src/lib/scraper/connectors.ts:1-11`
- **Code**:
  ```typescript
  connectorRegistry.register("jsearch", createJSearchConnector);
  connectorRegistry.register("eures", createEuresConnector);
  connectorRegistry.register("arbeitsagentur", createArbeitsagenturConnector);
  ```
- **Side Effects**: Called during app initialization; populates connectorRegistry
- **Export**: `connectorRegistry` (singleton)

---

## Dependencies

### Internal Dependencies

- `src/models/automation.model` — Automation, AutomationRunStatus (runner)
- `src/models/ai.model` — AiProvider, OllamaModel, OpenaiModel, DeepseekModel (runner)
- `src/models/userSettings.model` — AiSettings, defaultUserSettings (runner)
- `src/models/automation.model` — DiscoveryStatus (mapper)
- `src/lib/db` — Prisma client for database operations (runner, mapper)
- `src/lib/ai` — AI provider utilities (generateText, getModel, JobMatchSchema, prompts) (runner)
- `src/lib/automation-logger` — Structured logging for automations (runner)
- `src/lib/debug` — Debug logging utility (runner)

### External Dependencies

- **cockatiel** (resilience library)
  - `retry`, `circuitBreaker`, `timeout`, `bulkhead`, `wrap` — Policy composition
  - `handleWhen`, `ConsecutiveBreaker`, `ExponentialBackoff`, `TimeoutStrategy` — Configuration
  - Used in EURES and Arbeitsagentur resilience modules

- **Native Fetch API** (global)
  - Used in all connectors for HTTP requests
  - JSearch has no custom resilience; relies on native fetch

- **Prisma Client** (`@prisma/client`)
  - Database queries for automations, resumes, jobs, titles, locations, companies, sources, statuses
  - Used in runner and mapper

- **Vercel AI SDK** (`ai`)
  - `generateText`, `Output` — For AI-powered job matching (runner)

- **Environment Variables**
  - `RAPIDAPI_KEY` — RapidAPI key for JSearch (jsearch module)
  - `NEXT_LOCALE` — User locale (read from cookies in API routes) (runner)

---

## Data Flow

### Automation Execution Flow

```
runAutomation()
  ├─ Load automation config
  ├─ Create automationRun record
  ├─ Load user's resume with sections
  ├─ connectorRegistry.create(automation.jobBoard)
  │  └─ Returns DataSourceConnector instance
  ├─ connector.search({ keywords, location, connectorParams })
  │  └─ Module-specific API call via resilientFetch()
  │     ├─ Rate limiting via TokenBucketRateLimiter
  │     ├─ Resilience policy (retry, circuit breaker, timeout, bulkhead)
  │     └─ HTTP fetch with error handling
  │  └─ Translate API responses to DiscoveredVacancy[]
  ├─ Deduplicate against existing jobs (normalizeJobUrl)
  ├─ Cap to MAX_JOBS_PER_RUN (10 jobs)
  ├─ For each job (if connector.getDetails available):
  │  └─ connector.getDetails(externalId) → enrich DiscoveredVacancy
  ├─ For each job:
  │  ├─ matchJobToResume() → AI matching (0-100 score)
  │  ├─ Filter by automation.matchThreshold
  │  ├─ mapScrapedJobToJobRecord()
  │  │  ├─ findOrCreateJobTitle()
  │  │  ├─ findOrCreateLocation()
  │  │  ├─ findOrCreateCompany()
  │  │  ├─ getOrCreateJobSource()
  │  │  └─ Returns Job record ready for DB insert
  │  └─ db.job.create()
  ├─ finalizeRun() → update automationRun with metrics
  └─ Calculate nextRunAt() → update automation schedule
```

### Connector API Response Translation Flow

```
External API Response
  ├─ EURES:
  │  ├─ Search: EuresSearchResponse → List<EuresJobVacancy>
  │  │  └─ Translate: translateEuresVacancy() → DiscoveredVacancy[]
  │  └─ Detail: EuresVacancyDetail
  │     └─ Translate: translateDetail() → DiscoveredVacancy
  ├─ Arbeitsagentur:
  │  ├─ Search: ArbeitsagenturSearchResponse → List<ArbeitsagenturJob>
  │  │  └─ Translate: translateJob() → DiscoveredVacancy[]
  │  └─ Detail: ArbeitsagenturJobDetail
  │     └─ Translate: translateDetail() → DiscoveredVacancy
  └─ JSearch:
     ├─ Search: JSearchResponse → List<JSearchJob>
     │  └─ Translate: translateJSearchJob() → DiscoveredVacancy[]
     └─ Detail: Not implemented (getDetails absent)

DiscoveredVacancy (canonical domain type)
  └─ Used by: runner, mapper, UI, database
```

---

## Error Handling Patterns

### Connector-Level Error Handling

All connectors return `ConnectorResult<T>` — never throw exceptions (except misconfiguration):

| Error Type | Cause | Result | Runner Handling |
|---|---|---|---|
| **blocked** | Invalid API key, account suspended, service restriction | `{ success: false, error: { type: "blocked", reason: "..." } }` | Set run status to "blocked", store blockedReason |
| **rate_limited** | API quota exceeded, too many concurrent requests | `{ success: false, error: { type: "rate_limited", retryAfter: 60 } }` | Set run status to "rate_limited" |
| **network** | Connection failure, timeout, HTTP 5xx, invalid response | `{ success: false, error: { type: "network", message: "..." } }` | Set run status to "failed", log error |
| **parse** | Invalid JSON, missing required fields | `{ success: false, error: { type: "parse", message: "..." } }` | Set run status to "failed", log error |

### Resilience Policy Error Handling

**EURES and Arbeitsagentur** resilience policies catch and categorize errors:

1. **EuresApiError / ArbeitsagenturApiError** (custom)
   - Thrown by `resilientFetch()` on non-ok HTTP response
   - Status code determines retry behavior and circuit breaker state
   - 5xx or 429 → retry, increment breaker failure count
   - Breaker opens after 5 consecutive 5xx

2. **BrokenCircuitError** (cockatiel)
   - Thrown when circuit breaker is open
   - Connector maps to `{ type: "network", message: "circuit breaker open" }`

3. **TaskCancelledError** (cockatiel)
   - Thrown when request timeout (15s) triggered
   - Connector maps to `{ type: "network", message: "request timed out" }`

4. **BulkheadRejectedError** (cockatiel)
   - Thrown when bulkhead queue full (5 concurrent, 10 pending)
   - Connector maps to `{ type: "rate_limited", retryAfter: 30 }`

5. **Generic Network Errors** (native fetch)
   - ECONNREFUSED, ENOTFOUND, fetch failed
   - JSearch passes through as network error
   - EURES/Arbeitsagentur caught by retry policy, then circuit breaker

### AI Matching Error Handling

`matchJobToResume()` returns `MatchResult` (never throws):

| Condition | Behavior |
|---|---|
| AI provider unreachable (network error) | `{ success: false, error: "ai_unavailable" }` → run status: "failed" |
| AI parsing error | `{ success: false, error: message }` → logged as warning, continue |
| Job score below threshold | Logged as "info", job skipped |
| Job score above threshold | Job persisted to database |

### Database Error Handling

`mapScrapedJobToJobRecord()` and `db.job.create()` may throw:

| Scenario | Behavior |
|---|---|
| Job title creation fails | Exception caught in `runAutomation()`, logged, job skipped, continue |
| Job creation fails | Exception caught, logged, `jobsSaved` not incremented, continue |
| Resume fetch fails | Exception caught, run status: "failed", automation ends |

---

## Resilience Characteristics

### EURES Module

| Component | Configuration | Purpose |
|---|---|---|
| **Retry** | 3 attempts, exponential backoff | Recover from transient 5xx, 429, network errors |
| **Circuit Breaker** | 5 consecutive failures, 30s half-open | Fail fast when API degraded; recover after 30s |
| **Timeout** | 15 seconds (cooperative) | Prevent hung requests; allows cleanup |
| **Bulkhead** | 5 concurrent, 10 queued | Prevent resource exhaustion; backpressure |
| **Rate Limiter** | 3 tokens per 500ms (6 req/s) | Respect API limits, prevent throttling |

### Arbeitsagentur Module

Same as EURES (identical cockatiel policies + rate limiter).

### JSearch Module

- **No custom resilience** — relies on native fetch error handling
- **API key validation** — returns blocked error if missing
- **Rate limit detection** — 429 status → rate_limited error with retryAfter: 60
- **Auth failure detection** — 403 status → blocked error

---

## Configuration & Constants

### EURES Configuration

```typescript
EURES_API_BASE = "https://europa.eu/eures/api"
EURES_SEARCH_URL = "https://europa.eu/eures/api/jv-searchengine/public/jv-search/search"
EURES_DETAIL_URL = "https://europa.eu/eures/api/jv-searchengine/public/jv/id"

SearchRequest defaults:
- resultsPerPage: 50
- sortSearch: "MOST_RECENT"
- publicationPeriod: "LAST_WEEK"
- specificsearchCode: "EVERYWHERE"
- sessionId: "jobsync-{timestamp}"

Rate Limiter: 3 tokens per 500ms
Timeout: 15 seconds
Bulkhead: 5 concurrent, 10 queued
```

### Arbeitsagentur Configuration

```typescript
API_BASE = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service"
SEARCH_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs"
DETAIL_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobdetails"
API_KEY = "jobboerse-jobsuche" (header: X-API-Key)

PAGE_SIZE: 50 (0-based pagination)
Timeout: 15 seconds
Bulkhead: 5 concurrent, 10 queued
Rate Limiter: 3 tokens per 500ms (same as EURES)
```

### JSearch Configuration

```typescript
RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
JSEARCH_BASE_URL = "https://jsearch.p.rapidapi.com"
SEARCH_URL = "https://jsearch.p.rapidapi.com/search"

Search defaults:
- page: 1
- num_pages: 1 (single page, 100 results max)
- date_posted: "week"

No custom resilience; native fetch only
```

### Shared Configuration

```typescript
MAX_JOBS_PER_RUN = 10 (cap on jobs processed per automation run)
STOP_WORDS = ["senior", "jr", "junior", "sr", "inc", "llc", "ltd", "corp", "corporation", "the", "a", "an", "co", "company"]
TRACKING_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source", "fbclid", "gclid", "msclkid", "tk", "from", "vjk"]
```

---

## Relationships

The connector layer forms a hub-and-spoke architecture, with each module implementing the shared `DataSourceConnector` interface:

```mermaid
---
title: Code Diagram for Connector Layer (Hub & Spoke)
---
classDiagram
    namespace Shared {
        class ConnectorRegistry {
            -factories: Map~string, ConnectorFactory~
            +register(id, factory) void
            +create(id) DataSourceConnector
            +has(id) boolean
            +availableConnectors() string~
        }
        class RunnerModule {
            +runAutomation(automation) Promise~RunnerResult~
            +matchJobToResume(job, resume, aiSettings, userId) Promise~MatchResult~
        }
        class MapperModule {
            +mapScrapedJobToJobRecord(input) Promise~MapperOutput~
            -findOrCreateJobTitle(title, userId) Promise~string~
            -findOrCreateLocation(location, userId) Promise~string|null~
            -findOrCreateCompany(company, userId) Promise~string~
            -getOrCreateJobSource(sourceBoard, userId) Promise~string~
        }
        class UtilsModule {
            +normalizeJobUrl(url) string
            +normalizeForSearch(str) string
            +extractKeywords(str) string~
            +extractCityName(location) string|null
        }
        class TypesModule {
            <<interface>>
            +DataSourceConnector
            +DiscoveredVacancy
            +ConnectorError
            +ConnectorResult~T~
            +SearchParams
        }
    }

    namespace EuresModule {
        class EuresConnector {
            <<implements DataSourceConnector>>
            -id: "eures"
            -name: "EURES"
            +search(params) Promise~ConnectorResult~DiscoveredVacancy~~~
            +getDetails(externalId) Promise~ConnectorResult~DiscoveredVacancy~~
        }
        class EuresTranslator {
            +translateEuresVacancy(jv, language) DiscoveredVacancy
            +translateDetail(detail, language) DiscoveredVacancy
            -stripHtml(html) string
            -formatLocation(map) string
            -mapScheduleCode(codes) EmploymentType|undefined
        }
        class EuresResilience {
            +resilientFetch~T~(url, init) Promise~T~
            -euresRetry: Policy
            -euresBreaker: Policy
            -euresTimeout: Policy
            -euresBulkhead: Policy
        }
        class RateLimiter {
            -tokens: number
            -lastRefill: number
            +acquire() Promise~void~
        }
    }

    namespace ArbeitsagenturModule {
        class ArbeitsagenturConnector {
            <<implements DataSourceConnector>>
            -id: "arbeitsagentur"
            -name: "Arbeitsagentur"
            +search(params) Promise~ConnectorResult~DiscoveredVacancy~~~
            +getDetails(externalId) Promise~ConnectorResult~DiscoveredVacancy~~
        }
        class ArbeitsagenturTranslator {
            +translateJob(job) DiscoveredVacancy
            +translateDetail(detail) DiscoveredVacancy
            -buildLocationString(arbeitsort) string
            -mapEmploymentType(arbeitszeit) EmploymentType|undefined
            -buildDetailUrl(hashId, refnr) string
        }
        class ArbeitsagenturResilience {
            +resilientFetch~T~(url, init) Promise~T~
            -aaRetry: Policy
            -aaBreaker: Policy
            -aaTimeout: Policy
            -aaBulkhead: Policy
        }
    }

    namespace JSearchModule {
        class JSearchConnector {
            <<implements DataSourceConnector>>
            -id: "jsearch"
            -name: "JSearch"
            -requiresApiKey: true
            +search(params) Promise~ConnectorResult~DiscoveredVacancy~~~
        }
        class JSearchTranslator {
            +translateJSearchJob(job) DiscoveredVacancy
            -mapEmploymentType(raw) EmploymentType|undefined
            -formatSalary(job) string|undefined
        }
    }

    TypesModule "implements" <|.. EuresConnector
    TypesModule "implements" <|.. ArbeitsagenturConnector
    TypesModule "implements" <|.. JSearchConnector

    ConnectorRegistry -->|creates instances| EuresConnector
    ConnectorRegistry -->|creates instances| ArbeitsagenturConnector
    ConnectorRegistry -->|creates instances| JSearchConnector

    RunnerModule -->|uses| ConnectorRegistry
    RunnerModule -->|calls| TypesModule
    RunnerModule -->|calls| MapperModule
    RunnerModule -->|calls| UtilsModule

    MapperModule -->|uses| UtilsModule
    MapperModule -->|outputs| TypesModule

    EuresConnector -->|translates via| EuresTranslator
    EuresConnector -->|resilience via| EuresResilience
    EuresResilience -->|rate limit via| RateLimiter

    ArbeitsagenturConnector -->|translates via| ArbeitsagenturTranslator
    ArbeitsagenturConnector -->|resilience via| ArbeitsagenturResilience
    ArbeitsagenturResilience -->|rate limit via| RateLimiter

    JSearchConnector -->|translates via| JSearchTranslator

    EuresTranslator -->|outputs| TypesModule
    ArbeitsagenturTranslator -->|outputs| TypesModule
    JSearchTranslator -->|outputs| TypesModule
```

---

## Testing Patterns

### Unit Test Coverage Areas

1. **Connector Factories**
   - `createEuresConnector()`, `createArbeitsagenturConnector()`, `createJSearchConnector()`
   - Verify metadata (id, name, requiresApiKey)

2. **Search Methods**
   - Mock API responses for happy path
   - Verify translation logic (type mapping, HTML stripping, location formatting)
   - Test error handling (BrokenCircuitError, TaskCancelledError, etc.)

3. **Detail Methods**
   - Mock detail API responses
   - Verify enrichment fields (applicationDeadline, salary, instructions)

4. **Translation Functions**
   - Unit tests for each `translateX()` function with various API response shapes
   - Edge cases: missing fields, empty arrays, null values, HTML entities

5. **Resilience Policies**
   - Mock network failures and verify retry behavior
   - Mock 5xx errors and verify circuit breaker state changes
   - Verify timeout cancellation
   - Verify bulkhead queue behavior

6. **Utilities**
   - `normalizeJobUrl()` — verify tracking param removal
   - `normalizeForSearch()` — verify normalization
   - `extractKeywords()` — verify keyword extraction and stop word filtering
   - `extractCityName()` — verify city extraction from location strings

7. **Runner Orchestration**
   - Mock connectorRegistry, database, and AI provider
   - Verify search → dedup → enrich → match → save flow
   - Verify error handling (search failure, match failure, save failure)
   - Verify metrics calculation (jobsSearched, jobsMatched, jobsSaved)

8. **Mapper**
   - Mock database calls to verify findOrCreate logic
   - Verify keyword-based fuzzy matching for deduplication
   - Verify all database records created in correct order

### Integration Test Coverage

1. **Real API Integration** (with VCR cassettes or mocks)
   - Test real EURES API search and detail endpoints
   - Test real Arbeitsagentur API search and detail endpoints
   - Test error responses (rate limiting, invalid location codes, etc.)

2. **Full Automation Run**
   - Create test automation, resume, and mock database
   - Execute full `runAutomation()` flow
   - Verify all database records created
   - Verify metrics and status updates

3. **Multi-Module Search**
   - Run search across multiple connectors simultaneously
   - Verify deduplication and metrics aggregation

---

## Known Limitations & TODOs

1. **JSearch Module**
   - No pagination support (only fetches first page, 100 results max)
   - No `getDetails()` method (no detail enrichment available)
   - Relies on native fetch (no custom resilience policies)

2. **EURES Module**
   - Detail response uses hardcoded "en" language (should respect request language)
   - LocationMap translation may miss some location formats

3. **Arbeitsagentur Module**
   - Search results include brief "beruf" teaser instead of full description; requires getDetails() call for complete description
   - Hash ID generation differs from reference number format; URL building handles both

4. **Resilience Policies**
   - Rate limiters are per-module instance (not globally shared; allows high concurrency if multiple automations run simultaneously)
   - Circuit breaker recovery is automatic (half-open after 30s); no manual override mechanism

5. **Mapper Deduplication**
   - Fuzzy matching on keywords may miss some variations (e.g., "Senior Software Engineer" vs. "Sr. Software Developer")
   - Location city name extraction is simplistic (splits on comma; doesn't handle all formats)

6. **AI Matching**
   - Costs per automation run scale with number of jobs processed (MAX_JOBS_PER_RUN = 10 concurrent matches)
   - No caching of match results; identical job-resume pairs re-matched on each run

---

## Future Roadmap

As per CLAUDE.md, the connector layer will be refactored:

- **Target Path**: `src/lib/connector/modules/`
- **Structure**:
  ```
  src/lib/connector/
    ├── modules/
    │   ├── eures/
    │   ├── arbeitsagentur/
    │   ├── jsearch/
    │   └── {future-modules}/
    ├── types.ts        (shared interfaces)
    ├── registry.ts     (factory registry)
    ├── runner.ts       (orchestration)
    ├── mapper.ts       (domain translation)
    └── utils.ts        (text processing)
  ```

New modules should follow the same pattern:
1. Create `src/lib/connector/modules/{name}/index.ts` implementing `DataSourceConnector`
2. Create `src/lib/connector/modules/{name}/types.ts` for API-specific types
3. Create `src/lib/connector/modules/{name}/resilience.ts` for fault tolerance (if external API)
4. Register in `src/lib/connector/connectors.ts` via `connectorRegistry.register()`

---

## Notes

- **Anti-Corruption Layer Pattern**: The connector layer translates between external API languages and the canonical `DiscoveredVacancy` domain type. This isolation allows swapping modules without affecting the application core.
- **Resilience Philosophy**: EURES and Arbeitsagentur modules assume unreliable networks and implement comprehensive fault tolerance (retry, circuit breaker, timeout, bulkhead, rate limiting). JSearch has no custom resilience (future enhancement).
- **Error Semantics**: All connector errors are classified into four types (blocked, rate_limited, network, parse), enabling the runner to respond appropriately (pause, retry, log, escalate).
- **Marketplace Integration** (Future): Modules and connectors will be activatable/deactivatable via `/dashboard/settings`, with dependency tracking and automated pause of affected automations.
