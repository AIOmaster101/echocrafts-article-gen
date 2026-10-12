import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { deflateSync } from "node:zlib";
import {
  atomicJson,
  chooseCandidate,
  chooseCraftCandidate,
  publicPageChecks,
  readJson,
  validateDestination,
} from "./lib/publication-harness.mjs";

const root = resolve(import.meta.dirname, "..");
const policy = readJson(join(root, "config/publication-policy.json"));
const product = {
  id: "gid://shopify/Product/42",
  title: "Handmade Bowl",
  handle: "handmade-bowl",
  status: "ACTIVE",
  updatedAt: "2026-10-04T00:00:00Z",
  onlineStoreUrl: "https://modernjapancrafts.com/products/handmade-bowl",
  totalInventory: 3,
  descriptionHtml: "<p>Glazed bowl from Japan.</p>",
  featuredMedia: {
    preview: { image: { url: "https://cdn.shopify.com/bowl.jpg" } },
  },
};

function cli(home, ...arguments_) {
  return spawnSync(
    process.execPath,
    [join(root, "scripts/publication-harness.mjs"), ...arguments_],
    {
      encoding: "utf8",
      env: { ...process.env, PUBLICATION_LEDGER: join(home, "ledger.json") },
    },
  );
}

function pngChunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  const result = Buffer.alloc(8 + payload.length + 4);
  result.writeUInt32BE(data.length, 0);
  payload.copy(result, 4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
  return result;
}

function makeCover(path) {
  const width = 128;
  const height = 128;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const scanlines = Buffer.alloc(height * (1 + width * 3));
  for (let row = 0; row < height; row++) {
    randomBytes(width * 3).copy(scanlines, row * (1 + width * 3) + 1);
  }
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from("89504e470d0a1a0a", "hex"),
      pngChunk("IHDR", header),
      pngChunk("IDAT", deflateSync(scanlines)),
      pngChunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

function fixture() {
  const home = mkdtempSync(join(tmpdir(), "publication-harness-"));
  const cover = join(home, "cover.png");
  makeCover(cover);
  const bundle = {
    version: 1,
    product: {
      id: "source-product-1",
      nameEn: "Handmade Bowl",
      sourceUrls: [product.onlineStoreUrl],
    },
    destinations: {
      shopifyStore: policy.shopifyStore,
      shopifyBlog: policy.shopifyBlog,
      substackPublication: new URL(policy.substackOrigin).host,
    },
    articles: [0, 1, 2, 3].map((index) => ({
      id: `source-article-${index}`,
      themeIndex: index,
      titleEn: `Bowl Story ${index + 1}`,
      shopifyBodyHtml: `<h1>Bowl Story ${index + 1}</h1><p><a href="${product.onlineStoreUrl}">Bowl</a></p>`,
      substackSubject: `The Bowl ${index + 1}`,
      substackBody: `A story about the bowl ${index + 1}.`,
      sources: [],
    })),
  };
  const bundlePath = join(home, "bundle.json");
  writeFileSync(bundlePath, JSON.stringify(bundle));
  writeFileSync(join(home, "product-reference.jpg"), "test image bytes");
  const visualEvidencePath = join(home, "visual-evidence.json");
  writeFileSync(
    visualEvidencePath,
    JSON.stringify({
      version: 1,
      productUrl: product.onlineStoreUrl,
      referenceImages: [product.featuredMedia.preview.image.url],
      referenceFiles: ["product-reference.jpg"],
      dimensions: "120 mm diameter, 60 mm high",
      visibleFeatures: "glazed bowl with a round foot",
      articles: [0, 1, 2, 3].map((themeIndex) => ({
        themeIndex,
        scene: `Home scene ${themeIndex}`,
        visualFocus: `Bowl story ${themeIndex}`,
      })),
    }),
  );
  const outputDir = join(home, "batch");
  const prepared = spawnSync(
    process.execPath,
    [
      join(root, "scripts/prepare-publication.mjs"),
      bundlePath,
      outputDir,
      "--visual-evidence",
      visualEvidencePath,
    ],
    { encoding: "utf8" },
  );
  assert.equal(prepared.status, 0, prepared.stderr);
  const candidate = join(home, "candidate.json");
  writeFileSync(
    candidate,
    JSON.stringify({
      kind: "candidate",
      product: {
        id: product.id,
        handle: product.handle,
        url: product.onlineStoreUrl,
      },
    }),
  );
  return { home, receipt: join(outputDir, "receipt.json"), candidate, cover };
}

test("selection resumes an active batch and excludes past products", () => {
  const catalog = {
    data: {
      products: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [
          product,
          {
            ...product,
            handle: "other-bowl",
            onlineStoreUrl: "https://modernjapancrafts.com/products/other-bowl",
          },
        ],
      },
    },
  };
  assert.equal(
    chooseCandidate(
      catalog,
      { batches: [{ status: "active", product }] },
      policy,
    ).kind,
    "resume",
  );
  const selection = chooseCandidate(
    catalog,
    { batches: [{ status: "complete", product }] },
    policy,
  );
  assert.equal(selection.product.handle, "other-bowl");
  assert.equal(
    chooseCandidate(
      catalog,
      { batches: [] },
      { ...policy, excludedProductHandles: ["handmade-bowl", "other-bowl"] },
    ).kind,
    "none",
  );
  assert.equal(
    chooseCandidate(
      catalog,
      { batches: [], skippedProducts: [{ handle: "handmade-bowl" }] },
      policy,
    ).product.handle,
    "other-bowl",
  );
});

