// Renders wiki/ into the GitHub wiki repo. Run by .github/workflows/wiki.yml
// as: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/sync-wiki.mts
//
// Imports carry .ts extensions because Node's type stripping is ESM and needs
// explicit ones. tsconfig excludes scripts/, so tsc never sees these. Pass
// --dry-run to validate and print without cloning or pushing.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { parseWikiPage } from "../src/lib/wiki/parse.ts";
import { wikiIndexSchema, wikiPageSchema } from "../src/lib/wiki/schema.ts";
import {
  buildSidebar,
  rewriteWikiLinks,
  toWikiFileName,
} from "../src/lib/wiki/publish.ts";

const WIKI_DIR = path.join(process.cwd(), "wiki");
const INDEX = "index.md";
const DRY_RUN = process.argv.includes("--dry-run");

function listMarkdown(dir: string, prefix = ""): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return listMarkdown(path.join(dir, entry.name), rel);
    return entry.name.endsWith(".md") ? [rel] : [];
  });
}

function render(): { files: Map<string, string>; sidebar: string } {
  // sort(): readdirSync is unordered, and an unsorted render reorders the
  // published wiki commit for no reason (Locked Decision #12).
  const sources = listMarkdown(WIKI_DIR).sort();
  const errors: string[] = [];
  const files = new Map<string, string>();
  let indexBody = "";

  for (const rel of sources) {
    const raw = fs.readFileSync(path.join(WIKI_DIR, rel), "utf8");
    let parsed;
    try {
      parsed = parseWikiPage(raw);
    } catch (error) {
      errors.push(`${rel}: ${(error as Error).message}`);
      continue;
    }

    const schema = rel === INDEX ? wikiIndexSchema : wikiPageSchema;
    const result = schema.safeParse(parsed.frontmatter);
    if (!result.success) {
      errors.push(`${rel}:\n${z.prettifyError(result.error)}`);
      continue;
    }

    const body = rewriteWikiLinks(parsed.body, path.posix.dirname(rel));
    files.set(toWikiFileName(rel), body);
    if (rel === INDEX) indexBody = body;
  }

  if (errors.length > 0) {
    console.error(`Wiki validation failed (${errors.length}):\n\n${errors.join("\n\n")}`);
    process.exit(1);
  }

  return { files, sidebar: buildSidebar(indexBody) };
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function publish(files: Map<string, string>, sidebar: string): void {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.WIKI_TOKEN;
  if (!repository || !token) {
    console.error("GITHUB_REPOSITORY and WIKI_TOKEN must both be set.");
    process.exit(1);
  }

  const remote = `https://x-access-token:${token}@github.com/${repository}.wiki.git`;
  const checkout = fs.mkdtempSync(path.join(os.tmpdir(), "jobsync-wiki-"));
  // Never log `remote`: it carries the token.
  git(process.cwd(), "clone", "--depth", "1", remote, checkout);

  for (const name of fs.readdirSync(checkout)) {
    if (name === ".git") continue;
    fs.rmSync(path.join(checkout, name), { recursive: true, force: true });
  }
  for (const [name, body] of files) {
    fs.writeFileSync(path.join(checkout, name), body, "utf8");
  }
  fs.writeFileSync(path.join(checkout, "_Sidebar.md"), sidebar, "utf8");

  git(checkout, "add", "-A");
  if (git(checkout, "status", "--porcelain").trim() === "") {
    console.log("Wiki already up to date; nothing to push.");
    return;
  }

  git(checkout, "config", "user.name", "github-actions[bot]");
  git(
    checkout,
    "config",
    "user.email",
    "41898282+github-actions[bot]@users.noreply.github.com"
  );
  git(checkout, "commit", "-m", `docs(wiki): sync from ${process.env.GITHUB_SHA ?? "wiki/"}`);
  git(checkout, "push", "origin", "HEAD");
  console.log(`Published ${files.size} pages plus _Sidebar.md.`);
}

const { files, sidebar } = render();

if (DRY_RUN) {
  console.log(`Validated ${files.size} pages:\n`);
  for (const name of files.keys()) console.log(`  ${name}`);
  console.log(`\n_Sidebar.md:\n\n${sidebar}`);
} else {
  publish(files, sidebar);
}
