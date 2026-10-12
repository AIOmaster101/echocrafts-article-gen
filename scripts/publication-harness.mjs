#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import {
  assertReadyForPublish,
  atomicJson,
  chooseCandidate,
  chooseCraftCandidate,
  currentArticle,
  editorialHash,
  publicPageChecks,
  readJson,
  receiptStatus,
  sha256,
  validateDestination,
  validateReceipt,
  withLock,
} from "./lib/publication-harness.mjs";

const root = resolve(import.meta.dirname, "..");
const policy = readJson(join(root, "config/publication-policy.json"));
const ledgerPath = resolve(
  process.env.PUBLICATION_LEDGER ??
    join(root, ".tmp/publication-harness/ledger.json"),
);
const lockPath = `${ledgerPath}.lock`;
const args = process.argv.slice(2);
const command = args.shift();

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

function ledger() {
  return readJson(ledgerPath, { version: 1, batches: [] });
}

function batchForReceipt(state, path) {
  const batch = state.batches.find((item) => item.receiptPath === path);
  if (!batch) throw new Error(`Receipt is not registered: ${path}`);
  return batch;
}

function mutate(receiptPath, callback) {
  const path = resolve(receiptPath);
  return withLock(lockPath, () => {
    const state = ledger();
    const batch = batchForReceipt(state, path);
    const receipt = readJson(path);
    validateReceipt(receipt, path);
    const result = callback(receipt, batch);
    batch.status = receiptStatus(receipt);
    batch.updatedAt = new Date().toISOString();
    atomicJson(path, receipt);
    atomicJson(ledgerPath, state);
    return result;
  });
}

function articleFor(receipt) {
  const index = Number(option("index"));
  if (!Number.isInteger(index) || index < 0 || index > 3) {
    throw new Error("--index must be 0, 1, 2, or 3");
  }
  return currentArticle(receipt, index);
}

function assertSameOrEmpty(existing, next, label) {
  if (existing && existing !== next) {
    throw new Error(`${label} already recorded with a different value.`);
  }
}

