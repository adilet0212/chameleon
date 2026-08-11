import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-5 py-16 sm:px-8">
      <p className="text-micro font-semibold uppercase tracking-[0.14em] text-muted">
        404
      </p>
      <h1 className="mt-4 font-display text-title font-semibold">
        That page isn&apos;t here.
      </h1>
      <p className="mt-4 text-lede text-muted">
        This may be an unknown brand, or an item that belongs to a different brand.
        Item URLs are scoped to the brand that owns them.
      </p>
      <Link
        href="/"
        className="mt-8 self-start rounded-brand border border-hairline px-6 py-3 text-sm font-semibold transition-colors hover:bg-raise"
      >
        Back to all brands
      </Link>
    </div>
  );
}
