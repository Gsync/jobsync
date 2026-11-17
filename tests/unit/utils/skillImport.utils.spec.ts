import { describe, it, expect } from "vitest";
import { extractSkillCategories } from "@/utils/skillImport.utils";

describe("extractSkillCategories", () => {
  it("returns [] for nullish/garbage input", () => {
    expect(extractSkillCategories(undefined)).toEqual([]);
    expect(extractSkillCategories(null)).toEqual([]);
    expect(extractSkillCategories("nope")).toEqual([]);
    expect(extractSkillCategories(42)).toEqual([]);
  });

  it("normalizes the documented { categories } object shape", () => {
    const result = extractSkillCategories({
      categories: [
        { label: "Languages", skills: ["TypeScript", "Python"] },
        { label: "Tools", skills: ["Docker"] },
      ],
    });
    expect(result).toEqual([
      { label: "Languages", skills: ["TypeScript", "Python"] },
      { label: "Tools", skills: ["Docker"] },
    ]);
  });

  it("wraps a flat string array into a single unlabeled category", () => {
    const result = extractSkillCategories(["React", "Node.js"]);
    expect(result).toEqual([{ label: undefined, skills: ["React", "Node.js"] }]);
  });

  it("accepts a bare array of category objects", () => {
    const result = extractSkillCategories([
      { label: "Frontend", skills: ["CSS"] },
    ]);
    expect(result).toEqual([{ label: "Frontend", skills: ["CSS"] }]);
  });

  it("extracts skill names from { name } objects", () => {
    const result = extractSkillCategories({
      categories: [{ skills: [{ name: "Go" }, { name: "Rust" }] }],
    });
    expect(result[0].skills).toEqual(["Go", "Rust"]);
  });

  it("trims and drops empty skill strings", () => {
    const result = extractSkillCategories({
      categories: [{ label: "X", skills: ["  Java  ", "", "   "] }],
    });
    expect(result).toEqual([{ label: "X", skills: ["Java"] }]);
  });

  it("drops categories that have no usable skills", () => {
    const result = extractSkillCategories({
      categories: [
        { label: "Empty", skills: [] },
        { label: "Real", skills: ["SQL"] },
      ],
    });
    expect(result).toEqual([{ label: "Real", skills: ["SQL"] }]);
  });

  it("ignores a non-string label", () => {
    const result = extractSkillCategories({
      categories: [{ label: 123, skills: ["AWS"] }],
    });
    expect(result[0].label).toBeUndefined();
    expect(result[0].skills).toEqual(["AWS"]);
  });

  it("survives partial streaming snapshots (skill briefly an object)", () => {
    const result = extractSkillCategories({
      categories: [{ label: "Cloud", skills: ["AWS", {}] }],
    });
    expect(result).toEqual([{ label: "Cloud", skills: ["AWS"] }]);
  });
});