test("selection rejects unpublished, empty, or imageless products", () => {
  const catalog = {
    products: {
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: [
        { ...product, status: "DRAFT" },
        {
          ...product,
          handle: "empty",
          onlineStoreUrl: "https://modernjapancrafts.com/products/empty",
          totalInventory: 0,
        },
        {
          ...product,
          handle: "no-image",
          onlineStoreUrl: "https://modernjapancrafts.com/products/no-image",
          featuredMedia: null,
        },
      ],
    },
  };
  assert.equal(chooseCandidate(catalog, { batches: [] }, policy).kind, "none");
});

test("registration and publish guards survive CLI process restarts", () => {
  const { home, receipt, candidate, cover } = fixture();
  assert.equal(
    cli(home, "register", "--receipt", receipt, "--candidate", candidate)
      .status,
    0,
  );
  assert.match(
    cli(home, "register", "--receipt", receipt, "--candidate", candidate)
      .stderr,
    /already registered/,
  );
  const url = "https://modernjapancrafts.com/blogs/journal/bowl-story-1";
  assert.match(
    cli(
      home,
      "shopify",
      "--receipt",
      receipt,
      "--index",
      "0",
      "--id",
      "gid://shopify/Article/12",
      "--url",
      url,
    ).stderr,
    /lacks editorial review/,
  );
  const note =
    "Checked maker, material, and product claims against the source page.";
  assert.equal(
    cli(
      home,
      "review",
      "--receipt",
      receipt,
      "--index",
      "0",
      "--note",
      note,
      "--source-url",
      product.onlineStoreUrl,
    ).status,
    0,
  );
  assert.match(
    cli(
      home,
      "shopify",
      "--receipt",
      receipt,
      "--index",
      "0",
      "--id",
      "gid://shopify/Article/12",
      "--url",
      url,
    ).stderr,
    /lacks a reviewed cover/,
  );
  assert.equal(
    cli(
      home,
      "cover",
      "--receipt",
      receipt,
      "--index",
      "0",
      "--path",
      cover,
      "--note",
      "Compared shape and finish with the live product photograph.",
    ).status,
    0,
  );
  assert.equal(
    cli(
      home,
      "shopify",
      "--receipt",
      receipt,
      "--index",
      "0",
      "--id",
      "gid://shopify/Article/12",
      "--url",
      url,
    ).status,
    0,
  );
  assert.match(
    cli(
      home,
      "substack",
      "--receipt",
      receipt,
      "--index",
      "0",
      "--url",
      "https://modernjapancrafts.substack.com/p/the-bowl-1",
    ).stderr,
    /Verify Shopify/,
  );
  const state = readJson(receipt);
  assert.equal(state.articles[0].shopify.status, "published");
  assert.equal(state.articles[0].editorial.sha256.length, 64);
  assert.equal(readJson(join(home, "ledger.json")).batches[0].status, "active");
});

