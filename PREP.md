# Chameleon — interview prep

Everything below is grounded in code in this repo. Line numbers are from the current commit. Where I could not find something, it says **NOT FOUND IN REPO** — do not fill those in from memory.

**Read section 0 first.** All four items are now fixed. They are kept because §0.1 still matters — the benchmark number moves between runs even though the files agree — and because §0.2 and §0.4 are worth *volunteering* rather than waiting to be asked.

---

## 0. FIX-OR-KNOW BEFORE 10:00

These were real inconsistencies I found by reading the repo. All are now fixed; what remains here is what to say about them.

### 0.1 The benchmark number moves between runs — say "about 19x"

**Re-run and synced.** As of the committed run, every place in the repo that cites this number agrees: `README.md`, `prisma/schema.prisma`, `docs/handout.html`, and `benchmark-results.json` all reflect the same run. The earlier three-way disagreement is gone.

But the ratio genuinely moves with cache state. Observed across runs: **18.2x, 18.4x, 18.7x, 18.8x, 19.1x.** The committed run is **19.1x** p50.

**Say "about 19x" out loud.** If someone runs it live and gets 18.4x, "about 19x" still holds; "19.1x" looks like a number you memorised rather than measured. `README.md:150` documents the 18.2–19.1 range explicitly, so you are covered either way.

If pushed: *"It moves between roughly 18 and 19 depending on cache state — the README documents the range and the committed JSON is the run those figures came from."*

### 0.2 Mobile test viewport — fixed, and worth mentioning

The README claimed tests ran at 390×844 while `playwright.config.ts` used the Pixel 7 preset (412×915). Rather than correct the prose, the config now pins **390×844** explicitly (`playwright.config.ts:36-42`), keeping Pixel 7's device characteristics — touch, mobile user agent — but at the narrower width. All 18 tests pass at 390.

**This is worth volunteering, not hiding:** *"I test at 390 rather than a device preset, because 412 is wide enough to hide a hero that's too crowded or a control that overflows. The switcher overflowing its container at 375 is a bug I actually shipped and caught in a screenshot, so I moved the tests down to the narrow end."* That turns a documentation error into evidence you fix root causes rather than prose.

### 0.3 Stale schema comment — fixed

`prisma/schema.prisma:45` now correctly points at `src/components/HomeLayouts.tsx`. It previously named a `src/components/layouts` directory that never existed.

### 0.4 Dead code — removed, and the subdomain branch is now tested

`src/middleware.ts` used to set an `x-tenant` response header that nothing read. It is gone.

More useful: while removing it I checked whether the subdomain rewrite — the file's only real behaviour — actually works, by sending a `Host` header at the running server. **It does.** All three brands resolve from `brand.example.com`, deep paths survive the rewrite, and an apex host correctly falls through to the platform index. That is now five specs (`e2e/tenancy.spec.ts:207-241`) rather than a thing I had never seen run.

**Worth volunteering:** *"Both addressing schemes are tested. The subdomain ones go through Playwright's request API rather than a page, because browsers won't let you set a Host header — so I drive it at the HTTP level and assert the rendered document carries the right tenant."* That is a good answer about testing something awkward, not an apology.

---

## 1. ARCHITECTURE WALKTHROUGH — one request, end to end

Narrate this for `GET /foundry`.

**1. Middleware — `src/middleware.ts:49` `middleware(request)`**
- Matcher at `:73` excludes `_next/static`, `_next/image`, favicon, and static file extensions, so this never runs for assets.
- `:52-53` — takes the first path segment, returns early if it's in `RESERVED` (`:23-29`).
- `:56` — `tenantFromHost(host)` (`:36-47`) checks for a subdomain. Returns `null` for `.vercel.app` hosts (`:39`) and for anything in `APEX` (`:32`).
- If a subdomain tenant is found and the path doesn't already start with it, `:59-63` rewrites `brand.example.com/menu` → `/brand/menu`. **This is the only functional behaviour in the file**, and it is covered by specs at `e2e/tenancy.spec.ts:207-241`.
- Otherwise `:67` returns `NextResponse.next()` — path addressing needs nothing done to it, because the `[tenant]` route segment already carries the identifier.
- **Middleware never touches the database.** That's deliberate — the comment at `:15-20` explains it: it runs on every request, so a DB call here puts a query in front of everything.

**2. Layout — `src/app/[tenant]/layout.tsx:36` `TenantLayout`**
- `:43` awaits `params` (Next 16 — params is a Promise).
- `:44` — `Promise.all([getTenant(slug), listTenants()])`.
- `:46` — `if (!tenant) notFound()`. **This is where an unknown tenant 404s**, not in middleware.

