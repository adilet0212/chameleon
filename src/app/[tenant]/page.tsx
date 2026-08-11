import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenant, listFeatured, listCategories, formatPrice } from "@/lib/tenant";
import { BrandArt } from "@/components/BrandArt";

export default async function TenantHome({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) notFound();

  const [featured, categories] = await Promise.all([
    listFeatured(tenant.id, 3),
    listCategories(tenant.id),
  ]);

  const treatment = tenant.theme?.imagery ?? "arc";

  return (
    <>
      {/* Hero. Single column on phones, split at lg — the artwork is decorative,
          so it drops below the fold rather than pushing the copy down. */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <p className="text-micro font-semibold uppercase tracking-[0.14em] text-accent">
              {tenant.name}
            </p>
            <h1 className="mt-4 max-w-[15ch] text-balance font-display text-display font-semibold text-ink">
              {tenant.tagline}
            </h1>
            <p className="mt-6 max-w-[52ch] text-pretty text-lede text-muted">
              {tenant.about}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={`/${tenant.slug}/${tenant.catalogSlug}`}
                className="inline-flex items-center justify-center rounded-brand bg-primary px-6 py-3.5 text-sm font-semibold text-primary-ink transition-opacity hover:opacity-90"
              >
                {tenant.ctaLabel}
              </Link>
              <Link
                href={`/${tenant.slug}/about`}
                className="inline-flex items-center justify-center rounded-brand border border-hairline px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-raise"
              >
                About us
              </Link>
            </div>
          </div>

          <div className="order-first overflow-hidden rounded-brand-lg border border-hairline lg:order-last">
            <BrandArt
              seed={tenant.name.length * 7919}
              treatment={treatment}
              hero
              className="aspect-[16/10] w-full lg:aspect-[4/3]"
            />
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="border-t border-hairline">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-title font-semibold text-ink">
                Featured
              </h2>
              <Link
                href={`/${tenant.slug}/${tenant.catalogSlug}`}
                className="shrink-0 text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                All {tenant.itemNoun.toLowerCase()}
              </Link>
            </div>

            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/${tenant.slug}/${tenant.catalogSlug}/${p.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-brand-lg border border-hairline bg-raise transition-shadow hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.28)]"
                  >
                    <BrandArt
                      seed={p.artSeed}
                      treatment={treatment}
                      className="aspect-[3/2] w-full"
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-micro font-semibold uppercase tracking-[0.1em] text-accent">
                        {p.category}
                      </p>
                      <h3 className="mt-2 font-display text-heading font-semibold text-ink">
                        {p.name}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                        {p.blurb}
                      </p>
                      <p className="mt-4 text-sm font-semibold text-ink">
                        {p.priceCents === 0 ? "Included" : formatPrice(p.priceCents)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="border-t border-hairline">
        <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <h2 className="font-display text-title font-semibold text-ink">
            Browse the {tenant.itemNoun.toLowerCase()}
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.category}>
                <Link
                  href={`/${tenant.slug}/${tenant.catalogSlug}?category=${encodeURIComponent(c.category)}`}
                  className="flex items-center justify-between gap-4 rounded-brand border border-hairline bg-raise px-5 py-4 transition-colors hover:border-accent"
                >
                  <span className="font-medium text-ink">{c.category}</span>
                  <span className="text-sm tabular-nums text-muted">
                    {c.count.toLocaleString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
