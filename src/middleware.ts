import { NextResponse, type NextRequest } from "next/server";

/*
  Tenant resolution.

  Two addressing schemes resolve to the same place:

    rook-and-ridge.example.com/menu   ->  /rook-and-ridge/menu   (subdomain)
    example.com/rook-and-ridge/menu   ->  /rook-and-ridge/menu   (path segment)

  Subdomain form is rewritten to the path form so exactly one set of routes exists
  in the app. The alternative — duplicating the route tree per addressing scheme —
  is how multi-tenant codebases start forking.

  What this deliberately does NOT do is touch the database. Middleware runs on
  every request including static assets, and opening a Postgres connection there
  would put a query in front of every image. It resolves the *identifier* only;
  the tenant record itself is loaded in the server component that needs it, where
  React's cache() dedupes it to one query per request. An unknown slug falls
  through to notFound() there.
*/

const RESERVED = new Set([
  "_next",
  "api",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

// Apex hosts that carry no tenant. Anything else in position 0 is a candidate.
const APEX = new Set(["www", "localhost", "chameleon"]);

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

function tenantFromHost(host: string): string | null {
  const hostname = host.split(":")[0];
  // Vercel preview URLs (chameleon-abc123.vercel.app) are not tenant subdomains.
  if (hostname.endsWith(".vercel.app")) return null;

  const parts = hostname.split(".");
  if (parts.length < 3) return null; // no subdomain present

  const candidate = parts[0];
  if (APEX.has(candidate) || !SLUG.test(candidate)) return null;
  return candidate;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const first = pathname.split("/")[1] ?? "";
  if (RESERVED.has(first)) return NextResponse.next();

  const host = request.headers.get("host") ?? "";
  const subdomainTenant = tenantFromHost(host);

  // Subdomain addressing: fold it into the canonical path form.
  if (subdomainTenant && first !== subdomainTenant) {
    const url = request.nextUrl.clone();
    url.pathname = `/${subdomainTenant}${pathname === "/" ? "" : pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("x-tenant", subdomainTenant);
    return response;
  }

  // Path addressing: pass the resolved identifier downstream so server components
  // and instrumentation can read it without re-parsing the URL.
  const response = NextResponse.next();
  if (first && SLUG.test(first)) {
    response.headers.set("x-tenant", subdomainTenant ?? first);
  }
  return response;
}

export const config = {
  // Skip static assets and image optimisation entirely — no reason to run tenant
  // resolution for a font file.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)"],
};
