import type { Theme } from "@prisma/client";
import type { CSSProperties } from "react";

/*
  Theme row -> CSS custom properties.

  The database stores a font *key*, not a CSS variable name. The mapping from key
  to loaded font lives here, in code, because which fonts are actually bundled is a
  build-time fact — the DB has no business knowing what next/font named its CSS
  variables. An unrecognised key degrades to the system stack rather than throwing.
*/

const FONT_STACKS: Record<string, string> = {
  inter: "var(--font-inter)",
  fraunces: "var(--font-fraunces)",
  spaceGrotesk: "var(--font-space-grotesk)",
  plexSans: "var(--font-plex-sans)",
  outfit: "var(--font-outfit)",
};

const SYSTEM_FALLBACK =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

function fontStack(key: string): string {
  const resolved = FONT_STACKS[key];
  return resolved ? `${resolved}, ${SYSTEM_FALLBACK}` : SYSTEM_FALLBACK;
}

/** The token contract. Everything the design system reads comes from this object. */
export function themeToCssVars(theme: Theme | null): CSSProperties {
  if (!theme) return {};
  return {
    "--t-primary": theme.primary,
    "--t-primary-ink": theme.primaryInk,
    "--t-secondary": theme.secondary,
    "--t-accent": theme.accent,
    "--t-accent-ink": theme.accentInk,
    "--t-ink": theme.ink,
    "--t-ink-muted": theme.inkMuted,
    "--t-surface": theme.surface,
    "--t-surface-raise": theme.surfaceRaise,
    "--t-surface-alt": theme.surfaceAlt,
    "--t-surface-sunken": theme.surfaceSunken,
    "--t-surface-brand": theme.surfaceBrand,
    "--t-border": theme.border,
    "--t-border-strong": theme.borderStrong,
    "--t-shadow": theme.shadowRgb,
    "--t-font-display": fontStack(theme.fontDisplay),
    "--t-font-body": fontStack(theme.fontBody),
    "--t-display-tracking": theme.displayTracking,
    "--t-radius": theme.radius,
  } as CSSProperties;
}
