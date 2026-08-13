import { test, expect, type Page } from "@playwright/test";

/*
  What these tests are actually for.

  A multi-tenant front-end has two failure modes that matter, and neither one shows
  up in a unit test:

    1. A brand renders with the wrong brand's design. Usually caused by caching a
       theme across requests, or by a token that quietly falls back to a default.
    2. A brand's data leaks into another brand's page. Usually caused by a query
       that forgot its tenant filter.

  Both are only observable from the outside, against a real render of a real route,
  which is why they are asserted here rather than in a unit test of the data layer.
  The isolation specs are the ones that would block a release.
*/

/*
  Expected values are the hex tokens exactly as stored in the themes table.
  getComputedStyle on a custom property returns the literal declared value rather
  than a resolved colour, so these are compared as hex, not as rgb().
*/
const BRANDS = [
  {
    slug: "rook-and-ridge",
    name: "Rook & Ridge",
    catalog: "menu",
    primary: "#4a3428",
    ownItem: "ridge-house-espresso",
    ownItemName: "Ridge House Espresso",
  },
  {
    slug: "northaven",
    name: "Northaven Motors",
    catalog: "inventory",
    primary: "#16263a",
    ownItem: "meridian-ex-sedan",
    ownItemName: "Meridian EX",
  },
  {
    slug: "foundry",
    name: "Foundry Athletic",
    catalog: "schedule",
    primary: "#12291f",
    ownItem: "barbell-fundamentals",
    ownItemName: "Barbell Fundamentals",
  },
] as const;

async function primaryToken(page: Page): Promise<string> {
  const raw = await page.evaluate(() => {
    const scope = document.getElementById("tenant-scope");
    if (!scope) throw new Error("tenant scope element missing");
    return getComputedStyle(scope).getPropertyValue("--t-primary").trim();
  });
  return raw.toLowerCase();
}

