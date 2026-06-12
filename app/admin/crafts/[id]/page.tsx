"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import type { CraftItem, CraftSource, CraftItemStatus } from "@/types/crafts";
import Link from "next/link";

const PIPELINE_STEPS: { status: CraftItemStatus; label: string }[] = [
  { status: "pending_facts", label: "Pending" },
  { status: "facts_review", label: "Facts Review" },
  { status: "generating", label: "Generating" },
  { status: "article_review", label: "Article Review" },
  { status: "approved", label: "Approved" },
  { status: "pushed", label: "Pushed" },
];

const STATUS_ORDER: CraftItemStatus[] = [
  "pending_facts",
  "facts_review",
  "generating",
  "article_review",
  "approved",
  "pushed",
  "published",
];

function statusIndex(s: CraftItemStatus) {
  return STATUS_ORDER.indexOf(s);
}

const CATEGORY_LABELS: Record<string, string> = {
  ceramics: "陶磁器",
  glass: "ガラス",
  textiles: "織物",
  lacquerware: "漆器",
  metalwork: "金属工芸",
  woodwork: "木工",
  paper: "和紙",
  other: "その他",
};

export default function CraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [craft, setCraft] = useState<CraftItem | null>(null);
  const [sources, setSources] = useState<CraftSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Autonomous generate state
  const [autonomousLoading, setAutonomousLoading] = useState(false);
  const [autonomousError, setAutonomousError] = useState<string | null>(null);

  // Add source form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addPublisher, setAddPublisher] = useState("");
  const [addTier, setAddTier] = useState<1 | 2>(2);
  const [addLoading, setAddLoading] = useState(false);

  // Fetch state per source
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadData() {
    try {
      const [craftRes, sourcesRes] = await Promise.all([
        fetch(`/api/admin/crafts/${id}`),
        fetch(`/api/admin/crafts/${id}/sources`),
      ]);
      if (!craftRes.ok) throw new Error("品目の取得に失敗しました");
      const craftData = await craftRes.json();
      const sourcesData = sourcesRes.ok ? await sourcesRes.json() : [];
      setCraft(craftData);
      setSources(Array.isArray(sourcesData) ? sourcesData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleFetch(sourceId: string) {
    setFetchingId(sourceId);
    try {
      const res = await fetch(`/api/admin/crafts/${id}/sources/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: sourceId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert("取得失敗: " + (err.error ?? "不明なエラー"));
        return;
      }
      // Refresh sources
      const sourcesRes = await fetch(`/api/admin/crafts/${id}/sources`);
      if (sourcesRes.ok) setSources(await sourcesRes.json());
    } finally {
      setFetchingId(null);
    }
  }

  async function handleDelete(sourceId: string) {
    if (!confirm("このソースを削除しますか？")) return;
    setDeletingId(sourceId);
    try {
      const res = await fetch(
        `/api/admin/crafts/${id}/sources?source_id=${sourceId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json();
        alert("削除失敗: " + (err.error ?? "不明なエラー"));
        return;
      }
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAutonomousGenerate() {
    setAutonomousLoading(true);
    setAutonomousError(null);
    try {
      const res = await fetch("/api/crafts/autonomous-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ craft_item_id: id }),
      });
      if (!res.ok) {
        let errMsg = "不明なエラーが発生しました";
        try {
          const err = await res.json();
          errMsg = err.error ?? errMsg;
        } catch {
          errMsg = `サーバーエラー (HTTP ${res.status})`;
        }
        setAutonomousError(errMsg);
        return;
      }
      router.push(`/admin/crafts/${id}/article`);
    } catch (e) {
      setAutonomousError(e instanceof Error ? e.message : String(e));
    } finally {
      setAutonomousLoading(false);
    }
  }

  async function handleAddSource(e: React.FormEvent) {
    e.preventDefault();
    if (!addUrl) return;
    setAddLoading(true);
    try {
      const res = await fetch(`/api/admin/crafts/${id}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: addUrl,
          title: addTitle || null,
          publisher: addPublisher || null,
          tier: addTier,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert("追加失敗: " + (err.error ?? "不明なエラー"));
        return;
      }
      const newSource = await res.json();
      setSources((prev) => [...prev, newSource]);
      setAddUrl("");
      setAddTitle("");
      setAddPublisher("");
      setAddTier(2);
      setShowAddForm(false);
    } finally {
      setAddLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (error || !craft) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-red-500 text-sm">{error ?? "品目が見つかりません"}</p>
      </div>
    );
  }

  const currentIndex = statusIndex(craft.status);
  const hasFetchedSource = sources.some((s) => !!s.raw_text);
  const canGenerateArticle = currentIndex >= statusIndex("facts_review");

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Back link */}
        <Link
          href="/admin/crafts"
          className="text-xs text-stone-400 hover:text-stone-600 mb-4 block"
        >
          ← 品目一覧
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-stone-800">
              {craft.name_en}{" "}
              <span className="text-stone-500 font-normal">({craft.name_ja})</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Category badge */}
            <span className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
              {CATEGORY_LABELS[craft.category] ?? craft.category}
            </span>
            {/* Article type badge */}
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full ${
                craft.article_type === "pillar"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-sky-100 text-sky-700"
              }`}
            >
              {craft.article_type === "pillar" ? "Pillar" : "Spoke"}
            </span>
            {/* Status badge */}
            <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {craft.status}
            </span>
          </div>
          {/* Meta info */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
            <span>slug: <span className="font-mono text-stone-700">{craft.slug}</span></span>
            {(craft.region_ja || craft.region_en) && (
              <span>地域: {craft.region_ja}{craft.region_en ? ` / ${craft.region_en}` : ""}</span>
            )}
            {craft.meti_designated && (
              <span className="text-emerald-600 font-medium">
                METI指定{craft.meti_designation_year ? ` (${craft.meti_designation_year})` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Pipeline progress */}
        <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-4">
            パイプライン進捗
          </h2>
          <div className="flex items-center gap-0">
            {PIPELINE_STEPS.map((step, i) => {
              const stepIndex = statusIndex(step.status);
              const isDone = currentIndex > stepIndex;
              const isCurrent = currentIndex === stepIndex;
              return (
                <div key={step.status} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-stone-800 text-white"
                          : "bg-stone-100 text-stone-400"
                      }`}
                    >
                      {isDone ? "✓" : i + 1}
                    </div>
                    <span
                      className={`text-[9px] mt-1 text-center max-w-[56px] leading-tight ${
                        isCurrent ? "text-stone-800 font-medium" : "text-stone-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div
                      className={`w-8 h-0.5 mb-3 ${
                        isDone ? "bg-emerald-400" : "bg-stone-100"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sources section */}
        <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              ソース ({sources.length})
            </h2>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="text-xs text-stone-600 hover:text-stone-800 border border-stone-200 rounded-lg px-3 py-1 hover:bg-stone-50 transition-colors"
            >
              {showAddForm ? "キャンセル" : "+ ソースを追加"}
            </button>
          </div>

          {/* Source list */}
          {sources.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">
              ソースが登録されていません
            </p>
          ) : (
            <div className="space-y-3">
              {sources.map((src) => (
                <div
                  key={src.id}
                  className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl"
                >
                  {/* Tier badge */}
                  <span
                    className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                      src.tier === 1
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    Tier{src.tier}
                  </span>

                  <div className="flex-1 min-w-0">
                    {src.publisher && (
                      <p className="text-xs font-medium text-stone-700 mb-0.5">
                        {src.publisher}
                      </p>
                    )}
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate block"
                    >
                      {src.title ?? src.url}
                    </a>
                    <p className="text-[10px] text-stone-400 mt-1">
                      {src.raw_text ? (
                        <span className="text-emerald-600">
                          ✓ 取得済 ({src.raw_text.length.toLocaleString()}文字)
                          {src.fetched_at && (
                            <> · {new Date(src.fetched_at).toLocaleDateString("ja-JP")}</>
                          )}
                        </span>
                      ) : (
                        <span className="text-stone-400">✗ 未取得</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleFetch(src.id)}
                      disabled={fetchingId === src.id}
                      className="text-[11px] text-stone-600 hover:text-stone-800 border border-stone-200 rounded-lg px-2 py-1 hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {fetchingId === src.id ? "取得中..." : "ページ本文を取得"}
                    </button>
                    <button
                      onClick={() => handleDelete(src.id)}
                      disabled={deletingId === src.id}
                      className="text-[11px] text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add source form */}
          {showAddForm && (
            <form onSubmit={handleAddSource} className="mt-4 border-t border-stone-100 pt-4 space-y-3">
              <div>
                <label className="text-xs text-stone-600 block mb-1">
                  URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  required
                  placeholder="https://example.com/..."
                  className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-600 block mb-1">タイトル</label>
                  <input
                    type="text"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-600 block mb-1">発行元</label>
                  <input
                    type="text"
                    value={addPublisher}
                    onChange={(e) => setAddPublisher(e.target.value)}
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-stone-600 block mb-1">ティア</label>
                <div className="flex gap-4">
                  {([1, 2] as const).map((t) => (
                    <label key={t} className="flex items-center gap-1.5 text-sm text-stone-700 cursor-pointer">
                      <input
                        type="radio"
                        name="tier"
                        value={t}
                        checked={addTier === t}
                        onChange={() => setAddTier(t)}
                        className="accent-stone-700"
                      />
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          t === 1
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        Tier{t}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={addLoading}
                className="w-full bg-stone-800 text-white text-sm py-2 rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-50"
              >
                {addLoading ? "追加中..." : "ソースを追加"}
              </button>
            </form>
          )}
        </div>

        {/* Pipeline action buttons */}
        <div className="space-y-4">
          {/* Autonomous generate — primary CTA */}
          <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
            <button
              onClick={handleAutonomousGenerate}
              disabled={autonomousLoading}
              className="w-full bg-stone-800 text-white text-sm py-3.5 rounded-xl font-semibold hover:bg-stone-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {autonomousLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white flex-shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>ソース取得 → 事実抽出 → 記事生成中... (約60秒)</span>
                </>
              ) : (
                "自律生成（ワンクリック）"
              )}
            </button>
            {autonomousError && (
              <p className="mt-2 text-xs text-red-500 text-center">{autonomousError}</p>
            )}
            <p className="mt-2 text-[11px] text-stone-400 text-center">
              ソース自動取得 → 事実抽出 → 記事生成をまとめて実行します
            </p>
          </div>

          {/* Manual flow — secondary */}
          <div>
            <p className="text-[11px] text-stone-400 mb-2 text-center">詳細設定（手動フロー）</p>
            <div className="flex gap-3">
              <Link
                href={hasFetchedSource ? `/admin/crafts/${id}/facts` : "#"}
                aria-disabled={!hasFetchedSource}
                className={`flex-1 text-center text-sm py-3 rounded-xl font-medium transition-colors ${
                  hasFetchedSource
                    ? "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    : "bg-stone-100 text-stone-400 cursor-not-allowed pointer-events-none"
                }`}
              >
                事実レビュー
              </Link>
              <Link
                href={canGenerateArticle ? `/admin/crafts/${id}/article` : "#"}
                aria-disabled={!canGenerateArticle}
                className={`flex-1 text-center text-sm py-3 rounded-xl font-medium transition-colors ${
                  canGenerateArticle
                    ? "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    : "bg-stone-100 text-stone-400 cursor-not-allowed pointer-events-none"
                }`}
              >
                記事を生成する
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
