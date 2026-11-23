import nextVitals from "eslint-config-next/core-web-vitals";

const TOAST = "Import toasts from @/lib/toast, never sonner directly (root CLAUDE.md, Components & UI).";
const STORAGE = "Use src/utils/localstorage.utils.ts instead of raw localStorage (root CLAUDE.md, Reuse Before Writing).";
const V1_STRICT = "Public API v1 must accept unknown keys: no .strict(), z.strictObject() or .catchall() (root CLAUDE.md, Public API v1).";
const V1_IMPORTS = "v1 routes take schemas only from @/models/apiV1.schema, so a strict schema cannot leak in (root CLAUDE.md, Public API v1).";
const toastPaths = [{ name: "sonner", message: TOAST }];

const eslintConfig = [
  { ignores: [".next/", "coverage/", "tests/mocks/", "src/generated/", "scripts/dist/"] },
  ...nextVitals,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/toast.ts", "src/components/ui/sonner.tsx"],
    rules: { "no-restricted-imports": ["error", { paths: toastPaths }] },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/utils/localstorage.utils.ts"],
    rules: {
      "no-restricted-globals": ["error", { name: "localStorage", message: STORAGE }],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "localStorage", message: STORAGE },
        { object: "globalThis", property: "localStorage", message: STORAGE },
      ],
    },
  },
  {
    files: ["src/models/apiV1.schema.ts", "src/app/api/v1/**/*.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...["strict", "strictObject", "catchall"].map((name) => ({
        selector: `CallExpression[callee.property.name='${name}']`,
        message: V1_STRICT,
      }))],
    },
  },
  {
    files: ["src/app/api/v1/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: toastPaths,
        patterns: [{ group: ["@/models/*", "!@/models/apiV1.schema"], message: V1_IMPORTS }],
      }],
    },
  },
  {
    // Playwright's fixture `use` callback is not a React hook.
    files: ["tests/e2e/**"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
];

export default eslintConfig;
