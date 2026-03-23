import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
  locales: ["en", "de", "fr", "es"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "src/i18n/messages/{locale}",
      include: ["src"],
    },
  ],
};

export default config;
