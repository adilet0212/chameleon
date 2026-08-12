import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

/*
  Composite index benchmark.

  Measures the detail-page lookup — `WHERE "tenantId" = $1 AND slug = $2` — with
  and without the composite index on (tenantId, slug), against the full seeded
  table.

  Method notes, because a benchmark you cannot defend is worse than no benchmark:

    - Every measurement runs the same set of sampled (tenantId, slug) pairs in the
      same order, so both phases do identical work.
    - ANALYZE runs after each DDL change. Without it the planner works from stale
      statistics and may keep its old plan, which would measure nothing.
    - Warm-up iterations are discarded so we are not timing cold caches and first
      connection setup.
    - EXPLAIN output is captured in both phases. A timing claim is only credible
      alongside proof that the plan actually changed — here, from an Index Scan on
      the composite key to a Bitmap Heap Scan that narrows by tenant and then
      discards ~5,000 rows with a filter.
    - p50 and p95 are reported rather than a mean. A mean over network-attached
      Postgres is dominated by tail latency and overstates the typical case.

  The index is recreated in a finally block. An interrupted run must not leave the
  database without the unique constraint that backs tenant-scoped slug uniqueness.
*/

const prisma = new PrismaClient({ log: ["error"] });

const WARMUP = 50;
const ITERATIONS = 400;

type Stats = {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
  n: number;
};

function summarize(samples: number[]): Stats {
  const s = [...samples].sort((a, b) => a - b);
  const at = (q: number) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return {
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
    min: s[0],
    max: s[s.length - 1],
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    n: s.length,
  };
}

const ms = (n: number) => n.toFixed(3);

async function findIndexName(): Promise<string> {
  const rows = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'products'
      AND indexdef ILIKE '%("tenantId", slug)%'
  `;
  if (rows.length === 0) {
    throw new Error(
      "No (tenantId, slug) index found on products. Run `npx prisma db push` first.",
    );
  }
  return rows[0].indexname;
}

async function indexExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count FROM pg_indexes
    WHERE tablename = 'products' AND indexname = ${name}
  `;
  return Number(rows[0].count) > 0;
}

/** Raw SQL timing — isolates database work from client-side overhead. */
async function timeRaw(pairs: { tenantId: string; slug: string }[]): Promise<number[]> {
  const samples: number[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const { tenantId, slug } = pairs[i];
    const t0 = process.hrtime.bigint();
    await prisma.$queryRaw`
      SELECT id, name, slug, "priceCents" FROM products
      WHERE "tenantId" = ${tenantId} AND slug = ${slug}
    `;
    const t1 = process.hrtime.bigint();
    if (i >= WARMUP) samples.push(Number(t1 - t0) / 1_000_000);
  }
  return samples;
}

/** Prisma client timing — what a request to the detail page actually pays. */
async function timeClient(pairs: { tenantId: string; slug: string }[]): Promise<number[]> {
  const samples: number[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const { tenantId, slug } = pairs[i];
    const t0 = process.hrtime.bigint();
    await prisma.product.findFirst({
      where: { tenantId, slug },
      select: { id: true, name: true, slug: true, priceCents: true },
    });
    const t1 = process.hrtime.bigint();
    if (i >= WARMUP) samples.push(Number(t1 - t0) / 1_000_000);
  }
  return samples;
}

async function explain(tenantId: string, slug: string): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<Record<string, string>[]>(
    `EXPLAIN (ANALYZE, BUFFERS) SELECT id, name, slug, "priceCents" FROM products WHERE "tenantId" = $1 AND slug = $2`,
    tenantId,
    slug,
  );
  return rows.map((r) => Object.values(r)[0]).join("\n");
}

/*
  Server-side execution time.

  The wall-clock numbers above include the round trip from this machine to the
  database, which for a remote Postgres is tens of milliseconds and swamps the
  thing we are actually trying to measure. Postgres reports its own execution time
  inside EXPLAIN ANALYZE — that figure excludes network entirely and is the honest
  answer to "what did the index change".

  Reported alongside the end-to-end numbers rather than instead of them. One says
  what the database does, the other says what a request actually pays.
*/
async function timeServerSide(
  pairs: { tenantId: string; slug: string }[],
  iterations: number,
): Promise<{ exec: number[]; plan: number[] }> {
  const exec: number[] = [];
  const plan: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const { tenantId, slug } = pairs[i % pairs.length];
    const text = await explain(tenantId, slug);
    const e = text.match(/Execution Time:\s*([\d.]+)\s*ms/);
    const p = text.match(/Planning Time:\s*([\d.]+)\s*ms/);
    if (e) exec.push(parseFloat(e[1]));
    if (p) plan.push(parseFloat(p[1]));
  }
  if (exec.length === 0) {
    throw new Error("Could not parse Execution Time from EXPLAIN output.");
  }
  return { exec, plan };
}

/** First line of a plan, e.g. "Index Scan using ... " — proves the plan changed. */
function planNode(text: string): string {
  const first = text.split("\n").find((l) => l.trim().length > 0) ?? "";
  return first.trim().split("(")[0].trim().replace(/^->\s*/, "");
}

