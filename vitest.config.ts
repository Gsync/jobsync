import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      {
        find: "@prisma/client",
        replacement: path.resolve(__dirname, "./node_modules/@prisma/client"),
      },
      {
        find: "next-auth/providers/credentials",
        replacement: path.resolve(
          __dirname,
          "./__mocks__/next-auth-providers.ts"
        ),
      },
      {
        find: /^next-auth$/,
        replacement: path.resolve(__dirname, "./__mocks__/next-auth.ts"),
      },
      {
        find: "server-only",
        replacement: path.resolve(__dirname, "./__mocks__/server-only.ts"),
      },
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3737",
      },
    },
    setupFiles: ["./vitest.polyfills.ts", "./vitest.setup.ts"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
    },
    exclude: ["e2e/**", "node_modules/**"],
    deps: {
      inline: [/@prisma/, /next-auth/, /@auth/, /@next/, /jose/],
    },
  },
});
