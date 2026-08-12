import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenant, getProduct, listProducts, formatPrice } from "@/lib/tenant";
import { BrandArt } from "@/components/BrandArt";
import { ProductCard } from "@/components/ProductCard";

/*
  Detail page.

  The lookup here is the one the benchmark measures: findUnique on the composite
  key (tenantId, slug). Note what that buys beyond speed — because the key is
  scoped to the tenant, requesting another brand's slug under this brand returns
  null and 404s. Tenant isolation is a property of the schema, not of a filter
  somebody remembered to write. The Playwright suite asserts exactly this.
*/

type Params = { tenant: string; section: string; item: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tenant: slug, item } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) return { title: "Not found" };
  const product = await getProduct(tenant.id, item);
  if (!product) return { title: "Not found" };
  return {
    title: `${product.name} — ${tenant.name}`,
    description: product.blurb,
  };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { tenant: slug, section, item } = await params;

  const tenant = await getTenant(slug);
  if (!tenant) notFound();

  // The catalogue path is tenant configuration; a detail page only exists beneath
  // this brand's own catalogue segment.
  if (section !== tenant.catalogSlug) notFound();

  const product = await getProduct(tenant.id, item);
  if (!product) notFound();

  const related = (
    await listProducts(tenant.id, { category: product.category, take: 4 })
  )
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  const treatment = tenant.theme?.imagery ?? "arc";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href={`/${tenant.slug}/${section}`} className="hover:text-ink">
          {tenant.itemNoun}
        </Link>
        <span aria-hidden className="px-2 opacity-50">
          /
        </span>
        <span className="text-ink">{product.category}</span>
      </nav>

      <div className="mt-6 grid gap-9 lg:grid-cols-[1fr_1fr] lg:gap-14">
        <div className="overflow-hidden rounded-brand-lg border border-hairline">
          <BrandArt
            seed={product.artSeed}
            treatment={treatment}
            hero
            className="aspect-[4/3] w-full"
          />
        </div>

        <div className="lg:pt-4">
          <p className="text-micro font-semibold uppercase tracking-[0.14em] text-accent">
            {product.category}
          </p>
          <h1 className="mt-3 text-balance font-display text-title font-semibold text-ink">
            {product.name}
          </h1>
          <p className="mt-4 text-lede text-muted">{product.blurb}</p>

          <p className="mt-7 font-display text-heading font-semibold text-ink">
            {product.priceCents === 0
              ? "Included with membership"
              : formatPrice(product.priceCents)}
          </p>

          <button
            type="button"
            className="mt-6 w-full rounded-brand bg-primary px-6 py-4 text-sm font-semibold text-primary-ink transition-opacity hover:opacity-90 sm:w-auto sm:px-10"
          >
            {tenant.ctaLabel}
          </button>

          <div className="mt-9 border-t border-hairline pt-7">
            <h2 className="font-display text-heading font-semibold text-ink">
              Details
            </h2>
            <p className="mt-3 text-pretty leading-relaxed text-muted">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-hairline pt-12">
          <h2 className="font-display text-heading font-semibold text-ink">
            More in {product.category}
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-3">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  href={`/${tenant.slug}/${section}/${p.slug}`}
                  treatment={treatment}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
