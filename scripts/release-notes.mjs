// Renders changes/ fragments as release notes; run by release.yml and `npm run release:notes`.
// Plain .mjs because the release jobs run Node 20, which has no type stripping.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const FRAGMENT_TYPES = ["breaking", "feat", "fix", "other"];

const HEADINGS = {
  breaking: "Breaking Changes",
  feat: "Features",
  fix: "Bug Fixes",
  other: "Other Changes",
};

const NAME_PATTERN = new RegExp(
  `^([a-z0-9][a-z0-9-]*)\\.(${FRAGMENT_TYPES.join("|")})\\.md$`,
);

/**
 * @param {{ fileName: string; content: string | null }[]} files
 * @returns {{ ok: true; notes: string } | { ok: false; errors: string[] }}
 */
export function buildReleaseNotes(files) {
  const errors = [];
  /** @type {{ slug: string; type: string; text: string }[]} */
  const fragments = [];

  for (const { fileName, content } of files) {
    if (fileName === "README.md" || fileName.startsWith(".")) continue;
    const match = NAME_PATTERN.exec(fileName);
    if (!match || content === null) {
      errors.push(
        `changes/${fileName}: expected a file named <slug>.<type>.md (slug lowercase kebab, type one of ${FRAGMENT_TYPES.join(", ")})`,
      );
      continue;
    }
    // A release body renders a single newline as a break, so join wrapped lines
    const text = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/^[-*]\s+/, "");
    if (!text) {
      errors.push(`changes/${fileName}: fragment is empty`);
      continue;
    }
    fragments.push({ slug: match[1], type: match[2], text });
  }

  if (errors.length > 0) return { ok: false, errors };
  if (fragments.length === 0) {
    return {
      ok: false,
      errors: [
        "No release notes: add a changes/<slug>.<type>.md fragment for each user-facing change (see changes/README.md)",
      ],
    };
  }

  const sections = FRAGMENT_TYPES.flatMap((type) => {
    const bullets = fragments
      .filter((fragment) => fragment.type === type)
      .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
      .map((fragment) => `* ${fragment.text}\n`);
    return bullets.length > 0
      ? [`### ${HEADINGS[type]}\n\n${bullets.join("")}`]
      : [];
  });
  return { ok: true, notes: sections.join("\n") };
}

function main() {
  let entries = [];
  try {
    entries = readdirSync("changes", { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const files = entries.map((entry) => ({
    fileName: entry.name,
    content: entry.isFile()
      ? readFileSync(join("changes", entry.name), "utf8")
      : null,
  }));
  const result = buildReleaseNotes(files);
  if (result.ok) {
    process.stdout.write(result.notes);
  } else {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
