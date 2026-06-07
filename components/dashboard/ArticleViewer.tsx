"use client";

import { useState } from "react";
import type { ArticleRow, ThemeRow } from "@/types";

const ARTICLE_TYPES = [
  { id: "faq", emoji: "❓" },
  { id: "what", emoji: "📖" },
  { id: "best", emoji: "🏆" },
  { id: "vs", emoji: "⚖️" },
];

export function ArticleViewer({
  articles,
  themes,
}: {
  articles: ArticleRow[];
  themes: ThemeRow[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lang, setLang] = useState<"en" | "ja">("en");
  const [copied, setCopied] = useState(false);

  const current = articles[activeIndex];
  const currentTheme = themes[activeIndex];
  const html = current ? (lang === "en" ? current.content_en : current.content_ja) : "";

  function copy() {
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm">
      <h2 className="text-sm font-medium text-stone-700 mb-4">生成済み記事</h2>

      {/* 記事タブ */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {articles.map((a, i) => {
          const theme = themes[i];
          const type = ARTICLE_TYPES.find((t) => t.id === theme?.type) || ARTICLE_TYPES[0];
          return (
            <button
              key={a.id}
              onClick={() => setActiveIndex(i)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                activeIndex === i
                  ? "bg-stone-800 text-white border-stone-800"
                  : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
              }`}
            >
              <span>{type.emoji}</span>
              <span>{i + 1}本目</span>
            </button>
          );
        })}
      </div>

      {/* テーマ情報 */}
      {currentTheme && (
        <div className="mb-4 p-3 bg-stone-50 rounded-xl">
          <p className="text-xs text-stone-500 mb-0.5">{currentTheme.type?.toUpperCase()}</p>
          <p className="text-sm font-medium text-stone-800">{currentTheme.title_en}</p>
          <p className="text-xs text-stone-500">{currentTheme.title_ja}</p>
        </div>
      )}

      {/* 言語切り替え */}
      <div className="flex gap-1 mb-4 bg-stone-100 p-1 rounded-xl">
        {(["en", "ja"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`flex-1 py-2 text-sm rounded-lg transition-all ${
              lang === l ? "bg-white shadow-sm text-stone-800 font-medium" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {l === "en" ? "英語版" : "日本語版"}
          </button>
        ))}
      </div>

      {/* コピーボタン */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-stone-400">WixのHTMLコードブロックに貼り付けてください</p>
        <button
          onClick={copy}
          className="text-xs px-3 py-1.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-all"
        >
          {copied ? "コピー済み ✓" : "HTMLをコピー"}
        </button>
      </div>

      {/* プレビュー */}
      <div
        className="prose prose-stone prose-sm max-w-none border border-stone-100 rounded-xl p-4 bg-white"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <details className="mt-3">
        <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-600">生のHTMLを表示</summary>
        <pre className="mt-2 text-xs text-stone-600 whitespace-pre-wrap bg-stone-50 rounded-xl p-4 overflow-x-auto leading-relaxed">
          {html}
        </pre>
      </details>
    </div>
  );
}
