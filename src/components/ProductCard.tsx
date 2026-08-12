import Link from "next/link";
import type { Product } from "@prisma/client";
import { BrandArt } from "@/components/BrandArt";
import { formatPrice } from "@/lib/tenant";

/*
  One card, used by every layout variant.

  Shape changes rather than scale between breakpoints. On a phone the compact form
  is a row — 92px of artwork on the left, copy on the right — because a full-bleed
  image per card meant roughly one item per screen, which is a bad way to read a
  catalogue. From `sm` up there is room for the image to lead.

  The `size` prop is chosen by the tenant's layout variant, not by the page, so an
  editorial brand can lead with a large card and a dense brand can run four across
  without either one needing its own component.
*/

export type CardSize = "lead" | "standard" | "compact";

type Props = {
  product: Product;
  href: string;
  treatment: string;
  size?: CardSize;
  /** Stagger index for the entrance animation. */
  index?: number;
};

const ART_ASPECT: Record<CardSize, string> = {
  lead: "aspect-[4/3] w-full",
  standard: "aspect-[3/2] w-full",
  compact: "size-[92px] shrink-0 sm:aspect-[4/3] sm:size-auto sm:w-full",
};

export function ProductCard({
  product,
  href,
  treatment,
  size = "standard",
  index = 0,
}: Props) {
  const compact = size === "compact";
  const lead = size === "lead";

  return (
    <Link
      href={href}
      data-testid="catalog-item"
      className={[
        "card-i rise group flex h-full overflow-hidden rounded-brand-lg border border-hairline bg-raise shadow-brand hover:border-hairline-strong hover:shadow-brand-lift",
        compact ? "flex-row sm:flex-col" : "flex-col",
        `rise-${Math.min(4, (index % 4) + 1)}`,
      ].join(" ")}
    >
      <div className={`overflow-hidden ${compact ? "shrink-0" : ""}`}>
        <BrandArt
          seed={product.artSeed}
          treatment={treatment}
          hero={lead}
          className={`card-art ${ART_ASPECT[size]}`}
        />
      </div>

      {/* min-w-0 lets long names truncate instead of forcing the row wider than
          the viewport. */}
      <div
        className={[
          "flex min-w-0 flex-1 flex-col justify-center gap-1.5",
          compact ? "p-4 sm:justify-start sm:p-5" : lead ? "p-6 sm:p-8" : "p-5",
        ].join(" ")}
      >
        <p className="text-micro font-semibold uppercase text-accent">
          {product.category}
        </p>
        <h3
          className={[
            "display-type font-semibold leading-snug text-ink",
            lead ? "text-title" : compact ? "text-[0.95rem] sm:text-heading" : "text-heading",
          ].join(" ")}
        >
          {product.name}
        </h3>
        <p
          className={[
            "text-sm leading-relaxed text-muted",
            compact ? "line-clamp-2 sm:line-clamp-none" : "line-clamp-3",
            lead ? "sm:text-lede" : "",
          ].join(" ")}
        >
          {lead ? product.description : product.blurb}
        </p>
        <p
          className={[
            "mt-auto pt-2 font-semibold tabular-nums text-ink",
            lead ? "text-heading" : "text-sm",
          ].join(" ")}
        >
          {product.priceCents === 0 ? "Included" : formatPrice(product.priceCents)}
        </p>
      </div>
    </Link>
  );
}
