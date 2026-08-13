# Chameleon — interview prep

Everything here is verified against the code. If something says **NOT IN REPO**, don't fill it in from memory.

Read §1 and §2 properly. Skim the rest. §5 and §7 are the ones to reread on the subway.

---

## 1. THE SIX FACTS TO KNOW COLD

| | |
| --- | --- |
| **What it is** | 3 branded storefronts, 1 codebase, no per-brand code |
| **The mechanism** | Tenant row → 19 CSS custom properties on one wrapper element |
| **The index** | `@@unique([tenantId, slug])` — isolation *and* speed, same key |
| **The number** | **~19x** faster server-side. End-to-end ~1.0x (network dominates) |
| **Tests** | 28 passing (14 specs × desktop + 390px mobile) |
| **Scale** | 15,036 rows seeded, 36 shown |

**Three numbers you'll be asked for:** 19x · 15,036 rows · 28 tests.

**Never say "19.1x." Say "about 19x."** It moves between runs (18.2–19.1 observed). If someone clones it and gets 18.4, "about 19x" still holds. A memorised decimal doesn't.

---

## 2. THE PITCH (90 seconds, spoken)

Know the four beats. Don't recite.

> "So — Chameleon. Three consumer storefronts: a coffee roaster, a car dealership, a fitness studio. Different colours, typefaces, page structures, even different URL schemes — the roaster's catalogue is at `/menu`, the dealer's is at `/inventory`. All one codebase, no per-brand code in it.
>
> I built it for you specifically. The thing about Konrad is you ship high-craft branded work for a lot of clients out of one team — and the tempting way to do that is fork the codebase per client. Works great until you're maintaining eight of them and fixing the same bug eight times.
>
> So the idea is: brand identity is data. There's a tenants table, each row has a theme with about nineteen design tokens and a `layoutVariant` that picks which of three page compositions renders. Middleware normalises the URL, the layout resolves the tenant and writes those tokens onto one wrapper as CSS custom properties, everything underneath styles itself from those. Adding a client is an insert, not a fork.
>
> The bit I'd want to talk about is the database side. Product slugs are unique *per tenant*, not globally — so two clients can both have `/espresso`. That composite key does double duty: it's the isolation boundary, because one brand's slug under another brand can't match, and it's the index behind the detail page. About nineteen times faster on server-side execution across fifteen thousand rows. Though end-to-end it's basically flat — I measured from Toronto against a database in Virginia, and thirty milliseconds of network swamps a sub-millisecond saving. Both numbers are in the README; reporting only the good one would've been dishonest.
>
> One evening, so there's plenty it doesn't do — no caching, no auth, no migrations. Happy to go into any of it."

**Why that ending works:** naming the gaps yourself turns them into scope decisions instead of discoveries.

---

## 3. THE REQUEST TRACE

Narrate for `GET /foundry`. Eight steps.

1. **`src/middleware.ts:49`** — resolves the *identifier* only, never touches the DB (it runs on every request; a query here sits in front of everything). Subdomain form rewritten to path form at `:59-63`. Otherwise `:67` passes through.
2. **`src/app/[tenant]/layout.tsx:44`** — `Promise.all([getTenant(slug), listTenants()])`.
3. **`:46`** — `if (!tenant) notFound()`. **Unknown tenants 404 here, not in middleware.**
4. **`src/lib/tenant.ts:30` `getTenant`** — `findUnique` on slug with `include: { theme: true }`. Wrapped in React `cache()`, so metadata + layout + page share one query.
5. **`src/lib/theme.ts:30` `themeToCssVars`** — returns **19 CSS custom properties**.
6. **`layout.tsx:56-61`** — `<div id="tenant-scope" style={...}>`. **That inline style object is the entire theming mechanism.**
7. **`src/app/globals.css:17` `@theme inline`** — maps `--color-primary: var(--t-primary)`, so `bg-primary` resolves to whatever the wrapper set.
8. **`src/components/HomeLayouts.tsx:517`** — `switch (tenant.layoutVariant)` → `Dense` / `Showcase` / `Editorial`. **Switches on a token, never a brand name.**

**One sentence:** *"Middleware normalises the URL, the layout resolves the tenant and writes nineteen custom properties onto one wrapper, Tailwind maps its utilities onto those, and a `layoutVariant` string picks the page composition — so the component tree never knows which brand it's rendering."*

---

## 4. THE FIVE DECISIONS

### 4.1 Runtime DB theming — not build-time config, not separate deploys
- **Alternatives:** build-time config is faster but every brand change needs a deploy. Separate deploys isolate best but it's N codebases in practice — N upgrades, N places to fix one bug.
- **Why:** onboarding must be an insert, not a fork. Only holds if identity is data at runtime.
- **Cost:** **7 SQL statements per home render** (measured). No caching. Tokens ship inline on every response, so they can't be a cached static stylesheet.

### 4.2 `@@unique([tenantId, slug])` — `prisma/schema.prisma:151`
- Slugs unique **per tenant**, not globally. Two clients can both have `/espresso`.
- One brand's slug under another **can't match** — isolation is the key, not a filter someone remembered.
- **Cost:** every read must carry `tenantId`. There is deliberately no "get by id" path.

