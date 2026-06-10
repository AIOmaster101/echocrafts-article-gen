"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CraftCategory, ArticleType, CraftItem } from "@/types/crafts";

const CATEGORIES: CraftCategory[] = [
  "ceramics",
  "glass",
  "textiles",
  "lacquerware",
  "metalwork",
  "woodwork",
  "paper",
  "other",
];

export default function NewCraftPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pillars, setPillars] = useState<CraftItem[]>([]);

  const [slug, setSlug] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameJa, setNameJa] = useState("");
  const [category, setCategory] = useState<CraftCategory>("ceramics");
  const [articleType, setArticleType] = useState<ArticleType>("pillar");
  const [pillarId, setPillarId] = useState<string>("");
  const [regionEn, setRegionEn] = useState("");
  const [regionJa, setRegionJa] = useState("");
  const [metiDesignated, setMetiDesignated] = useState(false);
  const [metiYear, setMetiYear] = useState<number | "">(2000);
  const [priority, setPriority] = useState<number>(100);

  useEffect(() => {
    fetch("/api/admin/crafts")
      .then((r) => r.json())
      .then((data: CraftItem[]) => {
        if (Array.isArray(data)) {
          setPillars(data.filter((c) => c.article_type === "pillar"));
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      slug,
      name_en: nameEn,
      name_ja: nameJa,
      category,
      article_type: articleType,
      pillar_id: articleType === "spoke" && pillarId ? pillarId : null,
      region_en: regionEn || null,
      region_ja: regionJa || null,
      meti_designated: metiDesignated,
      meti_designation_year:
        metiDesignated && metiYear !== "" ? Number(metiYear) : null,
      priority,
      status: "pending_facts",
    };

    try {
      const res = await fetch("/api/admin/crafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
        setLoading(false);
        return;
      }
      router.push(`/admin/crafts/${data.id}`);
    } catch {
      setError("通信エラーが発生しました");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <a
            href="/admin/crafts"
            className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            ← 品目一覧に戻る
          </a>
        </div>

        <h1 className="text-xl font-medium text-stone-800 mb-6">新規品目登録</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* slug */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. kyoto-nishijin-ori"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
            />
            <p className="text-xs text-stone-400 mt-1">小文字英数字とハイフンのみ</p>
          </div>

          {/* name_en */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Name (EN) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Nishijin Weaving"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
            />
          </div>

          {/* name_ja */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Name (JA) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nameJa}
              onChange={(e) => setNameJa(e.target.value)}
              placeholder="e.g. 西陣織"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
            />
          </div>

          {/* category */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              カテゴリ
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CraftCategory)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* article_type */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              記事タイプ
            </label>
            <div className="flex gap-4">
              {(["pillar", "spoke"] as ArticleType[]).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="article_type"
                    value={t}
                    checked={articleType === t}
                    onChange={() => setArticleType(t)}
                    className="accent-stone-800"
                  />
                  <span className="text-sm text-stone-700">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* pillar_id (only for spoke) */}
          {articleType === "spoke" && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Pillar記事
              </label>
              <select
                value={pillarId}
                onChange={(e) => setPillarId(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
              >
                <option value="">-- 選択してください --</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_en} ({p.name_ja})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* region_en */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Region (EN)
            </label>
            <input
              type="text"
              value={regionEn}
              onChange={(e) => setRegionEn(e.target.value)}
              placeholder="e.g. Kyoto"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
            />
          </div>

          {/* region_ja */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Region (JA)
            </label>
            <input
              type="text"
              value={regionJa}
              onChange={(e) => setRegionJa(e.target.value)}
              placeholder="e.g. 京都府"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
            />
          </div>

          {/* meti_designated */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={metiDesignated}
                onChange={(e) => setMetiDesignated(e.target.checked)}
                className="accent-stone-800"
              />
              <span className="text-sm text-stone-700">経済産業省指定伝統的工芸品</span>
            </label>
          </div>

          {/* meti_designation_year */}
          {metiDesignated && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                指定年
              </label>
              <input
                type="number"
                value={metiYear}
                onChange={(e) =>
                  setMetiYear(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="e.g. 1976"
                min={1900}
                max={2100}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
              />
            </div>
          )}

          {/* priority */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              優先度
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              min={1}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-stone-800 text-white text-sm rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            {loading ? "登録中..." : "登録する"}
          </button>
        </form>
      </div>
    </div>
  );
}
