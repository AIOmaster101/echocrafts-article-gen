export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { callClaude, ClaudeOverloadedError } from "@/lib/claude";
import { getSupabaseClient } from "@/lib/supabase";
import type { SurveyInput, SurveyArticleMeta } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { product_id, survey, product_name_en, product_name_ja } =
      await req.json() as {
        product_id: string;
        survey: SurveyInput;
        product_name_en: string;
        product_name_ja: string;
      };

    if (!product_id || !survey) {
      return NextResponse.json({ error: "product_id and survey are required" }, { status: 400 });
    }

    let systemPrompt: string;
    try {
      systemPrompt = readFileSync(join(process.cwd(), "prompts", "survey-article.md"), "utf-8");
    } catch {
      return NextResponse.json({ error: "Prompt file not found" }, { status: 500 });
    }

    const userMessage = JSON.stringify({
      product_name_en,
      product_name_ja,
      survey_name: survey.survey_name,
      conducted_by: survey.conducted_by ?? "Modern Japan Crafts",
      n: survey.n,
      date_start: survey.date_start,
      date_end: survey.date_end,
      method: survey.method,
      question_verbatim: survey.question_verbatim,
      charts: survey.charts,
      quotes: survey.quotes ?? [],
      additional_findings: survey.additional_findings ?? "",
    });

    const html = await callClaude(systemPrompt, userMessage);

    // Strip accidental markdown fences
    const cleanHtml = html.replace(/^```html\s*/i, "").replace(/```\s*$/i, "").trim();

    const meta: SurveyArticleMeta = {
      survey_name: survey.survey_name,
      n: survey.n,
      data_tier: survey.data_tier,
      generated_at: new Date().toISOString(),
    };

    const db = getSupabaseClient();
    const { error } = await db
      .from("products")
      .update({ survey_article_html: cleanHtml, survey_article_meta: meta })
      .eq("id", product_id);

    if (error) {
      console.error("Supabase save error:", error);
    }

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