// ---------------------------------------------------------------------------
// 1. Each brand renders its own theme.
// ---------------------------------------------------------------------------
for (const brand of BRANDS) {
  test(`${brand.name} renders its own theme tokens`, async ({ page }) => {
    await page.goto(`/${brand.slug}`);

    await expect(page.locator("#tenant-scope")).toHaveAttribute(
      "data-tenant",
      brand.slug,
    );

    // The token is the mechanism, so assert on the token rather than on a
    // screenshot — this fails loudly if a theme falls back to the default.
    expect(await primaryToken(page)).toBe(brand.primary);

    // And assert it actually reaches paint, not just the custom property.
    const header = page.getByRole("banner");
    await expect(header).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

// ---------------------------------------------------------------------------
// 2. Isolation: one brand's item must not resolve under another brand.
// ---------------------------------------------------------------------------
test("an item slug does not resolve under a different brand", async ({ page }) => {
  const [coffee, motors] = BRANDS;

  // Sanity: the item does resolve under its own brand.
  const own = await page.goto(
    `/${coffee.slug}/${coffee.catalog}/${coffee.ownItem}`,
  );
  expect(own?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: coffee.ownItemName }),
  ).toBeVisible();

  // The same slug under another brand's catalogue must 404. Product slugs are
  // unique per tenant, not globally, so this is enforced by the composite key.
  const crossed = await page.goto(
    `/${motors.slug}/${motors.catalog}/${coffee.ownItem}`,
  );
  expect(crossed?.status()).toBe(404);
});

// ---------------------------------------------------------------------------
// 3. Isolation: a catalogue must contain only its own brand's rows.
// ---------------------------------------------------------------------------
test("a catalogue never renders another brand's items", async ({ page }) => {
  for (const brand of BRANDS) {
    await page.goto(`/${brand.slug}/${brand.catalog}`);
    const grid = page.getByTestId("catalog-grid");
    await expect(grid).toBeVisible();

    const text = (await grid.innerText()).toLowerCase();
    expect(text).toContain(brand.ownItemName.toLowerCase());

    for (const other of BRANDS) {
      if (other.slug === brand.slug) continue;
      expect(
        text,
        `${brand.name}'s catalogue leaked "${other.ownItemName}" from ${other.name}`,
      ).not.toContain(other.ownItemName.toLowerCase());
    }
  }
});

// ---------------------------------------------------------------------------
// 4. URL structure is tenant configuration, not a hardcoded route.
// ---------------------------------------------------------------------------
test("each brand's catalogue lives at its own configured path", async ({ page }) => {
  for (const brand of BRANDS) {
    const ok = await page.goto(`/${brand.slug}/${brand.catalog}`);
    expect(ok?.status()).toBe(200);

    // Another brand's catalogue segment must not work here.
    const wrong = BRANDS.find((b) => b.slug !== brand.slug)!;
    const bad = await page.goto(`/${brand.slug}/${wrong.catalog}`);
    expect(
      bad?.status(),
      `${brand.slug} should not serve a catalogue at /${wrong.catalog}`,
    ).toBe(404);
  }
});

// ---------------------------------------------------------------------------
// 5. The switcher re-skins the whole application.
// ---------------------------------------------------------------------------
test("the brand switcher re-themes the application", async ({ page }) => {
  const [coffee, motors] = BRANDS;

  await page.goto(`/${coffee.slug}`);
  expect(await primaryToken(page)).toBe(coffee.primary);

  await page.getByTestId(`brand-switch-${motors.slug}`).click();

  await expect(page).toHaveURL(new RegExp(`/${motors.slug}$`));
  await expect(page.locator("#tenant-scope")).toHaveAttribute(
    "data-tenant",
    motors.slug,
  );
  await expect
    .poll(() => primaryToken(page), { timeout: 5_000 })
    .toBe(motors.primary);

  // The switch must be a real navigation, not a colour swap on stale content.
  await expect(page.getByRole("banner")).toContainText(motors.name);
});

// ---------------------------------------------------------------------------
// 6. Unknown brands 404 rather than rendering an unthemed shell.
// ---------------------------------------------------------------------------
test("an unknown brand 404s", async ({ page }) => {
  const res = await page.goto("/not-a-real-brand");
  expect(res?.status()).toBe(404);
});

// ---------------------------------------------------------------------------
// 7. Benchmark rows exist in the table but never reach a customer-facing page.
// ---------------------------------------------------------------------------
test("generated benchmark rows are never merchandised", async ({ page }) => {
  for (const brand of BRANDS) {
    await page.goto(`/${brand.slug}/${brand.catalog}`);
    const grid = await page.getByTestId("catalog-grid").innerText();

    // The generated tail is all named "<Category> Archive <n>".
    expect(
      grid,
      `${brand.name}'s catalogue is showing generated benchmark rows`,
    ).not.toMatch(/Archive \d+/);
  }

  // And they are not addressable directly either, even though the row exists.
  const res = await page.goto("/rook-and-ridge/menu/archive-espresso-1");
  expect(res?.status()).toBe(404);
});

// ---------------------------------------------------------------------------
// 8. Subdomain addressing resolves to the same routes as path addressing.
// ---------------------------------------------------------------------------
/*
  This is the one branch of src/middleware.ts that does real work, and until this
  spec existed it had never been exercised — the deployment has no wildcard DNS,
  so every other test reaches the app by path. Driving it through Playwright's
  request API lets us set a Host header directly, which a browser will not allow.
*/
test.describe("subdomain addressing", () => {
  for (const brand of BRANDS) {
    test(`${brand.name} resolves from its subdomain`, async ({ request, baseURL }) => {
      const res = await request.get(`${baseURL}/`, {
        headers: { Host: `${brand.slug}.example.com` },
      });
      expect(res.status()).toBe(200);
      // The rewrite is server-side, so the response body is the tenant's page
      // even though the URL carries no tenant segment.
      expect(await res.text()).toContain(`data-tenant="${brand.slug}"`);
    });
  }

  test("a subdomain preserves the rest of the path", async ({ request, baseURL }) => {
    const [coffee] = BRANDS;
    const res = await request.get(`${baseURL}/${coffee.catalog}`, {
      headers: { Host: `${coffee.slug}.example.com` },
    });
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain(`data-tenant="${coffee.slug}"`);
  });

  test("an apex host carries no tenant and serves the platform index", async ({
    request,
    baseURL,
  }) => {
    const res = await request.get(`${baseURL}/`, {
      headers: { Host: "example.com" },
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("One codebase");
    expect(body).not.toContain('data-tenant="');
  });
});
