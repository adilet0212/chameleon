import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getTenant,
  getPage,
  listProducts,
  listCategories,
} from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";

/*
  One route serves two different things, decided by tenant data rather than by the
  filesystem:

    /rook-and-ridge/menu       -> catalogue   (section matches tenant.catalogSlug)
    /rook-and-ridge/about      -> CMS page    (section matches a Page row)

  This is why the catalogue can live at /menu for one brand and /inventory for
  another without either one existing as a directory in the app. The URL structure
  is tenant configuration.
*/

type Params = { tenant: string; section: string };
type Search = { category?: string };

const PAGE_SIZE = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tenant: slug, section } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) return { title: "Not found" };

  if (section === tenant.catalogSlug) {
    return { title: `${tenant.itemNoun} — ${tenant.name}` };
  }
  const page = await getPage(tenant.id, section);
  return page
    ? { title: `${page.title} — ${tenant.name}` }
    : { title: "Not found" };
}

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { tenant: slug, section } = await params;
  const { category } = await searchParams;

  const tenant = await getTenant(slug);
  if (!tenant) notFound();

  // --- Catalogue --------------------------------------------------------
  if (section === tenant.catalogSlug) {
    const [items, categories, total] = await Promise.all([
      listProducts(tenant.id, { category, take: PAGE_SIZE }),
      listCategories(tenant.id),
      prisma.product.count({
        where: { tenantId: tenant.id, ...(category ? { category } : {}) },
      }),
    ]);

    const treatment = tenant.theme?.imagery ?? "arc";

    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="font-display text-title font-semibold text-ink">
          {tenant.itemNoun}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {total.toLocaleString()} {total === 1 ? tenant.itemNounSingular.toLowerCase() : "entries"}
          {category ? ` in ${category}` : ""} · showing {Math.min(PAGE_SIZE, items.length)}
        </p>

        {/* Category filter. Horizontally scrollable on phones rather than
            wrapping into a tall block that pushes the grid off screen. */}
        <div className="-mx-5 mt-7 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            <FilterChip
              href={`/${tenant.slug}/${section}`}
              label="All"
              active={!category}
            />
            {categories.map((c) => (
              <FilterChip
                key={c.category}
                href={`/${tenant.slug}/${section}?category=${encodeURIComponent(c.category)}`}
                label={c.category}
                active={category === c.category}
              />
            ))}
          </div>
        </div>

        <ul
          data-testid="catalog-grid"
          className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((p) => (
            <li key={p.id}>
              <ProductCard
                product={p}
                href={`/${tenant.slug}/${section}/${p.slug}`}
                treatment={treatment}
              />
            </li>
          ))}
        </ul>

        {items.length === 0 && (
          <p className="mt-10 rounded-brand border border-hairline bg-raise p-8 text-center text-muted">
            Nothing in this category yet.
          </p>
        )}
      </div>
    );
  }

  // --- Editorial page ---------------------------------------------------
  const page = await getPage(tenant.id, section);
  if (!page) notFound();

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
      <p className="text-micro font-semibold uppercase tracking-[0.14em] text-accent">
        {page.title}
      </p>
      <h1 className="mt-4 text-balance font-display text-title font-semibold text-ink">
        {page.heading}
      </h1>
      <p className="mt-7 text-pretty text-lede leading-relaxed text-muted">
        {page.body}
      </p>
      <Link
        href={`/${tenant.slug}/${tenant.catalogSlug}`}
        className="mt-10 inline-flex items-center justify-center rounded-brand bg-primary px-6 py-3.5 text-sm font-semibold text-primary-ink transition-opacity hover:opacity-90"
      >
        {tenant.ctaLabel}
      </Link>
    </article>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      data-active={active || undefined}
      className="shrink-0 rounded-full border border-hairline px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-ink data-[active]:border-primary data-[active]:bg-primary data-[active]:text-primary-ink"
    >
      {label}
    </Link>
  );
}
