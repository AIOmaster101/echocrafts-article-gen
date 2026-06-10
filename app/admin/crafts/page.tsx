export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { CraftItem, CraftCategory } from "@/types/crafts";
import { CraftItemCard } from "@/components/crafts/CraftItemCard";
import { CraftCategoryFilter } from "@/components/crafts/CraftCategoryFilter";

async function getCraftItems(): Promise<CraftItem[]> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("craft_items")
    .select("*")
    .order("priority", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CraftItem[];
}

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function CraftsAdminPage({ searchParams }: PageProps) {
  const { category } = await searchParams;

  let crafts: CraftItem[] = [];
  try {
    crafts = await getCraftItems();
  } catch (e) {
    console.error("getCraftItems error:", e);
  }

  const filtered =
    category && category !== "all"
      ? crafts.filter((c) => c.category === (category as CraftCategory))
      : crafts;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              ← ダッシュボードに戻る
            </a>
          </div>
          <a
            href="/admin/crafts/new"
            className="px-4 py-2 bg-stone-800 text-white text-sm rounded-xl hover:bg-stone-700 transition-colors"
          >
            新規品目登録 →
          </a>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-medium text-stone-800 mb-4">工芸品目一覧</h1>
          <Suspense>
            <CraftCategoryFilter />
          </Suspense>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-stone-400 text-xl">✦</span>
            </div>
            <p className="text-stone-500 text-sm">
              {category && category !== "all"
                ? "このカテゴリには品目がありません。"
                : "まだ品目が登録されていません。新規登録から始めてください。"}
            </p>
            <a
              href="/admin/crafts/new"
              className="mt-4 px-5 py-2.5 bg-stone-800 text-white text-sm rounded-xl hover:bg-stone-700 transition-colors"
            >
              新規品目登録 →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((craft) => (
              <CraftItemCard key={craft.id} craft={craft} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
