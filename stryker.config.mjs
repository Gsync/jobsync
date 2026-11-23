// On-demand only: `npm run test:mutation`. Never part of npm test or CI.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: "vitest",
  vitest: { configFile: "vitest.mutation.config.mts" },
  coverageAnalysis: "perTest",
  reporters: ["clear-text", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/mutation.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  mutate: [
    "src/lib/jobs/timeline/*.ts",
    "src/lib/jobs/sortStages.ts",
    "src/lib/jobs/canonicalize.ts",
    "src/lib/jobs/resolve.ts",
    "src/lib/jobs/jobDedupe.ts",
    "src/models/apiV1.schema.ts",
  ],
  tempDirName: ".stryker-tmp",
  thresholds: { high: 80, low: 60, break: null },
  // Leading "/" anchors to the repo root, so src/lib/data is still copied
  ignorePatterns: [
    "/jobsyncdb", "/data", "/coverage", "/playwright-report", "/test-results",
    "/screenshots", "/evals", "/docs", "/.next",
  ],
};

export default config;
