"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

/*
  The brand switcher.

  Design position: this control is *platform* chrome, not brand chrome. It is the
  one thing on screen that does not belong to the tenant, so it is deliberately
  neutral — a dark glass pill that sits above whichever brand is loaded. Styling it
  to match the active brand would be the obvious move and the wrong one; it would
  read as part of the storefront rather than as the seam between storefronts.

  Behaviour: navigating between tenants is a server round trip, and waiting for it
  before recolouring would make the switch feel broken. So on click we write the
  target brand's tokens onto the scope element immediately and let the CSS
  transition run, then navigate underneath it. The server sends the same token
  values, so when the new route commits there is nothing to correct — no flash, no
  second repaint.

  Fixed to the bottom on purpose: this gets demonstrated on a phone, held one
  handed, and the switcher needs to be under a thumb rather than at the top of the
  page behind a scroll.
*/

export type SwitcherTenant = {
  slug: string;
  name: string;
  shortName: string;
  tokens: Record<string, string>;
};

export function BrandSwitcher({
  tenants,
  activeSlug,
}: {
  tenants: SwitcherTenant[];
  activeSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Warm the RSC payload for the other brands so the switch is a paint, not a
  // fetch — but not during load. Prefetching eagerly pulled and parsed two full
  // RSC payloads while the page was still becoming interactive, which showed up
  // directly in Total Blocking Time. Deferring to idle keeps the switch instant
  // and takes the work off the critical path.
  useEffect(() => {
    const warm = () => {
      for (const t of tenants) {
        if (t.slug !== activeSlug) router.prefetch(`/${t.slug}`);
      }
    };

    // This only runs in the browser, so `window` is always defined here. Safari
    // still lacks requestIdleCallback, hence the timeout fallback.
    // `in` would narrow window to never in the else branch, since lib.dom
    // declares requestIdleCallback as always present. Safari does not have it.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(id);
  }, [tenants, activeSlug, router]);

  function switchTo(t: SwitcherTenant) {
    if (t.slug === activeSlug) return;

    // Optimistic re-skin: paint the new brand before the navigation resolves.
    const scope = document.getElementById("tenant-scope");
    if (scope) {
      for (const [key, value] of Object.entries(t.tokens)) {
        scope.style.setProperty(key, value);
      }
    }
    // Keep the browser chrome in step with the brand on mobile.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", t.tokens["--t-primary"] ?? "#1e1e1e");

    startTransition(() => {
      router.push(`/${t.slug}`);
    });
  }

  // Left/right arrows move between brands — expected for a radiogroup, and it
  // makes the control demonstrable from a keyboard as well as a thumb.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = tenants.findIndex((t) => t.slug === activeSlug);
    const next =
      e.key === "ArrowRight"
        ? tenants[(i + 1) % tenants.length]
        : tenants[(i - 1 + tenants.length) % tenants.length];
    switchTo(next);
    const buttons = containerRef.current?.querySelectorAll("button");
    buttons?.[tenants.indexOf(next)]?.focus();
  }

  const isNested = pathname.split("/").filter(Boolean).length > 1;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] px-3">
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label="Switch brand"
        onKeyDown={onKeyDown}
        data-pending={isPending || undefined}
        className="pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-full border border-white/10 bg-[#101113]/92 p-1 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55)] backdrop-blur-md data-[pending]:opacity-90"
      >
        <span className="sr-only">
          Switching brand re-themes the entire application from the database.
        </span>
        {tenants.map((t) => {
          const active = t.slug === activeSlug;
          return (
            <button
              key={t.slug}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => switchTo(t)}
              data-testid={`brand-switch-${t.slug}`}
              data-active={active || undefined}
              // min-w-0 is load-bearing: without it flex items refuse to shrink
              // below their content and the pill overflows a 375px viewport,
              // clipping the outer two brand names.
              className="relative min-w-0 flex-1 rounded-full px-2 py-2.5 text-[0.8125rem] font-medium text-white/55 transition-colors duration-200 hover:text-white/85 data-[active]:text-[#101113] sm:text-sm"
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-white"
                  style={{ transition: "none" }}
                />
              )}
              <span className="relative flex items-center justify-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: t.tokens["--t-primary"] }}
                />
                {/* Short form on phones, full brand name once there is room. */}
                <span className="truncate sm:hidden">{t.shortName}</span>
                <span className="hidden truncate sm:inline">{t.name}</span>
              </span>
            </button>
          );
        })}
      </div>
      {isNested && (
        <span className="sr-only" aria-live="polite">
          Switching brand returns to the brand home page.
        </span>
      )}
    </div>
  );
}
