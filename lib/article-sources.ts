import type { ProductInfo, Source, CraftSourceRef } from "@/types";

// 記事の参照情報源（Tier1〜4）を組み立てる共通ロジック。
// components/ArticleGenerator.tsx（楽観的表示用）と app/api/article/route.ts（保存用）の両方から使う。
export function buildArticleSources(params: {
  productInfo: Pick<ProductInfo, "artisan">;
  interviewAnswers: string;
  craftSources?: CraftSourceRef[];
}): Source[] {
  const { productInfo, interviewAnswers, craftSources } = params;
  const hasInterview = interviewAnswers.trim().length > 0;
  const src: Source[] = [];

  if (hasInterview) {
    src.push({ tier: "Tier 1", source: `${productInfo.artisan || "職人"}インタビュー`, note: "一次情報（独自取材）" });
  }

  if (craftSources && craftSources.length > 0) {
    // 工芸品由来の派生記事: 工芸百科事典に登録済みの実出典をTier1/2として使う
    craftSources.forEach((s) => {
      src.push({
        tier: s.tier === 1 ? "Tier 1" : "Tier 2",
        source: s.publisher || s.url,
        note: "工芸百科事典の登録出典",
      });
    });
  } else {
    src.push(
      { tier: "Tier 1", source: productInfo.artisan ? `${productInfo.artisan} 公式ショップ` : "商品ページ", note: "商品仕様・価格・職人情報" },
      { tier: "Tier 2", source: "Encyclopaedia Britannica", note: "技法の定義・歴史的背景" },
      { tier: "Tier 2", source: "ResearchGate / 学術論文", note: "材料の化学的性質・耐久性データ" }
    );
  }

  src.push(
    { tier: "Tier 3", source: "Musubi Kiln Journal", note: "伝統工芸のケア・使用方法" },
    { tier: "Tier 3", source: "専門クラフトメディア", note: "工芸品の比較・市場情報" },
    { tier: "Tier 4", source: "Amazon / eBay レビュー", note: "購買者の視点・競合商品情報" }
  );

  return src;
}