### 4.3 Middleware resolves the ID; the server component loads the data
- **Why:** middleware runs on everything; Prisma there means a connection in front of every request.
- **Cost:** can't 404 unknown tenants early — costs a route match and a DB round trip first.

### 4.4 `layoutVariant` — structure is a token too
- Three genuinely different compositions, not one skeleton with new colours. This is your answer to *"isn't this just CSS variables?"*
- **Cost — concede it:** it's a `switch`. A *new* arrangement is a code change. **Colour is data; structure is a fixed menu.** Invalid values silently fall back to `editorial`.

### 4.5 `isCatalogueVisible` — `schema.prisma:129`
- 15,036 rows so the benchmark measures something real; 36 shown so the site looks finished. Every user-facing query filters on it; the benchmark deliberately doesn't.
- **Cost:** a second predicate every query must remember. One `visible` const (`tenant.ts:28`) is the mitigation.

---

## 5. THE NUMBERS

### The benchmark — `scripts/benchmark.ts` → `benchmark-results.json`

Compares `WHERE "tenantId" = $1 AND slug = $2` with and without the composite index, on 15,036 rows.

| | Without | With | |
| --- | ---: | ---: | ---: |
| **Server-side p50** | 0.782 ms | 0.041 ms | **19.1x** |
| Server-side p95 | 1.001 ms | 0.048 ms | 20.9x |
| End-to-end p50 | 29.25 ms | 29.14 ms | 1.0x |

**Plan flips:** `Bitmap Heap Scan` (271 buffers, 5,011 rows discarded) → `Index Scan` (4 buffers).

**Lead with the caveat — don't wait to be asked:**
> *"About 19x on server-side execution. End-to-end it's 1.0x, because I measured from Toronto against us-east-1 and roughly 29ms of every query is network — the saving disappears into the round trip. Both are in the README; reporting one would've been misleading."*

### Concede these if pushed
1. **Phases run sequentially, not interleaved** — drift between them contaminates the end-to-end comparison.
2. **Benchmarked query ≠ production query** — the benchmark omits the `isCatalogueVisible` filter.
3. **"Without index" isn't "no index"** — a `(tenantId, category)` index still exists, so it's a filtered bitmap scan. **Don't call it a sequential scan.**
4. Single machine, single run, no confidence intervals.

### Lighthouse (mobile, deployed)

| | Northaven | Foundry | Rook & Ridge |
| --- | ---: | ---: | ---: |
| Performance | 85 | 84 | 82 |
| A11y / BP / SEO | 100 | 100 | 100 |
| **CLS** | **0** | **0** | **0** |

**Lead with CLS 0** — three full-bleed hero photographs and nothing shifts. Perf is 82–85 because five font families load at root (so a brand switch never triggers a font request) and LCP is a photograph. Own it as a trade and name the fix: load only the active brand's pair, prefetch the rest at idle.

### Never measured — say "I didn't"
Throughput/RPS · tenant onboarding time · cold start/TTFB · bundle size. All **NOT IN REPO**.

---

## 6. THE TESTS — what they actually prove

**`e2e/tenancy.spec.ts` — 14 specs × 2 projects = 28 tests.** Production build, not dev. Mobile pinned to **390×844** rather than a device preset, because 412px is wide enough to hide a crowded hero — the switcher clipping its labels was a real bug caught at 375.

