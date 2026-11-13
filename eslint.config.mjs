import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  { ignores: [".next/", "coverage/", "tests/mocks/", "src/generated/", "scripts/dist/"] },
  ...nextVitals,
  {
    // Playwright's fixture `use` callback is not a React hook.
    files: ["tests/e2e/**"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
];

export default eslintConfig;
