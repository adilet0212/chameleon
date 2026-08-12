import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenant, getProduct, listRelated, formatPrice } from "@/lib/tenant";
import { BrandArt } from "@/components/BrandArt";
import { ProductCard } from "@/components/ProductCard";

/*
  Detail page.

  The lookup here is the one the benchmark measures: an equality match on
  (tenantId, slug). Note what that buys beyond speed — because the key is scoped to
  the tenant, requesting another brand's slug under this brand returns null and
  404s. Tenant isolation is a property of the schema, not of a filter somebody
  remembered to write. The Playwright suite asserts exactly this.
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

export default async function ItemPage({ params }: { params: Promise<Params> }) {
  const { tenant: slug, section, item } = await params;

  const tenant = await getTenant(slug);
  if (!tenant) notFound();

  // The catalogue path is tenant configuration; a detail page only exists beneath
  // this brand's own catalogue segment.
  if (section !== tenant.catalogSlug) notFound();

  const product = await getProduct(tenant.id, item);
  if (!product) notFound();

  const related = await listRelated(tenant.id, product.category, product.id, 4);
  const treatment = tenant.theme?.imagery ?? "arc";

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-5 pt-6 sm:px-8 sm:pt-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link
            href={`/${tenant.slug}/${section}`}
            className="transition-colors hover:text-ink"
          >
            {tenant.itemNoun}
          </Link>
          <span aria-hidden className="px-2 opacity-40">
            /
          </span>
          <Link
            href={`/${tenant.slug}/${section}?category=${encodeURIComponent(product.category)}`}
            className="transition-colors hover:text-ink"
          >
            {product.category}
          </Link>
        </nav>
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="rise overflow-hidden rounded-brand-xl border border-hairline shadow-brand-lift">
            <BrandArt
              seed={product.artSeed}
              treatment={treatment}
              hero
              className="aspect-[4/3] w-full"
            />
          </div>

          <div className="rise rise-2 lg:pt-3">
            <p className="text-micro font-semibold uppercase text-accent">
              {product.category}
            </p>
            <h1 className="display-type mt-3 text-balance text-title font-semibold text-ink">
              {product.name}
            </h1>
            <p className="mt-4 text-pretty text-lede text-muted">{product.blurb}</p>

            <p className="display-type mt-7 text-title font-semibold tabular-nums text-accent">
              {product.priceCents === 0
                ? "Included"
                : formatPrice(product.priceCents)}
            </p>

            <button
              type="button"
              className="mt-6 min-h-12 w-full rounded-brand bg-primary px-8 py-4 text-sm font-semibold text-primary-ink transition-opacity hover:opacity-90 sm:w-auto sm:px-12"
            >
              {tenant.ctaLabel}
            </button>

            <div className="mt-10 border-t border-hairline pt-8">
              <h2 className="display-type text-heading font-semibold text-ink">
                Details
              </h2>
              <p className="mt-3 text-pretty leading-relaxed text-muted">
                {product.description}
              </p>
            </div>

            {/* Metadata block — reads as real product data rather than filler. */}
            <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-brand border border-hairline bg-hairline">
              {[
                ["Category", product.category],
                ["Reference", product.slug.slice(0, 18).toUpperCase()],
                [
                  "Availability",
                  product.featured ? "Featured" : "Available",
                ],
                ["Brand", tenant.name],
              ].map(([k, v]) => (
                <div key={k} className="bg-raise px-4 py-3">
                  <dt className="text-micro font-semibold uppercase text-muted">
                    {k}
                  </dt>
                  <dd className="mt-1 truncate text-sm font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-6 border-t border-hairline bg-alt">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <h2 className="display-type text-heading font-semibold text-ink">
              More in {product.category}
            </h2>
            <ul className="mt-7 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {related.map((p, i) => (
                <li key={p.id}>
                  <ProductCard
                    product={p}
                    href={`/${tenant.slug}/${section}/${p.slug}`}
                    treatment={treatment}
                    size="compact"
                    index={i}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
