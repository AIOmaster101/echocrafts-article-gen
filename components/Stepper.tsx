"use client";

const PHASES = ["インプット", "情報抽出", "テーマ選定", "質問生成", "記事生成"];

export function Stepper({ phase }: { phase: number }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {PHASES.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border transition-all duration-300 ${
                i < phase
                  ? "bg-stone-800 border-stone-800 text-white"
                  : i === phase
                  ? "bg-white border-stone-800 text-stone-800"
                  : "bg-white border-stone-200 text-stone-400"
              }`}
            >
              {i < phase ? "✓" : i + 1}
            </div>
            <span
              className={`mt-1.5 text-xs whitespace-nowrap ${
                i === phase ? "text-stone-800 font-medium" : "text-stone-400"
              }`}
            >
              {label}
            </span>
          </div>
          {i < PHASES.length - 1 && (
            <div
              className={`h-px flex-1 mx-2 mt-[-14px] transition-all duration-500 ${
                i < phase ? "bg-stone-800" : "bg-stone-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
