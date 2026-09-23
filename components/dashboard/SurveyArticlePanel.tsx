"use client";

import { useState } from "react";
import type { SurveyInput, SurveyChart, SurveyQuote, SurveyArticleMeta, ChartType } from "@/types";

interface Props {
  productId: string;
  productNameEn: string;
  productNameJa: string;
  initialHtml?: string | null;
  initialMeta?: SurveyArticleMeta | null;
}

const TIER_LABELS: Record<string, string> = {
  A: "実データ（入力済み）",
  B: "取得済みデータ",
  C: "AI推定（本番前に確認推奨）",
};
const TIER_COLORS: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-blue-50 text-blue-700 border-blue-200",
  C: "bg-amber-50 text-amber-700 border-amber-200",
};

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: "horizontal-bar", label: "横棒グラフ" },
  { value: "grouped-bar", label: "グループ縦棒グラフ（2系列）" },
];

function emptyChart(): SurveyChart {
  return {
    id: `c${Date.now()}`,
    type: "horizontal-bar",
    title: "",
    subtitle: "",
    data: [{ label: "", value: 0 }],
    series1Label: "",
    series2Label: "",
    source: "",
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex-shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"
    >
      {copied ? "✓ コピー済" : "コピー"}
    </button>
  );
}

// ── Step 1: データ入力 ──────────────────────────────────────────────────

