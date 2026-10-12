#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const inputPath = process.argv[2];
const outputPath = process.argv[3];
const evidenceFlag = process.argv[4];
const evidencePath = process.argv[5];
if (
  !inputPath ||
  !outputPath ||
  evidenceFlag !== "--visual-evidence" ||
  !evidencePath ||
  process.argv.length !== 6
) {
  console.error(
    "Usage: node scripts/prepare-publication.mjs <bundle.json> <output-dir> --visual-evidence <visual-evidence.json>",
  );
  process.exit(2);
}

const bundle = JSON.parse(readFileSync(inputPath, "utf8"));
const visualEvidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const articles = bundle.articles;
if (
  bundle.version !== 1 ||
  !Array.isArray(articles) ||
  articles.length !== 4 ||
  new Set(articles.map((article) => article.id)).size !== 4 ||
  new Set(articles.map((article) => article.themeIndex)).size !== 4 ||
  articles.some(
    (article) =>
      !article.titleEn ||
      !article.shopifyBodyHtml ||
      !article.substackSubject ||
      !article.substackBody,
  )
) {
  throw new Error(
    "The bundle must contain exactly four distinct generated articles.",
  );
}
if (
  bundle.destinations?.shopifyStore !== "xffvf7-e1.myshopify.com" ||
  bundle.destinations?.shopifyBlog !== "journal" ||
  bundle.destinations?.substackPublication !== "modernjapancrafts.substack.com"
) {
  throw new Error("Unexpected publication destination.");
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/['"’‘“”]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validateVisualEvidence() {
  const isCraft = bundle.product.sourceType === "craft";
  const scenes = visualEvidence.articles?.map((article) => article.scene);
  if (
    visualEvidence.version !== 1 ||
    !Array.isArray(visualEvidence.referenceImages) ||
    visualEvidence.referenceImages.length === 0 ||
    visualEvidence.referenceImages.some((url) => !validHttpsUrl(url)) ||
    !Array.isArray(visualEvidence.referenceFiles) ||
    visualEvidence.referenceFiles.length !==
      visualEvidence.referenceImages.length ||
    visualEvidence.referenceFiles.some(
      (path) =>
        typeof path !== "string" ||
        !path ||
        !existsSync(resolve(dirname(evidencePath), path)),
    ) ||
    !Array.isArray(visualEvidence.articles) ||
    visualEvidence.articles.length !== 4 ||
    visualEvidence.articles.some(
      (article, index) =>
        article.themeIndex !== index ||
        !article.scene?.trim() ||
        !article.visualFocus?.trim(),
    ) ||
    new Set(scenes).size !== 4 ||
    (!isCraft &&
      (!visualEvidence.productUrl ||
        !validHttpsUrl(visualEvidence.productUrl) ||
        !bundle.product.sourceUrls?.includes(visualEvidence.productUrl) ||
        !visualEvidence.dimensions?.trim() ||
        !visualEvidence.visibleFeatures?.trim()))
  ) {
    throw new Error(
      "Visual evidence must include source image URLs and local files plus four distinct scenes; product mode also needs the source URL, dimensions, and visible features.",
    );
  }
}

validateVisualEvidence();
const sourceImageInputs = visualEvidence.referenceFiles.map((path, index) => {
  const file = resolve(dirname(evidencePath), path);
  return {
    url: visualEvidence.referenceImages[index],
    path: file,
    sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
  };
});

function imagePrompt(article, brief) {
  const isCraft = bundle.product.sourceType === "craft";
  return [
    `Use case: ${isCraft ? "craft-category editorial illustration" : "product-grounded lifestyle editorial"}`,
    "Asset type: premium editorial article cover for Modern Japan Crafts",
    `Article: ${article.titleEn}`,
    `${isCraft ? "Craft category" : "Product"} context: ${bundle.product.nameEn || bundle.product.nameJa || "Japanese craft"}`,
    `Source image inputs: ${sourceImageInputs.map((input) => input.path).join(", ")}`,
    `Source image URLs: ${visualEvidence.referenceImages.join(", ")}`,
    `Scene for this article: ${brief.scene}`,
    `Visual focus: ${brief.visualFocus}`,
    `Product dimensions and scale: ${visualEvidence.dimensions || "category reference only"}`,
    `Visible product features: ${visualEvidence.visibleFeatures || "verified craft features only"}`,
    `Selected variant: ${brief.variant || "use only a variant visible in the source images"}`,
    "Primary request: Create a photorealistic everyday use scene with the restraint and intimacy of a premium photo book. The craft belongs naturally in the scene, alongside a few believable objects and human traces, without a sterile studio display.",
    "Composition: subject readable at small Journal-card size; distinct camera position, activity, props, and light from the other three covers in this batch. No collage.",
    "Lighting and palette: natural editorial light, tactile materials, quiet elegance, accurate material color and finish.",
    isCraft
      ? "Constraints: depict a representative craft category, not a specific item for sale. Use verified reference sources for materials and technique; do not invent an exact object, maker mark, or product claim."
      : "Constraints: supply the actual product photographs as image inputs to the generation tool, not just as URLs in text. Preserve silhouette, proportions, rim, foot, pattern, finish, and relative size. Do not substitute a similar product. If source photos do not show a feature or variant clearly, do not invent it.",
    "Avoid: text, logos, watermark, invented labels, exaggerated gloss, visual clutter, misleading product details, apparent unsafe care or unsupported food-contact claims.",
  ].join("\n");
}

const outputDir = resolve(outputPath);
if (existsSync(outputDir)) {
  throw new Error(`Output directory already exists: ${outputDir}`);
}
mkdirSync(outputDir, { recursive: true });
const receipt = {
  version: 1,
  productId: bundle.product.id,
  sourceType: bundle.product.sourceType ?? "product",
  ...(bundle.product.sourceType === "craft"
    ? {
        craftItemId: bundle.product.craftItemId,
        craftSlug: bundle.product.craftSlug,
        craftUrl: bundle.product.craftUrl,
      }
    : {}),
  createdAt: new Date().toISOString(),
  destinations: bundle.destinations,
  articles: [],
};

for (const article of [...articles].sort(
  (a, b) => a.themeIndex - b.themeIndex,
)) {
  const slug = slugify(article.titleEn);
  if (!slug)
    throw new Error(`Cannot derive a Shopify handle for article ${article.id}`);
  const dir = join(outputDir, `${article.themeIndex + 1}-${slug}`);
  mkdirSync(dir);
  writeFileSync(join(dir, "shopify.html"), article.shopifyBodyHtml);
  writeFileSync(
    join(dir, "substack.txt"),
    [
      article.substackSubject,
      article.substackSubtitle || "",
      "",
      article.substackBody ||
        "[Substack distribution content has not been generated.]",
    ].join("\n"),
  );
  const visualBrief = visualEvidence.articles[article.themeIndex];
  writeFileSync(
    join(dir, "cover-brief.json"),
    JSON.stringify(
      {
        ...visualEvidence,
        sourceImageInputs,
        articles: undefined,
        articleTitle: article.titleEn,
        ...visualBrief,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(dir, "cover-prompt.txt"),
    imagePrompt(article, visualBrief),
  );
  writeFileSync(
    join(dir, "source.json"),
    JSON.stringify(
      {
        articleId: article.id,
        titleEn: article.titleEn,
        titleJa: article.titleJa,
        productSourceUrls: bundle.product.sourceUrls,
        sourceType: bundle.product.sourceType ?? "product",
        ...(bundle.product.sourceType === "craft"
          ? {
              craftItemId: bundle.product.craftItemId,
              craftSlug: bundle.product.craftSlug,
              craftUrl: bundle.product.craftUrl,
            }
          : {}),
        sources: article.sources,
      },
      null,
      2,
    ),
  );
  receipt.articles.push({
    sourceArticleId: article.id,
    themeIndex: article.themeIndex,
    title: article.titleEn,
    handle: slug,
    directory: basename(dir),
    sourceHash: hash(article.shopifyBodyHtml),
    cover: { path: null, sha256: null, reviewed: false },
    shopify: { status: "pending", id: null, url: null, verifiedAt: null },
    substack: {
      status: "pending",
      url: null,
      verifiedAt: null,
      emailSent: false,
    },
  });
}
writeFileSync(
  join(outputDir, "receipt.json"),
  JSON.stringify(receipt, null, 2),
);
console.log(`Prepared four articles in ${outputDir}`);