**Covered:** per-brand theme tokens · cross-brand slug 404 · catalogue leakage · per-tenant URL structure · switcher re-theme · unknown brand 404 · benchmark rows hidden · **subdomain addressing (5 specs, driven via `Host` header through the request API — browsers won't let you set one)**.

### Blunt: do they prove isolation? Partially.

The leakage spec checks **three hardcoded strings are absent** from the grid. If a query dropped its tenant filter and leaked a *non-featured* product, **it would still pass.** The honest version compares rendered slugs against the tenant's actual row set.

**Not covered:** non-featured cross-tenant leakage · `listRelated` · the About page · concurrency (a theme cached across requests — the classic RSC bug) · anything below the DOM · auth (none exists).

**Say it this way:** *"They prove the theming works and the obvious cross-tenant URL attack 404s. The leakage test is weaker than it looks — it checks three known strings, so it'd miss a leak of a product I didn't hardcode."*

---

## 7. THE TEN HARD QUESTIONS

**1. "No caching? Every view hits Postgres?"**
Yes. No `revalidate`, no `unstable_cache`, nothing. React `cache()` dedupes *within* one request only. → *"Nothing, deliberately, and it's the first thing I'd add. But there's no write path yet, so I'd have been guessing at the invalidation contract."*

**2. "N+1?"**
Not classic — no query in a render loop. But `include: { theme: true }` makes Prisma issue a **second query per include** — 2 of the 7.

**3. "What breaks at 300 tenants?"** ← *sharpest question, best answer*
`layout.tsx:44` calls `listTenants()` on **every request**, unbounded, no `take`, purely to fill the brand switcher. At 300 tenants that's 300 tenants + 300 themes per page load. → *"The switcher. It's a demo affordance — in production a user belongs to one brand, so it wouldn't exist at all rather than get paginated."*

**4. "A designer changes a theme — what invalidates?"**
Nothing, because there's no write path and no cache. → *"Immediate today, which is a non-answer since the only way to change a theme is a re-seed. Add caching and I'd need tag-based invalidation on theme write — which is exactly why I didn't add caching first."*

**5. "Where can data leak?"**
A new query forgetting `tenantId`. **`src/lib/tenant.ts` is the only file under `src/` that imports Prisma** — verified. So the leak vector is "someone adds an import," which is visible in review. → *"Convention, not enforcement. RLS would make it structural."*

**6. "Migrations?"**
None. No `prisma/migrations/`. `db push` only. → *"Fine for one night where I own the database and re-seed freely. Unacceptable with real data. Production is `prisma migrate` with checked-in SQL — and the multi-tenant wrinkle is that a column added to `products` locks a table every tenant reads."*

**7. "Auth?"**
None. Storefronts are genuinely public. → *"Read access is legitimately unauthenticated. What's missing is the admin side — a user belonging to a tenant, editing only that tenant. That's where multi-tenancy gets hard and I didn't build it."*

**8. "Why not row-level security?"**
Not used. → *"Application-level plus a composite key. RLS is strictly better — it survives a developer forgetting a filter, which is the actual failure mode. Prisma's support needs session variables per connection and I was on a pooled connection. It's the right answer at scale."*

**9. "Your variants are a switch — how's that different from `if tenant === 'Foundry'`?"**
Don't oversell this one. → *"You're right that structure is a bounded menu and only the selection is data. Switching on a data value means three brands can share `editorial` and a fourth needs no code — but a genuinely new arrangement is a code change."*

**10. "What if a tenant wants something the tokens can't express?"**
No escape hatch exists. → *"Nothing today. That's the real tension — the value is that brands can't fork, and the cost is that a novel requirement changes shared code. You'd want a bounded escape hatch, and I'd want to see the actual request before designing it."*

---

## 8. LIMITATIONS TO NAME FIRST

1. **One evening.** No caching, migrations, auth, admin. Say the scope early — it reframes every gap as a decision.
2. **Fictional brands, no production traffic.** The hard part of multi-tenancy is the tenth client's weird requirement. This has never met one.
3. **The suite proves less than "28 tests" suggests** (§6). Volunteer it before they find it.
4. **All photography is stock** — free-licence Unsplash curated to match listings, not art-directed.
5. **Pagination is a hard `take: 24`** with no next page. The catalogue genuinely cannot show item 25.

---

## 9. IF THEY OPEN THE REPO

Clean: no `console.log` in `src/` (only CLI scripts) · no committed secrets (`.env` gitignored) · build passes · `tsc` clean · 28/28 tests · working tree clean.

**Two things to know:**
- The **provenance claim** (README, handout, seed, landing page) says: brands invented, photography free-licence stock, some frames incidentally show real production vehicles, no affiliation implied. That's deliberate — stock photos of cars have badges on them, so claiming "no real marks" would have been false.
- **Neon credentials were pasted in plaintext during setup — rotate them after tomorrow.**

---

## 10. QUESTIONS TO ASK (pick 3)

1. **"When you take on a new client brand, what actually gets reused — a component library, a starter, or does each engagement mostly start fresh?"**
2. **"How do you handle the client who wants something the design system can't express — extend the system, or fork and accept the drift?"** ← your own §7.10, asked back
3. **"Where's the handoff between design and engineering on tokens? Are designers editing values that reach production?"**
4. **"For consumer work at your scale, who owns the performance budget when a client's brand direction is expensive to render?"** ← lets you raise your own 82–85 honestly
5. **"Given BrainStation, is there a house way of doing things new engineers learn, or does it vary by team?"**

---

## 11. WHAT I CANNOT ANSWER — say "I didn't get to that"

Auth · any write path · migrations · caching and invalidation · tenant onboarding · **custom domains** (the rewrite is tested; DNS, domain mapping and certs don't exist) · observability · rate limiting · **i18n — `formatPrice` is hardcoded `en-CA`/`CAD`, which breaks immediately across markets** · CI (no workflows; tests exist, nothing runs them) · load testing · accessibility beyond automated Lighthouse.

**The fallback:** *"I didn't build that. One evening, and I spent it on making brand identity data instead of code and proving the isolation held. Here's how I'd approach it…"* — then actually say how.

---

## Tonight

- [x] Benchmark re-run, all files synced
- [x] Truck images reverted, provenance claims accurate
- [x] Dead code removed, subdomain branch tested
- [ ] Open the live site on your phone, on cellular not wifi
- [ ] Know cold: `middleware.ts:49` · `layout.tsx:44` · `theme.ts:30` · `HomeLayouts.tsx:517` · `schema.prisma:151`
- [ ] Rotate Neon credentials after tomorrow
