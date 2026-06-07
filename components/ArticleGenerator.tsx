"use client";

import { useState, useCallback } from "react";
import { Stepper } from "./Stepper";
import { Card, ScoreBar, TierTag, Spinner } from "./ui";
import type { ProductInfo, Theme, Questions, Source, Article, Q1Value, Q2Value, ArticleGeneratorInitialState } from "@/types";

const ARTICLE_TYPES = [
  { id: "faq", label: "FAQ / How-to", emoji: "❓", fannel: "認知〜関心" },
  { id: "what", label: "What is（定義）", emoji: "📖", fannel: "認知" },
  { id: "best", label: "Best / Guide", emoji: "🏆", fannel: "検討" },
  { id: "vs", label: "比較 / 職人Story", emoji: "⚖️", fannel: "検討〜信頼" },
];

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 mb-4 transition-colors">
      ← 前のステップに戻る
    </button>
  );
}

export function ArticleGenerator({ initialState }: { initialState?: ArticleGeneratorInitialState } = {}) {
  const [phase, setPhase] = useState(initialState?.phase ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Phase 0
  const [urls, setUrls] = useState(initialState?.urls ?? "");
  const [q1, setQ1] = useState<Q1Value | "">(initialState?.q1 ?? "");
  const [q2, setQ2] = useState<Q2Value | "">(initialState?.q2 ?? "");

  // DB tracking
  const [productId, setProductId] = useState<string | undefined>(initialState?.productId);
  const [themeIds, setThemeIds] = useState<string[]>([]);

  // Phase 1
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(initialState?.productInfo ?? null);

  // Phase 2
  const [themes, setThemes] = useState<Theme[]>(initialState?.themes ?? []);
  const [customizationInstruction, setCustomizationInstruction] = useState("");
  const [rescoring, setRescoring] = useState(false);

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
  const [generateProgress, setGenerateProgress] = useState("");
  const [copied, setCopied] = useState(false);

  const urlList = urls.trim().split("\n").filter(Boolean);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    setError("");
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : "エラーが発生しました"); }
    finally { setLoading(false); }
  }, []);

  // 記事生成の共通関数（1本ずつ呼び出す）
  async function generateAllArticles(
    themesToGen: Theme[],
    product: ProductInfo,
    answers: string
  ): Promise<Article[]> {
    const result: Article[] = [];
    for (let i = 0; i < themesToGen.length; i++) {
      setGenerateProgress(`記事を生成中... ${i + 1} / ${themesToGen.length} 本目`);
      const res = await fetch("/api/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themes: [themesToGen[i]],
          productInfo: product,
          interviewAnswers: answers,
          urls: urlList,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "記事生成に失敗しました");
      result.push({ theme: themesToGen[i], contentEn: data.contentEn, contentJa: data.contentJa });
    }
    setGenerateProgress("");
    return result;
  }

  // sources の共通組み立て
  function buildSources(product: ProductInfo, answers: string): Source[] {
    const hasInterview = answers.trim().length > 0;
    const src: Source[] = [];
    if (hasInterview) src.push({ tier: "Tier 1", source: `${product.artisan || "職人"}インタビュー`, note: "一次情報（独自取材）" });
    src.push(
      { tier: "Tier 1", source: product.artisan ? `${product.artisan} 公式ショップ` : "商品ページ", note: "商品仕様・価格・職人情報" },
      { tier: "Tier 2", source: "Encyclopaedia Britannica", note: "技法の定義・歴史的背景" },
      { tier: "Tier 2", source: "ResearchGate / 学術論文", note: "材料の化学的性質・耐久性データ" },
      { tier: "Tier 3", source: "Musubi Kiln Journal", note: "伝統工芸のケア・使用方法" },
      { tier: "Tier 4", source: "Amazon / eBay レビュー", note: "購買者の視点・競合商品情報" }
    );
    return src;
  }

  // ── ワンクリック生成（Step1→Step5）────────────────────────────
  async function handleOneClick() {
    if (!urls.trim() || !q1 || !q2) return;
    setGenerating(true);
    setError("");
    try {
      // 1. 抽出
      setGenerateProgress("商品情報を抽出中...");
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlList }),
      });
      const product = await extractRes.json();
      if (!extractRes.ok) throw new Error(product.error || "商品情報の抽出に失敗しました");
      setProductInfo(product);

      // 2. スコアリング
      setGenerateProgress("テーマをスコアリング中...");
      const scoreRes = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productInfo: product, q1, q2 }),
      });
      const scored = await scoreRes.json();
      if (!scoreRes.ok) throw new Error(scored.error || "テーマ選定に失敗しました");
      const scoredThemes = scored.themes ?? scored;
      setThemes(scoredThemes);

      // 3. 記事生成（4本）
      const generatedArticles = await generateAllArticles(scoredThemes, product, "");
      setArticles(generatedArticles);
      setSources(buildSources(product, ""));
      setActiveArticleIndex(0);
      setArticleLang("en");
      setPhase(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setGenerating(false);
      setGenerateProgress("");
    }
  }

  // ── 通常フロー ─────────────────────────────────────────────────
  async function handleExtract() {
    if (!urls.trim() || !q1 || !q2) return;
    await run(async () => {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlList }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "商品情報の抽出に失敗しました");
      setProductInfo(data);
      if (data.productId) setProductId(data.productId);
      setPhase(1);
    });
  }

  async function handleScoring() {
    if (!productInfo) return;
    await run(async () => {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productInfo, q1, q2, productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "テーマ選定に失敗しました");
      setThemes(data.themes ?? data);
      if (data.themeIds) setThemeIds(data.themeIds);
      setPhase(2);
    });
  }

  async function handleRescore() {
    if (!productInfo || !customizationInstruction.trim()) return;
    setRescoring(true);
    setError("");
    try {
      const res = await fetch("/api/rescore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, productInfo, q1, q2, customizationInstruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "再スコアリングに失敗しました");
      const newThemes = data.themes ?? data;
      setThemes(newThemes);
      if (data.themeIds) setThemeIds(data.themeIds);
      setCustomizationInstruction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラー");
    } finally {
      setRescoring(false);
    }
  }

  async function handleGenerateQuestions() {
    if (!themes.length || !productInfo) return;
    await run(async () => {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topTheme: themes[0], productInfo, q1, themeId: themeIds[0] }),
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
      const generatedArticles = await generateAllArticles(themes, productInfo, interviewAnswers);
      setArticles(generatedArticles);
      setSources(buildSources(productInfo, interviewAnswers));
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
    setProductId(undefined); setThemeIds([]);
    setProductInfo(null); setThemes([]); setQuestions(null);
    setCustomizationInstruction(""); setInterviewAnswers("");
    setEmailBody(""); setShowEmail(false);
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
            <h1 className="text-xl font-medium text-stone-800 tracking-tight">EchoCrafts Article Generator</h1>
          </div>
          <p className="text-sm text-stone-500 ml-11">商品URLから記事テーマ選定・職人質問生成・英日記事制作まで</p>
        </div>

        <Stepper phase={phase} />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* ── Phase 0: Input ─────────────────────────────── */}
        {phase === 0 && (
          <div className="space-y-4">
            <Card>
              <h2 className="text-base font-medium text-stone-800 mb-5">商品情報を入力</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">商品URL <span className="text-red-400">*</span></label>
                  <textarea
                    className="w-full h-24 text-sm border border-stone-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
                    placeholder={"https://example.com/product/123\n複数の場合は改行で区切ってください"}
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-2">Q1. 職人・工房への一次取材はできますか？ <span className="text-red-400">*</span></label>
                  <div className="space-y-2">
                    {[
                      ["interview_yes", "できる（訪問済み・随時可能）→ E-E-A-T強化記事を最優先"],
                      ["interview_email", "メール・オンラインのみ可 → テキスト取材ベース"],
                      ["interview_no", "現時点では難しい → 職人インタビューなしで記事生成"],
                    ].map(([val, label]) => (
                      <label key={val} className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${q1 === val ? "border-stone-800 bg-stone-50" : "border-stone-100 hover:border-stone-200"}`}>
                        <input type="radio" name="q1" value={val} checked={q1 === val} onChange={(e) => setQ1(e.target.value as Q1Value)} className="mt-0.5 accent-stone-800" />
                        <span className="text-sm text-stone-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-2">Q2. 先に取りたいポジションはどれですか？ <span className="text-red-400">*</span></label>
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

                {/* ワンクリック生成ボタン（interview_no または常に表示） */}
                <div className={`rounded-xl border p-4 space-y-3 ${q1 === "interview_no" ? "border-stone-800 bg-stone-50" : "border-stone-200"}`}>
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      ⚡ ワンクリック記事生成
                      {q1 === "interview_no" && <span className="ml-2 text-[10px] bg-stone-800 text-white px-2 py-0.5 rounded-full">推奨</span>}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      テーマ選定・質問生成をスキップして、4本の記事を一括生成します（職人インタビューなし）
                    </p>
                  </div>
                  <button
                    onClick={handleOneClick}
                    disabled={generating || !urls.trim() || !q1 || !q2}
                    className="w-full py-3 bg-stone-800 text-white text-sm font-medium rounded-xl disabled:opacity-40 hover:bg-stone-700 transition-all"
                  >
                    {generating ? (generateProgress || "生成中...") : "URLを入力して4本まとめて生成 →"}
                  </button>
                </div>

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 h-px bg-stone-200" />
                  <span className="text-xs text-stone-400">または ステップごとに進む</span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>

                <button onClick={handleExtract} disabled={loading || !urls.trim() || !q1 || !q2}
                  className="w-full py-3 border border-stone-300 text-stone-700 text-sm font-medium rounded-xl disabled:opacity-40 hover:bg-stone-50 transition-all">
                  {loading ? "抽出中..." : "商品情報を抽出する（ステップごと）→"}
                </button>
              </div>
            </Card>
          </div>
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
                    <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-lg flex-shrink-0">{type.emoji}</div>
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
                    {([["AIO空白度", t.score_aio, 30], ["実需確認度", t.score_demand, 25], ["売上への距離", t.score_sales, 25], ["制作コスト", t.score_cost, 20]] as [string, number, number][]).map(([label, score, max]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-[10px] text-stone-500 w-24">{label}</span>
                        <ScoreBar score={score} max={max} />
                      </div>
                    ))}
                  </div>
                  {t.aio_reason && <p className="text-xs text-stone-500 p-2.5 bg-stone-50 rounded-lg">💡 {t.aio_reason}</p>}
                </Card>
              );
            })}
            {/* テーマカスタマイズ（Step-by-Stepフローのみ） */}
            <Card className="border-stone-200">
              <details>
                <summary className="text-sm font-medium text-stone-700 cursor-pointer select-none">
                  🎯 テーマをカスタマイズする
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-stone-500">変更したい内容を日本語で入力してください</p>
                  <textarea
                    className="w-full h-20 text-sm border border-stone-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
                    placeholder="例: 「1本目はギフト向けに変更してほしい」「比較記事（vs）はなしにしてほしい」"
                    value={customizationInstruction}
                    onChange={(e) => setCustomizationInstruction(e.target.value)}
                  />
                  <button
                    onClick={handleRescore}
                    disabled={rescoring || !customizationInstruction.trim()}
                    className="w-full py-2.5 border border-stone-800 text-stone-800 text-sm font-medium rounded-xl disabled:opacity-40 hover:bg-stone-50 transition-all"
                  >
                    {rescoring ? "再スコアリング中..." : "指示を反映して再スコアリング →"}
                  </button>
                </div>
              </details>
            </Card>

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
              {generating ? (generateProgress || "記事を生成中...") : "4本の記事をすべて生成する →"}
            </button>
          </div>
        )}

        {/* ── Phase 4: Articles ──────────────────────────── */}
        {phase === 4 && articles.length > 0 && (
          <div className="space-y-4">
            <BackButton onClick={() => setPhase(3)} />

            {/* テーマ一覧サマリ */}
            {themes.length > 0 && (
              <Card>
                <h2 className="text-sm font-medium text-stone-700 mb-3">生成されたテーマ</h2>
                <div className="space-y-2">
                  {themes.map((t, i) => {
                    const type = ARTICLE_TYPES.find((a) => a.id === t.type) || ARTICLE_TYPES[i % 4];
                    const total = t.score_aio + t.score_demand + t.score_sales + t.score_cost;
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span>{type.emoji}</span>
                        <span className="font-medium text-stone-700 flex-1 truncate">{t.title_en}</span>
                        <span className="text-stone-400">{total}点</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

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
                      activeArticleIndex === i ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                    }`}>
                    <span>{type.emoji}</span>
                    <span className="hidden sm:inline">{i + 1}本目</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </button>
                );
              })}
            </div>

            {/* 選択中の記事 */}
            {currentArticle && (
              <Card>
                <div className="mb-4 p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs text-stone-500 mb-0.5">
                    {ARTICLE_TYPES.find((t) => t.id === currentArticle.theme.type)?.label} · スコア {currentArticle.theme.score_aio + currentArticle.theme.score_demand + currentArticle.theme.score_sales + currentArticle.theme.score_cost}
                  </p>
                  <p className="text-sm font-medium text-stone-800">{currentArticle.theme.title_en}</p>
                  <p className="text-xs text-stone-500">{currentArticle.theme.title_ja}</p>
                </div>

                <div className="flex gap-1 mb-4 bg-stone-100 p-1 rounded-xl">
                  {(["en", "ja"] as const).map((lang) => (
                    <button key={lang} onClick={() => setArticleLang(lang)}
                      className={`flex-1 py-2 text-sm rounded-lg transition-all ${articleLang === lang ? "bg-white shadow-sm text-stone-800 font-medium" : "text-stone-500 hover:text-stone-700"}`}>
                      {lang === "en" ? "英語版" : "日本語版"}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-stone-400">WixのHTMLコードブロックに貼り付けてください</p>
                  <button onClick={() => copyHtml(currentHtml)}
                    className="flex-shrink-0 text-xs px-3 py-1.5 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-all">
                    {copied ? "コピー済み ✓" : "HTMLをコピー"}
                  </button>
                </div>

                <div className="prose prose-stone prose-sm max-w-none border border-stone-100 rounded-xl p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: currentHtml }} />

                <details className="mt-3">
                  <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-600">生のHTMLを表示</summary>
                  <pre className="mt-2 text-xs text-stone-600 whitespace-pre-wrap bg-stone-50 rounded-xl p-4 overflow-x-auto leading-relaxed">{currentHtml}</pre>
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
            {generating && generateProgress
              ? <div className="flex items-center gap-2 text-stone-600"><div className="w-4 h-4 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" /><span className="text-sm">{generateProgress}</span></div>
              : <Spinner />
            }
          </div>
        )}
      </div>
    </div>
  );
}
