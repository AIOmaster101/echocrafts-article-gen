import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

export const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

export function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function atomicJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    renameSync(temp, path);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
}

export function withLock(lockPath, action) {
  mkdirSync(dirname(lockPath), { recursive: true });
  let fd;
  try {
    fd = openSync(lockPath, "wx");
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`Another harness operation is active: ${lockPath}`);
    }
    throw error;
  }
  try {
    writeFileSync(fd, `${process.pid}\n`);
    return action();
  } finally {
    closeSync(fd);
    unlinkSync(lockPath);
  }
}

export function catalogProducts(value) {
  const root =
    value?.data?.products ?? value?.products ?? value?.result?.data?.products;
  const nodes = root?.nodes ?? root?.edges?.map((edge) => edge.node);
  if (!Array.isArray(nodes)) {
    throw new Error("Expected Shopify products.nodes in the catalog JSON.");
  }
  return nodes;
}

export function chooseCandidate(
  catalog,
  ledger,
  policy,
  allowNextTheme = false,
) {
  const active = ledger.batches?.find((batch) => batch.status !== "complete");
  if (active && !allowNextTheme) return { kind: "resume", batch: active };

  const used = new Set([
    ...(policy.excludedProductHandles ?? []),
    ...(ledger.batches ?? [])
      .map((batch) => batch.product?.handle)
      .filter(Boolean),
    ...(ledger.skippedProducts ?? []).map((item) => item.handle),
  ]);
  const origin = new URL(policy.shopifyOrigin);
  const products = catalogProducts(catalog)
    .filter((product) => {
      if (!product?.id || !product?.handle || !product?.title) return false;
      if (used.has(product.handle)) return false;
      if (product.status && product.status !== "ACTIVE") return false;
      if (product.totalInventory !== undefined && product.totalInventory <= 0)
        return false;
      if (!product.descriptionHtml?.replace(/<[^>]+>/g, "").trim())
        return false;
      if (!product.featuredMedia?.preview?.image?.url) return false;
      try {
        const url = new URL(product.onlineStoreUrl);
        return (
          url.origin === origin.origin &&
          url.pathname === `/products/${product.handle}`
        );
      } catch {
        return false;
      }
    })
    .sort((a, b) =>
      String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")),
    );
  if (!products.length) {
    const pageInfo =
      catalog?.data?.products?.pageInfo ??
      catalog?.products?.pageInfo ??
      catalog?.result?.data?.products?.pageInfo;
    if (!pageInfo || typeof pageInfo.hasNextPage !== "boolean") {
      throw new Error("Shopify catalog pageInfo is required before fallback.");
    }
    if (pageInfo.hasNextPage) {
      if (!pageInfo.endCursor) throw new Error("Missing Shopify endCursor.");
      return { kind: "more_products", cursor: pageInfo.endCursor };
    }
    return { kind: "none" };
  }
  const selected = products[0];
  return {
    kind: "candidate",
    product: {
      id: selected.id,
      title: selected.title,
      handle: selected.handle,
      url: selected.onlineStoreUrl,
      imageUrl: selected.featuredMedia.preview.image.url,
      updatedAt: selected.updatedAt ?? null,
    },
  };
}

export function chooseCraftCandidate(
  catalog,
  ledger,
  policy,
  allowNextTheme = false,
) {
  const active = ledger.batches?.find((batch) => batch.status !== "complete");
  if (active && !allowNextTheme) return { kind: "resume", batch: active };
  if (!Array.isArray(catalog))
    throw new Error("Expected a complete craft catalog.");
  const used = new Set([
    ...(ledger.batches ?? []).map((batch) => batch.craft?.id).filter(Boolean),
    ...(ledger.skippedCrafts ?? []).map((item) => item.id),
  ]);
  const candidates = catalog
    .filter(({ item, facts, sources }) => {
      if (
        !item?.id ||
        !/^[a-z0-9-]+$/.test(item.slug) ||
        !item.name_en ||
        used.has(item.id)
      )
        return false;
      if (!Array.isArray(facts) || !Array.isArray(sources)) return false;
      const verified = sources.filter((source) => {
        if (![1, 2].includes(source.tier) || !source.id) return false;
        try {
          return new URL(source.url).protocol === "https:";
        } catch {
          return false;
        }
      });
      const ids = new Set(verified.map((source) => source.id));
      return facts.some(
        (fact) =>
          ["approved", "edited"].includes(fact.confidence) &&
          fact.content?.claim?.trim() &&
          ids.has(fact.source_id),
      );
    })
    .sort(
      (a, b) =>
        Number(a.item.priority ?? Infinity) -
          Number(b.item.priority ?? Infinity) ||
        a.item.slug.localeCompare(b.item.slug),
    );
  if (!candidates.length) return { kind: "none" };
  const { item, facts, sources } = candidates[0];
  const sourceIds = new Set(
    facts
      .filter((fact) => ["approved", "edited"].includes(fact.confidence))
      .map((fact) => fact.source_id),
  );
  const references = sources.filter((source) => {
    if (!sourceIds.has(source.id) || ![1, 2].includes(source.tier))
      return false;
    try {
      return new URL(source.url).protocol === "https:";
    } catch {
      return false;
    }
  });
  return {
    kind: "craft",
    craft: {
      id: item.id,
      slug: item.slug,
      nameEn: item.name_en,
      nameJa: item.name_ja,
      url: `${policy.shopifyOrigin}/blogs/crafts/${item.slug}`,
      sourceUrls: references.map((source) => source.url),
    },
  };
}

