#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { atomicJson, readJson, sha256 } from "./lib/publication-harness.mjs";

const args = process.argv.slice(2);
const command = args.shift();
const root = resolve(import.meta.dirname, "..");
const policy = readJson(join(root, "config/publication-policy.json"));

function option(name, required = true) {
  const index = args.indexOf(`--${name}`);
  if (index < 0) {
    if (required) throw new Error(`Missing --${name}`);
    return null;
  }
  const value = args[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`Missing --${name} value`);
  return value;
}

const dir = option("run-dir", false);
const runDir = dir ? resolve(dir) : null;
const inflightPath = runDir ? join(runDir, "inflight.json") : null;
const defaultApi = "https://echocrafts-article-gen.vercel.app";

function config() {
  const result = readJson(join(runDir, "run.json"));
  if (!result) throw new Error("Run not initialized. Use extract first.");
  return result;
}

async function post(apiBase, path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(
      `${path}: ${response.status} ${data.error ?? data.detail ?? "unknown error"}`,
    );
  }
  return data;
}

async function checkpoint(step, path, call) {
  if (existsSync(path)) return readJson(path);
  if (existsSync(inflightPath)) {
    const inflight = readJson(inflightPath);
    throw new Error(
      `Uncertain remote result for ${inflight.step}. Inspect the app before resuming; do not repeat the request.`,
    );
  }
  atomicJson(inflightPath, { step, startedAt: new Date().toISOString() });
  const value = await call();
  atomicJson(path, value);
  unlinkSync(inflightPath);
  return value;
}

function productPageUrl(productId, apiBase) {
  return `${apiBase}/products/${productId}`;
}

export function articleIdsFromHtml(html) {
  // Next's current public product page exposes the four saved article IDs in serialized props.
  // 画面のシリアライズ形式が変わった場合は推測せず停止する。
  const ids = new Map();
  const pattern =
    /"id":"([0-9a-f-]{36})","created_at":"[^"]+","theme_id":"[0-9a-f-]{36}","theme_index":([0-3])/g;
  const serialized = html.replace(/\\"/g, '"');
  for (const match of serialized.matchAll(pattern)) {
    const index = Number(match[2]);
    const existing = ids.get(index);
    if (existing && existing !== match[1]) {
      throw new Error(
        `Multiple saved article IDs for theme ${index}. Reconcile manually.`,
      );
    }
    ids.set(index, match[1]);
  }
  return ids;
}

async function remoteArticleIds(run) {
  const response = await fetch(productPageUrl(run.productId, run.apiBase), {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`Product page read failed: ${response.status}`);
  return articleIdsFromHtml(await response.text());
}

function validateProductUrl(url) {
  const parsed = new URL(url);
  if (
    parsed.origin !== new URL(policy.shopifyOrigin).origin ||
    !/^\/products\/[a-z0-9-]+$/.test(parsed.pathname) ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "Source must be one canonical Modern Japan Crafts product URL.",
    );
  }
  return parsed.toString();
}

