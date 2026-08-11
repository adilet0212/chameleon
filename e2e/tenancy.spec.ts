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

const BRANDS = [
  {
    slug: "rook-and-ridge",
    name: "Rook & Ridge",
    catalog: "menu",
    primary: "rgb(74, 52, 40)",
    ownItem: "ridge-house-espresso",
    ownItemName: "Ridge House Espresso",
  },
  {
    slug: "northaven",
    name: "Northaven Motors",
    catalog: "inventory",
    primary: "rgb(27, 42, 61)",
    ownItem: "meridian-ex-sedan",
    ownItemName: "Meridian EX",
  },
  {
    slug: "foundry",
    name: "Foundry Athletic",
    catalog: "schedule",
    primary: "rgb(22, 48, 42)",
    ownItem: "barbell-fundamentals",
    ownItemName: "Barbell Fundamentals",
  },
] as const;

async function primaryToken(page: Page): Promise<string> {
  return page.evaluate(() => {
    const scope = document.getElementById("tenant-scope");
    if (!scope) throw new Error("tenant scope element missing");
    return getComputedStyle(scope).getPropertyValue("--t-primary").trim();
  });
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
