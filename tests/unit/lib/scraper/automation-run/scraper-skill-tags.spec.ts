import { buildSkillTerms, matchSkillTags } from "@/lib/scraper/automation-run/skillTags";
import type { ResumeWithSections } from "@/lib/scraper/automation-run/types";

function makeResume(
  sections: Array<Array<{ id: string; label: string; order: number }>>,
): ResumeWithSections {
  return {
    id: "resume-1",
    title: "My Resume",
    ContactInfo: null,
    ResumeSections: sections.map((skills) => ({
      sectionType: "skills",
      skills: skills.map((s) => ({
        category: null,
        order: s.order,
        Tag: { id: s.id, label: s.label },
      })),
    })),
  } as unknown as ResumeWithSections;
}

const resume = makeResume([
  [
    { id: "t-react", label: "React", order: 0 },
    { id: "t-ts", label: "TypeScript", order: 1 },
    { id: "t-go", label: "Go", order: 2 },
    { id: "t-cpp", label: "C++", order: 3 },
    { id: "t-net", label: ".NET", order: 4 },
    { id: "t-ml", label: "Machine Learning", order: 5 },
  ],
]);

describe("buildSkillTerms", () => {
  it("returns one term per skill, ranked in resume order", () => {
    const terms = buildSkillTerms(resume);

    expect(terms.map((t) => t.tagId)).toEqual([
      "t-react",
      "t-ts",
      "t-go",
      "t-cpp",
      "t-net",
      "t-ml",
    ]);
    expect(terms.map((t) => t.rank)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("sorts each section by the skill order field, not array position", () => {
    const shuffled = makeResume([
      [
        { id: "t-b", label: "Beta", order: 1 },
        { id: "t-a", label: "Alpha", order: 0 },
      ],
    ]);

    expect(buildSkillTerms(shuffled).map((t) => t.tagId)).toEqual(["t-a", "t-b"]);
  });

  it("flattens multiple skills sections into one continuous rank", () => {
    const twoSections = makeResume([
      [{ id: "t-a", label: "Alpha", order: 0 }],
      [{ id: "t-b", label: "Beta", order: 0 }],
    ]);

    expect(buildSkillTerms(twoSections).map((t) => t.rank)).toEqual([0, 1]);
  });

  it("drops a duplicate label appearing in a second section", () => {
    const dupe = makeResume([
      [{ id: "t-a", label: "React", order: 0 }],
      [{ id: "t-b", label: "react", order: 0 }],
    ]);

    expect(buildSkillTerms(dupe).map((t) => t.tagId)).toEqual(["t-a"]);
  });

  it("strips a trailing parenthetical so the bare name is what matches", () => {
    const decorated = makeResume([
      [
        { id: "t-ng", label: "Angular (v10-14)", order: 0 },
        { id: "t-aws", label: "AWS (Lambda, S3, SNS)", order: 1 },
      ],
    ]);
    const terms = buildSkillTerms(decorated);

    expect(matchSkillTags("Engineer", "Angular and AWS shop", terms)).toEqual([
      "t-ng",
      "t-aws",
    ]);
    // The tag's own label is untouched — only the matcher is derived.
    expect(terms[0].label).toBe("Angular (v10-14)");
  });

  it("leaves a mid-label parenthetical and slash compounds alone", () => {
    const compound = makeResume([
      [
        { id: "t-cs", label: "C# / .NET", order: 0 },
        { id: "t-rn", label: "React (v18) Native", order: 1 },
      ],
    ]);
    const terms = buildSkillTerms(compound);

    expect(terms.map((t) => t.tagId)).toEqual(["t-cs", "t-rn"]);
    // Decision 12: compounds are not split, so a bare "C#" is not a hit.
    expect(matchSkillTags("Engineer", "A C# and React shop", terms)).toEqual([]);
  });

  it("drops a label that is nothing but a parenthetical", () => {
    const empty = makeResume([[{ id: "t-x", label: "(TBD)", order: 0 }]]);

    expect(buildSkillTerms(empty)).toEqual([]);
  });

  it("collapses two labels differing only inside the parenthetical", () => {
    const dupes = makeResume([
      [
        { id: "t-aws1", label: "AWS (Lambda, S3)", order: 0 },
        { id: "t-aws2", label: "AWS (SNS, SQS)", order: 1 },
      ],
    ]);

    expect(buildSkillTerms(dupes).map((t) => t.tagId)).toEqual(["t-aws1"]);
  });

  it("ignores non-skills sections", () => {
    const mixed = {
      ResumeSections: [{ sectionType: "experience", skills: [] }],
    } as unknown as ResumeWithSections;

    expect(buildSkillTerms(mixed)).toEqual([]);
  });
});

describe("matchSkillTags", () => {
  const terms = buildSkillTerms(resume);

  it("returns the tag ids the description mentions", () => {
    const ids = matchSkillTags(
      "Frontend Engineer",
      "<p>Build React components in TypeScript.</p>",
      terms,
    );

    expect(ids).toEqual(["t-react", "t-ts"]);
  });

  it("matches terms in the job title too", () => {
    expect(matchSkillTags("Go Engineer", "A great job", terms)).toEqual(["t-go"]);
  });

  it("does not match a short term inside a longer word", () => {
    expect(matchSkillTags("Engineer", "We are going places", terms)).toEqual([]);
  });

  it("matches punctuation-bearing skills without truncating them", () => {
    expect(matchSkillTags("Engineer", "Strong C++ background", terms)).toEqual([
      "t-cpp",
    ]);
  });

  it("matches a term that ends a sentence", () => {
    expect(matchSkillTags("Engineer", "We use Go.", terms)).toEqual(["t-go"]);
  });

  it("does not match a term against a longer dotted name", () => {
    const nodeResume = makeResume([[{ id: "t-node", label: "Node", order: 0 }]]);

    expect(
      matchSkillTags("Engineer", "Node.js services", buildSkillTerms(nodeResume)),
    ).toEqual([]);
  });

  it("does not match .NET inside ASP.NET", () => {
    expect(matchSkillTags("Engineer", "ASP.NET shop", terms)).toEqual([]);
  });

  it("matches a multi-word skill", () => {
    expect(matchSkillTags("Engineer", "machine learning at scale", terms)).toEqual([
      "t-ml",
    ]);
  });

  it("ranks by occurrence count, then by resume order on a tie", () => {
    const ids = matchSkillTags(
      "Engineer",
      "TypeScript, TypeScript everywhere. Also React and Go.",
      terms,
    );

    expect(ids).toEqual(["t-ts", "t-react", "t-go"]);
  });

  it("caps the result at MAX_JOB_TAGS", () => {
    const many = makeResume([
      Array.from({ length: 12 }, (_, i) => ({
        id: `t-${i}`,
        label: `skill${i}`,
        order: i,
      })),
    ]);
    const text = Array.from({ length: 12 }, (_, i) => `skill${i}`).join(" ");

    expect(matchSkillTags("Engineer", text, buildSkillTerms(many))).toHaveLength(10);
  });

  it("returns nothing when the vocabulary is empty", () => {
    expect(matchSkillTags("Engineer", "React and TypeScript", [])).toEqual([]);
  });

  it("is case-insensitive", () => {
    expect(matchSkillTags("Engineer", "REACT and typescript", terms)).toEqual([
      "t-react",
      "t-ts",
    ]);
  });
});