async function extract() {
  const candidatePath = option("candidate", false);
  const craft = candidatePath ? readJson(resolve(candidatePath))?.craft : null;
  const productInput = option("product-url", false);
  if (Boolean(craft) === Boolean(productInput)) {
    throw new Error(
      "Use either --product-url or --candidate with a craft selection.",
    );
  }
  const productUrl = productInput ? validateProductUrl(productInput) : null;
  if (craft && (!craft.id || !craft.slug || !craft.sourceUrls?.length)) {
    throw new Error("Craft candidate lacks identity or evidence URLs.");
  }
  if (
    craft &&
    (craft.url !== `${policy.shopifyOrigin}/blogs/crafts/${craft.slug}` ||
      craft.sourceUrls.some((url) => {
        try {
          return new URL(url).protocol !== "https:";
        } catch {
          return true;
        }
      }))
  ) {
    throw new Error("Craft candidate URL or evidence URL is invalid.");
  }
  const apiBase = new URL(option("api-base", false) ?? defaultApi).origin;
  mkdirSync(runDir, { recursive: true });
  const runPath = join(runDir, "run.json");
  const existing = readJson(runPath);
  const q1 = option("q1", false) ?? existing?.q1 ?? policy.defaultQ1;
  const q2 = option("q2", false) ?? existing?.q2 ?? policy.defaultQ2;
  if (
    !["interview_yes", "interview_email", "interview_no"].includes(q1) ||
    !["position_definition", "position_gift", "position_auto"].includes(q2)
  ) {
    throw new Error(
      "Q1 or Q2 is not an option from the original generator UI.",
    );
  }
  if (
    existing &&
    (existing.productUrl !== productUrl ||
      existing.craftItemId !== (craft?.id ?? undefined) ||
      existing.apiBase !== apiBase ||
      existing.q1 !== q1 ||
      existing.q2 !== q2)
  ) {
    throw new Error(
      "Run directory already belongs to another product or API base.",
    );
  }
  const result = await checkpoint(
    "extract",
    join(runDir, "extract.json"),
    () =>
      craft
        ? post(apiBase, "/api/extract-from-craft", { craftItemId: craft.id })
        : post(apiBase, "/api/extract", { urls: [productUrl] }),
  );
  if (!result.productId || result._dbError) {
    throw new Error(
      `Extraction was not saved in the app: ${result._dbError ?? "missing productId"}`,
    );
  }
  if (
    craft &&
    (result.craftItemId !== craft.id ||
      result.craftSlug !== craft.slug ||
      !craft.sourceUrls.every((url) =>
        result.craftSources?.some((source) => source.url === url),
      ) ||
      result.price_jpy !== 0 ||
      result.price_usd !== 0 ||
      result.artisan !== "")
  ) {
    throw new Error(
      "Craft extraction differs from the selected evidence or invents product details.",
    );
  }
  atomicJson(runPath, {
    version: 1,
    apiBase,
    productUrl,
    sourceType: craft ? "craft" : "product",
    ...(craft
      ? {
          craftItemId: craft.id,
          craftSlug: craft.slug,
          craftUrl: craft.url,
          craftSources: result.craftSources,
          sourceUrls: craft.sourceUrls,
        }
      : {}),
    productId: result.productId,
    q1,
    q2,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });
  console.log(
    `Extracted ${productUrl ?? craft.slug}. Review extract.json before generation.`,
  );
}

function reviewedProduct(run) {
  const review = readJson(join(runDir, "source-review.json"));
  const product = readJson(join(runDir, "product-reviewed.json"));
  if (
    !review ||
    review.sourceUrl !== (run.craftUrl ?? run.productUrl) ||
    review.note?.trim().length < 20 ||
    !product ||
    product.productId !== run.productId ||
    !product.name_en
  ) {
    throw new Error(
      "Review extract.json against the product page, then save product-reviewed.json and source-review.json with sourceUrl and a substantive note.",
    );
  }
  if (
    run.sourceType === "craft" &&
    (product.price_jpy !== 0 ||
      product.price_usd !== 0 ||
      product.artisan !== "")
  ) {
    throw new Error(
      "Craft category must not contain a price or named artisan.",
    );
  }
  if (review.productHash !== sha256(JSON.stringify(product))) {
    throw new Error("Reviewed product changed after the source review.");
  }
  return product;
}

async function reviewSource() {
  const run = config();
  const path = join(runDir, "product-reviewed.json");
  const product = readJson(path);
  const note = option("note");
  if (
    !product ||
    product.productId !== run.productId ||
    note.trim().length < 20
  ) {
    throw new Error(
      "Save corrected product-reviewed.json and provide a substantive note.",
    );
  }
  atomicJson(join(runDir, "source-review.json"), {
    sourceUrl: run.craftUrl ?? run.productUrl,
    ...(run.sourceType === "craft" ? { sourceUrls: run.sourceUrls } : {}),
    note: note.trim(),
    productHash: sha256(JSON.stringify(product)),
    reviewedAt: new Date().toISOString(),
  });
  console.log("Product source review recorded.");
}

