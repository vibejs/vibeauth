import { resolve } from "node:path";
import { vibe } from "@usevibejs/compiler/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const alias = [
  { find: "@usevibejs/auth/server", replacement: resolve("src/server.ts") },
  { find: "@usevibejs/auth/router", replacement: resolve("src/router.ts") },
  { find: "@usevibejs/auth", replacement: resolve("src/index.ts") },
];

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "node",
          environment: "node",
          include: ["src/server/**/*.test.ts", "test/**/*.test.ts"],
          exclude: ["**/*.integration.test.ts", "**/*.vibe.test.ts", "**/*.browser.test.ts"],
          setupFiles: ["test/setup.ts"],
          testTimeout: 15000,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/client/**/*.test.ts", "src/router/**/*.test.ts"],
          setupFiles: ["test/setup.ts"],
        },
      },
      {
        resolve: { alias },
        plugins: [vibe()],
        test: {
          name: "integration",
          environment: "jsdom",
          include: ["test/**/*.vibe.test.ts"],
          setupFiles: ["test/setup.ts"],
        },
      },
      {
        resolve: { alias },
        plugins: [vibe()],
        define: { __DEV__: "true" },
        test: {
          name: "browser",
          include: ["test/**/*.browser.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.test-d.ts"],
      thresholds: { 100: true, perFile: true },
    },
  },
});
