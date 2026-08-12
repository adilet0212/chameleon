import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url"; import { join } from "node:path";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 320 } });
await p.goto(pathToFileURL(join(process.cwd(), ".tmpwork/t.html")).href, { waitUntil: "load" });
await p.waitForTimeout(5000);
await p.screenshot({ path: ".tmpwork/trucks.png", fullPage: true }); await b.close();