async function reviewArticle() {
  const run = config();
  const index = Number(option("index"));
  const note = option("note");
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > 3 ||
    note.trim().length < 20
  ) {
    throw new Error("Use --index 0..3 and a substantive --note.");
  }
  const article = readJson(join(runDir, `article-${index}.json`));
  if (!article?.contentEn) throw new Error("Generate the article first.");
  const path = join(runDir, `editorial-${index}.html`);
  if (!existsSync(path)) {
    writeFileSync(path, article.contentEn, { flag: "wx" });
  }
  const html = readFileSync(path, "utf8");
  if (existsSync(join(runDir, `distribution-${index}.json`))) {
    const stamped = readJson(join(runDir, `distribution-${index}.input.json`));
    if (stamped?.editorialHash !== sha256(html)) {
      throw new Error(
        "Distribution already exists for different article copy.",
      );
    }
  }
  const sourceLinks =
    run.sourceType === "craft"
      ? [run.craftUrl, ...(run.sourceUrls ?? [])]
      : [run.productUrl];
  if (!sourceLinks.some((url) => html.includes(new URL(url).pathname))) {
    throw new Error(
      "Editorial body must link to the selected product or craft entry.",
    );
  }
  atomicJson(join(runDir, `editorial-${index}.json`), {
    sourceUrl: run.craftUrl ?? run.productUrl,
    note: note.trim(),
    sha256: sha256(html),
    reviewedAt: new Date().toISOString(),
  });
  console.log(`Editorial review ${index + 1} recorded.`);
}

async function generate() {
  const run = config();
  const product = reviewedProduct(run);
  if (!run.q1 || !run.q2) {
    throw new Error("Q1 and Q2 must match the original generator UI options.");
  }
  const score = await checkpoint("score", join(runDir, "score.json"), () =>
    post(run.apiBase, "/api/score", {
      productInfo: product,
      q1: run.q1,
      q2: run.q2,
      productId: run.productId,
    }),
  );
  const themes = score.themes;
  const themeIds = score.themeIds;
  if (
    !Array.isArray(themes) ||
    themes.length !== 4 ||
    new Set(themes.map((item) => item.type)).size !== 4 ||
    !Array.isArray(themeIds) ||
    themeIds.length !== 4
  ) {
    throw new Error("Score API did not save exactly four distinct themes.");
  }
  for (let index = 0; index < 4; index++) {
    const articlePath = join(runDir, `article-${index}.json`);
    if (!existsSync(articlePath)) {
      const saved = await remoteArticleIds(run);
      if (saved.has(index)) {
        throw new Error(
          `Article ${index + 1} exists remotely but has no local checkpoint. Reconcile before retry.`,
        );
      }
    }
    const article = await checkpoint(`article-${index}`, articlePath, () =>
      post(run.apiBase, "/api/article", {
        themes: [themes[index]],
        productInfo: product,
        interviewAnswers: "",
        urls: run.sourceType === "craft" ? [] : [run.productUrl],
        ...(run.sourceType === "craft"
          ? {
              craftSlug: run.craftSlug,
              craftSources: run.craftSources,
            }
          : {}),
        productId: run.productId,
        themeId: themeIds[index],
        themeIndex: index,
      }),
    );
    if (!article.contentEn || !article.rawEn) {
      throw new Error(`Article ${index + 1} is incomplete.`);
    }
    await checkpoint(
      `translation-${index}`,
      join(runDir, `translation-${index}.json`),
      () =>
        post(run.apiBase, "/api/article/translate", {
          rawEn: article.rawEn,
          refsHtml: article.refsHtml,
          themeId: themeIds[index],
        }),
    );
  }
  const ids = await remoteArticleIds(run);
  if (ids.size !== 4)
    throw new Error("Could not confirm four saved article IDs.");
  atomicJson(
    join(runDir, "article-ids.json"),
    [0, 1, 2, 3].map((index) => ids.get(index)),
  );
  console.log(
    "Generated four articles. Review each English body before bundle.",
  );
}

