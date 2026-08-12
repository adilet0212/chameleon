import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's query engine is a native binary; bundling it into the server chunks
  // breaks it. Marking it external keeps the engine loadable on Vercel.
  serverExternalPackages: ["@prisma/client", "prisma"],

  images: {
    // Photography is served from Unsplash and re-optimised by next/image, which
    // is what emits AVIF/WebP at the sizes actually requested rather than
    // shipping a 2000px JPEG to a phone.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 828, 1080, 1200, 1920],
    imageSizes: [96, 128, 192, 256, 384],
    minimumCacheTTL: 2678400,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