function ChartEditor({
  chart,
  index,
  onChange,
  onRemove,
}: {
  chart: SurveyChart;
  index: number;
  onChange: (c: SurveyChart) => void;
  onRemove: () => void;
}) {
  function updateData(i: number, key: "label" | "value" | "value2", val: string) {
    const newData = chart.data.map((row, idx) =>
      idx === i ? { ...row, [key]: key === "label" ? val : parseFloat(val) || 0 } : row
    );
    onChange({ ...chart, data: newData });
  }

  return (
    <div className="border border-stone-200 rounded-xl p-4 mb-4 bg-stone-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-stone-500">Chart {index + 1}</span>
        <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">削除</button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] text-stone-400 block mb-1">グラフ種類</label>
          <select
            value={chart.type}
            onChange={(e) => onChange({ ...chart, type: e.target.value as ChartType })}
            className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white"
          >
            {CHART_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-stone-400 block mb-1">タイトル</label>
          <input
            value={chart.title}
            onChange={(e) => onChange({ ...chart, title: e.target.value })}
            className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5"
            placeholder="Unexpected properties reported..."
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[10px] text-stone-400 block mb-1">サブタイトル（任意）</label>
        <input
          value={chart.subtitle ?? ""}
          onChange={(e) => onChange({ ...chart, subtitle: e.target.value })}
          className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5"
          placeholder="Open-ended, multiple codes per response (n=50)"
        />
      </div>

      {chart.type === "grouped-bar" && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-stone-400 block mb-1">系列1ラベル</label>
            <input
              value={chart.series1Label ?? ""}
              onChange={(e) => onChange({ ...chart, series1Label: e.target.value })}
              className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5"
              placeholder="Valued more"
            />
          </div>
          <div>
            <label className="text-[10px] text-stone-400 block mb-1">系列2ラベル</label>
            <input
              value={chart.series2Label ?? ""}
              onChange={(e) => onChange({ ...chart, series2Label: e.target.value })}
              className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5"
              placeholder="Valued less"
            />
          </div>
        </div>
      )}

      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-stone-400">
            データ行（ラベル・値%{chart.type === "grouped-bar" ? "・値2%" : ""}）
          </label>
          <button
            onClick={() => onChange({ ...chart, data: [...chart.data, { label: "", value: 0 }] })}
            className="text-[10px] text-stone-500 hover:text-stone-700"
          >
            + 行追加
          </button>
        </div>
        {chart.data.map((row, i) => (
          <div key={i} className="flex gap-2 mb-1.5 items-center">
            <input
              value={row.label}
              onChange={(e) => updateData(i, "label", e.target.value)}
              className="flex-1 text-xs border border-stone-200 rounded-lg px-2 py-1"
              placeholder="ラベル"
            />
            <input
              type="number"
              min="0"
              max="100"
              value={row.value}
              onChange={(e) => updateData(i, "value", e.target.value)}
              className="w-16 text-xs border border-stone-200 rounded-lg px-2 py-1 text-right"
              placeholder="%"
            />
            {chart.type === "grouped-bar" && (
              <input
                type="number"
                min="0"
                max="100"
                value={row.value2 ?? ""}
                onChange={(e) => updateData(i, "value2", e.target.value)}
                className="w-16 text-xs border border-stone-200 rounded-lg px-2 py-1 text-right"
                placeholder="%2"
              />
            )}
            <button
              onClick={() => onChange({ ...chart, data: chart.data.filter((_, idx) => idx !== i) })}
              className="text-xs text-stone-400 hover:text-red-400 flex-shrink-0"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteEditor({
  quote,
  index,
  onChange,
  onRemove,
}: {
  quote: SurveyQuote;
  index: number;
  onChange: (q: SurveyQuote) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-stone-200 rounded-xl p-4 mb-3 bg-stone-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-stone-500">引用 {index + 1}</span>
        <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">削除</button>
      </div>
      <textarea
        value={quote.text}
        onChange={(e) => onChange({ ...quote, text: e.target.value })}
        className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5 mb-2 resize-none"
        rows={2}
        placeholder="I wore it with a cream coat, but only that first time."
      />
      <div className="grid grid-cols-2 gap-2">
        {(["respondent_id", "gender", "age_group", "location", "product_detail"] as const).map((f) => (
          <input
            key={f}
            value={quote[f] ?? ""}
            onChange={(e) => onChange({ ...quote, [f]: e.target.value })}
            className="text-xs border border-stone-200 rounded-lg px-2 py-1"
            placeholder={f === "respondent_id" ? "R16" : f === "gender" ? "woman" : f === "age_group" ? "35-44" : f === "location" ? "NY" : "Aizome scarf, 7 months"}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────

export function SurveyArticlePanel({ productId, productNameEn, productNameJa, initialHtml, initialMeta }: Props) {
  const [step, setStep] = useState<"input" | "confirm" | "result">(
    initialHtml ? "result" : "input"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string>(initialHtml ?? "");
  const [meta, setMeta] = useState<SurveyArticleMeta | null>(initialMeta ?? null);

  const [survey, setSurvey] = useState<SurveyInput>({
    survey_name: "",
    conducted_by: "Modern Japan Crafts",
    n: 0,
    date_start: "",
    date_end: "",
    method: "",
    question_verbatim: "",
    charts: [emptyChart()],
    quotes: [],
    additional_findings: "",
    data_tier: "A",
  });

  function updateChart(i: number, c: SurveyChart) {
    setSurvey((s) => ({ ...s, charts: s.charts.map((ch, idx) => (idx === i ? c : ch)) }));
  }
  function removeChart(i: number) {
    setSurvey((s) => ({ ...s, charts: s.charts.filter((_, idx) => idx !== i) }));
  }
  function addChart() {
    setSurvey((s) => ({ ...s, charts: [...s.charts, emptyChart()] }));
  }

  function updateQuote(i: number, q: SurveyQuote) {
    setSurvey((s) => ({ ...s, quotes: (s.quotes ?? []).map((qq, idx) => (idx === i ? q : qq)) }));
  }
  function removeQuote(i: number) {
    setSurvey((s) => ({ ...s, quotes: (s.quotes ?? []).filter((_, idx) => idx !== i) }));
  }
  function addQuote() {
    setSurvey((s) => ({
      ...s,
      quotes: [...(s.quotes ?? []), { text: "", respondent_id: "", gender: "", age_group: "", location: "", product_detail: "" }],
    }));
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/survey-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          survey,
          product_name_en: productNameEn,
          product_name_ja: productNameJa,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "生成に失敗しました");
        return;
      }
      setHtml(data.html);
      setMeta(data.meta);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const canProceed =
    survey.survey_name.trim().length > 0 &&
    survey.n > 0 &&
    survey.charts.length > 0 &&
    survey.charts.every((c) => c.title.trim().length > 0 && c.data.length > 0 && c.data[0].label.trim().length > 0);

  // ── Result view ──────────────────────────────────────────────────────
  if (step === "result" && html) {
    return (
      <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm mt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-stone-700">一次調査記事</h2>
            {meta && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-stone-400">{meta.survey_name} (n={meta.n})</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${TIER_COLORS[meta.data_tier]}`}>
                  {TIER_LABELS[meta.data_tier]}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setStep("input")}
            className="text-xs text-stone-400 hover:text-stone-700 border border-stone-200 px-3 py-1.5 rounded-lg"
          >
            再生成
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-stone-500">HTML（Shopify body_html 貼り付け用）</span>
          <CopyButton text={html} />
        </div>
        <pre className="text-[11px] text-stone-600 bg-stone-50 border border-stone-100 rounded-xl p-4 overflow-x-auto max-h-96 whitespace-pre-wrap font-mono leading-relaxed">
          {html}
        </pre>
      </div>
    );
  }

  // ── Confirm view ─────────────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm mt-6">
        <h2 className="text-sm font-medium text-stone-700 mb-1">一次調査記事 — 確認</h2>
        <p className="text-xs text-stone-400 mb-5">入力内容を確認してから生成してください</p>

        <div className="space-y-2 mb-6 text-xs">
          <div className="flex gap-2 p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 w-28 flex-shrink-0">調査名</span>
            <span className="text-stone-800">{survey.survey_name}</span>
          </div>
          <div className="flex gap-2 p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 w-28 flex-shrink-0">n数 / 期間</span>
            <span className="text-stone-800">n={survey.n} / {survey.date_start ?? "—"} 〜 {survey.date_end ?? "—"}</span>
          </div>
          <div className="flex gap-2 p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 w-28 flex-shrink-0">チャート数</span>
            <span className="text-stone-800">{survey.charts.length}本</span>
          </div>
          <div className="flex gap-2 p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 w-28 flex-shrink-0">引用数</span>
            <span className="text-stone-800">{survey.quotes?.length ?? 0}件</span>
          </div>
          <div className="flex gap-2 p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 w-28 flex-shrink-0">データ種別</span>
            <span className={`font-medium px-2 py-0.5 rounded-full border ${TIER_COLORS[survey.data_tier]}`}>
              {TIER_LABELS[survey.data_tier]}
            </span>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mb-4 text-center">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => setStep("input")}
            className="flex-1 py-3 border border-stone-200 text-stone-600 text-sm rounded-xl"
          >
            戻る
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex-1 py-3 bg-stone-800 text-white text-sm rounded-xl font-medium hover:bg-stone-700 disabled:opacity-60"
          >
            {loading ? "生成中... (約30秒)" : "記事を生成"}
          </button>
        </div>
      </div>
    );
  }

  // ── Input view ───────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm mt-6">
      <h2 className="text-sm font-medium text-stone-700 mb-1">一次調査記事</h2>
      <p className="text-xs text-stone-400 mb-5">
        調査データを入力して、SVGチャート付きの記事を生成します
      </p>

      {/* データ種別 */}
      <div className="mb-5">
        <label className="text-xs font-medium text-stone-600 block mb-2">データ種別</label>
        <div className="flex gap-2">
          {(["A", "B", "C"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSurvey((s) => ({ ...s, data_tier: t }))}
              className={`flex-1 text-xs py-2 px-3 rounded-xl border transition-colors ${
                survey.data_tier === t
                  ? TIER_COLORS[t] + " font-medium"
                  : "border-stone-200 text-stone-500 bg-white"
              }`}
            >
              Tier {t}：{TIER_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 基本情報 */}
      <div className="mb-5">
        <h3 className="text-xs font-semibold text-stone-600 mb-3">基本情報</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[10px] text-stone-400 block mb-1">調査名 *</label>
            <input
              value={survey.survey_name}
              onChange={(e) => setSurvey((s) => ({ ...s, survey_name: e.target.value }))}
              className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
              placeholder="MJC Indigo Owner Survey #01"
            />
          </div>
          <div>
            <label className="text-[10px] text-stone-400 block mb-1">実施者</label>
            <input
              value={survey.conducted_by ?? ""}
              onChange={(e) => setSurvey((s) => ({ ...s, conducted_by: e.target.value }))}
              className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
              placeholder="Modern Japan Crafts"
            />
          </div>
          <div>
            <label className="text-[10px] text-stone-400 block mb-1">サンプル数 (n) *</label>
            <input
              type="number"
              min="1"
              value={survey.n || ""}
              onChange={(e) => setSurvey((s) => ({ ...s, n: parseInt(e.target.value) || 0 }))}
              className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
              placeholder="50"
            />
          </div>
          <div>
            <label className="text-[10px] text-stone-400 block mb-1">調査期間 開始</label>
            <input
              type="date"
              value={survey.date_start ?? ""}
              onChange={(e) => setSurvey((s) => ({ ...s, date_start: e.target.value }))}
              className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="text-[10px] text-stone-400 block mb-1">調査期間 終了</label>
            <input
              type="date"
              value={survey.date_end ?? ""}
              onChange={(e) => setSurvey((s) => ({ ...s, date_end: e.target.value }))}
              className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-stone-400 block mb-1">質問文（verbatim）</label>
            <input
              value={survey.question_verbatim ?? ""}
              onChange={(e) => setSurvey((s) => ({ ...s, question_verbatim: e.target.value }))}
              className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
              placeholder='"What surprised you most about the piece in the first three months?"'
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-stone-400 block mb-1">調査手法（任意）</label>
            <input
              value={survey.method ?? ""}
              onChange={(e) => setSurvey((s) => ({ ...s, method: e.target.value }))}
              className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
              placeholder="Open-ended online survey of Kickstarter backers..."
            />
          </div>
        </div>
      </div>

      {/* チャート */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-stone-600">チャート *</h3>
          <button onClick={addChart} className="text-xs text-stone-500 hover:text-stone-700 border border-stone-200 px-2.5 py-1 rounded-lg">
            + 追加
          </button>
        </div>
        {survey.charts.map((c, i) => (
          <ChartEditor
            key={c.id}
            chart={c}
            index={i}
            onChange={(updated) => updateChart(i, updated)}
            onRemove={() => removeChart(i)}
          />
        ))}
      </div>

      {/* 引用 */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-stone-600">回答者コメント（任意）</h3>
          <button onClick={addQuote} className="text-xs text-stone-500 hover:text-stone-700 border border-stone-200 px-2.5 py-1 rounded-lg">
            + 追加
          </button>
        </div>
        {(survey.quotes ?? []).map((q, i) => (
          <QuoteEditor
            key={i}
            quote={q}
            index={i}
            onChange={(updated) => updateQuote(i, updated)}
            onRemove={() => removeQuote(i)}
          />
        ))}
      </div>

      {/* 追加情報 */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-stone-600 block mb-2">
          追加情報・発見事項（任意）
        </label>
        <textarea
          value={survey.additional_findings ?? ""}
          onChange={(e) => setSurvey((s) => ({ ...s, additional_findings: e.target.value }))}
          className="w-full text-xs border border-stone-200 rounded-xl px-3 py-2 resize-none"
          rows={3}
          placeholder="74% repurchase intent. Under-45 respondents described fading in the vocabulary of denim..."
        />
      </div>

      <button
        onClick={() => setStep("confirm")}
        disabled={!canProceed}
        className="w-full py-3 bg-stone-800 text-white text-sm rounded-xl font-medium hover:bg-stone-700 disabled:opacity-40"
      >
        確認へ進む
      </button>
      {!canProceed && (
        <p className="text-[10px] text-stone-400 text-center mt-2">
          調査名・n数・チャート1本以上（タイトルとデータ行）が必要です
        </p>
      )}
    </div>
  );
}
