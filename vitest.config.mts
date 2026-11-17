import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const src = path.resolve(import.meta.dirname, "./src");
const serverOnlyStub = path.resolve(import.meta.dirname, "./tests/mocks/server-only.ts");
const depsInline = [/@prisma/, /next-auth/, /@auth/, /@next/, /jose/];

const browserAliases = [
  { find: "@", replacement: src },
  {
    find: "next-auth/providers/credentials",
    replacement: path.resolve(
      import.meta.dirname,
      "./tests/mocks/next-auth-providers.ts"
    ),
  },
  {
    find: /^next-auth$/,
    replacement: path.resolve(import.meta.dirname, "./tests/mocks/next-auth.ts"),
  },
  { find: "server-only", replacement: serverOnlyStub },
];

// Unit runs in node (DOM specs opt in per file); component runs in jsdom.
const jsdomProject = (name: string) => ({
  plugins: [react()],
  resolve: { alias: browserAliases },
  test: {
    name,
    include: [`tests/${name}/**/*.spec.{ts,tsx}`],
    globals: true,
    environment: name === "unit" ? "node" : "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3737",
      },
    },
    setupFiles: ["./tests/setup/polyfills.ts", "./tests/setup/dom.ts"],
    clearMocks: true,
    server: { deps: { inline: depsInline } },
  },
});

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
    },
    projects: [
      jsdomProject("unit"),
      jsdomProject("component"),
      {
        resolve: {
          alias: [
            { find: "@", replacement: src },
            { find: "server-only", replacement: serverOnlyStub },
          ],
        },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.spec.{ts,tsx}"],
          globals: true,
          environment: "node",
          clearMocks: true,
          server: { deps: { inline: depsInline } },
        },
      },
    ],
  },
});
