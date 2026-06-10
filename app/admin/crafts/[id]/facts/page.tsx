"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { CraftItem, CraftFact, CraftSource, FactType, FactConfidence } from "@/types/crafts";

// Fact with joined source
type FactWithSource = CraftFact & {
  source: Pick<CraftSource, "publisher" | "url" | "tier">;
};

const FACT_TYPE_LABELS: Record<FactType, string> = {
  definition: "定義",
  history: "歴史",
  technique: "技法",
  process: "工程",
  material: "素材",
  stat: "統計",
  identification: "識別",
  region: "産地",
  designation: "指定",
};

const FACT_TYPE_COLORS: Record<FactType, string> = {
  definition: "bg-indigo-100 text-indigo-700",
  history: "bg-amber-100 text-amber-700",
  technique: "bg-violet-100 text-violet-700",
  process: "bg-cyan-100 text-cyan-700",
  material: "bg-teal-100 text-teal-700",
  stat: "bg-orange-100 text-orange-700",
  identification: "bg-rose-100 text-rose-700",
  region: "bg-emerald-100 text-emerald-700",
  designation: "bg-blue-100 text-blue-700",
};

const CONFIDENCE_LABELS: Record<FactConfidence, string> = {
  extracted: "抽出済",
  approved: "承認済",
  edited: "編集済",
  rejected: "却下",
};

const CONFIDENCE_COLORS: Record<FactConfidence, string> = {
  extracted: "bg-stone-100 text-stone-600",
  approved: "bg-green-100 text-green-700",
  edited: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-600",
};

const REQUIRED_TYPES: FactType[] = ["definition", "history", "designation", "region"];

const FACT_TYPE_ORDER: FactType[] = [
  "definition", "history", "region", "designation",
  "technique", "process", "material", "stat", "identification",
];

interface EditState {
  claim: string;
  year: string;
  note: string;
}