**3. Tenant + theme load — `src/lib/tenant.ts:30` `getTenant`**
- `prisma.tenant.findUnique({ where: { slug }, include: { theme: true } })`.
- Wrapped in React `cache()` (`:30`) so `generateMetadata` (`layout.tsx:21`), the layout, and the page all share one result within a request.

**4. Tokens → CSS — `src/lib/theme.ts:30` `themeToCssVars(theme)`**
- Returns **19 CSS custom properties** (`:33-51`) — colours, two font stacks, display tracking, radius.
- Font keys are mapped to loaded `next/font` variables via `FONT_STACKS` (`:13-19`); an unknown key falls back to the system stack (`:24-27`) rather than throwing.

**5. Applied — `layout.tsx:56-61`**
- `<div id="tenant-scope" style={themeToCssVars(tenant.theme)} data-tenant={tenant.slug}>`.
- That inline style object **is the entire theming mechanism.**

**6. Tailwind reads the tokens — `src/app/globals.css:17` `@theme inline`**
- `:19` onward maps `--color-primary: var(--t-primary)` etc., so `bg-primary` resolves to whatever the wrapper set.
- `:69-70` defines neutral `:root` defaults for pages with no tenant in scope (the index page, 404).

**7. Page — `src/app/[tenant]/page.tsx:15` `TenantHomePage`**
- `:21` `getTenant` again (deduped by `cache()`).
- `:24-28` `Promise.all([listFeatured, listCategories, countProducts])`.
- `:30-37` hands everything to `<TenantHome />`. **This file has no idea which layout it is producing.**

**8. Layout variant — `src/components/HomeLayouts.tsx:516` `TenantHome`**
- `:517` `switch (props.tenant.layoutVariant)`.
- `:518` `dense` → `Dense` (`:318`), `:520` `showcase` → `Showcase` (`:426`), `:522` `editorial` default → `Editorial` (`:211`).
- Switching on a **token from the row**, never on a tenant name.

**One-sentence version to say out loud:** *"Middleware normalises the addressing scheme, the layout resolves the tenant and writes nineteen CSS custom properties onto one wrapper element, Tailwind's `@theme inline` maps its utilities onto those properties, and a `layoutVariant` string on the same row picks which of three page compositions renders — so the component tree never knows which brand it's rendering."*

---

## 2. THE FIVE DECISIONS I MUST DEFEND

### 2.1 Runtime DB-driven theming, not build-time config or separate deployments

**What:** Theme lives in the `themes` table (`prisma/schema.prisma:67-110`), loaded per request, written as inline CSS custom properties at `layout.tsx:59`.

**Alternatives:**
- *Build-time config* (a `themes.ts` object, one build per brand). Faster — tokens become static CSS, no query. But every brand change needs a deploy, and non-engineers can't touch it.
- *Separate deployments per brand.* Strongest isolation, best per-brand performance, and it's how a lot of agencies actually do it. But it's N codebases-in-practice: N dependency upgrades, N places to fix one bug.

**Why this one:** the premise is that onboarding a client should be an insert, not a fork. That only holds if brand identity is data at runtime.

**What it costs — say this before they say it:**
- Every tenant page hits Postgres. **7 SQL statements per home-page render** (I measured this — see §3.3). No caching layer.
- Tokens ship as an inline `style` attribute on every response, so they can't be cached as a static CSS file.
- A theme with a missing token renders a broken page at runtime rather than failing a build.

### 2.2 Composite unique on `(tenantId, slug)` — isolation as a schema property

**What:** `prisma/schema.prisma:151` `@@unique([tenantId, slug])`.

**Why it matters beyond speed:** slugs are unique *per tenant*, not globally. Requesting brand A's slug under brand B returns nothing and 404s — because the key can't match, not because a filter caught it. Asserted at `e2e/tenancy.spec.ts:86-104`.

