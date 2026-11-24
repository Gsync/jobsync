import { defineConfig } from "vitest/config";
import base from "./vitest.config.mts";

// Stryker runs only the fast unit and property suites
const keep = ["unit", "property"];
const projects = (base.test?.projects ?? []).filter(
  (p) => typeof p === "object" && keep.includes((p as any).test?.name)
);

export default defineConfig({ test: { ...base.test, projects } });
