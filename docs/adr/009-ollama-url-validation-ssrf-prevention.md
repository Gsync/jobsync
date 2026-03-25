# ADR-009: URL Format Validation for Ollama SSRF Prevention

## Status
Accepted

## Context

The Ollama integration allows users to configure a custom Ollama server URL, stored as the API "key" in the `ApiKey` model. This URL is used by:

1. **Verify endpoint** (`/api/settings/api-keys/verify`) — tests connectivity by fetching `${url}/api/tags`
2. **Proxy routes** (`/api/ai/ollama/{tags,ps,generate}`) — proxy requests via `getOllamaBaseUrl()`

Bug B7 identified that the verify endpoint performed no URL validation beyond stripping trailing slashes. A user could supply `file:///etc/passwd`, `gopher://internal-service`, or `http://169.254.169.254/metadata` as the "Ollama URL", and the server would fetch it — a classic Server-Side Request Forgery (SSRF) vector.

Three fix strategies were considered:

1. **Allowlist** (localhost/127.0.0.1 only): Too restrictive — self-hosted users commonly run Ollama on LAN IPs (e.g., `192.168.x.x:11434`).
2. **Environment-only** (ignore user URL, always use `OLLAMA_BASE_URL`): Removes user configurability, breaks the settings UI workflow.
3. **URL format validation + defense-in-depth**: Validate protocol and format at multiple checkpoints while preserving flexibility.

## Decision

Implement URL format validation with defense-in-depth at three layers:

1. **Zod schema** (`apiKey.schema.ts`): `.superRefine()` rejects invalid Ollama URLs at form submission time, preventing malicious URLs from reaching the database.
2. **Verify route** (`api-keys/verify/route.ts`): Validates before fetch, adds `AbortSignal.timeout(5000)`, and removes URL echo from error messages (information disclosure fix).
3. **`getOllamaBaseUrl()`** (`apiKey.actions.ts`): Validates stored URL after database retrieval, falls back to default on failure. Catches URLs that bypassed schema validation (e.g., direct DB manipulation).

The validation function `validateOllamaUrl()` in `src/lib/url-validation.ts` enforces:
- URL must be parseable by `new URL()`
- Protocol must be `http:` or `https:` (blocks `file:`, `ftp:`, `gopher:`, `javascript:`, `data:`)
- No embedded credentials (`user:pass@host`)

It intentionally does **not** restrict hostnames or IP ranges, preserving the self-hosted flexibility to point at any LAN or remote Ollama instance.

## Consequences

### Positive
- **SSRF vector eliminated**: Non-HTTP protocols and malformed URLs are rejected before any network request.
- **Defense-in-depth**: Three independent validation points mean a bypass at one layer is caught by another.
- **Self-hosted flexibility preserved**: Users can configure any HTTP/HTTPS Ollama endpoint (localhost, LAN IP, remote server).
- **Information disclosure fixed**: Error messages no longer echo back the user-supplied URL.
- **Timeout added**: The verify fetch now has a 5-second timeout, preventing hang on unreachable hosts.

### Negative
- **Does not block private IP SSRF**: A user can still target internal HTTP services (e.g., `http://192.168.1.1:9200`). For a self-hosted application where the user controls the server, this is an acceptable trust boundary — the user already has server access.
- **No DNS rebinding protection**: A hostname that resolves to a private IP at fetch time is not caught. This is a known limitation shared with most URL validation approaches.

### Neutral
- The existing ESCO URI validation pattern (`startsWith("http://data.europa.eu/esco/")`) in `api/esco/details/route.ts` is more restrictive because it validates a specific external API. The Ollama pattern is intentionally broader because the target host is user-configured.

## Related Decisions
- ADR-004: ACL Connector/Module Architecture — security boundary pattern for external integrations
