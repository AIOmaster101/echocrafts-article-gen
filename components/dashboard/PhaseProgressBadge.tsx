type Phase = 0 | 1 | 2 | 3 | 4;

interface PhaseProgressBadgeProps {
  phase: Phase;
}

const PHASE_CONFIG: Record<Phase, { label: string; className: string }> = {
  0: { label: "未開始", className: "bg-stone-100 text-stone-500" },
  1: { label: "情報抽出済", className: "bg-blue-100 text-blue-700" },
  2: { label: "テーマ選定済", className: "bg-purple-100 text-purple-700" },
  3: { label: "インタビュー待ち", className: "bg-yellow-100 text-yellow-700" },
  4: { label: "完成", className: "bg-green-100 text-green-700" },
};

export function PhaseProgressBadge({ phase }: PhaseProgressBadgeProps) {
  const config = PHASE_CONFIG[phase] ?? PHASE_CONFIG[0];
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
