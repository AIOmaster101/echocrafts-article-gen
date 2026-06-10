"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { CraftItem, CraftArticle, CraftItemStatus, InternalLink } from "@/types/crafts";

type Tab = "preview" | "edit" | "meta";

const STATUS_COLORS: Record<CraftItemStatus, string> = {
  pending_facts: "bg-stone-100 text-stone-500",
  facts_review: "bg-amber-100 text-amber-700",
  generating: "bg-blue-100 text-blue-700",
  article_review: "bg-violet-100 text-violet-700",
  approved: "bg-emerald-100 text-emerald-700",
  pushed: "bg-teal-100 text-teal-700",
  published: "bg-green-100 text-green-700",
};

export default function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [item, setItem] = useState<CraftItem | null>(null);
  const [article, setArticle] = useState<CraftArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("preview");

  // Edit tab state
  const [editHtml, setEditHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Meta tab state
  const [editTitle, setEditTitle] = useState("");
  const [editMeta, setEditMeta] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [saveMetaMsg, setSaveMetaMsg] = useState<string | null>(null);

  // Generate state
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Copy state
  const [copied, setCopied] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/crafts/${id}/article`);
      if (!res.ok) throw new Error("記事の取得に失敗しました");
      const data = await res.json();
      setItem(data.item);
      setArticle(data.article);
      if (data.article) {
        setEditHtml(data.article.body_html ?? "");
        setEditTitle(data.article.title ?? "");
        setEditMeta(data.article.meta_description ?? "");
      }
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

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/admin/crafts/${id}/generate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error ?? "生成に失敗しました");
        return;
      }
      await loadData();
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveHtml() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/admin/crafts/${id}/article`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body_html: editHtml }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveMsg("保存失敗: " + (err.error ?? "不明なエラー"));
        return;
      }
      const data = await res.json();
      setArticle(data.article);
      setSaveMsg("保存しました");
      setTimeout(() => setSaveMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMeta() {
    setSavingMeta(true);
    setSaveMetaMsg(null);
    try {
      const res = await fetch(`/api/admin/crafts/${id}/article`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, meta_description: editMeta }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveMetaMsg("保存失敗: " + (err.error ?? "不明なエラー"));
        return;
      }
      const data = await res.json();
      setArticle(data.article);
      setSaveMetaMsg("保存しました");
      setTimeout(() => setSaveMetaMsg(null), 3000);
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleApprove() {
    const res = await fetch(`/api/admin/crafts/${id}/article`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" as CraftItemStatus }),
    });
    if (res.ok) {
      const data = await res.json();
      setArticle(data.article);
      setItem((prev) => prev ? { ...prev, status: "approved" } : prev);
    }
  }

  function handleCopy() {
    if (!article?.body_html) return;
    navigator.clipboard.writeText(article.body_html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-red-500 text-sm">{error ?? "品目が見つかりません"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <Link
              href={`/admin/crafts/${id}`}
              className="text-xs text-stone-400 hover:text-stone-600 mb-2 block"
            >
              ← 品目詳細に戻る
            </Link>
            <h1 className="text-xl font-semibold text-stone-800">
              記事プレビュー — {item.name_en}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  STATUS_COLORS[item.status] ?? "bg-stone-100 text-stone-500"
                }`}
              >
                {item.status}
              </span>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-sm bg-emerald-700 text-white px-4 py-2 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                生成中...
              </>
            ) : article ? "記事を再生成する" : "記事を生成する"}
          </button>
        </div>

        {/* Generate error */}
        {generateError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {generateError}
          </div>
        )}

        {/* Generating spinner */}
        {generating && (
          <div className="mb-6 p-6 bg-white border border-stone-100 rounded-2xl shadow-sm flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
            <p className="text-sm text-stone-600">記事を生成中...</p>
            <p className="text-xs text-stone-400">約60秒かかる場合があります</p>
          </div>
        )}

        {/* No article empty state */}
        {!article && !generating && (
          <div className="bg-white border border-stone-100 rounded-2xl p-12 shadow-sm text-center">
            <p className="text-stone-600 font-medium mb-2">まだ記事が生成されていません</p>
            <p className="text-sm text-stone-400 mb-6">
              事実レビューが完了したら記事を生成できます
            </p>
            <button
              onClick={handleGenerate}
              className="bg-emerald-700 text-white text-sm px-6 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
            >
              記事を生成する
            </button>
          </div>
        )}

        {/* Article content */}
        {article && !generating && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 bg-stone-100 p-1 rounded-xl mb-6">
              {(["preview", "edit", "meta"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-sm rounded-lg transition-all ${
                    activeTab === tab
                      ? "bg-white shadow-sm text-stone-800 font-medium"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {tab === "preview" ? "プレビュー" : tab === "edit" ? "HTMLを編集" : "メタ情報"}
                </button>
              ))}
            </div>

            {/* Tab: Preview */}
            {activeTab === "preview" && (
              <div className="space-y-4">
                {/* Title */}
                {article.title && (
                  <div className="bg-white border border-stone-100 rounded-2xl px-5 py-4 shadow-sm">
                    <p className="text-xs text-stone-400 mb-1">タイトル</p>
                    <p className="text-base font-semibold text-stone-800">{article.title}</p>
                  </div>
                )}

                {/* Copy + HTML preview */}
                <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                      記事本文プレビュー
                    </p>
                    <button
                      onClick={handleCopy}
                      className="text-xs px-3 py-1.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-all"
                    >
                      {copied ? "コピー済み ✓" : "HTMLをコピー"}
                    </button>
                  </div>
                  <div
                    className="prose prose-stone prose-sm max-w-none border border-stone-100 rounded-xl p-4 bg-stone-50"
                    dangerouslySetInnerHTML={{ __html: article.body_html ?? "" }}
                  />
                </div>

                {/* Internal links audit */}
                {article.internal_links && article.internal_links.length > 0 && (
                  <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
                      内部リンク監査
                    </p>
                    <div className="space-y-2">
                      {article.internal_links.map((link: InternalLink, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span
                            className={`text-xs font-medium ${
                              link.placed ? "text-emerald-600" : "text-red-400"
                            }`}
                          >
                            {link.placed ? "✓" : "✗"}
                          </span>
                          <span className="font-mono text-xs text-stone-500">{link.slug}</span>
                          <span className="text-stone-600">{link.anchor_text}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ml-auto ${
                              link.placed
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {link.placed ? "配置済み" : "未配置"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: HTML Edit */}
            {activeTab === "edit" && (
              <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                    HTMLを編集
                  </p>
                  {saveMsg && (
                    <span
                      className={`text-xs ${
                        saveMsg.startsWith("保存失敗") ? "text-red-500" : "text-emerald-600"
                      }`}
                    >
                      {saveMsg}
                    </span>
                  )}
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                  編集すると生成ハッシュとの整合性が失われます
                </div>
                <textarea
                  value={editHtml}
                  onChange={(e) => setEditHtml(e.target.value)}
                  className="w-full h-[500px] font-mono text-xs border border-stone-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-y"
                  spellCheck={false}
                />
                <button
                  onClick={handleSaveHtml}
                  disabled={saving}
                  className="bg-stone-800 text-white text-sm px-5 py-2 rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            )}

            {/* Tab: Meta */}
            {activeTab === "meta" && (
              <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                    メタ情報
                  </p>
                  {saveMetaMsg && (
                    <span
                      className={`text-xs ${
                        saveMetaMsg.startsWith("保存失敗") ? "text-red-500" : "text-emerald-600"
                      }`}
                    >
                      {saveMetaMsg}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs text-stone-600 block mb-1">タイトル</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    placeholder="記事タイトル"
                  />
                </div>

                <div>
                  <label className="text-xs text-stone-600 block mb-1">
                    メタディスクリプション
                    <span
                      className={`ml-2 ${
                        editMeta.length > 160 ? "text-red-500" : "text-stone-400"
                      }`}
                    >
                      {editMeta.length}/160
                    </span>
                  </label>
                  <textarea
                    value={editMeta}
                    onChange={(e) => setEditMeta(e.target.value)}
                    maxLength={160}
                    rows={3}
                    className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
                    placeholder="SEO用の説明文（160文字以内）"
                  />
                </div>

                <button
                  onClick={handleSaveMeta}
                  disabled={savingMeta}
                  className="bg-stone-800 text-white text-sm px-5 py-2 rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-50"
                >
                  {savingMeta ? "保存中..." : "保存"}
                </button>
              </div>
            )}

            {/* Bottom actions */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleApprove}
                className="text-sm bg-emerald-700 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
              >
                承認済みにする
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="text-sm bg-stone-800 text-white px-5 py-2.5 rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-50"
              >
                記事を再生成する
              </button>
              <div className="relative group">
                <button
                  disabled
                  className="text-sm bg-stone-300 text-stone-400 px-5 py-2.5 rounded-xl cursor-not-allowed"
                  title="準備中"
                >
                  Shopifyに投稿する
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-700 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  準備中
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
