import Link from "next/link";
import type { Product, Tenant, Theme } from "@prisma/client";
import Image from "next/image";
import { BrandArt } from "@/components/BrandArt";
import { ProductImage } from "@/components/ProductImage";
import { ProductCard } from "@/components/ProductCard";

/*
  Page composition per tenant.

  Colour alone does not make two storefronts feel like different brands — if every
  client gets the same skeleton with a new palette, it reads as a theme switcher
  rather than as a platform. So arrangement is a token too: `tenant.layoutVariant`
  selects between the three compositions below.

  What varies: hero treatment, how featured items are arranged, card sizes and
  aspect ratios, how categories are presented, and the sequence of surface tints
  down the page.

  What does not vary: the spacing scale, the type ramp, focus states, and the card
  component itself. The variants below compose shared pieces differently — none of
  them ships its own card or its own button, and none of them is keyed on a brand
  name. Adding a fourth arrangement is a new branch here plus a string in a row.
*/

type TenantWithTheme = Tenant & { theme: Theme | null };

type Props = {
  tenant: TenantWithTheme;
  featured: Product[];
  categories: { category: string; count: number }[];
  totalVisible: number;
};

const catalogHref = (t: TenantWithTheme) => `/${t.slug}/${t.catalogSlug}`;
const itemHref = (t: TenantWithTheme, slug: string) =>
  `/${t.slug}/${t.catalogSlug}/${slug}`;

/* ---------------------------------------------------------------- shared bits */

/*
  Atmospheric backdrop for a full-bleed section.

  Two layers over the photograph: a wash of the brand primary in multiply, and a
  vertical scrim. The wash is what keeps a free-licence gym photo from looking
  like a free-licence gym photo — it pulls the image toward the tenant's palette.
  The scrim is purely functional: it guarantees text contrast regardless of what
  the photograph happens to be doing behind that corner.
*/
function Backdrop({
  src,
  overlay = "hero",
}: {
  src: string | null;
  overlay?: "hero" | "band";
}) {
  if (!src) return null;
  return (
    <>
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        priority={overlay === "hero"}
        sizes="100vw"
        className="-z-20 object-cover"
      />
      <span
        aria-hidden
        className={`absolute inset-0 -z-10 bg-primary ${overlay === "hero" ? "opacity-[0.82]" : "opacity-[0.9]"}`}
      />
    </>
  );
}

