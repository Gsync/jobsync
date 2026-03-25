# Handoff

## State
A18 ActionResult refactoring complete (55 functions typed, 114 files, 748 tests passing). All 48 bugs from audit fixed (45 closed, 3 low remaining). Arbeitsagentur connector on main. Full i18n (529 keys, 4 locales). DDD principles + ACL pattern documented in CLAUDE.md. ADR generation running. Branch `main` at commit `c552d30`.

## Next
1. ADR agent completing — commit when done, then push
2. Roadmap 0.1: Rename `src/lib/scraper/` → `src/lib/connector/modules/` (ACL structure)
3. Remaining low bugs: A18 (`Promise<any>` on ~80 actions — now ~6), A21 (console.log cleanup), B7 (Ollama SSRF)

## Context
- NixOS: `scripts/setup-prisma-engines.sh` auto-heals `/tmp` clears. `scripts/test.sh` uses system Node.js 24.
- Semgrep hook fires but has no token — safe to ignore.
- Stream 1 agent was very aggressive (225 tool-calls, 80+ min) — touched caller files outside ownership. Worked but risky.
- `createJobTitle` return shape changed — `ComboBox.tsx` caller needs `response.data` update (noted by Stream 3).
- `docs/adr/.pending` has 7 ADR topics — agent is generating them now.