async function selectCraft(apiBase, state) {
  async function get(path) {
    const response = await fetch(`${apiBase}${path}`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(`Craft catalog read failed: ${path} ${response.status}`);
    return response.json();
  }
  const items = await get("/api/admin/crafts");
  if (!Array.isArray(items))
    throw new Error("Craft catalog did not return an item list.");
  const used = new Set([
    ...(state.batches ?? []).map((batch) => batch.craft?.id).filter(Boolean),
    ...(state.skippedCrafts ?? []).map((item) => item.id),
  ]);
  const ordered = items
    .filter((item) => !used.has(item.id))
    .sort(
      (a, b) =>
        Number(a.priority ?? Infinity) - Number(b.priority ?? Infinity) ||
        a.slug.localeCompare(b.slug),
    );
  for (let start = 0; start < ordered.length; start += 8) {
    const entries = await Promise.all(
      ordered.slice(start, start + 8).map(async (item) => {
        const [factResult, sources] = await Promise.all([
          get(`/api/admin/crafts/${encodeURIComponent(item.id)}/facts`),
          get(`/api/admin/crafts/${encodeURIComponent(item.id)}/sources`),
        ]);
        if (!Array.isArray(factResult.facts) || !Array.isArray(sources)) {
          throw new Error(`Craft evidence is incomplete for ${item.id}`);
        }
        return { item, facts: factResult.facts, sources };
      }),
    );
    const selected = chooseCraftCandidate(entries, state, policy);
    if (selected.kind !== "none") return selected;
  }
  return { kind: "none" };
}

async function main() {
  if (command === "select") {
    const catalog = readJson(resolve(option("catalog")));
    const state = ledger();
    const productSelection = chooseCandidate(catalog, state, policy);
    if (productSelection.kind !== "none") {
      console.log(JSON.stringify(productSelection, null, 2));
      return;
    }
    const apiBase = new URL(
      option("api-base", false) ?? "https://echocrafts-article-gen.vercel.app",
    ).origin;
    const craftSelection = await selectCraft(apiBase, state);
    console.log(JSON.stringify(craftSelection, null, 2));
    return;
  }

  if (command === "register") {
    const receiptPath = resolve(option("receipt"));
    const candidate = readJson(resolve(option("candidate")));
    const craft = candidate?.kind === "craft" ? candidate.craft : null;
    const product = craft ? null : (candidate?.product ?? candidate);
    if (craft) {
      if (
        !craft.id ||
        !/^[a-z0-9-]+$/.test(craft.slug) ||
        craft.url !== `${policy.shopifyOrigin}/blogs/crafts/${craft.slug}` ||
        !Array.isArray(craft.sourceUrls) ||
        !craft.sourceUrls.length ||
        craft.sourceUrls.some((url) => {
          try {
            return new URL(url).protocol !== "https:";
          } catch {
            return true;
          }
        })
      ) {
        throw new Error(
          "Candidate must include a craft ID, slug, and verified source URLs.",
        );
      }
    } else {
      if (!product?.id || !product?.handle || !product?.url) {
        throw new Error("Candidate must include Shopify ID, handle, and URL.");
      }
      const parsed = new URL(product.url);
      if (
        parsed.origin !== new URL(policy.shopifyOrigin).origin ||
        parsed.pathname !== `/products/${product.handle}`
      ) {
        throw new Error(
          "Candidate URL does not match the configured store and handle.",
        );
      }
    }
    const receipt = readJson(receiptPath);
    validateReceipt(receipt, receiptPath);
    if (
      craft &&
      (receipt.sourceType !== "craft" ||
        receipt.craftItemId !== craft.id ||
        receipt.craftSlug !== craft.slug)
    ) {
      throw new Error("Receipt craft identity does not match candidate.");
    }
    for (const article of receipt.articles) {
      const source = readJson(
        join(dirname(receiptPath), article.directory, "source.json"),
      );
      if (craft) {
        if (
          source?.sourceType !== "craft" ||
          source.craftItemId !== craft.id ||
          source.craftSlug !== craft.slug ||
          !craft.sourceUrls.every((url) =>
            source.productSourceUrls?.includes(url),
          )
        ) {
          throw new Error("Receipt source does not match the selected craft.");
        }
      } else if (!source?.productSourceUrls?.includes(product.url)) {
        throw new Error(
          "Receipt source does not match the selected product URL.",
        );
      }
    }
    if (
      receipt.destinations?.shopifyStore !== policy.shopifyStore ||
      receipt.destinations?.shopifyBlog !== policy.shopifyBlog ||
      receipt.destinations?.substackPublication !==
        new URL(policy.substackOrigin).host
    ) {
      throw new Error("Receipt destination does not match policy.");
    }
    withLock(lockPath, () => {
      const state = ledger();
      if (state.batches.some((item) => item.receiptPath === receiptPath)) {
        throw new Error(
          "This receipt is already registered. Resume the existing batch.",
        );
      }
      if (
        state.batches.some((item) => item.status !== "complete") ||
        state.batches.some(
          (item) => product && item.product?.handle === product.handle,
        ) ||
        state.batches.some((item) => craft && item.craft?.id === craft.id) ||
        (state.skippedProducts ?? []).some(
          (item) => product && item.handle === product.handle,
        ) ||
        (state.skippedCrafts ?? []).some(
          (item) => craft && item.id === craft.id,
        ) ||
        (product && policy.excludedProductHandles.includes(product.handle))
      ) {
        throw new Error(
          "An active batch or previously used product blocks registration.",
        );
      }
      state.batches.push({
        id: `${new Date().toISOString().slice(0, 10)}-${craft ? `craft-${craft.slug}` : product.handle}`,
        ...(craft ? { craft } : { product }),
        receiptPath,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      atomicJson(ledgerPath, state);
    });
    console.log(`Registered ${craft?.slug ?? product.handle}`);
    return;
  }

  if (command === "skip") {
    const candidate = readJson(resolve(option("candidate")));
    const craft = candidate?.kind === "craft" ? candidate.craft : null;
    const product = craft ? null : (candidate?.product ?? candidate);
    const reason = option("reason");
    if (
      !(craft?.id || (product?.id && product?.handle)) ||
      reason.trim().length < 10
    ) {
      throw new Error("Candidate and a specific skip reason are required.");
    }
    withLock(lockPath, () => {
      const state = ledger();
      if (state.batches.some((item) => item.status !== "complete")) {
        throw new Error(
          "Resume the active batch before skipping a new product.",
        );
      }
      const key = craft ? "skippedCrafts" : "skippedProducts";
      state[key] ??= [];
      if (
        !state[key].some((item) =>
          craft ? item.id === craft.id : item.handle === product.handle,
        )
      ) {
        state[key].push({
          id: craft?.id ?? product.id,
          ...(craft ? { slug: craft.slug } : { handle: product.handle }),
          reason: reason.trim(),
          skippedAt: new Date().toISOString(),
        });
        atomicJson(ledgerPath, state);
      }
    });
    console.log(`Skipped ${craft?.slug ?? product.handle}`);
    return;
  }

  if (command === "review") {
    const path = option("receipt");
    const note = option("note");
    const sourceUrl = option("source-url");
    if (note.trim().length < 20) throw new Error("Review note is too short.");
    if (!/^https:\/\//.test(sourceUrl))
      throw new Error("Use an HTTPS evidence URL.");
    mutate(path, (receipt, batch) => {
      const article = articleFor(receipt);
      const allowed = batch.craft
        ? [batch.craft.url, ...batch.craft.sourceUrls]
        : [batch.product.url];
      if (!allowed.includes(sourceUrl))
        throw new Error("Review source URL is not in the selected evidence.");
      if (article.shopify.status !== "pending") {
        throw new Error("Editorial review cannot change after publication.");
      }
      const hash = editorialHash(resolve(path), article);
      assertSameOrEmpty(article.editorial?.sha256, hash, "Editorial hash");
      article.editorial = {
        sha256: hash,
        sourceUrl,
        note: note.trim(),
        reviewedAt: new Date().toISOString(),
      };
    });
    console.log("Editorial review recorded.");
    return;
  }

  if (command === "cover") {
    const path = option("receipt");
    const coverPath = resolve(option("path"));
    const note = option("note");
    if (note.trim().length < 20)
      throw new Error("Cover review note is too short.");
    const bytes = readFileSync(coverPath);
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from("89504e470d0a1a0a", "hex"));
    const jpeg = bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"));
    if (bytes.length < 10000 || (!png && !jpeg)) {
      throw new Error("Cover must be a real PNG/JPEG image of at least 10 KB.");
    }
    mutate(path, (receipt) => {
      const article = articleFor(receipt);
      if (!article.editorial?.reviewedAt)
        throw new Error("Review article before cover.");
      if (article.shopify.status !== "pending") {
        throw new Error("Cover cannot change after publication.");
      }
      const digest = sha256(bytes);
      if (
        receipt.articles.some(
          (item) => item !== article && item.cover?.sha256 === digest,
        )
      ) {
        throw new Error("Each article needs a distinct cover.");
      }
      assertSameOrEmpty(article.cover?.sha256, digest, "Cover hash");
      article.cover = {
        path: relative(dirname(resolve(path)), coverPath),
        sha256: digest,
        reviewed: true,
        note: note.trim(),
        reviewedAt: new Date().toISOString(),
      };
    });
    console.log("Cover review recorded.");
    return;
  }

  if (command === "shopify" || command === "substack") {
    const path = option("receipt");
    const url = validateDestination(option("url"), command, policy);
    const id = command === "shopify" ? option("id") : null;
    if (id && !/^gid:\/\/shopify\/Article\/\d+$/.test(id)) {
      throw new Error("Expected a Shopify Article GID.");
    }
    mutate(path, (receipt) => {
      const article = articleFor(receipt);
      assertReadyForPublish(resolve(path), article);
      if (command === "substack" && article.shopify.status !== "verified") {
        throw new Error("Verify Shopify before publishing on Substack.");
      }
      const target = article[command];
      assertSameOrEmpty(target.url, url, `${command} URL`);
      if (id) assertSameOrEmpty(target.id, id, "Shopify ID");
      target.url = url;
      if (id) target.id = id;
      target.status = target.status === "verified" ? "verified" : "published";
      target.publishedAt ??= new Date().toISOString();
      if (command === "substack") {
        target.emailSent = false;
        const txt = readFileSync(
          join(dirname(resolve(path)), article.directory, "substack.txt"),
          "utf8",
        );
        article.substackSubject = txt.split("\n")[0].trim();
      }
    });
    console.log(
      `${command} publication recorded; verify the public page next.`,
    );
    return;
  }

  if (command === "verify") {
    const path = resolve(option("receipt"));
    const kind = option("site");
    if (!["shopify", "substack"].includes(kind)) {
      throw new Error("--site must be shopify or substack.");
    }
    const receipt = readJson(path);
    validateReceipt(receipt, path);
    const article = articleFor(receipt);
    assertReadyForPublish(path, article);
    const target = article[kind];
    if (!target?.url || target.status === "pending") {
      throw new Error(`${kind} has not been recorded as published.`);
    }
    const response = await fetch(target.url, { redirect: "follow" });
    if (!response.ok || response.url !== target.url) {
      throw new Error(
        `${kind} public URL failed: ${response.status} ${response.url}`,
      );
    }
    const html = await response.text();
    const state = ledger();
    const batch = batchForReceipt(state, path);
    const errors = publicPageChecks(
      html,
      article,
      kind,
      batch.product?.url ?? [
        batch.craft?.url,
        ...(batch.craft?.sourceUrls ?? []),
      ],
      article.shopify.url,
    );
    if (errors.length)
      throw new Error(`${kind} verification failed: ${errors.join(", ")}`);
    mutate(path, (fresh) => {
      const freshArticle = currentArticle(fresh, article.themeIndex);
      if (freshArticle[kind].url !== target.url) {
        throw new Error("Remote URL changed during verification.");
      }
      freshArticle[kind].status = "verified";
      freshArticle[kind].verifiedAt = new Date().toISOString();
    });
    console.log(`Verified ${target.url}`);
    return;
  }

  if (command === "status") {
    const path = resolve(option("receipt"));
    const receipt = readJson(path);
    validateReceipt(receipt, path);
    const state = ledger();
    const batch = batchForReceipt(state, path);
    console.log(
      JSON.stringify(
        {
          batch: batch.id,
          source: batch.product?.url ?? batch.craft?.url,
          status: receiptStatus(receipt),
          articles: receipt.articles.map((article) => ({
            index: article.themeIndex,
            title: article.title,
            editorialReviewed: Boolean(article.editorial?.reviewedAt),
            coverReviewed: Boolean(article.cover?.reviewed),
            shopify: article.shopify,
            substack: article.substack,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  throw new Error(
    "Usage: publication-harness.mjs <select|skip|register|review|cover|shopify|substack|verify|status> [options]",
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
