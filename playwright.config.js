import { defineConfig, devices } from "@playwright/test";

process.env.NEXT_PUBLIC_DATABASE_TYPE = "localStorage";

const e2ePort = process.env.E2E_PORT || "5000";
const baseURL = `http://127.0.0.1:${e2ePort}`;
const webServerCommand =
  e2ePort === "5000"
    ? "pnpm dev"
    : `pnpm exec next dev --webpack -p ${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 600_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 90_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: `${baseURL}/login`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_DATABASE_TYPE: "localStorage",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
