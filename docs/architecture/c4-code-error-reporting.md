# C4 Code Level: Error Reporting System

## Overview

- **Name**: JobSync Client-Side Error Reporting System
- **Description**: In-memory ring buffer for capturing, storing, and displaying runtime errors in the Next.js application. Collects errors from React error boundaries, unhandled promise rejections, and other error sources. Integrates with the Settings UI for developer error log inspection and reporting toggle control.
- **Location**: `/home/pascal/projekte/jobsync/src/lib/error-reporter.ts` and related components
- **Language**: TypeScript (React components)
- **Purpose**: Provides developers with visibility into client-side errors during development and testing. Enables error capture control via user settings. Displays errors in a collapsible, timestamped error log UI with source attribution.
- **Architecture Pattern**: Ring Buffer / Circular Buffer pattern with React Error Boundary integration
- **Scope**: Development mode only (process.env.NODE_ENV === "development")

---

## Code Elements

### Core Error Reporter Library

#### Types

**`ErrorEntry` (interface)**

- **Description**: Represents a single captured error in the buffer with full context.
- **Location**: `src/lib/error-reporter.ts:11-18`
- **Properties**:
  - `id: string` — Unique error identifier (format: `err_${timestamp}_${randomSuffix}`)
  - `timestamp: Date` — When the error was captured (client-side system time)
  - `message: string` — Error message string
  - `stack?: string` — JavaScript error stack trace (from Error.stack)
  - `componentStack?: string` — React error boundary component stack trace (from ErrorBoundary parameter)
  - `source: "error-boundary" | "unhandled-rejection" | "console-error"` — Where the error originated
    - `"error-boundary"` — Caught by React error boundary (`src/app/error.tsx` or `src/app/global-error.tsx`)
    - `"unhandled-rejection"` — Unhandled Promise rejection (via global `unhandledrejection` listener)
    - `"console-error"` — (Extensible) Could be added for console.error() interception

#### Buffer Management Functions

**`reportError(entry: ErrorEntry): void`**

- **Description**: Add an error entry to the in-memory ring buffer. Maintains a maximum size (MAX_ENTRIES = 100) by dropping oldest entries when capacity is exceeded.
- **Location**: `src/lib/error-reporter.ts:29-34`
- **Parameters**:
  - `entry: ErrorEntry` — Error object with id, timestamp, message, stack, source
- **Returns**: void
- **Implementation Details**:
  - Ring buffer implementation: When `buffer.length > MAX_ENTRIES`, removes oldest entries via `buffer.slice(buffer.length - MAX_ENTRIES)`
  - This keeps the N most recent errors and discards the N+1th oldest
  - Time complexity: O(MAX_ENTRIES) on each push when buffer is full; O(1) average case
  - Not persisted to IndexedDB, localStorage, or server

**`getErrors(): ErrorEntry[]`**

- **Description**: Retrieve all recorded errors sorted newest-first.
- **Location**: `src/lib/error-reporter.ts:39-41`
- **Parameters**: None
- **Returns**: `ErrorEntry[]` — Array of error entries in reverse chronological order (newest first)
- **Implementation Details**:
  - Returns a shallow copy (`[...buffer].reverse()`) to prevent external mutation of the buffer
  - Time complexity: O(n) due to spread + reverse operations

**`clearErrors(): void`**

- **Description**: Wipe all recorded errors from the buffer (destructive operation).
- **Location**: `src/lib/error-reporter.ts:46-48`
- **Parameters**: None
- **Returns**: void
- **Implementation Details**:
  - Sets `buffer = []`
  - Called when user clicks "Clear Errors" button in ErrorLogSettings UI

**`getErrorCount(): number`**

- **Description**: Get the current number of errors in the buffer without retrieving entries.
- **Location**: `src/lib/error-reporter.ts:53-55`
- **Parameters**: None
- **Returns**: number — Current buffer length (0–100)
- **Implementation Details**:
  - Used by SettingsSidebar to display error count badge and determine badge visibility
  - Called on 3-second polling interval for real-time count updates

**`generateErrorId(): string`**

