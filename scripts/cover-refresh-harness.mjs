#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  atomicJson,
  readJson,
  sha256,
  withLock,
} from "./lib/publication-harness.mjs";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(process.env.COVER_REFRESH_SOURCE_ROOT ?? root);
const manifestPath = resolve(
  process.env.COVER_REFRESH_MANIFEST ??
    join(root, ".tmp/cover-refresh/manifest.json"),
);
const args = process.argv.slice(2);
const command = args.shift();

function option(name) {
  const index = args.indexOf(`--${name}`);
  if (index < 0 || !args[index + 1] || args[index + 1].startsWith("--")) {
    throw new Error(`Missing --${name}`);
  }
  return args[index + 1];
}

function manifest() {
  const state = readJson(manifestPath);
  if (!state || state.version !== 1 || !Array.isArray(state.articles)) {
    throw new Error("Cover refresh manifest is missing or invalid. Run init.");
  }
  return state;
}

function selected(state) {
  const index = Number(option("index"));
  if (!Number.isInteger(index) || index < 0 || index >= state.articles.length) {
    throw new Error("Invalid --index");
  }
  return state.articles[index];
}

function mutate(action) {
  return withLock(`${manifestPath}.lock`, () => {
    const state = manifest();
    const result = action(state);
    state.updatedAt = new Date().toISOString();
    atomicJson(manifestPath, state);
    return result;
  });
}

function sourceReceiptPaths() {
  const paths = [join(sourceRoot, ".tmp/live-batch/publication/receipt.json")];
  const runs = join(sourceRoot, ".tmp/publication-harness/runs");
  if (existsSync(runs)) {
    for (const name of readdirSync(runs)) {
      const path = join(runs, name, "publication/receipt.json");
      if (existsSync(path)) paths.push(path);
    }
  }
  return paths;
}

function imagePath(receiptPath, savedPath) {
  const fromRoot = resolve(sourceRoot, savedPath);
  if (existsSync(fromRoot)) return fromRoot;
  const fromReceipt = resolve(dirname(receiptPath), savedPath);
  if (existsSync(fromReceipt)) return fromReceipt;
  throw new Error(`Old cover not found: ${savedPath}`);
}

function initialize() {
  if (existsSync(manifestPath)) throw new Error("Manifest already exists.");
  const rows = [];
  for (const receiptPath of sourceReceiptPaths()) {
    if (!existsSync(receiptPath)) continue;
    const receipt = readJson(receiptPath);
    const runDir = dirname(dirname(receiptPath));
    const candidate = readJson(join(runDir, "candidate.json"));
    const productUrl =
      candidate?.product?.url ?? receipt.articles[0]?.evidenceUrl ?? null;
    for (const article of receipt.articles ?? []) {
      if (
        !article.shopify?.id ||
        !article.shopify?.url ||
        !article.substack?.url ||
        !article.shopify?.verifiedAt ||
        !article.substack?.verifiedAt ||
        !article.cover?.sha256 ||
        !productUrl
      ) {
        throw new Error(`Incomplete historical receipt: ${receiptPath}`);
      }
      const oldPath = imagePath(receiptPath, article.cover.path);
      if (sha256(readFileSync(oldPath)) !== article.cover.sha256) {
        throw new Error(`Old cover hash differs from receipt: ${oldPath}`);
      }
      rows.push({
        receiptPath,
        themeIndex: article.themeIndex,
        title: article.title,
        productUrl,
        shopify: {
          id: article.shopify.id,
          articleUrl: article.shopify.url,
          status: "pending",
          oldImageUrl: null,
          newImageUrl: null,
          verifiedAt: null,
        },
        substack: {
          articleUrl: article.substack.url,
          status: "pending",
          oldImageUrl: null,
          newImageUrl: null,
          verifiedAt: null,
        },
        oldCover: { path: oldPath, sha256: article.cover.sha256 },
        newCover: null,
      });
    }
  }
  if (
    rows.length !== 24 ||
    new Set(rows.map((row) => row.shopify.id)).size !== 24 ||
    new Set(rows.map((row) => row.substack.articleUrl)).size !== 24
  ) {
    throw new Error("Expected 24 unique article pairs across six receipts.");
  }
  rows.sort(
    (a, b) =>
      a.receiptPath.localeCompare(b.receiptPath) || a.themeIndex - b.themeIndex,
  );
  atomicJson(manifestPath, {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    articles: rows,
  });
  console.log(`Initialized ${rows.length} cover replacements: ${manifestPath}`);
}

