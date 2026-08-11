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
    - EXPLAIN output is captured in both phases. The timing claim is only credible
      alongside proof that the plan actually changed from Index Scan to Seq Scan.
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

  const results: Record<string, { raw: Stats; client: Stats; plan: string }> = {};

  try {
    // ---- Phase 1: index present -------------------------------------------
    await prisma.$executeRawUnsafe("ANALYZE products");
    console.log("Phase 1/2 — with composite index…");
    const withRaw = await timeRaw(pairs);
    const withClient = await timeClient(pairs);
    const withPlan = await explain(pairs[0].tenantId, pairs[0].slug);
    results.withIndex = {
      raw: summarize(withRaw),
      client: summarize(withClient),
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
    const withoutPlan = await explain(pairs[0].tenantId, pairs[0].slug);
    results.withoutIndex = {
      raw: summarize(withoutRaw),
      client: summarize(withoutClient),
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

  const table = [
    `Rows in table: ${total.toLocaleString()}   Iterations: ${w.raw.n} (after ${WARMUP} warm-up)`,
    "",
    "Query: SELECT ... FROM products WHERE \"tenantId\" = $1 AND slug = $2",
    "",
    "| Measurement | Without index | With composite index | Change |",
    "| --- | ---: | ---: | ---: |",
    `| SQL p50 | ${ms(wo.raw.p50)} ms | ${ms(w.raw.p50)} ms | ${(wo.raw.p50 / w.raw.p50).toFixed(1)}x faster |`,
    `| SQL p95 | ${ms(wo.raw.p95)} ms | ${ms(w.raw.p95)} ms | ${(wo.raw.p95 / w.raw.p95).toFixed(1)}x faster |`,
    `| SQL p99 | ${ms(wo.raw.p99)} ms | ${ms(w.raw.p99)} ms | ${(wo.raw.p99 / w.raw.p99).toFixed(1)}x faster |`,
    `| Prisma p50 | ${ms(wo.client.p50)} ms | ${ms(w.client.p50)} ms | ${(wo.client.p50 / w.client.p50).toFixed(1)}x faster |`,
    `| Prisma p95 | ${ms(wo.client.p95)} ms | ${ms(w.client.p95)} ms | ${(wo.client.p95 / w.client.p95).toFixed(1)}x faster |`,
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
    withIndex: { raw: w.raw, client: w.client },
    withoutIndex: { raw: wo.raw, client: wo.client },
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
