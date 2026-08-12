import { notFound } from "next/navigation";
import {
  getTenant,
  listFeatured,
  listCategories,
  countProducts,
} from "@/lib/tenant";
import { TenantHome } from "@/components/HomeLayouts";

/*
  The home route does data only. Which arrangement those rows get rendered in is
  decided by the tenant's layoutVariant token inside TenantHome — so this file has
  no idea whether it is producing an editorial page or a dense one.
*/
export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await getTenant(slug);
  if (!tenant) notFound();

  const [featured, categories, totalVisible] = await Promise.all([
    listFeatured(tenant.id, 3),
    listCategories(tenant.id),
    countProducts(tenant.id),
  ]);

  return (
    <TenantHome
      tenant={tenant}
      featured={featured}
      categories={categories}
      totalVisible={totalVisible}
    />
  );
}
