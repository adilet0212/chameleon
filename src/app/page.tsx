import Link from "next/link";
import { listTenants } from "@/lib/tenant";
import { themeToCssVars } from "@/lib/theme";
import { ProductImage } from "@/components/ProductImage";

/*
  Platform index.

  Not a tenant page — this uses the neutral default tokens rather than any brand's.
  The point it needs to make in about six seconds: the three storefronts below are
  the same code, and everything different about them came out of a database.

  Each preview renders inside that brand's own token scope, so the card shows the
  real typeface, the real palette and the real imagery language rather than
  describing them. Three colour dots did not communicate anything.
*/

export const metadata = {
  title: "Chameleon — one codebase, many branded front-ends",
};

const VARIANT_LABEL: Record<string, string> = {
  editorial: "Editorial layout",
  dense: "Dense layout",
  showcase: "Showcase layout",
};

export default async function Index() {
  const tenants = await listTenants();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <header className="max-w-2xl">
        <p className="text-micro font-semibold uppercase text-muted">
          Multi-tenant architecture demonstration
        </p>
        <h1 className="display-type mt-4 text-balance text-display font-semibold">
          One codebase. Many branded front-ends.
        </h1>
        <p className="mt-6 text-pretty text-lede leading-relaxed text-muted">
          Three storefronts below. Different palettes, typefaces, page structures,
          imagery, navigation labels and URL schemes — and not one line of per-brand
          code between them. Theme, content, layout and routing are all resolved per
          request from Postgres, so launching a client brand is an insert, not a fork.
        </p>
      </header>

      <ul className="mt-14 grid gap-6 lg:grid-cols-3">
        {tenants.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/${t.slug}`}
              style={themeToCssVars(t.theme)}
              className="card-i group flex h-full flex-col overflow-hidden rounded-brand-lg border border-hairline bg-surface shadow-brand hover:shadow-brand-lift"
            >
              {/*
                A real photograph of the brand, carrying that brand's own tint.
                The previews used generated artwork while the storefronts behind
                them had photography, which made the front door look less
                finished than the pages it linked to. "strong" tint here rather
                than "soft": at card size the wash is what makes three palettes
                legible side by side in one glance.
              */}
              <ProductImage
                src={t.cardImage ?? null}
                alt=""
                seed={t.name.length * 7919}
                treatment={t.theme?.imagery ?? "arc"}
                hero
                tint="strong"
                className="aspect-[16/10] w-full border-b border-hairline"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />

              <div className="flex flex-1 flex-col p-6">
                {/* Set in the brand's own display face at a legible size. */}
                <p className="display-type text-heading font-semibold text-ink">
                  {t.name}
                </p>
                <p className="mt-2 flex-1 text-pretty text-sm leading-relaxed text-muted">
                  {t.tagline}
                </p>

                {/* Palette, shown as a ramp rather than three dots. */}
                <div
                  className="mt-5 flex h-7 overflow-hidden rounded-brand border border-hairline"
                  aria-hidden
                >
                  {[
                    t.theme?.primary,
                    t.theme?.secondary,
                    t.theme?.accent,
                    t.theme?.surfaceBrand,
                    t.theme?.surfaceAlt,
                  ].map((c, i) => (
                    <span
                      key={i}
                      className="flex-1"
                      style={{ backgroundColor: c ?? undefined }}
                    />
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-micro font-semibold uppercase">
                  <span className="rounded-full bg-brandtint px-2.5 py-1 text-ink">
                    {VARIANT_LABEL[t.layoutVariant] ?? t.layoutVariant}
                  </span>
                  <span className="rounded-full border border-hairline px-2.5 py-1 text-muted">
                    /{t.catalogSlug}
                  </span>
                </div>

                <span className="mt-5 text-sm font-semibold text-accent-ink underline-offset-4 group-hover:underline">
                  Open storefront →
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-20 grid gap-8 border-t border-hairline pt-12 sm:grid-cols-3">
        <div>
          <h2 className="display-type text-heading font-semibold">Theming</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Each tenant owns a row of design tokens — palette, typeface pairing,
            radius, letter-spacing, imagery language. The layout writes them onto one
            wrapper as CSS custom properties and every component styles itself from
            there. No per-brand stylesheet, no tenant conditional in the tree.
          </p>
        </div>
        <div>
          <h2 className="display-type text-heading font-semibold">Structure</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Composition is a token too. A <code>layoutVariant</code> selects between
            three arrangements — hero treatment, featured grid, card sizes, category
            presentation — so brands differ structurally, not just in colour.
          </p>
        </div>
        <div>
          <h2 className="display-type text-heading font-semibold">Isolation</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Every tenant-scoped read is keyed by <code>tenantId</code> first, and
            product slugs are unique per tenant rather than globally. One brand&apos;s
            item under another brand&apos;s URL returns nothing and 404s — enforced by
            the schema, asserted end to end.
          </p>
        </div>
      </section>

      <footer className="mt-16 border-t border-hairline pt-8 text-sm text-muted">
        <p>
          All three brands are fictional — names, copy, palettes and layouts are
          invented for this project. Photography is free-licence stock from
          Unsplash. Built by Adilet Masalbekov ·{" "}
          <a
            href="https://github.com/adilet0212"
            className="font-medium text-ink underline underline-offset-4"
          >
            github.com/adilet0212
          </a>
        </p>
      </footer>
    </div>
  );
}
