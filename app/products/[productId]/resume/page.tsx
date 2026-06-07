import { getProductWithData } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ResumeArticleGenerator } from "@/components/ResumeArticleGenerator";
import type { ArticleGeneratorInitialState, ProductInfo, Theme, Questions } from "@/types";

export const dynamic = "force-dynamic";

export default async function ResumePage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ phase?: string }>;
}) {
  const { productId } = await params;
  const { phase: phaseParam } = await searchParams;

  const product = await getProductWithData(productId).catch(() => null);
  if (!product) notFound();

  const resumePhase = Number(phaseParam ?? product.phase_completed);

  // 再開用の初期状態を組み立て
  const productInfo: ProductInfo | undefined = product.name_ja
    ? {
        name_ja: product.name_ja ?? "",
        name_en: product.name_en ?? "",
        price_jpy: product.price_jpy ?? 0,
        price_usd: product.price_usd ?? 0,
        material: product.material ?? "",
        origin: product.origin ?? "",
        artisan: product.artisan ?? "",
        use_cases: product.use_cases ?? "",
        category_en: product.category_en ?? "",
        keywords: product.keywords ?? [],
        similar_products: product.similar_products ?? [],
        key_differentiator: product.key_differentiator ?? "",
      }
    : undefined;

  const themes: Theme[] = product.themes.map((t) => ({
    type: t.type as Theme["type"],
    title_en: t.title_en,
    title_ja: t.title_ja,
    score_aio: t.score_aio,
    score_demand: t.score_demand,
    score_sales: t.score_sales,
    score_cost: t.score_cost,
    aio_reason: t.aio_reason,
    key_blank: t.key_blank,
  }));

  // interview_questionsからQuestionsを再構築（最優先テーマ分）
  // ※ interview_questionsはAPIルート経由で取得していないため、phase3再開時はquestions=undefined
  const questions: Questions | undefined = undefined;

  const initialState: ArticleGeneratorInitialState = {
    productId,
    phase: resumePhase,
    urls: (product.urls ?? []).join("\n"),
    q1: product.q1 as ArticleGeneratorInitialState["q1"],
    q2: product.q2 as ArticleGeneratorInitialState["q2"],
    productInfo,
    themes: themes.length > 0 ? themes : undefined,
    questions,
  };

  return <ResumeArticleGenerator initialState={initialState} />;
}
