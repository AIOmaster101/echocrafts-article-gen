"use client";

import { useState, useCallback } from "react";
import { Stepper } from "./Stepper";
import { Card, ScoreBar, TierTag, Spinner } from "./ui";
import type { ProductInfo, Theme, Questions, Source, Article, Q1Value, Q2Value } from "@/types";

const ARTICLE_TYPES = [
  { id: "faq", label: "FAQ / How-to", emoji: "❓", fannel: "認知〜関心" },
  { id: "what", label: "What is（定義）", emoji: "📖", fannel: "認知" },
  { id: "best", label: "Best / Guide", emoji: "🏆", fannel: "検討" },
  { id: "vs", label: "比較 / 職人Story", emoji: "⚖️", fannel: "検討〜信頼" },
];

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 mb-4 transition-colors"
    >
      ← 前のステップに戻る
    </button>
  );
}

export function ArticleGenerator() {
  const [phase, setPhase] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Phase 0
  const [urls, setUrls] = useState("");
  const [q1, setQ1] = useState<Q1Value | "">("");
  const [q2, setQ2] = useState<Q2Value | "">("");

  // Phase 1
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);

  // Phase 2
  const [themes, setThemes] = useState<Theme[]>([]);

  // Phase 3
  const [questions, setQuestions] = useState<Questions | null>(null);
  const [interviewAnswers, setInterviewAnswers] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Phase 4
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [activeArticleIndex, setActiveArticleIndex] = useState(0);
  const [articleLang, setArticleLang] = useState<"en" | "ja">("en");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleExtract() {
    if (!urls.trim() || !q1 || !q2) return;
    await run(async () => {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urls.trim().split("\n").filter(Boolean) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "商品情報の抽出に失敗しました");
      setProductInfo(data);
      setPhase(1);
    });
  }

  async function handleScoring() {
    if (!productInfo) return;
    await run(async () => {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productInfo, q1, q2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "テーマ選定に失敗しました");
      setThemes(data);
      setPhase(2);
    });
  }

  async function handleGenerateQuestions() {
    if (!themes.length || !productInfo) return;
    await run(async () => {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topTheme: themes[0], productInfo, q1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "質問生成に失敗しました");
      setQuestions(data);
      setPhase(3);
    });
  }

  async function handleGenerateEmail() {
    if (!questions || !productInfo) return;
    setEmailLoading(true);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, productInfo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "メール生成に失敗しました");
      setEmailBody(data.emailBody);
      setShowEmail(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラー");
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleGenerateArticle() {
    if (!themes.length || !productInfo) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themes, productInfo, interviewAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "記事生成に失敗しました");
      setArticles(data.articles);
      setSources(data.sources);
      setActiveArticleIndex(0);
      setArticleLang("en");
      setPhase(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラー");
    } finally {
      setGenerating(false);
    }
  }

  function copyHtml(html: string) {
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setPhase(0); setUrls(""); setQ1(""); setQ2("");
    setProductInfo(null); setThemes([]); setQuestions(null);
    setInterviewAnswers(""); setEmailBody(""); setShowEmail(false);
    setArticles([]); setSources([]);
  }

  const currentArticle = articles[activeArticleIndex];
  const currentHtml = currentArticle
    ? articleLang === "en" ? currentArticle.contentEn : currentArticle.contentJa
    : "";

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">✦</span>
            </div>
            <h1 className="text-xl font-medium text-stone-800 tracking-tight">
              EchoCrafts Article Generator
            </h1>
          </div>
          <p className="text-sm text-stone-500 ml-11">
            商品URLから記事テーマ選定・職人質問生成・英日記事制作まで
          </p>
        </div>

        <Stepper phase={phase} />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Phase 0: Input ─────────────────────────────── */}
        {phase === 0 && (
          <Card>
            <h2 className="text-base font-medium text-stone-800 mb-5">商品情報を入力</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  商品URL <span className="text-red-400">*</span>
                </label>
                <textarea
                  className="w-full h-24 text-sm border border-stone-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
                  placeholder={"https://example.com/product/123\n複数の場合は改行で区切ってください"}
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">
                  Q1. 職人・工房への一次取材はできますか？ <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    ["interview_yes", "できる（訪問済み・随時可能）→ E-E-A-T強化記事を最優先"],
                    ["interview_email", "メール・オンラインのみ可 → テキスト取材ベース"],
                    ["interview_no", "現時点では難しい → 4本目をvs比較記事に切り替える"],
                  ].map(([val, label]) => (
                    <label key={val} className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${q1 === val ? "border-stone-800 bg-stone-50" : "border-stone-100 hover:border-stone-200"}`}>
                      <input type="radio" name="q1" value={val} checked={q1 === val} onChange={(e) => setQ1(e.target.value as Q1Value)} className="mt-0.5 accent-stone-800" />
                      <span className="text-sm text-stone-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">
                  Q2. 先に取りたいポジションはどれですか？ <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    ["position_definition", "定義独占 → 「What is [商品名]?」系を最優先"],
                    ["position_gift", "ギフト流入 → 「Best [商品] Gifts」系を最優先"],
                    ["position_auto", "どちらでもよい → スコアリング結果をそのまま採用"],
                  ].map(([val, label]) => (
                    <label key={val} className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${q2 === val ? "border-stone-800 bg-stone-50" : "border-stone-100 hover:border-stone-200"}`}>
                      <input type="radio" name="q2" value={val} checked={q2 === val} onChange={(e) => setQ2(e.target.value as Q2Value)} className="mt-0.5 accent-stone-800" />
                      <span className="text-sm text-stone-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={handleExtract} disabled={loading || !urls.trim() || !q1 || !q2}
                className="w-full py-3 bg-stone-800 text-white text-sm font-medium rounded-xl disabled:opacity-40 hover:bg-stone-700 active:scale-[0.99] transition-all">
                {loading ? "抽出中..." : "商品情報を抽出する →"}
              </button>
            </div>
          </Card>
        )}

        {/* ── Phase 1: Extracted info ────────────────────── */}
        {phase === 1 && productInfo && (
          <div className="space-y-4">
            <BackButton onClick={() => setPhase(0)} />
            <Card>
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-base font-medium text-stone-800">抽出された商品情報</h2>
                <span className="text-xs text-stone-400">確認後に次へ進んでください</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["商品名（日本語）", productInfo.name_ja],
                  ["商品名（英語候補）", productInfo.name_en],
                  ["価格", `¥${productInfo.price_jpy?.toLocaleString()} ≈ $${productInfo.price_usd}`],
                  ["産地・工房", productInfo.origin],
                  ["職人名", productInfo.artisan],
                  ["上位カテゴリ", productInfo.category_en],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="p-3 bg-stone-50 rounded-xl">
                    <p className="text-[10px] text-stone-400 mb-0.5">{k}</p>
                    <p className="text-sm text-stone-800 font-medium">{v || "—"}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-stone-50 rounded-xl">
                <p className="text-[10px] text-stone-400 mb-1">素材・技法</p>
                <p className="text-sm text-stone-700">{productInfo.material}</p>
              </div>
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-[10px] text-emerald-600 mb-1 font-medium">最大の差別化ポイント</p>
                <p className="text-sm text-emerald-800 font-medium">{productInfo.key_differentiator}</p>
              </div>
              <div className="mt-3">
                <p className="text-[10px] text-stone-400 mb-1.5">英語キーワード候補</p>
                <div className="flex flex-wrap gap-1.5">
                  {(productInfo.keywords || []).map((k) => (
                    <span key={k} className="text-xs px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full">{k}</span>
                  ))}
                </div>
              </div>
            </Card>
            <button onClick={handleScoring} disabled={loading}
              className="w-full py-3 bg-stone-800 text-white text-sm font-medium rounded-xl disabled:opacity-40 hover:bg-stone-700 transition-all">
              {loading ? "スコアリング中..." : "テーマをスコアリングする →"}
            </button>
          </div>
        )}

        {/* ── Phase 2: Theme selection ───────────────────── */}
        {phase === 2 && themes.length > 0 && (
          <div className="space-y-4">
            <BackButton onClick={() => setPhase(1)} />
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-stone-800">テーマ選定結果</h2>
              <span className="text-xs text-stone-400">1商品あたり4本テンプレート</span>
            </div>
            {themes.map((t, i) => {
              const type = ARTICLE_TYPES.find((a) => a.id === t.type) || ARTICLE_TYPES[i % 4];
              const total = t.score_aio + t.score_demand + t.score_sales + t.score_cost;
              return (
                <Card key={i} className={i === 0 ? "border-stone-300 ring-1 ring-stone-200" : ""}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-lg flex-shrink-0">
                      {type.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-medium text-stone-500">{`${i + 1}本目`} · {type.label}</span>
                        {i === 0 && <span className="text-[10px] bg-stone-800 text-white px-2 py-0.5 rounded-full">最優先</span>}
                        <span className="text-[10px] text-stone-400 ml-auto">{type.fannel}</span>
                      </div>
                      <p className="text-sm font-medium text-stone-800">{t.title_en}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{t.title_ja}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-medium text-stone-800">{total}</p>
                      <p className="text-[10px] text-stone-400">/ 100</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    {([
                      ["AIO空白度", t.score_aio, 30],
                      ["実需確認度", t.score_demand, 25],
                      ["売上への距離", t.score_sales, 25],
                      ["制作コスト", t.score_cost, 20],
                    ] as [string, number, number][]).map(([label, score, max]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-[10px] text-stone-500 w-24">{label}</span>
                        <ScoreBar score={score} max={max} />
                      </div>
                    ))}
                  </div>
                  {t.aio_reason && (
                    <p className="text-xs text-stone-500 p-2.5 bg-stone-50 rounded-lg">💡 {t.aio_reason}</p>
                  )}
                </Card>
              );
            })}
            <button onClick={handleGenerateQuestions} disabled={loading}
              className="w-full py-3 bg-stone-800 text-white text-sm font-medium rounded-xl disabled:opacity-40 hover:bg-stone-700 transition-all">
              {loading ? "質問を生成中..." : "職人インタビュー質問を生成する →"}
            </button>
          </div>
        )}

        {/* ── Phase 3: Interview questions ──────────────── */}
        {phase === 3 && questions && (
          <div className="space-y-4">
            <BackButton onClick={() => setPhase(2)} />
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-medium text-stone-800">職人インタビュー質問リスト</h2>
                  <p className="text-xs text-stone-400 mt-0.5">{questions.theme_title}</p>
                </div>
                <button onClick={handleGenerateEmail} disabled={emailLoading}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 border border-stone-200 rounded-lg hover:bg-stone-50 transition-all">
                  {emailLoading ? "生成中..." : "✉ メール文を生成"}
                </button>
              </div>

              {[
                { label: "必須質問（ネットに存在しない一次情報）", dot: "bg-red-400", items: questions.required, bg: "bg-red-50 border-red-100" },
                { label: "推奨質問（記事の深みを上げる）", dot: "bg-amber-400", items: questions.recommended, bg: "bg-amber-50 border-amber-100" },
                { label: "E-E-A-T強化質問（権威性・信頼性）", dot: "bg-blue-400", items: questions.eeat, bg: "bg-blue-50 border-blue-100" },
              ].map(({ label, dot, items, bg }) => (
                <div key={label} className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-xs font-medium text-stone-700">{label}</span>
                  </div>
                  <div className="space-y-2">
                    {(items || []).map((q, i) => (
                      <div key={i} className={`p-3 ${bg} border rounded-xl`}>
                        <p className="text-sm text-stone-800 font-medium mb-1">Q{i + 1}. {q.q}</p>
                        <p className="text-xs text-stone-500">→ {q.why}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>

            {showEmail && emailBody && (
              <Card className="border-stone-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-stone-700">✉ 職人へのメール文</h3>
                  <div className="flex gap-2">
                    <button onClick={() => copyHtml(emailBody)} className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-50">
                      {copied ? "コピー済み ✓" : "コピー"}
                    </button>
                    <button onClick={() => setShowEmail(false)} className="text-xs text-stone-400 hover:text-stone-600">✕</button>
                  </div>
                </div>
                <pre className="text-xs text-stone-700 whitespace-pre-wrap bg-stone-50 rounded-xl p-4 leading-relaxed">{emailBody}</pre>
              </Card>
            )}

            <Card>
              <h3 className="text-sm font-medium text-stone-700 mb-2">
                インタビュー回答を貼り付ける
                <span className="text-stone-400 font-normal ml-1.5">（任意・記入すると記事がTier 1で補完されます）</span>
              </h3>
              <textarea
                className="w-full h-32 text-sm border border-stone-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
                placeholder="職人からの回答をここに貼り付けてください..."
                value={interviewAnswers}
                onChange={(e) => setInterviewAnswers(e.target.value)}
              />
            </Card>

            <button onClick={handleGenerateArticle} disabled={generating}
              className="w-full py-3 bg-stone-800 text-white text-sm font-medium rounded-xl disabled:opacity-40 hover:bg-stone-700 transition-all">
              {generating ? "4本の記事を生成中（数分かかります）..." : "4本の記事をすべて生成する →"}
            </button>
          </div>
        )}

        {/* ── Phase 4: Articles ──────────────────────────── */}
        {phase === 4 && articles.length > 0 && (
          <div className="space-y-4">
            <BackButton onClick={() => setPhase(3)} />

            {/* 参照情報源 */}
            <Card>
              <h2 className="text-sm font-medium text-stone-700 mb-3">参照情報源</h2>
              <div className="space-y-2">
                {sources.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <TierTag tier={s.tier} />
                    <div>
                      <p className="text-xs font-medium text-stone-800">{s.source}</p>
                      <p className="text-[10px] text-stone-400">{s.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 記事選択タブ */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {articles.map((a, i) => {
                const type = ARTICLE_TYPES.find((t) => t.id === a.theme.type) || ARTICLE_TYPES[i % 4];
                return (
                  <button key={i} onClick={() => setActiveArticleIndex(i)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                      activeArticleIndex === i
                        ? "bg-stone-800 text-white border-stone-800"
                        : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                    }`}>
                    <span>{type.emoji}</span>
                    <span>{i + 1}本目</span>
                  </button>
                );
              })}
            </div>

            {/* 選択中の記事 */}
            {currentArticle && (
              <Card>
                {/* テーマ情報 */}
                <div className="mb-4 p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs text-stone-500 mb-0.5">
                    {ARTICLE_TYPES.find((t) => t.id === currentArticle.theme.type)?.label} ·{" "}
                    スコア {currentArticle.theme.score_aio + currentArticle.theme.score_demand + currentArticle.theme.score_sales + currentArticle.theme.score_cost}
                  </p>
                  <p className="text-sm font-medium text-stone-800">{currentArticle.theme.title_en}</p>
                  <p className="text-xs text-stone-500">{currentArticle.theme.title_ja}</p>
                </div>

                {/* 言語切り替え */}
                <div className="flex gap-1 mb-4 bg-stone-100 p-1 rounded-xl">
                  {(["en", "ja"] as const).map((lang) => (
                    <button key={lang} onClick={() => setArticleLang(lang)}
                      className={`flex-1 py-2 text-sm rounded-lg transition-all ${
                        articleLang === lang ? "bg-white shadow-sm text-stone-800 font-medium" : "text-stone-500 hover:text-stone-700"
                      }`}>
                      {lang === "en" ? "英語版" : "日本語版"}
                    </button>
                  ))}
                </div>

                {/* Wixコピーボタン */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-stone-400">
                    WixのブログエディターでHTML埋め込みブロックに貼り付けてください
                  </p>
                  <button onClick={() => copyHtml(currentHtml)}
                    className="flex-shrink-0 text-xs px-3 py-1.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-all">
                    {copied ? "コピー済み ✓" : "HTMLをコピー"}
                  </button>
                </div>

                {/* HTMLプレビュー */}
                <div
                  className="prose prose-stone prose-sm max-w-none border border-stone-100 rounded-xl p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: currentHtml }}
                />

                {/* 生のHTMLも確認できるように */}
                <details className="mt-3">
                  <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-600">生のHTMLを表示</summary>
                  <pre className="mt-2 text-xs text-stone-600 whitespace-pre-wrap bg-stone-50 rounded-xl p-4 overflow-x-auto leading-relaxed">
                    {currentHtml}
                  </pre>
                </details>
              </Card>
            )}

            <button onClick={reset}
              className="w-full py-3 border border-stone-200 text-stone-600 text-sm rounded-xl hover:bg-stone-50 transition-all">
              別の商品で始める
            </button>
          </div>
        )}

        {/* Global loading overlay */}
        {(loading || generating) && phase !== 4 && (
          <div className="fixed bottom-6 right-6 bg-white border border-stone-100 rounded-2xl px-5 py-3 shadow-lg">
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );
}