function stage() {
  const coverPath = resolve(option("path"));
  const evidencePath = resolve(option("evidence"));
  const reviewNote = option("note");
  if (reviewNote.trim().length < 20) {
    throw new Error("Visual review note must describe the product comparison.");
  }
  const evidence = readJson(evidencePath);
  if (!existsSync(coverPath)) throw new Error("New cover file is missing.");
  const digest = sha256(readFileSync(coverPath));
  const result = mutate((state) => {
    const article = selected(state);
    if (
      article.shopify.status !== "pending" ||
      article.substack.status !== "pending"
    ) {
      throw new Error("Cannot replace a staged cover after remote editing.");
    }
    if (
      digest === article.oldCover.sha256 ||
      state.articles.some(
        (row) => row !== article && row.newCover?.sha256 === digest,
      )
    ) {
      throw new Error("New cover must differ from every other cover.");
    }
    const brief = evidence?.articles?.[article.themeIndex];
    if (
      evidence?.version !== 1 ||
      evidence.productUrl !== article.productUrl ||
      !Array.isArray(evidence.articles) ||
      evidence.articles.length !== 4 ||
      !brief?.scene ||
      !evidence.dimensions?.trim() ||
      !evidence.visibleFeatures?.trim() ||
      !Array.isArray(evidence.referenceImages) ||
      evidence.referenceImages.length !== evidence.referenceFiles?.length ||
      evidence.referenceImages.some((url) => {
        try {
          return new URL(url).protocol !== "https:";
        } catch {
          return true;
        }
      }) ||
      !Array.isArray(brief.sourceIndices) ||
      brief.sourceIndices.length === 0 ||
      brief.sourceIndices.some(
        (index) => !Number.isInteger(index) || index < 0,
      ) ||
      new Set(evidence.articles.map((item) => item.scene)).size !== 4 ||
      !Array.isArray(evidence.referenceFiles) ||
      !evidence.referenceFiles.length
    ) {
      throw new Error("Visual evidence does not match the article.");
    }
    const sourceImages = evidence.referenceFiles.map((path) => {
      const absolute = resolve(dirname(evidencePath), path);
      if (!existsSync(absolute))
        throw new Error(`Source image missing: ${path}`);
      return { path: absolute, sha256: sha256(readFileSync(absolute)) };
    });
    article.newCover = {
      path: coverPath,
      sha256: digest,
      sourceImages,
      scene: brief.scene,
      reviewNote,
      stagedAt: new Date().toISOString(),
    };
    return article.title;
  });
  console.log(`Staged: ${result}`);
}

function record() {
  const site = option("site");
  if (!["shopify", "substack"].includes(site)) throw new Error("Invalid site.");
  const oldImageUrl = option("old-image-url");
  const newImageUrl = option("new-image-url");
  if (
    new URL(oldImageUrl).protocol !== "https:" ||
    new URL(newImageUrl).protocol !== "https:" ||
    oldImageUrl === newImageUrl
  ) {
    throw new Error("Image URLs must be distinct HTTPS URLs.");
  }
  const result = mutate((state) => {
    const article = selected(state);
    if (!article.newCover) throw new Error("Stage the new cover first.");
    const destination = article[site];
    if (destination.status !== "pending") {
      throw new Error(
        "Destination already recorded; verify it before retrying.",
      );
    }
    destination.status = "updated";
    destination.oldImageUrl = oldImageUrl;
    destination.newImageUrl = newImageUrl;
    destination.updatedAt = new Date().toISOString();
    return article.title;
  });
  console.log(`Recorded ${site} update: ${result}`);
}

function verify() {
  const site = option("site");
  if (!["shopify", "substack"].includes(site)) throw new Error("Invalid site.");
  const observedImageUrl = option("observed-image-url");
  const result = mutate((state) => {
    const article = selected(state);
    const destination = article[site];
    if (destination.status !== "updated") {
      throw new Error("Destination must be updated before verification.");
    }
    if (observedImageUrl !== destination.newImageUrl) {
      throw new Error("Public image URL differs from the recorded update.");
    }
    destination.status = "verified";
    destination.verifiedAt = new Date().toISOString();
    return article.title;
  });
  console.log(`Verified ${site}: ${result}`);
}

if (command === "init") initialize();
else if (command === "stage") stage();
else if (command === "record") record();
else if (command === "verify") verify();
else if (command === "status") {
  const state = manifest();
  console.log(
    JSON.stringify(
      {
        total: state.articles.length,
        staged: state.articles.filter((row) => row.newCover).length,
        shopifyVerified: state.articles.filter(
          (row) => row.shopify.status === "verified",
        ).length,
        substackVerified: state.articles.filter(
          (row) => row.substack.status === "verified",
        ).length,
      },
      null,
      2,
    ),
  );
} else {
  throw new Error(
    "Usage: cover-refresh-harness.mjs <init|stage|record|verify|status> [options]",
  );
}
