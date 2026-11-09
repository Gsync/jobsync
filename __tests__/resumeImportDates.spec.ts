// @vitest-environment node
import { parseImportDate } from "@/actions/resumeImport/shared";

const ym = (d: Date | null) => d && [d.getFullYear(), d.getMonth() + 1];

describe("parseImportDate multilingual", () => {
  it.each([
    ["Jan 2020", [2020, 1]],
    ["janvier 2020", [2020, 1]],
    ["Janvier 2020", [2020, 1]],
    ["févr. 2021", [2021, 2]],
    ["août 2019", [2019, 8]],
    ["décembre 2018", [2018, 12]],
    ["Januar 2020", [2020, 1]],
    ["März 2020", [2020, 3]],
    ["enero de 2020", [2020, 1]],
    ["ene. 2020", [2020, 1]],
    ["marzo 2022", [2022, 3]],
    ["gennaio 2020", [2020, 1]],
    ["janeiro de 2020", [2020, 1]],
    ["январь 2020", [2020, 1]],
    ["2020年3月", [2020, 3]],
    ["2020-03", [2020, 3]],
    ["03/2020", [2020, 3]],
  ])("parses %s", (input, expected) => {
    expect(ym(parseImportDate(input))).toEqual(expected);
  });

  it.each(["Present", "Présent", "actuel", "en cours", "Heute", "Actualidad", "現在", "по настоящее время", "-"])(
    "treats %s as ongoing",
    (input) => {
      expect(parseImportDate(input)).toBeNull();
    },
  );

  it("parses a bare year and ignores empty input", () => {
    expect(ym(parseImportDate("2019"))).toEqual([2019, 1]);
    expect(parseImportDate("")).toBeNull();
    expect(parseImportDate("not a date")).toBeNull();
  });
});
