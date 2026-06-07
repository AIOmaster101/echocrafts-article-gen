import type { ProductRow } from "@/types";
import { PhaseProgressBadge } from "./PhaseProgressBadge";

interface ProductCardProps {
  product: ProductRow;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDisplayName(product: ProductRow): string {
  if (product.name_ja) return product.name_ja;
  if (product.name_en) return product.name_en;
  if (product.urls && product.urls.length > 0) {
    try {
      const url = new URL(product.urls[0]);
      return url.hostname + url.pathname.slice(0, 30);
    } catch {
      return product.urls[0].slice(0, 40);
    }
  }
  return "名称未設定";
}

export function ProductCard({ product }: ProductCardProps) {
  const displayName = getDisplayName(product);
  const isComplete = product.phase_completed === 4;
  const href = isComplete
    ? `/products/${product.id}`
    : `/products/${product.id}/resume?phase=${product.phase_completed}`;
  const buttonLabel = isComplete ? "詳細を見る →" : "続きから →";

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-medium text-stone-800 leading-snug line-clamp-2">
          {displayName}
        </h2>
        <PhaseProgressBadge phase={product.phase_completed} />
      </div>
      <p className="text-xs text-stone-400">{formatDate(product.created_at)}</p>
      <div className="mt-auto pt-2">
        <a
          href={href}
          className="inline-block px-4 py-2 bg-stone-800 text-white text-xs rounded-xl hover:bg-stone-700 transition-colors"
        >
          {buttonLabel}
        </a>
      </div>
    </div>
  );
}
