# ADR-003: Self-Healing Prisma Engines for NixOS

## Status
Accepted

## Context

JobSync is developed on NixOS, which uses an immutable, content-addressed store at `/nix/store`. Binaries installed via Nix are patched at install time with hard-coded interpreter paths (`ld-linux-x86-64.so.2`) pointing into `/nix/store`. Binaries downloaded from the internet at runtime — such as the Prisma query engine and schema engine — carry glibc interpreter paths that do not exist on a NixOS host, causing `ENOENT` or `Exec format error` on execution.

Prisma downloads its engines into the project's `node_modules/.prisma/` directory during `prisma generate`. On NixOS these binaries are unusable without patching. The `devenv` approach (Option A in `CLAUDE.md`) handles this via a writable Nix store with `pkgs.prisma-engines`, but this is not available in all environments (VMs, CI containers with read-only `/nix/store`).

A secondary problem is that `/tmp` is ephemeral: it is cleared on reboot and by `systemd-tmpfiles`. Any patched engines cached there are lost after each reboot.

## Decision

Introduce a self-healing engine bootstrap in `scripts/env.sh`, sourced by every helper script (`dev.sh`, `build.sh`, `test.sh`, etc.). On each invocation it checks for the presence of `/tmp/prisma-engines/libquery_engine.so.node`. If absent, it delegates to `scripts/setup-prisma-engines.sh`, which:

1. Downloads the Debian OpenSSL 3.x engine binaries for a pinned Prisma commit from `binaries.prisma.sh`.
2. Decompresses them into `/tmp/prisma-engines/`.
3. Locates `patchelf`, `glibc`, and `openssl` from `/nix/store` via glob patterns.
4. Patches the ELF interpreter and rpath of both binaries to point at the located Nix store paths.
5. Verifies the result with `ldd`.

Environment variables `PRISMA_QUERY_ENGINE_LIBRARY` and `PRISMA_SCHEMA_ENGINE_BINARY` are exported to direct Prisma to the patched copies instead of those in `node_modules`.

The engine commit SHA is pinned in `setup-prisma-engines.sh` and must be updated when the Prisma version changes.

## Consequences

### Positive
- Every script invocation is self-healing: a reboot does not break the development workflow.
- No manual setup step is required after cloning the repository on NixOS.
- Works in read-only Nix store environments (VMs, containers) where `devenv` cannot be used.

### Negative
- First run after a reboot requires a network download (~20 MB of engine binaries).
- The pinned commit SHA in `setup-prisma-engines.sh` must be kept in sync with the `prisma` package version in `package.json`; drift causes subtle runtime errors.
- `patchelf` must be present in `/nix/store`; the script exits with an error if it cannot be located, with no automatic fallback.

### Neutral
- `/tmp/prisma-engines/` is used rather than a project-local directory to avoid accidentally committing patched binaries.
- The `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` flag suppresses checksum validation warnings that arise because the binaries were downloaded outside Prisma's normal bootstrap path.
