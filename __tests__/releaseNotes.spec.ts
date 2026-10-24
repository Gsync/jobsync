import { buildReleaseNotes } from "../scripts/release-notes.mjs";

const f = (fileName: string, content: string | null) => ({ fileName, content });

describe("buildReleaseNotes", () => {
  it("renders sections in fixed order, sorted by slug", () => {
    expect(
      buildReleaseNotes([
        f("b.fix.md", "Fix B"),
        f("c.feat.md", "Add C"),
        f("a.feat.md", "Add A"),
        f("z.breaking.md", "Break Z"),
        f("o.other.md", "Other O"),
      ]),
    ).toEqual({
      ok: true,
      notes:
        "### Breaking Changes\n\n* Break Z\n\n### Features\n\n* Add A\n* Add C\n\n### Bug Fixes\n\n* Fix B\n\n### Other Changes\n\n* Other O\n",
    });
  });

  it("ignores README.md and dotfiles", () => {
    expect(
      buildReleaseNotes([
        f("README.md", "# Changes"),
        f(".DS_Store", "junk"),
        f("a.feat.md", "Add A"),
      ]),
    ).toEqual({ ok: true, notes: "### Features\n\n* Add A\n" });
  });

  it("fails when there are no fragments", () => {
    for (const files of [[], [f("README.md", "# Changes")]]) {
      const result = buildReleaseNotes(files);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.errors[0]).toContain("No release notes");
      expect(result.errors[0]).toContain("changes/");
    }
  });

  it("names every malformed file", () => {
    const names = [
      "Contacts.feat.md",
      "contacts.feature.md",
      "contacts-feat.md",
      "contacts.md",
      "contacts.feat.txt",
    ];
    const result = buildReleaseNotes([
      ...names.map((name) => f(name, "Add contacts")),
      f("contacts", null),
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(6);
    [...names, "contacts"].forEach((name, i) => {
      expect(result.errors[i]).toContain(name);
      expect(result.errors[i]).toContain("<slug>.<type>.md");
    });
  });

  it("rejects a blank fragment", () => {
    const result = buildReleaseNotes([f("a.feat.md", "  \r\n ")]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("a.feat.md");
    expect(result.errors[0]).toContain("empty");
  });

  it("strips a leading bullet marker", () => {
    for (const content of ["- Add A", "* Add A"]) {
      expect(buildReleaseNotes([f("a.feat.md", content)])).toEqual({
        ok: true,
        notes: "### Features\n\n* Add A\n",
      });
    }
  });

  it("normalises CRLF and wrapped lines", () => {
    expect(
      buildReleaseNotes([f("a.feat.md", "Add A\r\nacross lines\r\n\r\n")]),
    ).toEqual({ ok: true, notes: "### Features\n\n* Add A across lines\n" });
  });

  it("reports all errors at once", () => {
    const result = buildReleaseNotes([
      f("contacts.md", "Add contacts"),
      f("a.feat.md", ""),
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(2);
  });
});
