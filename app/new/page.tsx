import { ArticleGenerator } from "@/components/ArticleGenerator";
import { getCraftItems } from "@/lib/crafts-supabase";

export const dynamic = "force-dynamic";

export default async function NewPage() {
  let craftItems: Awaited<ReturnType<typeof getCraftItems>> = [];
  try {
    craftItems = await getCraftItems();
  } catch (e) {
    console.error("NewPage getCraftItems error:", e);
  }

  // ファクトが未収集の品目は情報が薄すぎるため選択肢から除外
  const eligibleCraftItems = craftItems.filter((c) => c.status !== "pending_facts");

  return <ArticleGenerator craftItems={eligibleCraftItems} />;
}