export default function FactsReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [craft, setCraft] = useState<CraftItem | null>(null);
  const [facts, setFacts] = useState<FactWithSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ claim: "", year: "", note: "" });
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [craftRes, factsRes] = await Promise.all([
        fetch(`/api/admin/crafts/${id}`),
        fetch(`/api/admin/crafts/${id}/facts`),
      ]);
      if (!craftRes.ok) throw new Error("品目の取得に失敗しました");
      if (!factsRes.ok) throw new Error("事実の取得に失敗しました");
      const craftData = await craftRes.json();
      const factsData = await factsRes.json();
      setCraft(craftData);
      setFacts(factsData.facts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const res = await fetch(`/api/admin/crafts/${id}/extract`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "抽出に失敗しました");
      await fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setExtracting(false);
    }
  };

  const handleAction = async (
    factId: string,
    action: "approve" | "reject" | "edit",
    extra?: { claim?: string; year?: number | null; note?: string }
  ) => {
    setSaving(factId);
    try {
      const res = await fetch(`/api/admin/crafts/${id}/facts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fact_id: factId, action, ...extra }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "保存に失敗しました");
      }
      // Update locally
      setFacts((prev) =>
        prev.map((f) => {
          if (f.id !== factId) return f;
          const updated = { ...f, confidence: action === "approve" ? "approved" : action === "reject" ? "rejected" : "edited" } as FactWithSource;
          if (action === "edit" && extra) {
            updated.content = {
              ...f.content,
              ...(extra.claim !== undefined ? { claim: extra.claim } : {}),
              ...(extra.year !== undefined ? { year: extra.year } : {}),
            };
            if (extra.note !== undefined) updated.reviewer_note = extra.note;
          }
          return updated;
        })
      );
      if (editingId === factId) setEditingId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };

  const startEdit = (fact: FactWithSource) => {
    setEditingId(fact.id);
    setEditState({
      claim: fact.content.claim,
      year: fact.content.year != null ? String(fact.content.year) : "",
      note: fact.reviewer_note ?? "",
    });
  };

  // Quality guard: check required types with approved/edited facts
  const approvedTypes = new Set(
    facts
      .filter((f) => f.confidence === "approved" || f.confidence === "edited")
      .map((f) => f.fact_type)
  );
  const missingRequired = REQUIRED_TYPES.filter((t) => !approvedTypes.has(t));
  const canGenerate = missingRequired.length === 0;

  // Group facts by type
  const grouped: Partial<Record<FactType, FactWithSource[]>> = {};
  for (const fact of facts) {
    if (!grouped[fact.fact_type]) grouped[fact.fact_type] = [];
    grouped[fact.fact_type]!.push(fact);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <a
              href={`/admin/crafts`}
              className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              ← 品目詳細に戻る
            </a>
            <h1 className="text-xl font-medium text-stone-800 mt-2">
              事実レビュー — {craft?.name_en}
            </h1>
            <p className="text-sm text-stone-500 mt-0.5">{craft?.name_ja}</p>
          </div>
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="px-4 py-2 bg-stone-700 text-white text-sm rounded-xl hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {extracting ? "抽出中..." : "事実を抽出（再実行）"}
          </button>
        </div>

        {/* Quality guard banner */}
        {missingRequired.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-medium text-amber-800 mb-1">
              必須事実タイプが未承認です
            </p>
            <p className="text-sm text-amber-700">
              記事生成には以下の承認が必要です:{" "}
              {missingRequired.map((t) => FACT_TYPE_LABELS[t]).join("、")}
            </p>
          </div>
        )}

        {/* Facts grouped by type */}
        {facts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-stone-500 text-sm mb-4">
              まだ事実が抽出されていません。
            </p>
            <button
              onClick={handleExtract}
              disabled={extracting}
              className="px-5 py-2.5 bg-stone-800 text-white text-sm rounded-xl hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              {extracting ? "抽出中..." : "事実を抽出する"}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {FACT_TYPE_ORDER.map((factType) => {
              const typeFacts = grouped[factType];
              if (!typeFacts || typeFacts.length === 0) return null;

              return (
                <section key={factType}>
                  <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wider mb-3">
                    {FACT_TYPE_LABELS[factType]}
                  </h2>
                  <div className="space-y-3">
                    {typeFacts.map((fact) => {
                      const isEditing = editingId === fact.id;
                      const isRejected = fact.confidence === "rejected";
                      const isSaving = saving === fact.id;

                      return (
                        <div
                          key={fact.id}
                          className={`p-4 bg-white rounded-xl border transition-opacity ${
                            isRejected
                              ? "opacity-50 border-stone-200"
                              : "border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          {/* Badges */}
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${FACT_TYPE_COLORS[fact.fact_type]}`}
                            >
                              {FACT_TYPE_LABELS[fact.fact_type]}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_COLORS[fact.confidence]}`}
                            >
                              {CONFIDENCE_LABELS[fact.confidence]}
                            </span>
                          </div>

                          {isEditing ? (
                            /* Edit mode */
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs text-stone-500 mb-1">主張</label>
                                <input
                                  type="text"
                                  value={editState.claim}
                                  onChange={(e) =>
                                    setEditState((s) => ({ ...s, claim: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-stone-500 mb-1">年（任意）</label>
                                <input
                                  type="number"
                                  value={editState.year}
                                  onChange={(e) =>
                                    setEditState((s) => ({ ...s, year: e.target.value }))
                                  }
                                  className="w-32 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-stone-500 mb-1">レビューメモ（任意）</label>
                                <textarea
                                  value={editState.note}
                                  onChange={(e) =>
                                    setEditState((s) => ({ ...s, note: e.target.value }))
                                  }
                                  rows={2}
                                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 resize-none"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleAction(fact.id, "edit", {
                                      claim: editState.claim,
                                      year: editState.year ? Number(editState.year) : null,
                                      note: editState.note || undefined,
                                    })
                                  }
                                  disabled={isSaving || !editState.claim.trim()}
                                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {isSaving ? "保存中..." : "承認して保存"}
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-4 py-1.5 text-stone-600 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                                >
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* View mode */
                            <div>
                              <p
                                className={`text-sm text-stone-800 mb-1 ${
                                  isRejected ? "line-through text-stone-400" : ""
                                }`}
                              >
                                {fact.content.claim}
                              </p>
                              {fact.content.year != null && (
                                <p className="text-xs text-stone-500 mb-1">
                                  年: {fact.content.year}
                                </p>
                              )}
                              {fact.content.quote_basis && (
                                <p className="text-xs text-stone-400 italic mb-2">
                                  &ldquo;{fact.content.quote_basis}&rdquo;
                                </p>
                              )}
                              {fact.reviewer_note && (
                                <p className="text-xs text-stone-500 mb-2 bg-stone-50 px-2 py-1 rounded">
                                  メモ: {fact.reviewer_note}
                                </p>
                              )}
                              <p className="text-xs text-stone-400 mb-3">
                                ソース:{" "}
                                {fact.source?.publisher && (
                                  <span className="font-medium">{fact.source.publisher}</span>
                                )}{" "}
                                {fact.source?.url && (
                                  <a
                                    href={fact.source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                  >
                                    {fact.source.publisher ? "リンク" : fact.source.url}
                                  </a>
                                )}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAction(fact.id, "approve")}
                                  disabled={isSaving || fact.confidence === "approved"}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  {isSaving ? "..." : "承認"}
                                </button>
                                <button
                                  onClick={() => startEdit(fact)}
                                  disabled={isSaving}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  編集
                                </button>
                                <button
                                  onClick={() => handleAction(fact.id, "reject")}
                                  disabled={isSaving || fact.confidence === "rejected"}
                                  className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  {isSaving ? "..." : "却下"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Bottom action */}
        <div className="mt-10 pt-6 border-t border-stone-200">
          {!canGenerate && (
            <p className="text-sm text-amber-700 mb-3">
              記事を生成するには、次の事実タイプを承認してください:{" "}
              {missingRequired.map((t) => FACT_TYPE_LABELS[t]).join("、")}
            </p>
          )}
          <button
            onClick={() => router.push(`/admin/crafts/${id}/article`)}
            disabled={!canGenerate}
            title={
              canGenerate
                ? undefined
                : `不足: ${missingRequired.map((t) => FACT_TYPE_LABELS[t]).join("、")}`
            }
            className="px-6 py-3 bg-stone-800 text-white text-sm rounded-xl hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            記事を生成する →
          </button>
        </div>
      </div>
    </div>
  );
}