test("skipped products remain excluded on the next process", () => {
  const { home, candidate } = fixture();
  assert.equal(
    cli(
      home,
      "skip",
      "--candidate",
      candidate,
      "--reason",
      "Already has an existing four-post series.",
    ).status,
    0,
  );
  const state = readJson(join(home, "ledger.json"));
  assert.equal(state.skippedProducts[0].handle, product.handle);
  assert.equal(
    chooseCandidate(
      { products: { nodes: [product], pageInfo: { hasNextPage: false } } },
      state,
      policy,
    ).kind,
    "none",
  );
});

test("edited content invalidates its review and atomic writes preserve JSON", () => {
  const { home, receipt, candidate, cover } = fixture();
  assert.equal(
    cli(home, "register", "--receipt", receipt, "--candidate", candidate)
      .status,
    0,
  );
  assert.equal(
    cli(
      home,
      "review",
      "--receipt",
      receipt,
      "--index",
      "0",
      "--note",
      "Checked source facts and corrected a product claim.",
      "--source-url",
      product.onlineStoreUrl,
    ).status,
    0,
  );
  const item = readJson(receipt).articles[0];
  const file = join(resolve(receipt, ".."), item.directory, "shopify.html");
  writeFileSync(file, `${readFileSync(file, "utf8")}<p>New content</p>`);
  assert.equal(
    cli(
      home,
      "cover",
      "--receipt",
      receipt,
      "--index",
      "0",
      "--path",
      cover,
      "--note",
      "Compared shape and finish with the live product photograph.",
    ).status,
    0,
  );
  assert.match(
    cli(
      home,
      "shopify",
      "--receipt",
      receipt,
      "--index",
      "0",
      "--id",
      "gid://shopify/Article/12",
      "--url",
      "https://modernjapancrafts.com/blogs/journal/bowl-story-1",
    ).stderr,
    /changed after review/,
  );
  const ledger = join(home, "ledger.json");
  const previous = readJson(ledger);
  atomicJson(ledger, previous);
  assert.deepEqual(readJson(ledger), previous);
});

test("verification rejects wrong hosts and missing public evidence", () => {
  assert.throws(
    () =>
      validateDestination("https://evil.example/p/story", "substack", policy),
    /Unexpected/,
  );
  assert.throws(
    () =>
      validateDestination(
        "https://modernjapancrafts.com/products/bowl",
        "shopify",
        policy,
      ),
    /Unexpected/,
  );
  const article = { title: "Bowl Story", substackSubject: "The Bowl" };
  assert.deepEqual(
    publicPageChecks(
      `<h1>Bowl Story</h1><img src="cover.png"><a href="${product.onlineStoreUrl}">Product</a>`,
      article,
      "shopify",
      product.onlineStoreUrl,
    ),
    [],
  );
  assert.deepEqual(
    publicPageChecks(
      "<h1>The Bowl</h1>",
      article,
      "substack",
      product.onlineStoreUrl,
      "https://modernjapancrafts.com/blogs/journal/bowl-story",
    ),
    ["image missing", "source or Shopify link missing"],
  );
});

test("product pagination blocks craft fallback until the last page", () => {
  const state = { batches: [], skippedProducts: [{ handle: product.handle }] };
  assert.deepEqual(
    chooseCandidate(
      {
        products: {
          nodes: [product],
          pageInfo: { hasNextPage: true, endCursor: "next" },
        },
      },
      state,
      policy,
    ),
    { kind: "more_products", cursor: "next" },
  );
  assert.equal(
    chooseCandidate(
      { products: { nodes: [product], pageInfo: { hasNextPage: false } } },
      state,
      policy,
    ).kind,
    "none",
  );
  assert.throws(
    () => chooseCandidate({ products: { nodes: [] } }, state, policy),
    /pageInfo/,
  );
});

const craft = {
  item: {
    id: "craft-1",
    slug: "kintsugi",
    name_en: "Kintsugi",
    name_ja: "金継ぎ",
    priority: 1,
  },
  facts: [
    {
      confidence: "approved",
      source_id: "source-1",
      content: { claim: "Lacquer repair" },
    },
  ],
  sources: [{ id: "source-1", url: "https://example.org/kintsugi", tier: 1 }],
};

