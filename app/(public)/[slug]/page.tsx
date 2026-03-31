import { PageBody } from "@/components/layout/page-body";
import { PageHeader } from "@/components/layout/page-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/validation/price";
import type { Category, Product } from "@/types";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

type PublicMenuPageProps = {
  params: Promise<{ slug: string }>;
};

type MenuCategory = Pick<Category, "id" | "name" | "sort_order">;
type MenuProduct = Pick<
  Product,
  "id" | "category_id" | "name" | "description" | "price" | "image_url" | "is_active" | "is_available" | "track_stock" | "stock_quantity"
>;

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export default async function PublicMenuPage({ params }: PublicMenuPageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug, is_active")
    .eq("slug", slug)
    .maybeSingle<StoreRow>();

  if (storeError || !store || !store.is_active) {
    notFound();
  }

  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, sort_order")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<MenuCategory[]>(),
    supabase
      .from("products")
      .select(
        "id, category_id, name, description, price, image_url, is_active, is_available, track_stock, stock_quantity"
      )
      .eq("store_id", store.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<MenuProduct[]>(),
  ]);

  if (categoriesResult.error) {
    throw new Error(`Erro ao carregar categorias: ${categoriesResult.error.message}`);
  }

  if (productsResult.error) {
    throw new Error(`Erro ao carregar produtos: ${productsResult.error.message}`);
  }

  const categories = categoriesResult.data ?? [];
  const products = productsResult.data ?? [];

  const visibleProducts = products.filter(productIsVisible);
  const productsByCategory = groupProductsByCategory(visibleProducts);
  const sections = categories
    .map((category) => ({
      category,
      products: productsByCategory.get(category.id) ?? [],
    }))
    .filter((section) => section.products.length > 0);

  const hasCategories = categories.length > 0;
  const hasVisibleProducts = sections.length > 0;

  let bodyContent: ReactNode;

  if (!hasCategories) {
    bodyContent = (
      <EmptyState
        title="Nenhuma categoria ativa"
        description="O cardápio desta loja ainda não possui categorias disponíveis."
      />
    );
  } else if (!hasVisibleProducts) {
    bodyContent = (
      <EmptyState
        title="Produtos indisponíveis"
        description="As categorias existem, mas nenhum produto elegível está disponível no momento."
      />
    );
  } else {
    bodyContent = (
      <div className="mx-auto max-w-4xl space-y-10">
        {sections.map(({ category, products }) => (
          <section key={category.id} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{category.name}</h2>
              <p className="text-sm text-zinc-500">Itens preparados no capricho.</p>
            </div>
            <div className="space-y-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={store.name}
        description="Confira o cardápio digital e peça direto no balcão."
        backHref="/"
        backLabel="Início"
      />
      <PageBody>
        <div className="px-6 py-8">
          {bodyContent}
        </div>
      </PageBody>
    </>
  );
}

function productIsVisible(product: MenuProduct) {
  if (!product.is_active || !product.is_available) {
    return false;
  }

  if (product.track_stock && product.stock_quantity <= 0) {
    return false;
  }

  return true;
}

function groupProductsByCategory(products: MenuProduct[]) {
  const map = new Map<string, MenuProduct[]>();

  for (const product of products) {
    const current = map.get(product.category_id) ?? [];
    current.push(product);
    map.set(product.category_id, current);
  }

  return map;
}

function ProductCard({ product }: { product: MenuProduct }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        {product.image_url ? (
          <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-zinc-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-base font-medium text-zinc-900">{product.name}</h3>
            <span className="text-sm font-semibold text-zinc-900">{formatBRL(product.price)}</span>
          </div>
          {product.description ? (
            <p className="mt-2 text-sm text-zinc-600">{product.description}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-zinc-200 bg-white px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>
    </div>
  );
}
