"use client";

import { useState } from "react";
import type { ArticleRow, ThemeRow, DistributionContent } from "@/types";

interface Props {
  articles: ArticleRow[];
  themes: ThemeRow[];
  productNameEn: string;
  productNameJa: string;
}

const THEME_EMOJI: Record<string, string> = {
  faq: "❓",
  what: "📖",
  best: "🏆",
  vs: "⚖️",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
    >
      {copied ? "✓ コピー済" : "コピー"}
    </button>
  );
}

function ContentBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">{label}</span>
        <CopyButton text={text} />
      </div>
      <pre className="text-xs text-stone-700 bg-stone-50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed font-sans">
        {text}
      </pre>
    </div>
  );
}

function ScheduleBadge({ day, label, baseDate }: { day: number; label: string; baseDate: Date }) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + day);
  const dateStr = d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-stone-400 w-12">Day {day}</span>
      <span className="text-stone-500">{dateStr}</span>
      <span className="text-stone-700">{label}</span>
    </div>
  );
}

export function DistributionPanel({ articles, themes, productNameEn, productNameJa }: Props) {
  const completedArticles = articles.filter((a) => a.content_en);
  const [selectedIndex, setSelectedIndex] = useState(
    completedArticles.length > 0 ? completedArticles[0].theme_index : 0
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distribution, setDistribution] = useState<DistributionContent | null>(() => {
    const found = completedArticles.find((a) => a.theme_index === selectedIndex);
    return found?.distribution_content ?? null;
  });
  const [activeTab, setActiveTab] = useState<"medium" | "newsletter" | "notes" | "schedule">("medium");

  if (completedArticles.length === 0) return null;

  const selectedArticle = completedArticles.find((a) => a.theme_index === selectedIndex);
  const selectedTheme = themes.find((t) => t.priority === selectedIndex) ?? themes[selectedIndex];

  function handleSelectArticle(idx: number) {
    setSelectedIndex(idx);
    setError(null);
    const art = completedArticles.find((a) => a.theme_index === idx);
    setDistribution(art?.distribution_content ?? null);
  }

  async function handleGenerate() {
    if (!selectedArticle || !selectedTheme) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: selectedArticle.id,
          theme_title_en: selectedTheme.title_en,
          content_en: selectedArticle.content_en,
          product_name_en: productNameEn,
          product_name_ja: productNameJa,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "生成に失敗しました");
        return;
      }
      setDistribution(data.distribution);
      setActiveTab("medium");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const baseDate = new Date();

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm">
      <h2 className="text-sm font-medium text-stone-700 mb-1">コンテンツ展開</h2>
      <p className="text-xs text-stone-400 mb-5">
        生成した記事を Medium・Substack に展開するコピー素材を生成します
      </p>

      {/* Article selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {completedArticles.map((art) => {
          const theme = themes.find((t) => t.priority === art.theme_index) ?? themes[art.theme_index];
          const emoji = THEME_EMOJI[theme?.type ?? ""] ?? "✦";
          const isSelected = art.theme_index === selectedIndex;
          return (
            <button
              key={art.id}
              onClick={() => handleSelectArticle(art.theme_index)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-colors ${
                isSelected
                  ? "bg-stone-800 text-white border-stone-800"
                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
              <span>{emoji}</span>
              <span className="truncate max-w-[140px]">{theme?.type?.toUpperCase() ?? `記事${art.theme_index + 1}`}</span>
            </button>
          );
        })}
      </div>

      {/* Selected theme title */}
      {selectedTheme && (
        <div className="mb-4 p-3 bg-stone-50 rounded-xl">
          <p className="text-[10px] text-stone-400 mb-0.5">選択中の記事</p>
          <p className="text-sm font-medium text-stone-800">{selectedTheme.title_en}</p>
          <p className="text-xs text-stone-500">{selectedTheme.title_ja}</p>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-3 bg-stone-800 text-white text-sm rounded-xl font-medium hover:bg-stone-700 transition-colors disabled:opacity-60 mb-4"
      >
        {loading
          ? "生成中... (約20秒)"
          : distribution
          ? "再生成"
          : "展開コンテンツを生成"}
      </button>

      {error && (
        <p className="text-xs text-red-500 mb-4 text-center">{error}</p>
      )}

      {/* Results */}
      {distribution && (
        <div>
          {/* MJC URL / Substack URL */}
          <div className="mb-5 space-y-2">
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <span className="text-[10px] font-semibold text-emerald-600 flex-shrink-0">MJC URL</span>
              <span className="text-xs text-emerald-800 truncate flex-1">{distribution.mjc_url}</span>
              <CopyButton text={distribution.mjc_url} />
            </div>
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-xl">
              <span className="text-[10px] font-semibold text-orange-600 flex-shrink-0">Substack URL</span>
              <span className="text-xs text-orange-800 truncate flex-1">{distribution.substack_url}</span>
              <CopyButton text={distribution.substack_url} />
            </div>
            <p className="text-[10px] text-stone-400">
              ※ Substack URLは推定値です。Newsletterを実際に公開した後、Substackが発行する正式なURL（末尾に <code>?r=...</code> が付くことがあります）と一致するか確認してください。
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 border-b border-stone-100 pb-0">
            {(["medium", "newsletter", "notes", "schedule"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs px-3 py-2 rounded-t-lg transition-colors -mb-px ${
                  activeTab === tab
                    ? "bg-white border border-stone-200 border-b-white text-stone-800 font-medium"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {tab === "medium" && "Medium"}
                {tab === "newsletter" && "Newsletter"}
                {tab === "notes" && "Notes × 3"}
                {tab === "schedule" && "スケジュール"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="space-y-4">
            {activeTab === "medium" && (
              <>
                <ContentBlock label="記事全文（HTML埋め込み用）" text={distribution.medium.full_html} />
                <div className="text-xs text-stone-400 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  ⚠️ MJCブログ公開から <strong>7〜14日後</strong> に投稿 ／ MediumのHTML埋め込みブロックに貼り付け ／ 詳細設定の Canonical URL にも {distribution.mjc_url} を設定してください
                </div>
              </>
            )}

            {activeTab === "newsletter" && (
              <>
                <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl">
                  <span className="text-[10px] text-stone-400 flex-shrink-0 w-12">件名</span>
                  <span className="text-sm text-stone-800 flex-1">{distribution.newsletter.subject}</span>
                  <CopyButton text={distribution.newsletter.subject} />
                </div>
                <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl">
                  <span className="text-[10px] text-stone-400 flex-shrink-0 w-12">サブタイトル</span>
                  <span className="text-sm text-stone-800 flex-1">{distribution.newsletter.subtitle}</span>
                  <CopyButton text={distribution.newsletter.subtitle} />
                </div>
                <ContentBlock label="本文（そのままコピー可）" text={distribution.newsletter.body} />
              </>
            )}

            {activeTab === "notes" && (
              <>
                <div className="text-xs text-stone-400 mb-2">各Note は300文字前後 / ①②はSubstack Newsletter記事へ、③はmodernjapancrafts.comへリンク</div>
                <ContentBlock label="① Day 0 — 事実・データ型" text={distribution.notes.fact} />
                <ContentBlock label="② Day 3 — 問いかけ・反転型" text={distribution.notes.question} />
                <ContentBlock label="③ Day 10 — ストーリー型" text={distribution.notes.story} />
              </>
            )}

            {activeTab === "schedule" && (
              <div className="space-y-3">
                <p className="text-xs text-stone-500 mb-4">MJCブログ公開日を Day 0 として計算</p>
                <ScheduleBadge day={0} label={distribution.schedule.day0_label} baseDate={baseDate} />
                <ScheduleBadge day={3} label={distribution.schedule.day3_label} baseDate={baseDate} />
                <ScheduleBadge day={7} label={distribution.schedule.day7_label} baseDate={baseDate} />
                <ScheduleBadge day={10} label={distribution.schedule.day10_label} baseDate={baseDate} />
                <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-500">
                  📬 {distribution.schedule.newsletter_label}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
