import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/*
  Captures the README imagery and gives a quick visual check across all three
  brands at phone size. Run against a running production server.
*/

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const OUT = join(process.cwd(), "docs", "shots");

const SHOTS = [
  { name: "rook-and-ridge-home", path: "/rook-and-ridge" },
  { name: "rook-and-ridge-menu", path: "/rook-and-ridge/menu" },
  { name: "northaven-home", path: "/northaven" },
  { name: "northaven-inventory", path: "/northaven/inventory" },
  { name: "foundry-home", path: "/foundry" },
  { name: "foundry-schedule", path: "/foundry/schedule" },
  { name: "detail", path: "/rook-and-ridge/menu/ridge-house-espresso" },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  for (const s of SHOTS) {
    const page = await phone.newPage();
    await page.goto(BASE + s.path, { waitUntil: "load" });
    // Scroll the page so lazy images enter the viewport, then wait for every
    // <img> to report complete. Without this the capture races the network and
    // photographs come out as empty boxes.
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 400));
      window.scrollTo(0, 0);
    });
    await page.waitForFunction(
      () => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0),
      undefined,
      { timeout: 20000 },
    ).catch(() => {});
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(OUT, `${s.name}.png`) });
    await page.close();
  }
  await phone.close();

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  for (const s of ["/", "/rook-and-ridge", "/northaven", "/foundry"]) {
    const page = await desktop.newPage();
    await page.goto(BASE + s, { waitUntil: "load" });
    // Scroll the page so lazy images enter the viewport, then wait for every
    // <img> to report complete. Without this the capture races the network and
    // photographs come out as empty boxes.
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 400));
      window.scrollTo(0, 0);
    });
    await page.waitForFunction(
      () => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0),
      undefined,
      { timeout: 20000 },
    ).catch(() => {});
    await page.waitForTimeout(900);
    await page.screenshot({
      path: join(OUT, `desktop${s === "/" ? "-index" : s.replace(/\//g, "-")}.png`),
    });
    await page.close();
  }
  await desktop.close();

  await browser.close();
  console.log(`Wrote ${SHOTS.length + 4} screenshots to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