function Cta({
  href,
  children,
  tone = "primary",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "primary" | "accent" | "outline" | "onDark";
}) {
  const tones = {
    primary: "bg-primary text-primary-ink hover:opacity-90",
    accent: "bg-accent text-primary-ink hover:opacity-90",
    outline: "border border-hairline-strong text-ink hover:bg-alt",
    onDark: "bg-primary-ink text-primary hover:opacity-90",
  };
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-brand px-6 py-3.5 text-sm font-semibold transition-opacity ${tones[tone]}`}
    >
      {children}
    </Link>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-micro font-semibold uppercase text-accent-ink">{children}</p>
  );
}

function SectionHead({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="display-type text-title font-semibold text-ink">{title}</h2>
      <Link
        href={href}
        className="shrink-0 pb-1 text-sm font-semibold text-accent-ink underline-offset-4 hover:underline"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

/*
  Category browsing. Previously a bare label and a number, which read as debug
  output. Now each category carries a slice of the brand's own artwork, so the
  block is scannable and unmistakably belongs to the brand.
*/
function CategoryTiles({
  tenant,
  categories,
  columns,
}: {
  tenant: TenantWithTheme;
  categories: { category: string; count: number }[];
  columns: string;
}) {
  const treatment = tenant.theme?.imagery ?? "arc";
  return (
    <ul className={`grid gap-3 ${columns}`}>
      {categories.map((c, i) => (
        <li key={c.category}>
          <Link
            href={`${catalogHref(tenant)}?category=${encodeURIComponent(c.category)}`}
            className="card-i group flex items-center gap-4 overflow-hidden rounded-brand-lg border border-hairline bg-raise pr-4 shadow-brand hover:border-hairline-strong hover:shadow-brand-lift"
          >
            <div className="overflow-hidden">
              <BrandArt
                seed={c.category.length * 3571 + i * 617}
                treatment={treatment}
                className="card-art size-16 shrink-0 sm:size-[72px]"
              />
            </div>
            <div className="min-w-0 flex-1 py-3">
              <p className="display-type truncate font-semibold text-ink">
                {c.category}
              </p>
              <p className="text-sm tabular-nums text-muted">
                {c.count} {c.count === 1 ? "item" : "items"}
              </p>
            </div>
            <span
              aria-hidden
              className="shrink-0 text-lg text-muted transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------- variant: editorial */
/* Large lead item, smaller supporting cards, generous rag-right measure.      */

function Editorial({ tenant, featured, categories, totalVisible }: Props) {
  const treatment = tenant.theme?.imagery ?? "arc";
  const [lead, ...rest] = featured;

  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-20">
          <div className="rise">
            <Eyebrow>{tenant.name}</Eyebrow>
            <h1 className="display-type mt-5 max-w-[14ch] text-balance text-display font-semibold text-ink">
              {tenant.tagline}
            </h1>
            <p className="mt-7 max-w-[46ch] text-pretty text-lede text-muted">
              {tenant.about}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Cta href={catalogHref(tenant)}>{tenant.ctaLabel}</Cta>
              <Cta href={`/${tenant.slug}/about`} tone="outline">
                About us
              </Cta>
            </div>
          </div>
          <ProductImage
            src={tenant.heroImage}
            alt=""
            seed={tenant.name.length * 7919}
            treatment={treatment}
            hero
            priority
            tint="soft"
            className="rise rise-2 aspect-[5/4] w-full rounded-brand-xl border border-hairline shadow-brand-lift"
            sizes="(max-width: 1024px) 100vw, 45vw"
          />
        </div>
      </section>

      {lead && (
        <section className="bg-alt">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <SectionHead
              title="This week"
              href={catalogHref(tenant)}
              linkLabel={`All ${tenant.itemNoun.toLowerCase()}`}
            />
            <div className="mt-9 grid gap-5 lg:grid-cols-[1.25fr_1fr] lg:gap-7">
              <ProductCard
                product={lead}
                href={itemHref(tenant, lead.slug)}
                treatment={treatment}
                size="lead"
              />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                {rest.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    href={itemHref(tenant, p.slug)}
                    treatment={treatment}
                    size="compact"
                    index={i + 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="relative isolate overflow-hidden">
        <Backdrop src={tenant.bandImage} overlay="band" />
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="display-type text-title font-semibold text-primary-ink">
            Browse the {tenant.itemNoun.toLowerCase()}
          </h2>
          <p className="mt-2 text-sm text-primary-ink/70">
            {totalVisible} items across {categories.length} categories.
          </p>
          <div className="mt-8">
            <CategoryTiles
              tenant={tenant}
              categories={categories}
              columns="sm:grid-cols-2"
            />
          </div>
        </div>
      </section>
    </>
  );
}

/* ----------------------------------------------------------- variant: dense */
/* Compact hero with an inline spec row, then a tight four-across grid.        */

function Dense({ tenant, featured, categories, totalVisible }: Props) {
  const treatment = tenant.theme?.imagery ?? "grid";

  return (
    <>
      <section className="border-b border-hairline bg-alt">
        <div className="mx-auto w-full max-w-6xl px-5 py-11 sm:px-8 sm:py-16">
          <div className="rise grid gap-7 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-14">
            <div>
              <Eyebrow>{tenant.name}</Eyebrow>
              <h1 className="display-type mt-4 max-w-[20ch] text-balance text-title font-semibold text-ink">
                {tenant.tagline}
              </h1>
              <p className="mt-4 max-w-[54ch] text-pretty leading-relaxed text-muted">
                {tenant.about}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Cta href={catalogHref(tenant)}>{tenant.ctaLabel}</Cta>
                <Cta href={`/${tenant.slug}/about`} tone="outline">
                  About us
                </Cta>
              </div>
            </div>
            <ProductImage
              src={tenant.heroImage}
              alt=""
              seed={tenant.name.length * 7919}
              treatment={treatment}
              hero
              priority
              tint="soft"
              className="aspect-[16/7] w-full rounded-brand border border-hairline shadow-brand lg:aspect-[4/3]"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </div>

          {/* Spec strip — reads as dealer data, and gives the compact hero a base. */}
          <dl className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-brand border border-hairline bg-hairline sm:grid-cols-4">
            {[
              [totalVisible.toString(), "Listed now"],
              [categories.length.toString(), "Categories"],
              ["210", "Point inspection"],
              ["5", "Locations"],
            ].map(([v, k]) => (
              <div key={k} className="bg-raise px-4 py-3.5">
                <dt className="text-micro font-semibold uppercase text-muted">{k}</dt>
                <dd className="display-type mt-1 text-heading font-semibold tabular-nums text-ink">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <SectionHead
            title="Featured stock"
            href={catalogHref(tenant)}
            linkLabel="Full inventory"
          />
          <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featured.map((p, i) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  href={itemHref(tenant, p.slug)}
                  treatment={treatment}
                  index={i}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-hairline bg-sunken">
        <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <h2 className="display-type text-title font-semibold text-ink">
            By category
          </h2>
          <div className="mt-7">
            <CategoryTiles
              tenant={tenant}
              categories={categories}
              columns="sm:grid-cols-2 lg:grid-cols-3"
            />
          </div>
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------- variant: showcase */
/* Full-bleed dark hero, asymmetric featured grid, brand-tinted closing band.  */

function Showcase({ tenant, featured, categories, totalVisible }: Props) {
  const treatment = tenant.theme?.imagery ?? "geometric";
  const [first, ...others] = featured;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-primary">
        <Backdrop src={tenant.heroImage} overlay="hero" />
        <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-32">
          <div className="rise max-w-3xl">
            <p className="text-micro font-semibold uppercase text-primary-ink/70">
              {tenant.name}
            </p>
            <h1 className="display-type mt-5 text-balance text-hero font-semibold text-primary-ink">
              {tenant.tagline}
            </h1>
            <p className="mt-7 max-w-[46ch] text-pretty text-lede text-primary-ink/75">
              {tenant.about}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Cta href={catalogHref(tenant)} tone="accent">
                {tenant.ctaLabel}
              </Cta>
              <Cta href={`/${tenant.slug}/about`} tone="onDark">
                About us
              </Cta>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <SectionHead
            title="On the schedule"
            href={catalogHref(tenant)}
            linkLabel={`Full ${tenant.itemNoun.toLowerCase()}`}
          />
          {/* Asymmetric: one tall card beside a stacked pair. */}
          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {first && (
              <div className="lg:row-span-2">
                <ProductCard
                  product={first}
                  href={itemHref(tenant, first.slug)}
                  treatment={treatment}
                  size="lead"
                />
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-2">
              {others.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  href={itemHref(tenant, p.slug)}
                  treatment={treatment}
                  index={i + 1}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden">
        <Backdrop src={tenant.bandImage} overlay="band" />
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="display-type text-title font-semibold text-primary-ink">
            Train how you want
          </h2>
          <p className="mt-2 max-w-[48ch] text-primary-ink/70">
            {totalVisible} sessions a week across {categories.length} disciplines,
            every one coached and capped at twelve.
          </p>
          <div className="mt-9">
            <CategoryTiles
              tenant={tenant}
              categories={categories}
              columns="sm:grid-cols-2 lg:grid-cols-3"
            />
          </div>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ selector */

export function TenantHome(props: Props) {
  switch (props.tenant.layoutVariant) {
    case "dense":
      return <Dense {...props} />;
    case "showcase":
      return <Showcase {...props} />;
    case "editorial":
    default:
      return <Editorial {...props} />;
  }
}