**Alternatives:** globally-unique slugs (simpler, but then two clients can't both have `/about` or `/espresso`, which is a non-starter for real brands); or a plain non-unique index plus application-level filtering (works until someone writes a query that forgets the filter).

**Cost:** every read must carry `tenantId`. There is no "get product by id" path in `src/lib/tenant.ts` — that's intentional but it means any future admin tooling has to be written tenant-first too.

### 2.3 Middleware resolves the identifier; server components load the data

**What:** `src/middleware.ts` does no DB work (comment at `:15-20`). `getTenant` runs in the RSC, deduped by React `cache()`.

**Alternative:** resolve the full tenant in middleware and pass it down. Rejected because middleware runs on every matched request, and Prisma in the edge/middleware path means a connection per request in front of everything.

**Cost:** middleware can't 404 an unknown tenant — that happens later, at `layout.tsx:46`. So an unknown slug still costs you a route match and a DB round trip before it 404s.

### 2.4 Layout variant as a token, not just colour

**What:** `layoutVariant` on the tenant row (`schema.prisma:48`), switched at `HomeLayouts.tsx:517`. Three genuinely different compositions — `Editorial:211`, `Dense:318`, `Showcase:426` — differing in hero treatment, featured grid, card sizes, and category presentation.

**Why:** if every client gets the same skeleton with a new palette, it's a theme switcher, not a platform. This is the answer to "isn't this just CSS variables?"

**Cost:** it's a `switch` over a string. Adding a fourth arrangement is a code change plus a deploy — **it is not data-driven the way colour is.** Be honest about that; it's the obvious counter and pretending otherwise is worse than owning it. An invalid `layoutVariant` value silently falls through to `editorial` (`:522`) rather than erroring.

### 2.5 `isCatalogueVisible` — separating "in the table" from "shown to a visitor"

**What:** `schema.prisma:129`. The products table holds 15,036 rows so the index benchmark measures something real, but only 36 hand-written rows are merchandising. Every user-facing read in `src/lib/tenant.ts` filters on it via the `visible` const (`:28`); `scripts/benchmark.ts` deliberately does not.

**Why:** a catalogue reading "Espresso Archive 1,003" next to six real drinks looks unfinished, but deleting the rows would make the benchmark meaningless.

**Cost:** it's a soft-delete-shaped flag with no admin UI, and it's a second predicate every query must remember. The `visible` const at `:28` is the mitigation — one place to forget instead of eleven.

---

## 3. THE NUMBERS

### 3.1 The query benchmark — what it actually is

**Where:** `scripts/benchmark.ts`. Run with `npm run benchmark`.

**What it compares:** `SELECT id, name, slug, "priceCents" FROM products WHERE "tenantId" = $1 AND slug = $2` — with the composite unique index present, then with it dropped, against **15,036 rows across 3 tenants**.

**Committed results** (`benchmark-results.json`, run at `2026-08-13T02:48:30Z`, Node v22.21.0):

| Measurement | Without index | With index | Ratio |
| --- | ---: | ---: | ---: |
| **Server-side execution (EXPLAIN ANALYZE)** p50 | 0.782 ms | 0.041 ms | **19.1x** |
| Server-side p95 | 1.001 ms | 0.048 ms | 20.9x |
| Raw SQL end-to-end p50 | 29.251 ms | 29.135 ms | 1.0x |
| Prisma client end-to-end p50 | 29.460 ms | 29.089 ms | 1.0x |

Plan detail from the same run: **271 buffers** touched and **5,011 rows** discarded by filter without the index, versus **4 buffers** and a direct lookup with it.

**Plan change** (the part that actually proves it):
- Without: `Bitmap Heap Scan on products`
- With: `Index Scan using "products_tenantId_slug_key" on products`

**The line to lead with:** *"About 19x on server-side execution time. End-to-end it's 1.0x, because I measured from Toronto against us-east-1 and roughly 29 milliseconds of every query is network — a 0.74 millisecond saving disappears into the round trip. Both numbers are in the README because reporting only one of them would have been misleading."*

That volunteered caveat is the single strongest thing you can say about this benchmark. Say it before they ask.

### 3.2 Where the benchmark methodology is weak — know these

Be ready to concede these. They are real.

1. **Phases are sequential, not interleaved.** `benchmark.ts:196-230` runs the entire with-index phase, then the entire without-index phase. Any drift in network or database load between phases contaminates the end-to-end comparison. Interleaved A/B sampling would be more rigorous. *(The EXPLAIN server-side numbers are much less exposed to this, which is another reason they're the headline.)*
2. **The benchmarked query is not exactly the production query.** `benchmark.ts:106-109` uses `findFirst({ where: { tenantId, slug } })`. The app's `getProduct` (`src/lib/tenant.ts:107-111`) also filters `isCatalogueVisible`. Close, but not identical — say so if pressed on it.
3. **"Without index" is not "no index."** A `(tenantId, category)` index still exists (`schema.prisma:155`), so the planner narrows by tenant and filters ~5,000 rows. This is *documented* in `README.md:127-146` and is arguably the more honest comparison, but do not describe it as a sequential scan — it is not.
4. **Single machine, single network path, one run.** No repetition across process restarts, no confidence intervals.
5. **Dropping the index also drops a uniqueness guarantee** for the duration of the run. `benchmark.ts:231-240` restores it in a `finally` and verifies. Good, but worth knowing it's a destructive benchmark against your real database.

**If you want to state a number with total confidence tomorrow, re-run `npm run benchmark` tonight and read the number off the fresh JSON.** That takes about three minutes and removes the §0.1 problem entirely.

### 3.3 Query count per request — measured

I instrumented Prisma and replayed one tenant home-page render: **7 SQL statements.**

1. `SELECT ... FROM tenants` (getTenant)
2. `SELECT ... FROM themes` — Prisma issues `include: { theme: true }` as a **separate query**
3. `SELECT ... FROM tenants` (listTenants, for the brand switcher)
4. `SELECT ... FROM themes` — again, separate query for the included themes
5. `SELECT ... FROM products` (listFeatured)
6. `SELECT COUNT(...) ... GROUP BY category` (listCategories)
7. `SELECT COUNT(*) FROM products` (countProducts)

This is a real, defensible number and it makes you look like you know your own system. See §5.3 for why statements 3–4 are the interesting problem.

### 3.4 Lighthouse — `README.md:170-180`, raw JSON in `docs/lh-*.json`

Mobile, simulated throttling, against the deployed build.

| | Northaven | Foundry | Rook & Ridge |
| --- | ---: | ---: | ---: |
| Performance | 85 | 84 | 82 |
| Accessibility | 100 | 100 | 100 |
| Best Practices | 100 | 100 | 100 |
| SEO | 100 | 100 | 100 |
| LCP | 3.4 s | 3.5 s | 3.6 s |
| CLS | 0 | 0 | 0 |

**The two to lead with:** CLS is 0 on all three despite three full-bleed hero photographs — every image sits in a fixed-aspect wrapper. And accessibility is 100 with contrast passing, which matters because every hero now sets text over a photograph.

**Performance is 82–85, not 95.** Cause per `README.md:182-184`: five font families load at the root so a brand switch never triggers a font request, and LCP is a photograph. Own it as a trade, name the fix (load only the active brand's pair, prefetch the rest at idle).

### 3.5 Things people will assume you measured, that you did not

- **Throughput / RPS / concurrent users** — NOT FOUND IN REPO. No load test exists.
- **Time to onboard a new tenant** — NOT FOUND IN REPO. No script, no admin UI. Adding a brand today means editing `prisma/seed.ts` and re-seeding.
- **Cold start / TTFB on Vercel** — NOT FOUND IN REPO.
- **Bundle size numbers** — not recorded anywhere in the repo. Lighthouse JSON contains audit data but no figure is stated. Verify yourself before quoting one.

---

## 4. THE TEST SUITE — what it actually proves

**File:** `e2e/tenancy.spec.ts`. **14 specs × 2 projects = 28 tests.** Projects at `playwright.config.ts:30-43`: `Desktop Chrome`, and a mobile project pinned to **390×844** (`:36-42`) with Pixel 7's touch and user-agent characteristics. `webServer` (`:45-46`) runs `npm run build && next start`, so tests run against a **production build**, not dev.

### What each spec genuinely asserts

| Spec | Line | Actually proves |
| --- | --- | --- |
| Theme tokens (×3) | `:63-81` | `#tenant-scope` has the right `data-tenant`, and computed `--t-primary` equals the exact hex from the themes table. Strong — this catches a theme falling back to default. |
| Cross-brand item 404 | `:86-104` | Coffee's item resolves under coffee (200), and 404s under motors. **One direction, one pair.** |
| Catalogue leakage | `:109-126` | For each brand, the grid contains its own featured item name and **does not contain the other two brands' featured item names.** |
| URL structure | `:131-144` | Each brand's catalogue path returns 200, and **one** other brand's catalogue segment 404s. |
| Switcher re-theme | `:149-168` | Token changes, URL changes, `data-tenant` changes, and the header text updates — so it's a real navigation, not a colour swap. |
| Unknown brand | `:173-176` | `/not-a-real-brand` → 404. |
| Benchmark rows hidden | `:181-196` | No grid matches `/Archive \d+/`, and a generated slug 404s directly. |
| Subdomain addressing (×3) | `:209-218` | `Host: brand.example.com` on `/` returns 200 and a document carrying that brand's `data-tenant`. Exercises the middleware rewrite. |
| Subdomain deep path | `:220-227` | `Host: brand.example.com` on `/menu` preserves the path through the rewrite. |
| Apex host | `:229-240` | `Host: example.com` serves the platform index and carries no `data-tenant`. |

### Blunt answer: do they prove tenant isolation?

**Partially. They prove the happy path is not obviously broken. They do not prove isolation.**

The leakage test (`:109-126`) is the weakest link, and it's the one you'd be tempted to oversell. It checks that **three specific strings** are absent from the rendered grid. It does not verify that every rendered row belongs to the tenant. If `listProducts` dropped its `tenantId` filter and leaked a *non-featured* product from another brand, **this test would still pass.**

A real version would assert that the set of rendered item slugs is a subset of the tenant's own product slugs — comparing against the database, not against three hardcoded names.

### Isolation failure modes NOT covered — say these before they find them

1. **Non-featured cross-tenant leakage** — as above. The test only knows three item names.
2. **`listRelated` (`src/lib/tenant.ts:113-126`) is never tested.** It's tenant-filtered in code, but no test asserts it.
3. **`getPage` / the About page is never tested for cross-tenant access.** `Page` has `@@unique([tenantId, slug])` (`schema.prisma:169`) so it should be safe, but nothing proves it.
4. **No concurrency test.** The classic RSC multi-tenancy bug is a theme cached across *different* requests. Every test is sequential; nothing hits two tenants concurrently and checks for bleed.
5. **No test at the data layer.** All assertions are through the rendered DOM, so a leak that doesn't render as visible text is invisible to this suite.
6. **No authorization tests** — because there is no auth (§5.7).

**How to say it:** *"They prove the theming mechanism works and that the obvious cross-tenant URL attack 404s. The catalogue leakage test is weaker than it looks — it checks three known strings are absent, so it'd miss a leak of a product I didn't hardcode. The honest version compares rendered slugs against the tenant's actual row set."*

That answer will land better than any test you could have written.

---

## 5. HOW A SENIOR ENGINEER WOULD ATTACK THIS

### 5.1 "You have no caching. Every page view hits Postgres, right?"

**Honest answer: yes.** I grepped `src` — there is no `revalidate`, no `unstable_cache`, no `force-static`, no `generateStaticParams` on tenant routes. React `cache()` (`src/lib/tenant.ts:30`) dedupes **within one request only**; it does nothing across requests. 7 statements per home render (§3.3).

**The good version:** *"Nothing, deliberately, and it's the first thing I'd add. Tenant and theme rows are near-static and near-perfect cache candidates — I'd wrap `getTenant` in `unstable_cache` tagged `tenant:${slug}`, and revalidate that tag when a theme is written. I didn't build it because there's no write path yet, so there was nothing to invalidate against and I'd have been guessing at the invalidation contract."*

### 5.2 "Do you have N+1 queries?"

Not in the classic per-row sense — no query runs inside a render loop. But `include: { theme: true }` causes Prisma to issue a **second query per include** (statements 2 and 4 in §3.3). That's not N+1, it's 2× on a fixed shape.

**The real problem is 5.3.**

### 5.3 "What breaks at 300 tenants?"

This is the sharpest question and the code has a clear answer.

`src/app/[tenant]/layout.tsx:44` calls `listTenants()` on **every tenant page request**, purely to populate the brand switcher (`:48-53`). `listTenants` (`src/lib/tenant.ts:39-54`) fetches **all tenants and all their themes, unbounded — no `take`, no pagination.**

At 3 tenants that's invisible. At 300, every single page load fetches 300 tenant rows plus 300 theme rows and serialises them into the client component's props. That's the first thing that falls over.

**The good version:** *"The brand switcher. It's a demo affordance that loads every tenant on every request with no limit, and it'd fall over somewhere in the low hundreds. In a real deployment the switcher wouldn't exist — a user belongs to one brand — so it'd come out entirely rather than get paginated."* That's a strong answer because it identifies the failure *and* correctly identifies that the feature is demo-only.

Second-order at scale: no connection pooling config beyond Neon's pooler (`.env.example`), and the `products` table has no partitioning — but 15k rows is nowhere near needing it.

### 5.4 "A designer changes a theme. What invalidates?"

**Honest answer: nothing, and nothing needs to — because there is no write path.** There is no admin UI, no mutation, no API route. Themes change by editing `prisma/seed.ts` and re-seeding.

Since pages are dynamically rendered with no caching (§5.1), a theme change is live on the next request. That's *accidentally* correct behaviour that would stop being correct the moment you add caching.

**The good version:** *"Today it's immediate, because there's no cache to invalidate — which is a non-answer, since there's also no way to change a theme except a re-seed. The moment I add the caching from 5.1, I'd need tag-based invalidation on theme write, and that's exactly why I didn't add caching first."*

### 5.5 "Where can tenant data leak?"

Real vectors visible in this code:

1. **A new query that forgets `tenantId`.** The mitigation is convention — everything goes through `src/lib/tenant.ts`, components never hold a Prisma handle. That's a discipline guarantee, not an enforced one. **Postgres row-level security would make it structural, and I didn't use it.**
2. **The "no raw Prisma handle in components" claim holds — I verified it.** `src/lib/tenant.ts` is the **only** file under `src/` that imports from `@/lib/prisma`. Nothing in `app/` or `components/` can issue an unscoped query without adding a new import first. You can state this one confidently: *"There's exactly one module that touches Prisma, and every function in it takes a tenant as its first argument."* That's a genuinely good answer — it makes the leak vector "someone adds an import," which is visible in review.
3. **The generated tail is addressable by the benchmark** (`getProduct` filters visibility, so a visitor 404s — asserted at `:181-196`), but the rows are real and would be exposed by any future endpoint that forgets the flag.
4. **No auth means no authorization boundary at all** (§5.7).

### 5.6 "How do you do migrations?"

**Honest answer: I don't.** There is no `prisma/migrations/` directory — I verified. The only schema workflow is `prisma db push` (`package.json` `db:push`), which is a dev-time sync, not a migration history.

**The good version:** *"`db push` only — there's no migration history in the repo. That's fine for a one-night build where I control the database and re-seed freely, and it's completely unacceptable for anything with real data. Production would be `prisma migrate` with checked-in SQL, and the multi-tenant wrinkle is that a column added to `products` is a lock on a table every tenant reads."*

### 5.7 "Where's auth? How do you know a request is allowed to see this tenant?"

**Honest answer: there is none, by design for this scope.** Every storefront is public — that's realistic for consumer storefronts. There is no login, no session, no authorization check anywhere.

**The good version:** *"These are public consumer storefronts, so read access is genuinely unauthenticated. What's missing is the other half — an admin surface where a user belongs to a tenant and can only edit that tenant. That's where multi-tenancy gets hard, and I didn't build it. I'd want tenant membership on the session and RLS underneath, so a compromised query still can't cross the boundary."*

### 5.8 "Why not Postgres row-level security?"

Not used. `schema.prisma` has no RLS policies. Isolation is application-level plus the composite key.

**The good version:** *"Application-level with a composite key that makes cross-tenant addressing structurally impossible. RLS would be strictly better — it survives a developer forgetting a filter, which is the actual failure mode. I didn't reach for it partly because Prisma's support requires session variables per connection and I was on a pooled Neon connection, and partly because it was one night. It's the right answer at scale."*

### 5.9 "Your layout variants are a switch statement. How is that different from an if-tenant-is-Foundry?"

Fair and sharp. **The honest answer: it's a switch on a data value, not on identity.** Three brands could share `editorial`; a fourth brand needs zero code if it picks an existing variant. But adding a *new* arrangement is a code change and a deploy — so composition is *configurable*, not *authorable*. Colour is data; structure is a fixed menu.

Don't oversell this one. Saying "you're right, structure is a bounded set and only the selection is data" is a better answer than defending it.

### 5.10 "What happens when a tenant wants something the token system can't express?"

The honest answer visible in the code: they get one of three layouts and 19 tokens, and anything else is a code change. There is no escape hatch — no per-tenant CSS override field, no slot/override mechanism.

**The good version:** *"Nothing today. That's the real tension in this design — the value comes from brands not being able to fork, and the cost is that a brand with a genuinely novel requirement has to change shared code. In practice you'd want a bounded escape hatch: a per-tenant CSS override column, or component slots. Both reintroduce some of the forking risk, which is why I'd want to see the actual request before designing it."*

**Also likely:**
- *"Why Prisma 6 and not 7?"* — v7 moves connection config out of the schema and requires driver adapters. Pinned to 6.19.3 to avoid a migration mid-build. Defensible.
- *"Is the SVG fallback dead code now that you have photos?"* — No. `ProductImage.tsx:56-67` falls back to `BrandArt` whenever `imageUrl` is null, which is all 15,000 generated rows.

---

## 6. HONEST LIMITATIONS — name these yourself

1. **One evening, and it shows in specific places.** No caching, no migrations, no auth, no admin. Say the scope out loud early — it reframes every gap as a scope decision instead of an oversight.
2. **Three fictional brands, no production traffic, no real client constraints.** Nobody has asked this system for something it can't do yet. The hard part of multi-tenancy is the tenth client's weird requirement, and this has never met one.
3. **The test suite proves less than its line count suggests** (§4). Volunteer this — an interviewer who finds it themselves discounts everything else you said about testing.

**Plus, from the code:**

4. **All photography is stock, and it shows.** Every image is free-licence Unsplash, chosen to match each listing but not shot for these brands. A real client engagement would have art direction; this has a curated stock library. The provenance claims in the repo say exactly this, so you are consistent if asked.
5. **Pagination is a hard `take: 24`** (`src/lib/tenant.ts:66`) with no next page. With 12 visible items per brand nobody notices, but the catalogue genuinely cannot show item 25.

---

## 7. CODE SMELLS TO KNOW ABOUT

Fixed nothing, as instructed. In rough order of how bad it'd be if opened live:

1. *(Fixed.)* The dead `x-tenant` header is removed, and the subdomain branch it sat next to now has test coverage. (§0.4)
2. **Three conflicting benchmark numbers:** README 18.8x / schema comment 18.6x / committed JSON 18.2x. (§0.1)
3. *(Fixed.)* `schema.prisma:45` now points at the real file, `src/components/HomeLayouts.tsx`.
4. *(Fixed.)* The README/config viewport mismatch is gone — the mobile project is pinned to 390×844 and the README matches.
5. *(Resolved.)* The two supplied press photos of real badged vehicles are gone — `public/vehicles/` is deleted and those listings are back on free-licence Unsplash stock. **The four claims were rewritten at the same time, and this is the part worth understanding**: swapping the images alone would not have made "no real company's marks appear here" true, because the Unsplash stand-ins are also photographs of real cars — the Range Rover shot has RANGE ROVER across the hood and a Land Rover grille badge. Free-licence stock of a car shows the car's marks. So all four now claim the accurate, verifiable thing: *the brands are invented; the photography is free-licence stock and some frames incidentally show real production vehicles; no affiliation is implied.*

   If anyone raises it: *"The brands are entirely invented — names, copy, palettes, layouts. The photography is free-licence Unsplash, and stock photos of cars have badges on them, so I say that explicitly rather than claiming something I can't back."* That is a better answer than the original claim was.

6. **`ram.jpg` was supplied as `ram.png`** — a JPEG with a PNG extension. I renamed it. Harmless, but if you `git log` live, the rename is visible.
7. **`console.log` calls exist** but only in CLI scripts (`prisma/seed.ts`, `scripts/*`) where they are the intended output. **None in `src/`.** Clean.
8. **No committed secrets.** `.env` is gitignored, only `.env.example` is tracked. I verified. Note your Neon credentials were pasted in plaintext during setup — **rotate them after the interview** regardless.
9. **`docs/` is heavy** — 11 screenshots plus three Lighthouse JSONs (~600 KB each) are committed.
10. *(Not a smell — verified clean.)* `src/lib/tenant.ts` is the only file under `src/` importing Prisma. The data-access boundary is real, not aspirational. Say it with confidence.

**Build/test status as of now:** `npm run build` succeeds, `npx tsc --noEmit` is clean, 18/18 Playwright tests pass, working tree is clean. If you demo `npm test` live it needs the DB reachable and takes ~40s including a production build.

---

## 8. THE 90-SECOND PITCH

Spoken. Contractions. Don't recite it word for word — know the three beats.

> "So — Chameleon. It's three consumer storefronts: a coffee roaster, a car dealership, and a fitness studio. Different colours, different typefaces, different page structures, even different URL schemes — the roaster's catalogue is at `/menu`, the dealer's is at `/inventory`. And they're all one codebase with no per-brand code in it.
>
> I built it for you specifically. The thing I kept coming back to about Konrad is that you ship high-craft branded work for a lot of different clients out of one team — and the tempting way to do that is to fork the codebase per client. That works great until you're maintaining eight of them and fixing the same bug eight times.
>
> So the whole idea here is: brand identity is data. There's a `tenants` table, each row has a theme with about nineteen design tokens, and a `layoutVariant` string that picks which of three page compositions renders. Middleware normalises the URL, the layout resolves the tenant and writes those tokens onto one wrapper element as CSS custom properties, and everything underneath styles itself from those. Adding a client is an insert, not a fork.
>
> The bit I'd actually want to talk about is the database side. Product slugs are unique *per tenant*, not globally — so two clients can both have `/espresso`. That composite key does double duty: it's the isolation boundary, because asking for one brand's slug under another brand can't match, and it's the index behind the detail page. I benchmarked it — about eighteen times faster on server-side execution across fifteen thousand rows. Though end-to-end it's basically flat, because I measured from Toronto against a database in Virginia and thirty milliseconds of network swamps a sub-millisecond saving. Both numbers are in the README; I figured reporting only the good one would be dishonest.
>
> I built it in one evening, so there's plenty it doesn't do — no caching, no auth, no migrations. Happy to go into any of it."

**Why that ending works:** naming the gaps yourself converts them from discoveries into scope decisions, and it invites the technical conversation you actually want.

---

## 9. QUESTIONS TO ASK THEM

These come from having built this. Ask three or four, not all five.

1. **"When you take on a new client brand, what actually gets reused from the last one — is it a component library, a starter, or does each engagement mostly start fresh?"** Goes straight at the fork-vs-platform tension this project is about, and their answer tells you how they really work.

2. **"How do you handle the client who wants something the design system can't express? Do you extend the system, or fork for that engagement and accept the drift?"** This is §5.10 — the real failure mode of what I built. Asking it shows you know the limitation, not just the idea.

3. **"Where does the handoff sit between design and engineering on tokens? Are designers editing values that reach production, or is it a spec that engineers implement?"** Directly relevant — I put tokens in a database precisely so a non-engineer *could* own them, and I want to know if that's a real need or a solution looking for a problem.

4. **"For consumer work at your scale — you mentioned reaching 250 million people — where does the performance budget get set, and who owns it when a client's brand direction is expensive to render?"** Lets you bring up your own 82–85 Lighthouse honestly, as a trade you made and can articulate.

5. **"Given BrainStation, is there a house way of doing things that new engineers are expected to learn, or does approach vary by team and client?"** Ties to the posting's BrainStation question, and it's a real question about how they maintain craft consistency across many clients — the same problem this project solves in code.

---

## 10. WHAT I CANNOT ANSWER FROM THIS CODE

Say **"I didn't get to that"** — do not improvise. Each of these is a real gap.

**Nothing in this repo addresses:**

1. **Authentication / authorization of any kind.** No session, no membership model, no admin.
2. **Any write path.** No mutation, no API route, no form that persists. Everything is read-only rendering over a seeded database.
3. **Migrations.** No `prisma/migrations/`. `db push` only.
4. **Caching or invalidation.** No directives anywhere in `src`.
5. **Tenant onboarding.** No script, no UI. A new brand means editing `prisma/seed.ts`.
6. **Custom domains.** Subdomain *routing* works and is tested (`middleware.ts:59-63`, specs at `e2e/tenancy.spec.ts:207-241`) — you can say that confidently. What does **not** exist is the operational half: no wildcard DNS on the deployment, no domain-to-tenant mapping table, no certificate provisioning. So `foundry.example.com` resolves correctly if something points that hostname at the app, and nothing in this project points it there. *"The rewrite is tested; the DNS and cert automation that would make it real isn't built."*
7. **Observability.** No logging, no error tracking, no tracing, no metrics.
8. **Rate limiting, WAF, abuse handling.** None.
9. **i18n / multi-currency.** `formatPrice` (`src/lib/tenant.ts:143`) is hardcoded to `en-CA` and `CAD`. A real multi-brand platform crossing markets breaks on this immediately — good thing to name unprompted.
10. **CI.** No `.github/workflows`. Tests exist but nothing runs them automatically. `playwright.config.ts` has `process.env.CI` branches (`:17-20`, `:48`) that no pipeline sets.
11. **Load, concurrency, or scale testing.** §3.5.
12. **Accessibility beyond automated Lighthouse.** No keyboard-navigation testing, no screen-reader testing. Lighthouse's 100 means no *detectable* violations, which is a much weaker claim than "accessible."
13. **Image licensing for the two truck photos.** §7.5.

**The universal fallback, and it's a strong one:** *"I didn't build that. It was one evening and I spent it on the part I thought was actually interesting — making brand identity data instead of code, and proving the isolation held. Here's how I'd approach it…"* Then actually say how. The willingness to draw a hard line around what you built is worth more than a fuzzy answer.

---

## Final checklist for tonight

- [x] ~~Re-run `npm run benchmark`~~ — done, all four files synced to the same run (19.1x)
- [x] ~~Decide on the two truck images~~ — reverted to Unsplash, all four claims rewritten to be accurate
- [ ] Rotate the Neon credentials after tomorrow
- [ ] Open the live site on your phone once on cellular, not wifi
- [ ] Know these five line numbers cold: `middleware.ts:49`, `layout.tsx:44`, `theme.ts:30`, `HomeLayouts.tsx:517`, `schema.prisma:151`
