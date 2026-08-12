import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

/*
  Renders docs/handout.html to a print-ready A4 PDF and a screen preview.
  Re-run after editing the handout — the PDF is what gets printed and handed over.
*/

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const src = pathToFileURL(join(process.cwd(), "docs", "handout.html")).href;
  await page.goto(src, { waitUntil: "load" });

  await page.pdf({
    path: join(process.cwd(), "docs", "handout.pdf"),
    format: "A4",
    printBackground: true,
  });

  await page.setViewportSize({ width: 900, height: 1300 });
  await page.screenshot({
    path: join(process.cwd(), "docs", "handout-preview.png"),
    fullPage: true,
  });

  await browser.close();
  console.log("Wrote docs/handout.pdf and docs/handout-preview.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
