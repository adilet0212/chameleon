import type { Metadata } from "next";
import {
  Inter,
  Fraunces,
  Space_Grotesk,
  IBM_Plex_Sans,
  Outfit,
} from "next/font/google";
import "./globals.css";

/*
  All brand typefaces are loaded once at the root and exposed as CSS variables.
  A tenant's theme selects between them by setting --t-font-display / --t-font-body,
  so switching brands never triggers a font network request — the demo re-skins
  instantly instead of flashing unstyled text halfway through.

  `display: "swap"` on every face keeps first paint fast on a phone over LTE.
*/

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Chameleon — one codebase, many branded front-ends",
    template: "%s",
  },
  description:
    "A multi-tenant storefront platform. Theme, content, routing and data are resolved per request from Postgres, so launching a new client brand is a database row rather than a fork of the codebase.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e1e1e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${spaceGrotesk.variable} ${plexSans.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
