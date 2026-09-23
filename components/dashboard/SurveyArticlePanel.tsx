"use client";

import { useState, useRef } from "react";
import type { SurveyArticleMeta } from "@/types";

interface Props {
  productId: string;
  productNameEn: string;
  productNameJa: string;
  initialHtml?: string | null;
  initialMeta?: SurveyArticleMeta | null;
}

const TIER_LABELS: Record<string, string> = {
  A: "実データ（アップロード済み）",
  B: "AIリサーチ（学習データ活用）",
  C: "AI推定（補完済み）",
};
const TIER_COLORS: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-blue-50 text-blue-700 border-blue-200",
  C: "bg-amber-50 text-amber-700 border-amber-200",
};

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

export function SurveyArticlePanel({ productId, productNameEn, productNameJa, initialHtml, initialMeta }: Props) {
  const [html, setHtml] = useState<string>(initialHtml ?? "");
  const [meta, setMeta] = useState<SurveyArticleMeta | null>(initialMeta ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(!initialHtml);

  // Form fields
  const [surveyName, setSurveyName] = useState("");
  const [conductedBy, setConductedBy] = useState("Modern Japan Crafts");
  const [n, setN] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [method, setMethod] = useState("");
  const [questionVerbatim, setQuestionVerbatim] = useState("");
  const [additionalFindings, setAdditionalFindings] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleGenerate(skipFile = false) {
    if (!surveyName.trim()) {
      setError("調査名を入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("product_id", productId);
      fd.append("product_name_en", productNameEn);
      fd.append("product_name_ja", productNameJa);
      fd.append("survey_name", surveyName);
      fd.append("conducted_by", conductedBy);
      fd.append("n", n);
      fd.append("date_start", dateStart);
      fd.append("date_end", dateEnd);
      fd.append("method", method);
      fd.append("question_verbatim", questionVerbatim);
      fd.append("additional_findings", additionalFindings);
      fd.append("quotes", "[]");
      if (!skipFile && file) fd.append("file", file);

      const res = await fetch("/api/survey-article", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "生成に失敗しました");
        return;
      }
      setHtml(data.html);
      setMeta(data.meta);
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // ── Result view ───────────────────────────────────────────────────────────
  if (!showForm && html) {
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
            onClick={() => setShowForm(true)}
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

  // ── Input view ────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm mt-6">
      <h2 className="text-sm font-medium text-stone-700 mb-1">一次調査記事</h2>
      <p className="text-xs text-stone-400 mb-5">
        調査データを入力または CSV/Excel をアップロードして記事を自動生成します。データがなくてもAIが補完します。
      </p>

      {/* 必須：調査名 */}
      <div className="mb-4">
        <label className="text-[10px] text-stone-400 block mb-1">調査名 *</label>
        <input
          value={surveyName}
          onChange={(e) => setSurveyName(e.target.value)}
          className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
          placeholder="MJC Indigo Owner Survey #01"
        />
      </div>

      {/* 基本情報グリッド */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-stone-400 block mb-1">実施者</label>
          <input
            value={conductedBy}
            onChange={(e) => setConductedBy(e.target.value)}
            className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
            placeholder="Modern Japan Crafts"
          />
        </div>
        <div>
          <label className="text-[10px] text-stone-400 block mb-1">サンプル数 (n)</label>
          <input
            type="number"
            min="1"
            value={n}
            onChange={(e) => setN(e.target.value)}
            className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
            placeholder="50"
          />
        </div>
        <div>
          <label className="text-[10px] text-stone-400 block mb-1">調査期間 開始</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-[10px] text-stone-400 block mb-1">調査期間 終了</label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-stone-400 block mb-1">質問文（verbatim・任意）</label>
          <input
            value={questionVerbatim}
            onChange={(e) => setQuestionVerbatim(e.target.value)}
            className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
            placeholder='"What surprised you most about the piece in the first three months?"'
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-stone-400 block mb-1">調査手法（任意）</label>
          <input
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2"
            placeholder="Open-ended online survey of Kickstarter backers..."
          />
        </div>
      </div>

      {/* ファイルアップロード（Tier A） */}
      <div className="mb-4">
        <label className="text-[10px] text-stone-400 block mb-1">
          調査データファイル（CSV / Excel） — <span className="text-emerald-600">Tier A：実データ</span>
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
            file ? "border-emerald-300 bg-emerald-50" : "border-stone-200 hover:border-stone-300"
          }`}
        >
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-emerald-700 font-medium">{file.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="text-xs text-stone-400 hover:text-red-400"
              >
                ×
              </button>
            </div>
          ) : (
            <p className="text-xs text-stone-400">クリックしてファイルを選択（.csv / .xlsx）</p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls,.txt"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* 追加情報 */}
      <div className="mb-6">
        <label className="text-[10px] text-stone-400 block mb-1">追加情報・発見事項（任意）</label>
        <textarea
          value={additionalFindings}
          onChange={(e) => setAdditionalFindings(e.target.value)}
          className="w-full text-xs border border-stone-200 rounded-xl px-3 py-2 resize-none"
          rows={2}
          placeholder="74% repurchase intent. Under-45 respondents described fading in the vocabulary of denim..."
        />
      </div>

      {error && <p className="text-xs text-red-500 mb-4 text-center">{error}</p>}

      {/* ボタン */}
      <div className="space-y-2">
        <button
          onClick={() => handleGenerate(false)}
          disabled={loading || !surveyName.trim()}
          className="w-full py-3 bg-stone-800 text-white text-sm rounded-xl font-medium hover:bg-stone-700 disabled:opacity-40"
        >
          {loading
            ? "生成中... (30〜60秒)"
            : file
            ? "実データで記事を生成（Tier A）"
            : "AIリサーチで記事を生成（Tier B/C）"}
        </button>
        {file && !loading && (
          <button
            onClick={() => handleGenerate(true)}
            disabled={loading || !surveyName.trim()}
            className="w-full py-2 border border-stone-200 text-stone-500 text-xs rounded-xl hover:bg-stone-50"
          >
            ファイルを使わずAIリサーチで生成（Tier B/C）
          </button>
        )}
      </div>

      {/* Tier 説明 */}
      <div className="mt-4 space-y-1.5">
        {(["A", "B", "C"] as const).map((t) => (
          <div key={t} className={`flex items-start gap-2 text-[10px] px-3 py-2 rounded-xl border ${TIER_COLORS[t]}`}>
            <span className="font-semibold flex-shrink-0">Tier {t}</span>
            <span>{TIER_LABELS[t]}</span>
          </div>
        ))}
      </div>

      {html && (
        <button
          onClick={() => setShowForm(false)}
          className="w-full mt-3 py-2 text-xs text-stone-400 hover:text-stone-700"
        >
          生成済みの記事を表示 →
        </button>
      )}
    </div>
  );
}
