import Link from "next/link";
import { listTenants } from "@/lib/tenant";
import { themeToCssVars } from "@/lib/theme";

/*
  Platform index.

  Not a tenant page — this is the front door for someone evaluating the project, so
  it deliberately uses the neutral default tokens rather than any brand's. The
  point it needs to make in about six seconds: the three storefronts below are the
  same code, and the differences between them all came out of a database.
*/

export const metadata = {
  title: "Chameleon — one codebase, many branded front-ends",
};

export default async function Index() {
  const tenants = await listTenants();

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <header className="max-w-2xl">
        <p className="text-micro font-semibold uppercase tracking-[0.14em] text-muted">
          Multi-tenant architecture demonstration
        </p>
        <h1 className="mt-4 text-balance font-display text-display font-semibold tracking-tight">
          One codebase. Many branded front-ends.
        </h1>
        <p className="mt-6 text-pretty text-lede leading-relaxed text-muted">
          Three storefronts below. Different colours, typefaces, corner radii,
          imagery, navigation labels and URL structures — and not one line of
          per-brand code between them. Theme, content, routing and data are all
          resolved per request from Postgres, so launching a new client brand is an
          insert, not a fork.
        </p>
      </header>

      <ul className="mt-14 grid gap-4 sm:grid-cols-3">
        {tenants.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/${t.slug}`}
              style={themeToCssVars(t.theme)}
              className="group flex h-full flex-col overflow-hidden rounded-[--t-radius] border border-[--t-border] bg-[--t-surface] transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex h-24 items-end bg-[--t-primary] p-4">
                <span className="text-sm font-semibold text-[--t-primary-ink]">
                  {t.name}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex gap-1.5" aria-hidden>
                  {[t.theme?.primary, t.theme?.accent, t.theme?.surface].map(
                    (c, i) => (
                      <span
                        key={i}
                        className="size-4 rounded-full border border-black/10"
                        style={{ backgroundColor: c ?? undefined }}
                      />
                    ),
                  )}
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-[--t-ink-muted]">
                  Catalogue at{" "}
                  <code className="rounded bg-black/5 px-1 py-0.5 text-[0.8em]">
                    /{t.slug}/{t.catalogSlug}
                  </code>
                </p>
                <span className="mt-4 text-sm font-semibold text-[--t-ink] underline-offset-4 group-hover:underline">
                  Open storefront →
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-20 grid gap-8 border-t border-hairline pt-12 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-heading font-semibold">
            How the theming works
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Each tenant owns a row of design tokens. The layout resolves the tenant
            once per request and writes those tokens onto a single wrapper element
            as CSS custom properties. Every component underneath styles itself from
            those properties, so there is no per-brand stylesheet, no class-name
            switch, and no conditional keyed on tenant anywhere in the tree.
          </p>
        </div>
        <div>
          <h2 className="font-display text-heading font-semibold">
            How isolation works
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Every tenant-scoped read is keyed by <code>tenantId</code> first, and
            product slugs are unique per tenant rather than globally. Asking for one
            brand&apos;s item under another brand&apos;s URL returns nothing and
            404s — isolation is a property of the schema rather than a filter
            someone remembered to write.
          </p>
        </div>
      </section>

      <footer className="mt-16 border-t border-hairline pt-8 text-sm text-muted">
        <p>
          All three brands are fictional. Built by Adilet Masalbekov ·{" "}
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
