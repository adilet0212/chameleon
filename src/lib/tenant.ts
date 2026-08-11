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

  `cache()` dedupes within a single request — the layout and the page both need the
  tenant, and this makes that one query instead of two.
*/

export type TenantWithTheme = Prisma.TenantGetPayload<{ include: { theme: true } }>;

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
    select: { slug: true, name: true, catalogSlug: true, theme: true },
    orderBy: { name: "asc" },
  });
});

/** Catalogue listing. Ordered so featured items lead, backed by (tenantId, featured, createdAt). */
export const listProducts = cache(
  async (tenantId: string, opts?: { category?: string; take?: number }) => {
    return prisma.product.findMany({
      where: {
        tenantId,
        ...(opts?.category ? { category: opts.category } : {}),
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: opts?.take ?? 24,
    });
  },
);

export const listFeatured = cache(async (tenantId: string, take = 3) => {
  return prisma.product.findMany({
    where: { tenantId, featured: true },
    orderBy: { createdAt: "desc" },
    take,
  });
});

export const listCategories = cache(async (tenantId: string) => {
  const rows = await prisma.product.groupBy({
    by: ["category"],
    where: { tenantId },
    _count: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => ({ category: r.category, count: r._count.category }));
});

/*
  The detail lookup. This is the query benchmarked in scripts/benchmark.ts:
  a two-column equality match that the composite index on (tenantId, slug) turns
  from a sequential scan into an index lookup.
*/
export const getProduct = cache(async (tenantId: string, slug: string) => {
  return prisma.product.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
  });
});

export const getPage = cache(async (tenantId: string, slug: string) => {
  return prisma.page.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
  });
});

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
