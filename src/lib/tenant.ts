import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/*
  Tenant-scoped data access.

  Every function in this file takes a tenant slug or id as its first argument, and
  every query it issues is filtered by tenantId. That is the whole isolation story:
  components never hold a raw Prisma handle, so there is no code path in the UI
  layer that can accidentally read across brands. The Playwright suite asserts this
  from the outside by checking that one brand's catalogue never contains another's
  rows.

  Every read here also filters on `isCatalogueVisible`. The products table holds
  15,036 rows so the index benchmark has something real to measure, but only the
  hand-written entries are merchandising — the generated tail must never surface on
  a customer-facing page. The single exception is scripts/benchmark.ts, which
  queries the full table on purpose.

  `cache()` dedupes within a single request — the layout and the page both need the
  tenant, and this makes that one query instead of two.
*/

export type TenantWithTheme = Prisma.TenantGetPayload<{ include: { theme: true } }>;

/** The visibility predicate, in one place so no caller can forget it. */
const visible = { isCatalogueVisible: true } as const;

export const getTenant = cache(
  async (slug: string): Promise<TenantWithTheme | null> => {
    return prisma.tenant.findUnique({
      where: { slug },
      include: { theme: true },
    });
  },
);

export const listTenants = cache(async () => {
  return prisma.tenant.findMany({
    select: {
      slug: true,
      name: true,
      shortName: true,
      tagline: true,
      catalogSlug: true,
      itemNoun: true,
      layoutVariant: true,
      theme: true,
    },
    orderBy: { name: "asc" },
  });
});

/** Catalogue listing. Featured lead, backed by (tenantId, isCatalogueVisible, featured, createdAt). */
export const listProducts = cache(
  async (tenantId: string, opts?: { category?: string; take?: number }) => {
    return prisma.product.findMany({
      where: {
        tenantId,
        ...visible,
        ...(opts?.category ? { category: opts.category } : {}),
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: opts?.take ?? 24,
    });
  },
);

export const listFeatured = cache(async (tenantId: string, take = 3) => {
  return prisma.product.findMany({
    where: { tenantId, ...visible, featured: true },
    orderBy: { createdAt: "desc" },
    take,
  });
});

/** Counts reflect what a visitor can actually browse, not the benchmark volume. */
export const listCategories = cache(async (tenantId: string) => {
  const rows = await prisma.product.groupBy({
    by: ["category"],
    where: { tenantId, ...visible },
    _count: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => ({ category: r.category, count: r._count.category }));
});

export const countProducts = cache(
  async (tenantId: string, category?: string) => {
    return prisma.product.count({
      where: { tenantId, ...visible, ...(category ? { category } : {}) },
    });
  },
);

/*
  The detail lookup. This is the query benchmarked in scripts/benchmark.ts:
  a two-column equality match that the composite index on (tenantId, slug) turns
  from a filtered bitmap scan into a direct index lookup.

  findFirst rather than findUnique because the visibility predicate is not part of
  the unique key — a generated row is addressable by the benchmark but must 404 for
  a visitor.
*/
export const getProduct = cache(async (tenantId: string, slug: string) => {
  return prisma.product.findFirst({
    where: { tenantId, slug, ...visible },
  });
});

export const listRelated = cache(
  async (tenantId: string, category: string, excludeId: string, take = 4) => {
    return prisma.product.findMany({
      where: {
        tenantId,
        ...visible,
        category,
        id: { not: excludeId },
      },
      orderBy: { createdAt: "desc" },
      take,
    });
  },
);

export const getPage = cache(async (tenantId: string, slug: string) => {
  return prisma.page.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
  });
});

/**
 * Tenant item nouns are data ("Class", "Vehicle", "Item"), so pluralising by
 * appending "s" produced "12 classs". Sibilant endings take -es.
 */
export function pluralize(noun: string, count: number): string {
  if (count === 1) return noun;
  return /(s|x|z|ch|sh)$/i.test(noun) ? `${noun}es` : `${noun}s`;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
