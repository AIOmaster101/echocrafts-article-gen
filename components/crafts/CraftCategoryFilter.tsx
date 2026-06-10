"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CraftCategory } from "@/types/crafts";

const CATEGORIES: { value: CraftCategory | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "ceramics", label: "ceramics" },
  { value: "glass", label: "glass" },
  { value: "textiles", label: "textiles" },
  { value: "lacquerware", label: "lacquerware" },
  { value: "metalwork", label: "metalwork" },
  { value: "woodwork", label: "woodwork" },
  { value: "paper", label: "paper" },
  { value: "other", label: "other" },
];

export function CraftCategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("category") ?? "all";

  function handleClick(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("category");
    } else {
      params.set("category", value);
    }
    router.push(`/admin/crafts?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => handleClick(cat.value)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            current === cat.value
              ? "bg-stone-800 text-white"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
