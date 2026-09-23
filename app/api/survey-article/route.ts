export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { callClaude, ClaudeOverloadedError } from "@/lib/claude";
import { getSupabaseClient } from "@/lib/supabase";
import type { SurveyArticleMeta } from "@/types";

// ── CSV/Excel parser ────────────────────────────────────────────────────────

function parseCsvText(text: string): string {
  // Return as-is — Claude will interpret the raw CSV rows
  return text.trim();
}

async function parseExcelBuffer(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(ws);
    if (csv.trim().length > 0) {
      parts.push(`[Sheet: ${sheetName}]\n${csv}`);
    }
  }
  return parts.join("\n\n");
}

// ── Tier B/C: synthesize research data via Claude ──────────────────────────

const RESEARCH_SYSTEM = `You are a market researcher with deep knowledge of Japanese craft products and their international buyers.
Given a product and survey context, synthesize realistic survey findings that a real U.S. owner survey might produce.
Base your synthesis on your training knowledge about: craft product ownership, cultural differences in craft appreciation, U.S. consumer behavior, and the specific craft category.

Return ONLY a JSON object (no markdown fences) with this shape:
{
  "data_description": "2-3 sentences explaining what the synthesized data represents",
  "questions": [
    {
      "question_text": "the survey question",
      "chart_type": "horizontal-bar or grouped-bar",
      "chart_title": "chart title for display",
      "chart_subtitle": "e.g. 'Open-ended, multiple codes per response (n=50)'",
      "rows": [
        { "label": "...", "value": 42, "value2": null }
      ],
      "series1_label": null,
      "series2_label": null
    }
  ],
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "suggested_quotes": [
    { "text": "...", "respondent_id": "R1", "gender": "woman", "age_group": "35-44", "location": "NY", "product_detail": "..." }
  ]
}
For grouped-bar, set value2 for all rows and set series1_label / series2_label.
Generate 3–4 questions that together tell a coherent story about the ownership experience.`;

async function synthesizeResearch(
  productNameEn: string,
  productNameJa: string,
  surveyName: string,
  n: number,
  questionVerbatim?: string,
  additionalContext?: string
): Promise<string> {
  const userMsg = JSON.stringify({
    product_name_en: productNameEn,
    product_name_ja: productNameJa,
    survey_name: surveyName,
    n,
    question_verbatim: questionVerbatim,
    additional_context: additionalContext,
  });
  return callClaude(RESEARCH_SYSTEM, userMsg);
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const productId = formData.get("product_id") as string;
    const productNameEn = formData.get("product_name_en") as string;
    const productNameJa = formData.get("product_name_ja") as string;
    const surveyName = formData.get("survey_name") as string;
    const conductedBy = (formData.get("conducted_by") as string) || "Modern Japan Crafts";
    const n = parseInt(formData.get("n") as string) || 0;
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

    // ── Step 1: get data ──────────────────────────────────────────────────
    let rawData = "";
    let dataTier: "A" | "B" | "C" = "C";

    if (file && file.size > 0) {
      // Tier A: user uploaded file
      dataTier = "A";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const name = file.name.toLowerCase();
      if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
        rawData = parseCsvText(new TextDecoder().decode(buffer));
      } else {
        // .xlsx / .xls
        rawData = await parseExcelBuffer(buffer);
      }
    } else {
      // Tier B → try Claude synthesis from training knowledge
      // (no external web call needed — Claude's training data covers craft ownership patterns)
      dataTier = "B";
      try {
        const synthesized = await synthesizeResearch(
          productNameEn, productNameJa, surveyName, n || 50,
          questionVerbatim, additionalFindings
        );
        // If Claude returned something useful, use it; otherwise fall through to C
        if (synthesized && synthesized.length > 100) {
          rawData = synthesized;
        } else {
          dataTier = "C";
          rawData = `No external data available. Generate plausible survey findings for a U.S. owner survey about ${productNameEn} (${productNameJa}), n=${n || 50}.`;
        }
      } catch {
        dataTier = "C";
        rawData = `Generate plausible survey findings for a U.S. owner survey about ${productNameEn} (${productNameJa}), n=${n || 50}.`;
      }
    }

    // ── Step 2: generate article ──────────────────────────────────────────
    let systemPrompt: string;
    try {
      systemPrompt = readFileSync(join(process.cwd(), "prompts", "survey-article.md"), "utf-8");
    } catch {
      return NextResponse.json({ error: "Prompt file not found" }, { status: 500 });
    }

    let quotes: unknown[] = [];
    try { quotes = JSON.parse(quotesRaw); } catch { quotes = []; }

    const userMessage = JSON.stringify({
      product_name_en: productNameEn,
      product_name_ja: productNameJa,
      survey_name: surveyName,
      conducted_by: conductedBy,
      n: n || 50,
      date_start: dateStart,
      date_end: dateEnd,
      method,
      question_verbatim: questionVerbatim,
      raw_data: rawData,
      quotes,
      additional_findings: additionalFindings,
    });

    const html = await callClaude(systemPrompt, userMessage);
    const cleanHtml = html.replace(/^```html\s*/i, "").replace(/```\s*$/i, "").trim();

    const meta: SurveyArticleMeta = {
      survey_name: surveyName,
      n: n || 50,
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
