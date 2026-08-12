import Image from "next/image";
import { BrandArt } from "@/components/BrandArt";

/*
  One image slot, two sources.

  A product with photography renders it through next/image, which re-encodes to
  AVIF/WebP at the requested size rather than shipping a full-resolution JPEG to a
  phone. A product without falls back to the generated artwork — the 15,000
  benchmark rows have no photography, and a brand onboarded before its assets
  arrive should still render something on-brand rather than a broken image.

  The brand tint is what stops three sets of free-licence stock photos from
  looking like three sets of free-licence stock photos: a low-opacity wash of the
  tenant's own primary, multiplied over the photograph, pulls every image in a
  storefront toward that brand's palette. Same mechanism as everything else here —
  it reads the token, so it costs no per-brand code.

  `fill` plus a fixed-aspect parent is deliberate: the wrapper reserves the space
  before the image loads, so there is no layout shift. CLS measured 0.
*/

type Props = {
  src: string | null;
  alt: string;
  seed: number;
  treatment: string;
  /** Tailwind aspect/size classes for the wrapper. It must establish the box. */
  className?: string;
  /** Responsive sizes hint — wrong values here are the usual cause of oversized downloads. */
  sizes: string;
  priority?: boolean;
  hero?: boolean;
  /** Strength of the brand wash. Heavier on large placements. */
  tint?: "none" | "soft" | "strong";
};

const TINT = {
  none: "",
  soft: "opacity-[0.14]",
  strong: "opacity-[0.24]",
};

export function ProductImage({
  src,
  alt,
  seed,
  treatment,
  className = "",
  sizes,
  priority = false,
  hero = false,
  tint = "soft",
}: Props) {
  if (!src) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <BrandArt
          seed={seed}
          treatment={treatment}
          hero={hero}
          className="card-art size-full"
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-sunken ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        className="card-art size-full object-cover"
      />
      {tint !== "none" && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-primary mix-blend-multiply ${TINT[tint]}`}
        />
      )}
    </div>
  );
}
