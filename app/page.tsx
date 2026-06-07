import { getProducts } from "@/lib/supabase";
import { ProductCard } from "@/components/dashboard/ProductCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">✦</span>
            </div>
            <h1 className="text-xl font-medium text-stone-800">
              EchoCrafts Article Generator
            </h1>
          </div>
          <a
            href="/new"
            className="px-4 py-2 bg-stone-800 text-white text-sm rounded-xl hover:bg-stone-700 transition-colors"
          >
            + 新規作成
          </a>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-stone-400 text-xl">✦</span>
            </div>
            <p className="text-stone-500 text-sm">
              まだ商品が登録されていません。新規作成から始めてください。
            </p>
            <a
              href="/new"
              className="mt-4 px-5 py-2.5 bg-stone-800 text-white text-sm rounded-xl hover:bg-stone-700 transition-colors"
            >
              + 新規作成
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
