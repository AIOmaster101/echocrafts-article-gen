"use client";

import type { CraftItem, CraftItemStatus, ArticleType } from "@/types/crafts";

interface CraftItemCardProps {
  craft: CraftItem;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusBadgeClass(status: CraftItemStatus): string {
  switch (status) {
    case "pending_facts":
      return "bg-stone-100 text-stone-600";
    case "facts_review":
      return "bg-blue-100 text-blue-700";
    case "generating":
      return "bg-yellow-100 text-yellow-700";
    case "article_review":
      return "bg-orange-100 text-orange-700";
    case "approved":
      return "bg-green-100 text-green-700";
    case "pushed":
    case "published":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-stone-100 text-stone-600";
  }
}

function articleTypeBadgeClass(type: ArticleType): string {
  return type === "pillar"
    ? "bg-indigo-100 text-indigo-700"
    : "bg-stone-100 text-stone-600";
}

export function CraftItemCard({ craft }: CraftItemCardProps) {
  return (
    <a
      href={`/admin/crafts/${craft.id}`}
      className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-stone-800 leading-snug">
            {craft.name_en}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">{craft.name_ja}</p>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(craft.status)}`}
        >
          {craft.status.replace(/_/g, " ")}
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full">
          {craft.category}
        </span>
        <span
          className={`px-2 py-0.5 text-xs rounded-full ${articleTypeBadgeClass(craft.article_type)}`}
        >
          {craft.article_type}
        </span>
      </div>
      <p className="text-xs text-stone-400 mt-auto">{formatDate(craft.created_at)}</p>
    </a>
  );
}
