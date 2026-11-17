import pkg from "../../../package.json";

// Lowering this floor brings back pdf.js's `duplicate private name #_` parse
// failure, now in the Turbopack production build too. See
// docs/architecture/resume-pdf-export.md before changing it.
describe("browserslist floor", () => {
  it("stays at the targets that keep pdf.js private fields unlowered", () => {
    expect(
      pkg.browserslist,
      "browserslist changed — read docs/architecture/resume-pdf-export.md (pdf.js #_ parse bug)",
    ).toEqual([
      "chrome >= 111",
      "edge >= 111",
      "firefox >= 128",
      "safari >= 16.4",
    ]);
  });
});
