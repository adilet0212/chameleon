import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? 3100;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/*
  Tests run against a production build rather than the dev server. Dev-mode
  behaviour (on-demand compilation, no route caching) is different enough from what
  ships that passing there would not tell us much.

  The mobile project is not an afterthought — half of what this project is for is
  the phone case, so the suite runs the same specs at 393x852 as it does on desktop.
*/
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      // 390x844 rather than a device preset. That is the narrow end of the
      // phones this gets looked at on, and the width the layouts were tuned
      // against — Pixel 7's 412px is wide enough to hide a crowded hero or a
      // control that overflows its container.
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],

  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