test("craft selection needs reviewed evidence and excludes completed categories", () => {
  assert.equal(
    chooseCraftCandidate([craft], { batches: [] }, policy).craft.slug,
    "kintsugi",
  );
  assert.equal(
    chooseCraftCandidate(
      [{ ...craft, facts: [{ ...craft.facts[0], confidence: "extracted" }] }],
      { batches: [] },
      policy,
    ).kind,
    "none",
  );
  assert.equal(
    chooseCraftCandidate(
      [{ ...craft, sources: [{ ...craft.sources[0], tier: 3 }] }],
      { batches: [] },
      policy,
    ).kind,
    "none",
  );
  assert.equal(
    chooseCraftCandidate(
      [craft],
      { batches: [{ status: "complete", craft: { id: "craft-1" } }] },
      policy,
    ).kind,
    "none",
  );
});

test("craft bundle registers with its own source identity", () => {
  const home = mkdtempSync(join(tmpdir(), "craft-harness-"));
  const bundlePath = join(home, "bundle.json");
  writeFileSync(
    bundlePath,
    JSON.stringify({
      version: 1,
      product: {
        id: "saved-product-1",
        nameEn: "Kintsugi",
        sourceType: "craft",
        craftItemId: "craft-1",
        craftSlug: "kintsugi",
        craftUrl: "https://modernjapancrafts.com/blogs/crafts/kintsugi",
        sourceUrls: ["https://example.org/kintsugi"],
      },
      destinations: {
        shopifyStore: policy.shopifyStore,
        shopifyBlog: policy.shopifyBlog,
        substackPublication: new URL(policy.substackOrigin).host,
      },
      articles: [0, 1, 2, 3].map((index) => ({
        id: `craft-article-${index}`,
        themeIndex: index,
        titleEn: `Kintsugi Story ${index}`,
        shopifyBodyHtml: `<p><a href="/blogs/crafts/kintsugi">Kintsugi</a></p>`,
        substackSubject: `Kintsugi ${index}`,
        substackBody: "Craft history",
        sources: [],
      })),
    }),
  );
  const output = join(home, "batch");
  writeFileSync(join(home, "craft-reference.jpg"), "test image bytes");
  const visualEvidencePath = join(home, "visual-evidence.json");
  writeFileSync(
    visualEvidencePath,
    JSON.stringify({
      version: 1,
      referenceImages: ["https://example.org/kintsugi-reference.jpg"],
      referenceFiles: ["craft-reference.jpg"],
      articles: [0, 1, 2, 3].map((themeIndex) => ({
        themeIndex,
        scene: `Craft scene ${themeIndex}`,
        visualFocus: `Kintsugi story ${themeIndex}`,
      })),
    }),
  );
  const prepared = spawnSync(
    process.execPath,
    [
      join(root, "scripts/prepare-publication.mjs"),
      bundlePath,
      output,
      "--visual-evidence",
      visualEvidencePath,
    ],
    { encoding: "utf8" },
  );
  assert.equal(prepared.status, 0, prepared.stderr);
  assert.match(
    readFileSync(
      join(output, "1-kintsugi-story-0", "cover-prompt.txt"),
      "utf8",
    ),
    /craft category, not a specific item for sale/,
  );
  const candidate = join(home, "candidate.json");
  writeFileSync(
    candidate,
    JSON.stringify({
      kind: "craft",
      craft: chooseCraftCandidate([craft], { batches: [] }, policy).craft,
    }),
  );
  const registered = cli(
    home,
    "register",
    "--receipt",
    join(output, "receipt.json"),
    "--candidate",
    candidate,
  );
  assert.equal(registered.status, 0, registered.stderr);
  assert.equal(
    readJson(join(home, "ledger.json")).batches[0].craft.slug,
    "kintsugi",
  );
  assert.deepEqual(
    publicPageChecks(
      '<h1>Kintsugi Story 0</h1><img src="cover.png"><a href="https://example.org/kintsugi">Source</a>',
      { title: "Kintsugi Story 0" },
      "shopify",
      [
        "https://modernjapancrafts.com/blogs/crafts/kintsugi",
        "https://example.org/kintsugi",
      ],
    ),
    [],
  );
});
