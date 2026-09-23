export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { callClaude, ClaudeOverloadedError } from "@/lib/claude";
import { getSupabaseClient } from "@/lib/supabase";
import type { SurveyArticleMeta } from "@/types";

// ── CSV/Excel parser ────────────────────────────────────────────────────────

async function parseFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
    return new TextDecoder().decode(buffer).trim();
  }
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });
  return wb.SheetNames.map((s) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[s]);
    return csv.trim() ? `[Sheet: ${s}]\n${csv}` : "";
  }).filter(Boolean).join("\n\n");
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const productId = formData.get("product_id") as string;
    const productNameEn = (formData.get("product_name_en") as string) || "";
    const productNameJa = (formData.get("product_name_ja") as string) || "";
    const surveyName = (formData.get("survey_name") as string) || "";
    const conductedBy = (formData.get("conducted_by") as string) || "Modern Japan Crafts";
    const n = parseInt(formData.get("n") as string) || 50;
    const dateStart = (formData.get("date_start") as string) || "";
    const dateEnd = (formData.get("date_end") as string) || "";
    const method = (formData.get("method") as string) || "";
    const questionVerbatim = (formData.get("question_verbatim") as string) || "";
    const additionalFindings = (formData.get("additional_findings") as string) || "";
    const quotesRaw = (formData.get("quotes") as string) || "[]";
    const file = formData.get("file") as File | null;

    if (!productId) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 });
    }

    // ── Parse file if provided (Tier A), otherwise pass empty string (Tier B/C) ──
    let rawData = "";
    let dataTier: "A" | "B" | "C" = "B";

    if (file && file.size > 0) {
      rawData = await parseFile(file);
      dataTier = "A";
    }

    // ── Single Claude call: research + article in one pass ──────────────────
    let systemPrompt: string;
    try {
      systemPrompt = readFileSync(join(process.cwd(), "prompts", "survey-article.md"), "utf-8");
    } catch {
      return NextResponse.json({ error: "Prompt file not found" }, { status: 500 });
    }

    let quotes: unknown[] = [];
    try { quotes = JSON.parse(quotesRaw); } catch { quotes = []; }

    // When no file: instruct Claude to generate its own research data inline
    const dataSection = rawData
      ? rawData
      : `NO_DATA_PROVIDED — synthesize plausible, specific survey findings for a U.S. owner survey about ${productNameEn || productNameJa} (n=${n}). Choose 3–4 survey questions that reveal the ownership experience, invent realistic percentage breakdowns, and design appropriate charts. Do not mention that data is synthesized.`;

    const userMessage = JSON.stringify({
      product_name_en: productNameEn,
      product_name_ja: productNameJa,
      survey_name: surveyName || `MJC ${productNameEn || productNameJa} Owner Survey`,
      conducted_by: conductedBy,
      n,
      date_start: dateStart,
      date_end: dateEnd,
      method,
      question_verbatim: questionVerbatim,
      raw_data: dataSection,
      quotes,
      additional_findings: additionalFindings,
    });

    const html = await callClaude(systemPrompt, userMessage, 16000);
    const cleanHtml = html.replace(/^```html\s*/i, "").replace(/```\s*$/i, "").trim();

    const meta: SurveyArticleMeta = {
      survey_name: surveyName || `MJC ${productNameEn || productNameJa} Owner Survey`,
      n,
      data_tier: dataTier,
      generated_at: new Date().toISOString(),
    };

    const db = getSupabaseClient();
    await db
      .from("products")
      .update({ survey_article_html: cleanHtml, survey_article_meta: meta })
      .eq("id", productId);

    return NextResponse.json({ success: true, html: cleanHtml, meta });
  } catch (err) {
    if (err instanceof ClaudeOverloadedError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("survey-article error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
