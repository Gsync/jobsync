{ pkgs, lib, config, ... }:

{
  # Metadata
  name = "jobsync";

  # ─── Languages & Runtimes ────────────────────────────────────────
  languages.javascript = {
    enable = true;
    bun = {
      enable = true;
      # Uses nixpkgs bun — no manual patching needed on NixOS
    };
  };

  languages.typescript.enable = true;

  # Node.js for Jest (bun has compatibility issues with Jest/stack-utils)
  languages.javascript.nodejs = {
    enable = true;
    package = pkgs.nodejs_22;
  };

  # Python for future CareerBERT / ML work
  languages.python = {
    enable = true;
    package = pkgs.python313;
  };

  # ─── System Packages ─────────────────────────────────────────────
  packages = with pkgs; [
    # Database
    openssl
    prisma-engines

    # Build tools
    jq
    curl
    wget

    # Git & GitHub
    git
    gh

    # Testing
    chromium  # For Playwright e2e tests
  ];

  # ─── Environment Variables ───────────────────────────────────────
  env = {
    # Prisma — use nixpkgs prisma-engines (no manual patching!)
    PRISMA_QUERY_ENGINE_LIBRARY = "${pkgs.prisma-engines}/lib/libquery_engine.node";
    PRISMA_QUERY_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/query-engine";
    PRISMA_SCHEMA_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/schema-engine";
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1";

    # Playwright — use system Chromium
    PLAYWRIGHT_BROWSERS_PATH = "${pkgs.chromium}/bin";
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

    # App defaults (can be overridden by .env)
    DATABASE_URL = "file:./prisma/dev.db";
    AUTH_TRUST_HOST = "true";
  };

  # ─── Scripts ─────────────────────────────────────────────────────
  scripts = {
    dev.exec = "bun run dev";
    build.exec = "bun run build";
    test.exec = "npx jest $@";
    lint.exec = "bun run lint";
    db-generate.exec = "bunx prisma generate";
    db-migrate.exec = "bunx prisma migrate dev";
    db-studio.exec = "bunx prisma studio";
    i18n-extract.exec = "bun run i18n:extract";
    i18n-compile.exec = "bun run i18n:compile";
  };

  # ─── Pre-commit Hooks (optional) ────────────────────────────────
  pre-commit.hooks = {
    eslint = {
      enable = true;
      entry = "bun run lint";
      pass_filenames = false;
    };
    # Type checking on staged files
    typescript = {
      enable = true;
      entry = "bunx tsc --noEmit";
      pass_filenames = false;
    };
  };

  # ─── Process Manager (devenv up) ────────────────────────────────
  processes = {
    next-dev.exec = "bun run dev";
  };

  # ─── Startup Message ────────────────────────────────────────────
  enterShell = ''
    echo ""
    echo "🚀 JobSync Development Environment"
    echo "   Node.js:  $(node --version)"
    echo "   Bun:      $(bun --version)"
    echo "   Prisma:   engines from nixpkgs"
    echo ""
    echo "   Commands:"
    echo "     dev          — Start Next.js dev server (port 3737)"
    echo "     build        — Production build"
    echo "     test         — Run Jest tests"
    echo "     lint         — ESLint"
    echo "     db-generate  — Generate Prisma client"
    echo "     db-migrate   — Run database migrations"
    echo "     db-studio    — Open Prisma Studio"
    echo "     devenv up    — Start all processes"
    echo ""
  '';
}
