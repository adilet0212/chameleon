import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTenant, listTenants } from "@/lib/tenant";
import { themeToCssVars } from "@/lib/theme";
import { BrandSwitcher, type SwitcherTenant } from "@/components/BrandSwitcher";

/*
  The tenant shell.

  Everything below this layout is brand-agnostic. The layout resolves the tenant
  once, writes its design tokens onto a single wrapper element as custom
  properties, and from that point on every component underneath styles itself from
  those properties without knowing which brand it is rendering.

  That wrapper is the entire theming mechanism. There is no per-brand stylesheet,
  no class-name switch, and no conditional rendering keyed on tenant slug anywhere
  in the component tree.
*/

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<Metadata> {
  const { tenant: slug } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) return { title: "Not found" };
  return {
    title: `${tenant.name} — ${tenant.tagline}`,
    description: tenant.about,
    themeColor: tenant.theme?.primary,
  };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const [tenant, all] = await Promise.all([getTenant(slug), listTenants()]);

  if (!tenant) notFound();

  const switcherTenants: SwitcherTenant[] = all.map((t) => ({
    slug: t.slug,
    name: t.name,
    tokens: themeToCssVars(t.theme) as unknown as Record<string, string>,
  }));

  return (
    <div
      id="tenant-scope"
      className="tenant-scope flex min-h-dvh flex-col bg-surface font-body text-ink"
      style={themeToCssVars(tenant.theme)}
      data-tenant={tenant.slug}
    >
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface/85 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href={`/${tenant.slug}`}
            className="flex items-center gap-2.5 font-display text-[1.0625rem] font-semibold tracking-tight text-ink"
          >
            <span
              aria-hidden
              className="grid size-7 place-items-center rounded-brand bg-primary text-[0.8125rem] font-bold text-primary-ink"
            >
              {tenant.name.charAt(0)}
            </span>
            <span className="truncate">{tenant.name}</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <Link
              href={`/${tenant.slug}/${tenant.catalogSlug}`}
              className="rounded-brand px-3 py-1.5 font-medium text-muted transition-colors hover:bg-raise hover:text-ink"
            >
              {tenant.itemNoun}
            </Link>
            <Link
              href={`/${tenant.slug}/about`}
              className="rounded-brand px-3 py-1.5 font-medium text-muted transition-colors hover:bg-raise hover:text-ink"
            >
              About
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-hairline">
        <div className="mx-auto w-full max-w-6xl px-5 pb-28 pt-12 sm:px-8">
          <p className="font-display text-heading text-ink">{tenant.name}</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            {tenant.about}
          </p>
          <p className="mt-8 border-t border-hairline pt-6 text-micro uppercase tracking-[0.08em] text-muted">
            Fictional brand · Built as a multi-tenant architecture demonstration
          </p>
        </div>
      </footer>

      <BrandSwitcher tenants={switcherTenants} activeSlug={tenant.slug} />
    </div>
  );
}
