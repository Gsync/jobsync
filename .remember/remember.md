# Handoff

## State
All 48 audit bugs FIXED (48/48). A18 ActionResult refactoring + Promise<any> typing complete. A21 Developer Settings with debug toggle live. B7 Ollama SSRF patched with defense-in-depth. 9 ADRs in docs/adr/. 808 tests passing. Full i18n (540+ keys, 4 locales). Branch `main` at latest push.

## Next
1. Roadmap 0.1: Rename `src/lib/scraper/` → `src/lib/connector/modules/` (ACL structure)
2. Remaining Low UI bugs (C7, C8, C10, C12, C16, C17, C18) were fixed in earlier sessions
3. Continue with Roadmap features (see docs/ROADMAP.md)

## Context
- NixOS: `scripts/setup-prisma-engines.sh` auto-heals `/tmp` clears. `scripts/test.sh` uses system Node.js 24.
- Semgrep hook fires but has no token — safe to ignore.
- User prefers wshobson agent-teams for parallel work (saved in memory).
- UI changes must consult ui-design agent first (saved in memory).
- `DEBUG_LOGGING` env var controls server-side debug logs (default: enabled). Developer Settings UI in /dashboard/settings.
- `validateOllamaUrl()` validates at Zod schema, verify route, and getOllamaBaseUrl() (defense-in-depth).
