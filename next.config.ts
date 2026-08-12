import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's query engine is a native binary; bundling it into the server chunks
  // breaks it. Marking it external keeps the engine loadable on Vercel.
  serverExternalPackages: ["@prisma/client", "prisma"],

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