export function validateReceipt(receipt, receiptPath) {
  if (
    receipt?.version !== 1 ||
    !Array.isArray(receipt.articles) ||
    receipt.articles.length !== 4
  ) {
    throw new Error("Receipt must contain exactly four articles.");
  }
  const targets = receipt.requiredDestinations ?? ["shopify", "substack"];
  if (
    !Array.isArray(targets) ||
    !targets.includes("shopify") ||
    targets.some((target) => !["shopify", "substack"].includes(target)) ||
    new Set(targets).size !== targets.length
  ) {
    throw new Error(
      "Receipt destinations must be Shopify or Shopify and Substack.",
    );
  }
  const indexes = receipt.articles.map((article) => article.themeIndex);
  if (
    new Set(indexes).size !== 4 ||
    indexes.some((index) => index < 0 || index > 3)
  ) {
    throw new Error(
      "Receipt must contain theme indexes 0 through 3 once each.",
    );
  }
  const ids = receipt.articles.map((article) => article.sourceArticleId);
  if (new Set(ids).size !== 4) throw new Error("Duplicate source article ID.");
  for (const article of receipt.articles) {
    if (!article.title || !article.handle || !article.directory) {
      throw new Error("Article title, handle, or directory is missing.");
    }
    if (
      article.directory.includes("..") ||
      article.directory.includes("/") ||
      isAbsolute(article.directory)
    ) {
      throw new Error("Unsafe article directory.");
    }
    for (const name of ["shopify.html", "substack.txt", "source.json"]) {
      const path = join(dirname(receiptPath), article.directory, name);
      if (!existsSync(path) || !readFileSync(path).length) {
        throw new Error(`Missing article file: ${path}`);
      }
    }
  }
}

export function validateDestination(url, kind, policy) {
  const parsed = new URL(url);
  const origin = new URL(
    kind === "shopify" ? policy.shopifyOrigin : policy.substackOrigin,
  );
  const prefix = kind === "shopify" ? `/blogs/${policy.shopifyBlog}/` : "/p/";
  if (
    parsed.origin !== origin.origin ||
    !parsed.pathname.startsWith(prefix) ||
    parsed.pathname.length <= prefix.length ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(`Unexpected ${kind} article URL: ${url}`);
  }
  return parsed.toString();
}

export function currentArticle(receipt, index) {
  const article = receipt.articles.find((item) => item.themeIndex === index);
  if (!article) throw new Error(`Missing article index ${index}`);
  return article;
}

export function editorialHash(receiptPath, article) {
  return sha256(
    readFileSync(join(dirname(receiptPath), article.directory, "shopify.html")),
  );
}

export function assertReadyForPublish(receiptPath, article) {
  if (!article.editorial?.reviewedAt || !article.editorial.note) {
    throw new Error(
      `Article ${article.themeIndex + 1} lacks editorial review.`,
    );
  }
  if (article.editorial.sha256 !== editorialHash(receiptPath, article)) {
    throw new Error(`Article ${article.themeIndex + 1} changed after review.`);
  }
  if (
    !article.cover?.reviewed ||
    !article.cover.path ||
    !article.cover.sha256
  ) {
    throw new Error(
      `Article ${article.themeIndex + 1} lacks a reviewed cover.`,
    );
  }
  const coverPath = resolve(dirname(receiptPath), article.cover.path);
  if (
    !existsSync(coverPath) ||
    sha256(readFileSync(coverPath)) !== article.cover.sha256
  ) {
    throw new Error(
      `Article ${article.themeIndex + 1} cover changed after review.`,
    );
  }
}

export function receiptStatus(receipt) {
  const targets = receipt.requiredDestinations ?? ["shopify", "substack"];
  return receipt.articles.every((article) =>
    targets.every((target) => article[target]?.status === "verified"),
  )
    ? "complete"
    : "active";
}

export function publicPageChecks(html, article, kind, sourceUrl, shopifyUrl) {
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
  const expected =
    kind === "shopify"
      ? article.title
      : article.substackSubject || article.title;
  const normalized = expected.replace(/\s+/g, " ").toLowerCase();
  const errors = [];
  if (!text.includes(normalized)) errors.push("title missing");
  if (!/<img\b/i.test(html)) errors.push("image missing");
  const links =
    kind === "shopify"
      ? [sourceUrl].flat().filter(Boolean)
      : [shopifyUrl].filter(Boolean);
  if (
    links.length &&
    !links.some((link) => html.includes(new URL(link).pathname))
  ) {
    errors.push("source or Shopify link missing");
  }
  return errors;
}