- **Description**: Generate a unique identifier for an error entry.
- **Location**: `src/lib/error-reporter.ts:60-62`
- **Parameters**: None
- **Returns**: string — Unique ID (format: `err_{Date.now()}_{randomSuffix}`)
- **Implementation Details**:
  - Uses `Date.now()` (millisecond timestamp) + `Math.random().toString(36).slice(2, 9)` (8-char base-36 random suffix)
  - Collision resistance: Extremely low probability of duplicate IDs in a 100-entry buffer
  - Example: `err_1711270984506_g7ksqmj`

#### Initialization

**`initClientErrorCapture(): void`**

- **Description**: Initialize client-side global error listeners. Must be called once in a client layout or component to set up the unhandled promise rejection listener.
- **Location**: `src/lib/error-reporter.ts:70-93`
- **Parameters**: None
- **Returns**: void
- **Conditions**:
  - Only active if `process.env.NODE_ENV === "development"` (production no-op)
  - Only runs on client side (skipped if `typeof window === "undefined"`)
  - Guard: `if (initialized) return;` prevents duplicate initialization
- **Event Listeners Attached**:
  - `window.addEventListener("unhandledrejection", ...)` — Captures Promise rejections that reach global scope
  - Extracts message and stack from the rejection reason (if it's an Error instance)
  - Calls `reportError()` with source `"unhandled-rejection"`
- **Implementation Details**:
  - Event handler converts rejection reason (could be Error, string, object) to string message
  - Sets `initialized = true` to prevent re-registration on hot reloads or multiple calls
  - Note: Does NOT intercept console.error(); Error Boundary handlers call reportError() directly

---

### React Error Boundaries

#### Segment Error Boundary

**`error.tsx` (Next.js error boundary)**

- **Description**: Segment-level error boundary for the Next.js App Router. Catches errors in specific routes and renders an error UI with recovery option.
- **Location**: `src/app/error.tsx:1-42`
- **Functional Signature**:
  ```typescript
  function Error({
    error: Error & { digest?: string },
    reset: () => void
  }): ReactNode
  ```
- **Parameters**:
  - `error: Error & { digest?: string }` — The caught Error object. The `digest` field is a Next.js-provided hash for tracking identical errors.
  - `reset: () => void` — Callback to reset the error boundary and re-render the segment
- **Returns**: React component rendering error message and retry button
- **Error Capture Flow**:
  - Calls `useEffect()` to capture error on mount (triggers on error dependency change)
  - Calls `reportError()` with:
    - `id: generateErrorId()` — Unique error ID
    - `timestamp: new Date()` — Current time
    - `message: error.message` — Error message
    - `stack: error.stack` — Stack trace
    - `source: "error-boundary"` — Attribution
  - Only captures in development mode (`if (process.env.NODE_ENV === "development")`)
- **UI Elements**:
  - Displays translated error heading (`t("common.error")`)
  - Shows error message to user
  - Provides "Try Again" button (`t("settings.errorTryAgain")`) that calls `reset()`
- **Dependencies**:
  - `useTranslations()` hook for i18n
  - `reportError()`, `generateErrorId()` from error-reporter library

#### Root Error Boundary

**`global-error.tsx` (Next.js root error boundary)**

- **Description**: Root-level error boundary for the entire Next.js App Router. Catches errors in layouts that error.tsx cannot handle (e.g., layout component errors). Must render full HTML document.
- **Location**: `src/app/global-error.tsx:1-51`
- **Functional Signature**:
  ```typescript
  function GlobalError({
    error: Error & { digest?: string },
    reset: () => void
  }): ReactNode
  ```
- **Parameters**: Same as segment error boundary
- **Returns**: Full HTML document (html, body, content)
- **Characteristics**:
  - Does NOT call `reportError()` directly (could crash if error-reporter.ts is broken)
  - Renders minimal inline styles (no CSS modules or layout wrapper available at root level)
  - System font fallback (`fontFamily: "system-ui, sans-serif"`)
  - Simple button styling with hardcoded colors
- **UI Elements**:
  - Heading: "Something went wrong"
  - Error message display
  - Reset button with basic styling
- **Note**: This boundary does not integrate with error-reporter to avoid cascading failures. It is a safety net.

---

### Error Log Settings UI Component

**`ErrorLogSettings.tsx` (Client Component)**

- **Description**: React component that displays a collapsible error log with filtering, clearing, and error reporting toggle. Periodically polls the error buffer for new entries. Allows users to enable/disable error reporting via settings.
- **Location**: `src/components/settings/ErrorLogSettings.tsx:1-326`
- **Component Type**: Client Component (`"use client"`)
- **State Management**:
  - `isLoading: boolean` — Fetching user settings from server
  - `errors: ErrorEntry[]` — Current error list (refreshed every 3 seconds)
  - `expandedIds: Set<string>` — Tracks which error entries are expanded to show stack traces
  - `errorReporting: boolean` — Toggle state for error reporting feature

#### Initialization Hook

**`useEffect()` (lines 48–68)** — Fetch user settings and initial error list

- **Parameters**: `[refreshErrors]` — Dependency: refreshErrors callback
- **Actions**:
  - Calls `getUserSettings()` server action to fetch user's errorReporting setting
  - Extracts `settings.developer.errorReporting` value
  - Sets component state to match persisted setting (fallback to dev-mode default)
  - Calls `refreshErrors()` to populate initial error list
- **Error Handling**: Catches and logs (console.error) any fetch failures; does not throw

#### Polling Hook

**`useEffect()` (lines 71–74)** — Poll error buffer every 3 seconds

- **Parameters**: `[refreshErrors]` — Dependency: refreshErrors callback
- **Actions**:
  - Sets up `setInterval(refreshErrors, 3000)` to refresh error list periodically
  - Cleanup: `clearInterval()` on unmount
- **Purpose**: Provides real-time error visibility as new errors are captured

#### Callbacks

**`refreshErrors()` (lines 44–46)** — Re-fetch errors from buffer

```typescript
const refreshErrors = useCallback(() => {
  setErrors(getErrors());
}, []);
```

- **Purpose**: Update component state with current error list from buffer
- **Called**: On mount, every 3 seconds, and after clearing errors
- **Time Complexity**: O(n) to copy and reverse buffer

**`handleToggleReporting(checked: boolean)` (lines 76–120)** — Update error reporting setting

- **Description**: Toggle error reporting on/off and persist to user settings.
- **Parameters**: `checked: boolean` — New toggle state
- **Actions**:
  1. Optimistically update UI: `setErrorReporting(checked)`
  2. Fetch current user settings via `getUserSettings()`
  3. Merge new errorReporting value into existing DeveloperSettings
  4. Call `updateUserSettings({ developer: newSettings })`
  5. Show success/failure toast
  6. Revert UI if save fails: `setErrorReporting(!checked)`
- **Error Handling**: Catches server action failures and reverts UI state
- **Server Interaction**: Calls `userSettings.actions.ts` (see Integration Points below)

**`handleClearAll()` (lines 122–125)** — Clear all errors

- **Description**: Wipe the error buffer and refresh UI.
- **Implementation**:
  ```typescript
  const handleClearAll = () => {
    clearErrors();
    refreshErrors();
  };
  ```
- **Side Effects**: Destructive; errors cannot be recovered

**`toggleExpanded(id: string)` (lines 127–137)** — Toggle stack trace visibility

- **Purpose**: Show/hide detailed stack trace for an error entry
- **Implementation**: Maintains Set of expanded IDs; toggles membership

#### Formatting Helpers

**`formatTimestamp(date: Date): string` (lines 139–145)**

- **Description**: Format error timestamp for display.
- **Implementation**: `new Date(date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })`
- **Output Examples**: "14:32:05", "02:15:47"

**`getSourceBadgeVariant(source: ErrorEntry["source"]): BadgeVariant` (lines 147–160)**

- **Description**: Map error source to badge color variant.
- **Mapping**:
  - `"error-boundary"` → `"destructive"` (red)
  - `"unhandled-rejection"` → `"default"` (muted)
  - `"console-error"` → `"secondary"` (blue)
  - default → `"outline"`

**`getSourceLabel(source: ErrorEntry["source"]): string` (lines 162–173)**

- **Description**: Get human-readable label for error source.
- **Mapping**:
  - `"error-boundary"` → "Error Boundary"
  - `"unhandled-rejection"` → "Unhandled Rejection"
  - `"console-error"` → "Console Error"

#### Render

**Error Reporting Toggle Section (lines 202–218)**

- Switch component bound to `errorReporting` state
- Calls `handleToggleReporting()` on change
- Toggles between on/off with i18n labels

**Error List Section (lines 220–319)**

- **Header**: Shows error count and "Clear Errors" button
- **Empty State**: "No errors" message
- **Error Entries**: Collapsible list with:
  - Chevron icon (indicates expandability)
  - Error message (truncated on one line)
  - Timestamp and source badge
  - Expandable content: stack trace (monospace, scrollable, max-height 192px)
  - Optional componentStack (for React error boundary errors)

---

### Settings Sidebar Integration

**`SettingsSidebar.tsx` (Client Component)**

- **Description**: Navigation sidebar for settings sections. Displays error count badge on "error-log" button.
- **Location**: `src/components/settings/SettingsSidebar.tsx:1-86`
- **Component Type**: Client Component
- **State Management**:
  - `errorCount: number` — Current error buffer count (refreshed every 3 seconds)
- **Polling**:
  - Hook calls `refreshCount()` on mount and every 3 seconds via `setInterval()`
  - Uses `getErrorCount()` to fetch current count from buffer

**Badge Display (lines 72–79)**

- Renders on error-log button only if `section.id === "error-log" && errorCount > 0`
- Uses destructive red badge with count
- Provides quick visual indicator that errors exist

---

### User Settings Model

**`userSettings.model.ts`**

- **Description**: Type definitions for user settings including error reporting flag.
- **Location**: `src/models/userSettings.model.ts:1-67`

**`DeveloperSettings` (interface)**

- **Location**: Lines 25–36
- **Properties**:
  - `debugLogging: boolean` — Enable debug logging
  - `logCategories: { scheduler: boolean; runner: boolean; automationLogger: boolean }` — Log category toggles
  - `allowedDevOrigins?: string` — CORS origins for dev
  - `errorReporting?: boolean` — Enable error capture (default: true in dev, false in prod)
- **Default Values** (in ErrorLogSettings.tsx):
  - `errorReporting: process.env.NODE_ENV === "development"` (true in dev, false in prod)

**`UserSettingsData` (interface)**

- **Location**: Lines 38–42
- **Includes**: `ai`, `display`, `developer` settings

---

## Dependencies

### Internal Dependencies

#### Libraries Imported

- `React` hooks: `useEffect`, `useState`, `useCallback`
- `@/i18n` — Translation system (`useTranslations()`, `t()`, locale formatter exports)
- `@/lib/error-reporter` — Core error reporter functions
- `@/lib/utils` — `cn()` utility for className merging (shadcn pattern)
- `@/actions/userSettings.actions` — Server actions for reading/writing user settings
- `@/models/userSettings.model` — Type definitions for settings
- **UI Components** (shadcn):
  - `Switch` — Toggle control
  - `Label` — Form label
  - `Button` — Button control
  - `Badge` — Status badge
  - `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` — Expandable sections
  - `use-toast` — Toast notification system
- **Icons** (lucide-react): `ChevronDown`, `ChevronRight`, `Loader2`, `Trash2`, `AlertTriangle`, `Bot`, `Bug`, `Key`, `Palette`

#### Module-Level State

- `buffer: ErrorEntry[]` — Shared in-memory error ring buffer (module-scoped variable)
- `initialized: boolean` — Guard flag for initClientErrorCapture (module-scoped)

---

### External Dependencies

- **Next.js 15**: Error boundary file convention (error.tsx, global-error.tsx)
- **React 18+**: Error boundary component pattern
- **Browser APIs**:
  - `window.addEventListener()` — Global event listener registration
  - `Date.now()` — Timestamp generation
  - `Math.random()` — ID randomization

---

## Data Flow & Integration

### Error Capture Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Client Application                                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ (error thrown)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Error Boundary (error.tsx or global-error.tsx)            │
│  - Catches synchronous React render errors                  │
│  - Props: error, reset                                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  useEffect() in Error Boundary                              │
│  - Extracts: message, stack, componentStack                 │
│  - Calls reportError(ErrorEntry)                            │
│  - Source: "error-boundary"                                 │
└─────────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
   ┌────────────────────┐  ┌────────────────────────────┐
   │  Ring Buffer       │  │  Unhandled Rejection       │
   │  (reportError)     │  │  Listener                  │
   │                    │  │ (initClientErrorCapture)   │
   │  - Max 100 entries │  │                            │
   │  - Newest first    │  │ - Async error paths        │
   │  - In-memory only  │  │ - Promise rejections       │
   └────────────────────┘  └────────────────────────────┘
              │                       │
              └───────────┬───────────┘
                          │
                          ▼
            ┌──────────────────────────────┐
            │  ErrorLogSettings Component   │
            │  - Polls every 3 seconds      │
            │  - getErrors() → display      │
            │  - clearErrors() → wipe       │
            └──────────────────────────────┘
                          │
                          ▼
            ┌──────────────────────────────┐
            │  SettingsSidebar Component    │
            │  - Shows error count badge    │
            │  - Polls every 3 seconds      │
            │  - getErrorCount() → count    │
            └──────────────────────────────┘
```

### Settings Control Flow

```
┌─────────────────────────────────────┐
│  ErrorLogSettings Toggle            │
│  (errorReporting state)             │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  handleToggleReporting(checked)      │
│  1. Optimistic UI update            │
│  2. Fetch current settings           │
│  3. Merge new errorReporting value   │
│  4. Call updateUserSettings()        │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  userSettings.actions.ts            │
│  updateUserSettings(data)           │
│  - Server action                    │
│  - Writes to Prisma DB              │
│  - Returns ActionResult<>           │
└─────────────────────────────────────┘
              │
         ┌────┴────┐
         │          │
    Success    Failure
         │          │
         ▼          ▼
    ┌────────┐  ┌──────────────┐
    │ Toast  │  │ Revert state │
    │ success│  │ Show error   │
    └────────┘  │ toast        │
                └──────────────┘
```

### Initialization Sequence

```
1. Page Load
   ↓
2. Root Layout mounts (server-side render, then hydrate)
   ↓
3. Client-side hydration begins
   ↓
4. Component tree renders (triggers useEffect hooks)
   ↓
5. ErrorLogSettings / SettingsSidebar useEffects trigger
   ↓
6. initClientErrorCapture() called (should be explicit in layout)
   ↓
7. Global error listeners attached:
   - window.addEventListener("unhandledrejection", ...)
   ↓
8. Error capture active (dev mode only)
   ↓
9. User navigates or new unhandled promise rejection occurs
   ↓
10. Event listener fires → reportError() → buffer updated
    ↓
11. Components poll every 3 seconds: getErrors() / getErrorCount()
    ↓
12. UI updates with latest error list and count
```

---

## Key Design Decisions

### Ring Buffer (Circular Buffer)

- **Why**: Prevents unbounded memory growth in long-running SPAs
- **Max Size**: 100 entries (configurable constant)
- **Eviction Strategy**: FIFO (oldest entries removed first when max reached)
- **Trade-off**: Old errors may be lost if the buffer fills up; acceptable for development logging

### In-Memory Only

- **Why**: Simplicity and minimal performance impact
- **No persistence**: Errors lost on page reload (intentional for dev-only use)
- **No server writes**: No network overhead
- **Future enhancement**: Could add IndexedDB persistence or server-side collection

### Development Mode Only

- **Why**: Error reporting adds overhead and is not needed in production
- **Guard**: `process.env.NODE_ENV === "development"` throughout codebase
- **Safety**: No error-reporter.ts code runs in production builds

### 3-Second Polling

- **Why**: Balances real-time visibility with CPU efficiency
- **Interval**: Hard-coded in ErrorLogSettings and SettingsSidebar
- **Trade-off**: 3-second delay between error capture and UI update
- **Alternative**: Could use callback/subscription pattern for instant updates (future)

### Separate Global-Error Boundary

- **Why**: Errors in error.tsx should not prevent the fallback from rendering
- **Safety**: global-error.tsx does NOT call reportError() to avoid cascading failures
- **Trade-off**: Layout errors are not captured in buffer

---

## Integration Points with Existing Architecture

### 1. Next.js App Router Error Boundaries

- **error.tsx** (segment boundary): Calls `reportError()` via useEffect
- **global-error.tsx** (root boundary): Does NOT call reportError (safety)
- Pattern: Conditional capture only in dev mode

### 2. User Settings System

- **File**: `src/actions/userSettings.actions.ts`
- **Integration**: ErrorLogSettings reads/writes `errorReporting` flag
- **Persistence**: Prisma database stores `UserSettings.settings.developer.errorReporting`
- **Sync**: On every toggle, component calls `updateUserSettings()` and waits for response

### 3. i18n Translation System

- **Dependency**: `@/i18n` for `useTranslations()`
- **Usage**: All error log UI text uses translation keys (e.g., `t("settings.errorLog")`)
- **Keys** (inferred from code; must be added to dictionaries):
  - `settings.errorLog` — Section heading
  - `settings.errorLogDesc` — Section description
  - `settings.errorReporting` — Toggle label
  - `settings.errorReportingDesc` — Toggle help text
  - `settings.loadingSettings` — Loading state
  - `settings.errorTimestamp` — Timestamp label
  - `settings.clearErrors` — Clear button label
  - `settings.errorLogEmpty` — Empty state message
  - `settings.saved` — Success toast
  - `settings.error` — Error toast heading
  - `settings.saveFailed` — Error toast message
  - `common.error` — Generic error heading (used in error.tsx)
  - `settings.errorTryAgain` — Retry button label (used in error.tsx)

### 4. UI Component Library (shadcn)

- Uses standard shadcn components: Switch, Badge, Button, Collapsible, etc.
- Theme-aware styling via Tailwind CSS
- Consistent with project design system

### 5. Toast Notification System

- **Library**: `src/components/ui/use-toast`
- **Usage**: Success/failure feedback on toggle save
- **Variants**: `"success"` (implicit), `"destructive"`

### 6. Settings Navigation

- SettingsSidebar displays error count badge (red destructive variant)
- Dynamically updates every 3 seconds
- Error-log section is one of 5 settings sections (ai-provider, api-keys, appearance, developer, error-log)

---

## Ring Buffer Implementation Details

### Memory Management

```
MAX_ENTRIES = 100

Initial state:
  buffer = []

After 1st error:
  buffer.length = 1
  buffer[0] = { id: 'err_1234_abc', ... }

After 100th error:
  buffer.length = 100
  buffer[99] = newest error

After 101st error (overflow):
  buffer = buffer.slice(1)  // Remove oldest (index 0)
  buffer.push(newEntry)     // Add to end
  buffer.length = 100
  buffer[99] = newest error
```

### Ordering Guarantees

- **Internal buffer**: Oldest at index 0, newest at index 99
- **getErrors() output**: Newest first (reversed order)
- **User-facing display**: Errors displayed newest-first in UI

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| reportError() (typical) | O(1) | Push to array |
| reportError() (overflow) | O(MAX_ENTRIES) | Slice and push |
| getErrors() | O(n) | Spread + reverse |
| clearErrors() | O(1) | Array reassignment |
| getErrorCount() | O(1) | Read length property |
| generateErrorId() | O(1) | Timestamp + random string |

---

## Error Source Attribution

| Source | Triggered By | Example |
|--------|---|---|
| `"error-boundary"` | React error in render method or lifecycle hook | Component throws during render |
| `"unhandled-rejection"` | Promise rejection not caught by `.catch()` | `fetch().then(...)` without error handling |
| `"console-error"` | (Future) Explicit `console.error()` call | (Not yet implemented) |

---

## Testing Recommendations

### Unit Tests (jest)

- `getErrors()` returns newest-first order
- `reportError()` enforces MAX_ENTRIES cap
- `clearErrors()` empties buffer
- `generateErrorId()` produces unique IDs
- Ring buffer overflow behavior (101st entry evicts oldest)

### Component Tests (React Testing Library)

- ErrorLogSettings renders toggle and error list
- Toggle saves to database and shows success/error toast
- Error entries expand/collapse on click
- Timestamp formatting works correctly
- Badge color matches error source
- SettingsSidebar shows error count badge when count > 0

### Integration Tests

- Error boundary in error.tsx calls reportError()
- initClientErrorCapture() attaches global listener
- Unhandled promise rejection captured and stored
- Settings toggle persists to Prisma and syncs state

### E2E Tests (Playwright)

- Navigate to settings, toggle error reporting, verify save
- Trigger error in app, verify error appears in log
- Clear errors, verify buffer emptied
- Reload page, verify errors lost (in-memory only)

---

## Future Enhancement Opportunities

1. **Error Filtering**: Filter errors by source, time range, or message search
2. **Local Persistence**: IndexedDB storage for error history across page reloads
3. **Server Synchronization**: Send errors to server API for aggregation and analytics
4. **Error Grouping**: Group identical errors by stack trace hash
5. **Console Error Capture**: Intercept `console.error()` and `console.warn()`
6. **React DevTools Integration**: Export errors in format compatible with React DevTools
7. **Export**: Download error log as JSON or CSV
8. **Analytics**: Show error frequency graph or timeline
9. **Callback Subscription**: Real-time event emitter instead of polling for UI performance

---

## Mermaid Code-Level Diagram

```mermaid
---
title: Error Reporting System - Code Architecture
---
classDiagram
    namespace ErrorReporter {
        class errorReporterModule {
            <<module>>
            +reportError(entry: ErrorEntry): void
            +getErrors(): ErrorEntry[]
            +clearErrors(): void
            +getErrorCount(): number
            +generateErrorId(): string
            +initClientErrorCapture(): void
        }

        class ErrorEntry {
            <<interface>>
            +id: string
            +timestamp: Date
            +message: string
            +stack?: string
            +componentStack?: string
            +source: 'error-boundary'|'unhandled-rejection'|'console-error'
        }

        class RingBuffer {
            <<internal>>
            -buffer: ErrorEntry[]
            -MAX_ENTRIES: 100
            -initialized: boolean
        }
    }

    namespace ErrorBoundaries {
        class ErrorBoundary {
            <<component>>
            +error: Error & {digest?}
            +reset: () => void
            +useEffect() captures error
        }

        class GlobalErrorBoundary {
            <<component>>
            +error: Error & {digest?}
            +reset: () => void
            -does NOT capture to buffer
        }
    }

    namespace SettingsUI {
        class ErrorLogSettings {
            <<component>>
            -errors: ErrorEntry[]
            -errorReporting: boolean
            -expandedIds: Set~string~
            +handleToggleReporting(checked)
            +handleClearAll()
            +toggleExpanded(id)
            +refreshErrors()
        }

        class SettingsSidebar {
            <<component>>
            -errorCount: number
            +refreshCount()
        }
    }

    namespace Models {
        class UserSettings {
            <<interface>>
            +userId: string
            +settings: UserSettingsData
        }

        class DeveloperSettings {
            <<interface>>
            +debugLogging: boolean
            +logCategories: LogCategories
            +errorReporting?: boolean
        }
    }

    namespace Actions {
        class userSettingsActions {
            <<module>>
            +getUserSettings(): ActionResult
            +updateUserSettings(data): ActionResult
        }
    }

    %% Relationships
    errorReporterModule --> ErrorEntry : uses
    errorReporterModule --> RingBuffer : manages

    ErrorBoundary --> errorReporterModule : calls reportError()
    ErrorBoundary --> ErrorEntry : creates

    GlobalErrorBoundary -.->|does NOT call| errorReporterModule

    ErrorLogSettings --> errorReporterModule : calls getErrors(), clearErrors()
    ErrorLogSettings --> UserSettings : reads/writes
    ErrorLogSettings --> userSettingsActions : calls updateUserSettings()

    SettingsSidebar --> errorReporterModule : calls getErrorCount()
    SettingsSidebar --> ErrorLogSettings : siblings

    userSettingsActions --> DeveloperSettings : persists
    DeveloperSettings --> ErrorEntry : via errorReporting flag

    initClientErrorCapture -.->|attaches listener| errorReporterModule
```

---

## Related Files & Documentation

- **Connector Architecture**: `docs/architecture/c4-code-connector.md` — ACL pattern reference
- **Component-Level Docs**: `docs/architecture/c4-component-*.md` — Higher-level component synthesis
- **i18n System**: `src/i18n/README.md` — Translation and formatting patterns
- **User Settings Actions**: `src/actions/userSettings.actions.ts` — Server-side settings persistence
- **Design System**: `src/components/ui/` — shadcn UI component library

