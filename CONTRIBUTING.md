# Contributing to JobSync

Thank you for your interest in contributing to JobSync! This document outlines the process and guidelines for contributing to this project. Please read it carefully before submitting any contributions.

## Table of Contents

- [Contributing to JobSync](#contributing-to-jobsync)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Local Setup](#local-setup)
  - [How to Contribute](#how-to-contribute)
  - [Development Workflow](#development-workflow)
  - [Branch Strategy](#branch-strategy)
    - [Naming Convention](#naming-convention)
  - [Commit Messages](#commit-messages)
  - [Pull Request Guidelines](#pull-request-guidelines)
    - [Before Opening a PR](#before-opening-a-pr)
    - [Keep PRs Small and Focused](#keep-prs-small-and-focused)
    - [PR Checklist](#pr-checklist)
    - [PR Description Template](#pr-description-template)
    - [Review Process](#review-process)
  - [Code Style](#code-style)
  - [Testing](#testing)
    - [Unit Tests (Jest)](#unit-tests-jest)
    - [E2E Tests (Playwright)](#e2e-tests-playwright)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Questions](#questions)

---

## Code of Conduct

This project follows a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold these standards. Please report unacceptable behavior to the project maintainers.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Git

### Local Setup

1. **Fork** the repository on GitHub.
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/jobsync.git
   cd jobsync
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/Gsync/jobsync.git
   ```
4. **Install dependencies:**
   ```bash
   npm install
   ```
5. **Copy the environment file and fill in your values:**
   ```bash
   cp .env.example .env
   ```
6. **Set up the database:**
   ```bash
   npx prisma migrate dev
   ```
7. **Start the development server:**
   ```bash
   npm run dev
   ```

---

## How to Contribute

There are many ways to contribute:

- **Bug fixes** — Find something broken? Fix it and open a PR.
- **Features** — Check the [open issues](https://github.com/Gsync/jobsync/issues) for ideas, or propose a new one first.
- **Documentation** — Improve README, docs, or inline code comments.
- **Tests** — Add missing unit or e2e tests.
- **Refactoring** — Improve code quality without changing behavior.

For significant changes or new features, **open an issue first** to discuss your approach before writing code. This avoids duplicated effort and ensures alignment with the project's direction.

---

## Development Workflow

1. **Sync your fork** with the latest `dev` branch before starting work:
   ```bash
   git fetch upstream
   git checkout dev
   git merge upstream/dev
   ```
2. **Create a focused branch** from `dev` (see [Branch Strategy](#branch-strategy)):
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Make your changes, keeping the scope narrow and focused.
4. **Run lint and tests** to verify everything passes (see [Testing](#testing)).
5. Commit your changes following the [commit message conventions](#commit-messages).
6. Push your branch to your fork and open a Pull Request.

---

## Branch Strategy

> **Important:** All pull requests must target the `dev` branch, **never** `main`. The `main` branch is the stable release branch and is only updated by maintainers via versioned merges from `dev`.

### Naming Convention

Use one of these prefixes for your branch name:

| Prefix | Purpose |
|--------|---------|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `refactor/` | Code refactoring (no behavior change) |
| `test/` | Adding or improving tests |
| `chore/` | Build process, tooling, dependencies |

**Examples:**
```
feat/add-resume-export
fix/automation-rate-limit
docs/update-api-routes
refactor/ai-provider-cleanup
test/task-actions-coverage
```

---

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(optional scope): <short summary>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat(automations): add rate limiting for manual runs
fix(tasks): prevent deletion of tasks with linked activities
docs: update environment variable list in README
refactor(ai): extract preprocessing into dedicated module
test(job-actions): add coverage for edge cases
```

- Use the **imperative mood** in the summary ("add feature" not "added feature")
- Keep the summary under **72 characters**
- Reference relevant issues in the footer: `Closes #123`

---

## Pull Request Guidelines

### Before Opening a PR

Ensure the following checks pass **locally** before submitting:

```bash
# Lint — must produce no errors
npm run lint

# Unit tests — all must pass
npm run test

# (Optional) E2e tests
npm run test:e2e
```

A PR that fails lint or tests will **not be reviewed** until those issues are resolved.

### Keep PRs Small and Focused

Large PRs are difficult to review thoroughly and are more likely to introduce bugs. Follow these guidelines:

- **One concern per PR** — a single bug fix, a single feature, or a single refactor; not all three.
- **Aim for under 400 lines changed** (excluding generated files, migrations, and lock files).
- If your change is large by necessity, break it into a sequence of smaller PRs that each build on the previous one.
- Avoid bundling unrelated changes (e.g., fixing a bug while also reformatting unrelated files).

### PR Checklist

Before submitting, verify:

- [ ] Branch is based on `dev`, not `main`
- [ ] `npm run lint` passes with no errors
- [ ] `npm run test` passes with no failures
- [ ] PR is scoped to a single concern
- [ ] Changes are under ~400 lines (excluding generated/migration files)
- [ ] PR description explains **what** and **why**
- [ ] Relevant tests have been added or updated
- [ ] Documentation is updated if behavior changes
- [ ] `npx prisma generate` and a migration have been added for any schema changes

### PR Description Template

When opening a PR, use this structure:

```markdown
## Summary
A brief description of what this PR does and why.

## Changes
- List of specific changes made

## Related Issues
Closes #<issue-number>

## Testing
Describe how the change was tested.
```

### Review Process

- At least one maintainer approval is required to merge.
- Address all review comments before requesting re-review.
- Keep discussion respectful and constructive — see the [Code of Conduct](./CODE_OF_CONDUCT.md).
- Maintainers may request changes, squash commits, or close a PR that no longer aligns with the project's goals.

---

## Code Style

This project uses ESLint and TypeScript strict mode. All style rules are enforced via `npm run lint`.

Key conventions:

- **Imports:** Use `@/` absolute imports; group by external → internal → relative.
- **Naming:** PascalCase for components, camelCase for functions/variables, kebab-case for files.
- **Types:** All types live in `src/models/*.model.ts`; Zod schemas in `src/models/*.schema.ts`.
- **Server actions:** Always validate auth with `getCurrentUser()` and return via `handleError()`.
- **Database:** Run `npx prisma generate` then `npx prisma migrate dev` after any schema change.
- **Files over 200 lines:** Break into a directory with focused modules and a barrel `index.ts`.
- **Comments:** Minimal; explain "why" not "what"; no decorative separator comments.

---

## Testing

### Unit Tests (Jest)

```bash
npm run test               # Run all unit tests
npm run test:watch         # Watch mode
npm run test -- path/to/test.test.ts   # Single file
npm run test -- --testNamePattern="test name"  # Single test
```

Tests live in `__tests__/` and should be co-located where possible. Mock external dependencies (AI providers, database). Focus on server actions and component behavior.

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

E2E tests live in `e2e/`. These require a running dev server.

---

## Reporting Bugs

Before filing a bug report, check if it has already been reported in the [issue tracker](https://github.com/Gsync/jobsync/issues).

When opening a bug report, include:

1. **Description** — clear summary of the problem.
2. **Steps to reproduce** — step-by-step instructions.
3. **Expected vs. actual behavior.**
4. **Environment** — OS, Node.js version, browser (if applicable).
5. **Screenshots or logs** — if relevant.

---

## Suggesting Features

Open a [feature request issue](https://github.com/Gsync/jobsync/issues/new) with:

1. **Problem statement** — what problem does this solve or what need does it address?
2. **Proposed solution** — your idea for how to implement it.
3. **Alternatives considered** — other approaches you thought of.

Feature requests are discussed before any implementation work begins.

---

## Questions

If you have a question that isn't answered here, feel free to open a [discussion](https://github.com/Gsync/jobsync/discussions) or an issue tagged `question`.

Thank you for helping make JobSync better!
