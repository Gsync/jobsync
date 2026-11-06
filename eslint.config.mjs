import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  { ignores: [".next/", "coverage/", "__mocks__/", "src/generated/", "scripts/dist/"] },
  ...nextVitals,
  {
    // Playwright's fixture `use` callback is not a React hook.
    files: ["e2e/**"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
];

export default eslintConfig;
