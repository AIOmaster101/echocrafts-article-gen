"use client";

import { Source } from "@/types";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-stone-100 rounded-2xl p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function ScoreBar({ score, max = 30 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-stone-800 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-stone-500 w-8 text-right">
        {score}/{max}
      </span>
    </div>
  );
}

const TIER_COLORS: Record<string, string> = {
  "Tier 1": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Tier 2": "bg-blue-50 text-blue-800 border-blue-200",
  "Tier 3": "bg-violet-50 text-violet-800 border-violet-200",
  "Tier 4": "bg-amber-50 text-amber-800 border-amber-200",
};

export function TierTag({ tier }: { tier: string }) {
  return (
    <span
      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
        TIER_COLORS[tier] || "bg-stone-50 text-stone-600 border-stone-200"
      }`}
    >
      {tier}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center gap-2 text-stone-500">
      <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      <span className="text-sm">処理中...</span>
    </div>
  );
}

export function SourceList({ sources }: { sources: Source[] }) {
  return (
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
  );
}
