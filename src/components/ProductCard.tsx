import Link from "next/link";
import type { Product } from "@prisma/client";
import { BrandArt } from "@/components/BrandArt";
import { formatPrice } from "@/lib/tenant";

/*
  One card, used by the home page, the catalogue and the related strip.

  Layout changes shape rather than scale between breakpoints. On a phone it is a
  row — 88px of artwork on the left, copy on the right — because a full-bleed 3:2
  image per card meant roughly one item per screen, which is a bad way to read a
  catalogue of 5,000 things. From `sm` up there is room for the image to lead, so
  it becomes a vertical card.

  Same component, same data, no duplicated markup: the earlier version of this was
  copy-pasted across three files and had already started to drift.
*/

type Props = {
  product: Product;
  href: string;
  treatment: string;
  /** Forces the vertical form regardless of breakpoint (used by the hero strip). */
  alwaysStacked?: boolean;
};

export function ProductCard({ product, href, treatment, alwaysStacked }: Props) {
  const stack = alwaysStacked ? "flex-col" : "flex-row sm:flex-col";
  const art = alwaysStacked
    ? "aspect-[3/2] w-full"
    : "size-[88px] shrink-0 sm:aspect-[3/2] sm:size-auto sm:w-full";

  return (
    <Link
      href={href}
      data-testid="catalog-item"
      className={`group flex h-full ${stack} overflow-hidden rounded-brand-lg border border-hairline bg-raise transition-shadow hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.28)]`}
    >
      <BrandArt seed={product.artSeed} treatment={treatment} className={art} />

      {/* min-w-0 lets the long product names truncate instead of forcing the
          flex row wider than the viewport. */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4 sm:justify-start sm:p-5">
        <p className="text-micro font-semibold uppercase tracking-[0.1em] text-accent">
          {product.category}
        </p>
        <h3 className="font-display text-[0.9375rem] font-semibold leading-snug text-ink sm:text-heading">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted sm:line-clamp-none sm:flex-1">
          {product.blurb}
        </p>
        <p className="mt-1 text-sm font-semibold text-ink sm:mt-3">
          {product.priceCents === 0 ? "Included" : formatPrice(product.priceCents)}
        </p>
      </div>
    </Link>
  );
}
