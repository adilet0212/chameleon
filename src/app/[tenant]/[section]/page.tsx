import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getTenant,
  getPage,
  listProducts,
  listCategories,
  countProducts,
} from "@/lib/tenant";
import { ProductCard } from "@/components/ProductCard";

/*
  One route serves two different things, decided by tenant data rather than by the
  filesystem:

    /rook-and-ridge/menu       -> catalogue   (section matches tenant.catalogSlug)
    /rook-and-ridge/about      -> CMS page    (section matches a Page row)

  This is why the catalogue can live at /menu for one brand and /inventory for
  another without either one existing as a directory in the app.
*/

type Params = { tenant: string; section: string };
type Search = { category?: string };

const PAGE_SIZE = 24;

/** Dense brands run a tighter grid. Another arrangement decision carried by a token. */
const GRID: Record<string, string> = {
  dense: "grid-cols-2 gap-4 lg:grid-cols-4",
  showcase: "gap-5 sm:grid-cols-2 lg:grid-cols-3",
  editorial: "gap-5 sm:grid-cols-2 lg:grid-cols-3",
};

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
      countProducts(tenant.id, category),
    ]);

    const treatment = tenant.theme?.imagery ?? "arc";
    const grid = GRID[tenant.layoutVariant] ?? GRID.editorial;
    const compact = tenant.layoutVariant !== "dense";

    return (
      <>
        <div className="border-b border-hairline bg-alt">
          <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
            <h1 className="display-type text-title font-semibold text-ink">
              {tenant.itemNoun}
            </h1>
            <p className="mt-2.5 text-sm text-muted">
              {total}{" "}
              {total === 1
                ? tenant.itemNounSingular.toLowerCase()
                : `${tenant.itemNounSingular.toLowerCase()}s`}
              {category ? ` in ${category}` : ""}
            </p>

            {/* Horizontally scrollable on phones rather than wrapping into a tall
                block that pushes the grid off screen. */}
            <div className="no-bar -mx-5 mt-6 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
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
                    count={c.count}
                    active={category === c.category}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <ul data-testid="catalog-grid" className={`grid ${grid}`}>
            {items.map((p, i) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  href={`/${tenant.slug}/${section}/${p.slug}`}
                  treatment={treatment}
                  size={compact ? "compact" : "standard"}
                  index={i}
                />
              </li>
            ))}
          </ul>

          {items.length === 0 && (
            <p className="rounded-brand-lg border border-hairline bg-raise p-10 text-center text-muted">
              Nothing in this category yet.
            </p>
          )}
        </div>
      </>
    );
  }

  // --- Editorial page ---------------------------------------------------
  const page = await getPage(tenant.id, section);
  if (!page) notFound();

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 sm:py-24">
      <p className="text-micro font-semibold uppercase text-accent-ink">{page.title}</p>
      <h1 className="display-type mt-4 text-balance text-title font-semibold text-ink">
        {page.heading}
      </h1>
      <p className="mt-8 text-pretty text-lede leading-relaxed text-muted">
        {page.body}
      </p>
      <Link
        href={`/${tenant.slug}/${tenant.catalogSlug}`}
        className="mt-11 inline-flex min-h-12 items-center justify-center rounded-brand bg-primary px-6 py-3.5 text-sm font-semibold text-primary-ink transition-opacity hover:opacity-90"
      >
        {tenant.ctaLabel}
      </Link>
    </article>
  );
}

function FilterChip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      data-active={active || undefined}
      className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-raise px-4 text-sm font-medium text-muted transition-colors hover:border-hairline-strong hover:text-ink data-[active]:border-primary data-[active]:bg-primary data-[active]:text-primary-ink"
    >
      {label}
      {count !== undefined && (
        <span className="tabular-nums opacity-60">{count}</span>
      )}
    </Link>
  );
}
