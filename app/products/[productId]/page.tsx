import { getProductWithData } from "@/lib/supabase";
import { PhaseProgressBadge } from "@/components/dashboard/PhaseProgressBadge";
import { notFound } from "next/navigation";
import { ArticleViewer } from "@/components/dashboard/ArticleViewer";

export const dynamic = "force-dynamic";

const ARTICLE_TYPES = [
  { id: "faq", label: "FAQ / How-to", emoji: "❓" },
  { id: "what", label: "What is（定義）", emoji: "📖" },
  { id: "best", label: "Best / Guide", emoji: "🏆" },
  { id: "vs", label: "比較 / 職人Story", emoji: "⚖️" },
];

const PHASE_LABELS = [
  "インプット",
  "情報抽出",
  "テーマ選定",
  "質問生成",
  "記事生成",
];

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProductWithData(productId).catch(() => null);
  if (!product) notFound();

  const nextPhase = product.phase_completed < 4 ? product.phase_completed : null;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* ヘッダー */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <a href="/" className="text-xs text-stone-400 hover:text-stone-600 mb-3 block">
              ← ダッシュボードに戻る
            </a>
            <h1 className="text-xl font-medium text-stone-800">
              {product.name_ja || product.name_en || "商品詳細"}
            </h1>
            {product.name_en && product.name_ja && (
              <p className="text-sm text-stone-500 mt-0.5">{product.name_en}</p>
            )}
          </div>
          <PhaseProgressBadge phase={product.phase_completed as 0 | 1 | 2 | 3 | 4} />
        </div>

        {/* 続きから再開ボタン */}
        {nextPhase !== null && (
          <a
            href={`/products/${productId}/resume?phase=${product.phase_completed}`}
            className="flex items-center justify-between w-full mb-6 p-4 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">
                「{PHASE_LABELS[product.phase_completed + 1] ?? "次のステップ"}」から続きを再開
              </p>
              <p className="text-xs text-stone-300 mt-0.5">
                現在: {PHASE_LABELS[product.phase_completed]} 完了
              </p>
            </div>
            <span className="text-lg">→</span>
          </a>
        )}

        {/* 商品情報 */}
        {product.name_ja && (
          <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-sm font-medium text-stone-700 mb-4">商品情報</h2>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["商品名（日本語）", product.name_ja],
                ["商品名（英語）", product.name_en],
                ["価格", product.price_jpy ? `¥${product.price_jpy.toLocaleString()} ≈ $${product.price_usd}` : "—"],
                ["産地・工房", product.origin],
                ["職人名", product.artisan],
                ["カテゴリ", product.category_en],
              ] as [string, string | null | undefined][]).map(([k, v]) => v ? (
                <div key={k} className="p-3 bg-stone-50 rounded-xl">
                  <p className="text-[10px] text-stone-400 mb-0.5">{k}</p>
                  <p className="text-sm text-stone-800 font-medium">{v}</p>
                </div>
              ) : null)}
            </div>
            {product.key_differentiator && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-[10px] text-emerald-600 mb-1 font-medium">最大の差別化ポイント</p>
                <p className="text-sm text-emerald-800 font-medium">{product.key_differentiator}</p>
              </div>
            )}
          </div>
        )}

        {/* テーマ一覧 */}
        {product.themes.length > 0 && (
          <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-sm font-medium text-stone-700 mb-4">選定テーマ</h2>
            <div className="space-y-3">
              {product.themes.map((t, i) => {
                const type = ARTICLE_TYPES.find((a) => a.id === t.type) || ARTICLE_TYPES[0];
                const total = t.score_aio + t.score_demand + t.score_sales + t.score_cost;
                const article = product.articles.find((a) => a.theme_index === i);
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                    <span className="text-lg">{type.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{t.title_en}</p>
                      <p className="text-xs text-stone-500">{t.title_ja}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-stone-400">{total}点</span>
                      {article ? (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">記事あり</span>
                      ) : (
                        <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">未生成</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 生成済み記事 */}
        {product.articles.length > 0 && (
          <ArticleViewer
            articles={product.articles}
            themes={product.themes}
          />
        )}

      </div>
    </div>
  );
}