async function main() {
  const total = await prisma.product.count();
  const tenants = await prisma.tenant.count();
  if (total < 10_000) {
    throw new Error(
      `Only ${total} products seeded. The benchmark needs 10k+ rows to be meaningful — run \`npm run db:seed\` first.`,
    );
  }

  const indexName = await findIndexName();
  console.log(`Table: products — ${total.toLocaleString()} rows across ${tenants} tenants`);
  console.log(`Index: ${indexName}\n`);

  // Sample real rows spread across all tenants, so no single tenant's data
  // dominates and the lookups hit different parts of the table.
  const sample = await prisma.$queryRaw<{ tenantId: string; slug: string }[]>`
    SELECT "tenantId", slug FROM products
    ORDER BY md5(id)
    LIMIT ${ITERATIONS}
  `;
  const pairs = Array.from(
    { length: ITERATIONS },
    (_, i) => sample[i % sample.length],
  );

  const results: Record<
    string,
    { raw: Stats; client: Stats; server: Stats; planning: Stats; plan: string }
  > = {};

  const SERVER_ITERATIONS = 120;

  try {
    // ---- Phase 1: index present -------------------------------------------
    await prisma.$executeRawUnsafe("ANALYZE products");
    console.log("Phase 1/2 — with composite index…");
    const withRaw = await timeRaw(pairs);
    const withClient = await timeClient(pairs);
    const withServer = await timeServerSide(pairs, SERVER_ITERATIONS);
    const withPlan = await explain(pairs[0].tenantId, pairs[0].slug);
    results.withIndex = {
      raw: summarize(withRaw),
      client: summarize(withClient),
      server: summarize(withServer.exec),
      planning: summarize(withServer.plan),
      plan: withPlan,
    };

    // ---- Phase 2: index dropped -------------------------------------------
    console.log("Phase 2/2 — index dropped…");
    await prisma.$executeRawUnsafe(`ALTER TABLE products DROP CONSTRAINT IF EXISTS "${indexName}"`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${indexName}"`);
    if (await indexExists(indexName)) {
      throw new Error(`Failed to drop ${indexName} — aborting rather than reporting a bogus comparison.`);
    }
    await prisma.$executeRawUnsafe("ANALYZE products");

    const withoutRaw = await timeRaw(pairs);
    const withoutClient = await timeClient(pairs);
    const withoutServer = await timeServerSide(pairs, SERVER_ITERATIONS);
    const withoutPlan = await explain(pairs[0].tenantId, pairs[0].slug);
    results.withoutIndex = {
      raw: summarize(withoutRaw),
      client: summarize(withoutClient),
      server: summarize(withoutServer.exec),
      planning: summarize(withoutServer.plan),
      plan: withoutPlan,
    };
  } finally {
    // Always restore. This is a unique constraint, not just a performance index.
    console.log("Restoring index…");
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${indexName}" ON products ("tenantId", slug)`,
    );
    await prisma.$executeRawUnsafe("ANALYZE products");
    const ok = await indexExists(indexName);
    console.log(ok ? "Index restored.\n" : "WARNING: index NOT restored — run `npx prisma db push`.\n");
  }

  const w = results.withIndex;
  const wo = results.withoutIndex;

  const x = (a: number, b: number) => `${(a / b).toFixed(1)}x`;

  const table = [
    `Rows: ${total.toLocaleString()} · End-to-end iterations: ${w.raw.n} (after ${WARMUP} warm-up) · EXPLAIN samples: ${w.server.n}`,
    "",
    'Query: SELECT id, name, slug, "priceCents" FROM products WHERE "tenantId" = $1 AND slug = $2',
    "",
    "**Server-side execution time** (Postgres `EXPLAIN ANALYZE`, excludes network)",
    "",
    "| | Without index | With composite index | Change |",
    "| --- | ---: | ---: | ---: |",
    `| p50 | ${ms(wo.server.p50)} ms | ${ms(w.server.p50)} ms | ${x(wo.server.p50, w.server.p50)} faster |`,
    `| p95 | ${ms(wo.server.p95)} ms | ${ms(w.server.p95)} ms | ${x(wo.server.p95, w.server.p95)} faster |`,
    `| plan node | ${planNode(wo.plan)} | ${planNode(w.plan)} | |`,
    "",
    "**End-to-end latency** (client in Toronto → Neon us-east-1; includes network round trip)",
    "",
    "| | Without index | With composite index | Change |",
    "| --- | ---: | ---: | ---: |",
    `| SQL p50 | ${ms(wo.raw.p50)} ms | ${ms(w.raw.p50)} ms | ${x(wo.raw.p50, w.raw.p50)} faster |`,
    `| SQL p95 | ${ms(wo.raw.p95)} ms | ${ms(w.raw.p95)} ms | ${x(wo.raw.p95, w.raw.p95)} faster |`,
    `| Prisma p50 | ${ms(wo.client.p50)} ms | ${ms(w.client.p50)} ms | ${x(wo.client.p50, w.client.p50)} faster |`,
    `| Prisma p95 | ${ms(wo.client.p95)} ms | ${ms(w.client.p95)} ms | ${x(wo.client.p95, w.client.p95)} faster |`,
  ].join("\n");

  console.log("\n" + table + "\n");
  console.log("--- EXPLAIN, with index ---\n" + w.plan);
  console.log("\n--- EXPLAIN, without index ---\n" + wo.plan + "\n");

  const payload = {
    measuredAt: new Date().toISOString(),
    node: process.version,
    rowsInTable: total,
    tenants,
    iterations: w.raw.n,
    warmup: WARMUP,
    indexName,
    withIndex: {
      raw: w.raw,
      client: w.client,
      serverExecution: w.server,
      planning: w.planning,
      planNode: planNode(w.plan),
    },
    withoutIndex: {
      raw: wo.raw,
      client: wo.client,
      serverExecution: wo.server,
      planning: wo.planning,
      planNode: planNode(wo.plan),
    },
    plans: { withIndex: w.plan, withoutIndex: wo.plan },
    markdownTable: table,
  };

  const out = join(process.cwd(), "benchmark-results.json");
  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${out}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