async function bundle() {
  const run = config();
  const product = reviewedProduct(run);
  const score = readJson(join(runDir, "score.json"));
  const ids = readJson(join(runDir, "article-ids.json"));
  if (!score?.themes || ids?.length !== 4) {
    throw new Error("Generate and confirm four saved articles first.");
  }
  const currentIds = await remoteArticleIds(run);
  if (ids.some((id, index) => id !== currentIds.get(index))) {
    throw new Error(
      "Saved article IDs changed remotely. Reconcile before distribution.",
    );
  }
  const items = [];
  for (let index = 0; index < 4; index++) {
    const review = readJson(join(runDir, `editorial-${index}.json`));
    const htmlPath = join(runDir, `editorial-${index}.html`);
    if (
      !review?.note ||
      review.note.trim().length < 20 ||
      !existsSync(htmlPath)
    ) {
      throw new Error(`Editorial review for article ${index + 1} is missing.`);
    }
    const html = readFileSync(htmlPath, "utf8");
    if (
      review.sha256 !== sha256(html) ||
      review.sourceUrl !== (run.craftUrl ?? run.productUrl)
    ) {
      throw new Error(
        `Editorial article ${index + 1} changed or lacks source evidence.`,
      );
    }
    const distributionPath = join(runDir, `distribution-${index}.json`);
    const inputPath = join(runDir, `distribution-${index}.input.json`);
    const existingDistribution = existsSync(distributionPath);
    if (
      existingDistribution &&
      readJson(inputPath)?.editorialHash !== review.sha256
    ) {
      throw new Error(
        `Distribution ${index + 1} was generated from different copy.`,
      );
    }
    const distribution = await checkpoint(
      `distribution-${index}`,
      distributionPath,
      () =>
        post(run.apiBase, "/api/distribute", {
          article_id: ids[index],
          theme_title_en: score.themes[index].title_en,
          content_en: html,
          product_name_en: product.name_en,
          product_name_ja: product.name_ja,
        }),
    );
    if (!existingDistribution) {
      atomicJson(inputPath, { editorialHash: review.sha256 });
    }
    const newsletter = distribution.distribution?.newsletter;
    if (!newsletter?.subject || !newsletter?.body) {
      throw new Error(`Distribution ${index + 1} lacks Substack copy.`);
    }
    items.push({
      id: ids[index],
      themeIndex: index,
      titleEn: score.themes[index].title_en,
      titleJa: score.themes[index].title_ja,
      themeType: score.themes[index].type,
      shopifyBodyHtml: html,
      substackSubject: newsletter.subject,
      substackSubtitle: newsletter.subtitle ?? "",
      substackBody: newsletter.body,
      sources: readJson(join(runDir, `article-${index}.json`))?.sources ?? [],
    });
  }
  const output = join(runDir, "bundle.json");
  const next = {
    version: 1,
    product: {
      id: run.productId,
      nameEn: product.name_en,
      nameJa: product.name_ja,
      sourceType: run.sourceType ?? "product",
      ...(run.sourceType === "craft"
        ? {
            craftItemId: run.craftItemId,
            craftSlug: run.craftSlug,
            craftUrl: run.craftUrl,
          }
        : {}),
      sourceUrls:
        run.sourceType === "craft" ? run.sourceUrls : [run.productUrl],
    },
    destinations: {
      shopifyStore: policy.shopifyStore,
      shopifyBlog: policy.shopifyBlog,
      substackPublication: new URL(policy.substackOrigin).host,
    },
    articles: items,
  };
  if (
    existsSync(output) &&
    sha256(JSON.stringify(readJson(output))) !== sha256(JSON.stringify(next))
  ) {
    throw new Error("Existing bundle differs. Inspect it before replacing.");
  }
  atomicJson(output, next);
  console.log(`Bundle ready: ${output}`);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  const actions = {
    extract,
    "review-source": reviewSource,
    generate,
    "review-article": reviewArticle,
    bundle,
  };
  (
    actions[command] ??
    (() =>
      Promise.reject(
        new Error(
          "Use extract, review-source, generate, review-article, or bundle.",
        ),
      ))
  )().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
