import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const destinations = {
  shopifyStore: "xffvf7-e1.myshopify.com",
  shopifyBlog: "journal",
  substackPublication: "modernjapancrafts.substack.com",
};

function run(articles, visualEvidence = null) {
  const temp = mkdtempSync(join(tmpdir(), "publication-test-"));
  const input = join(temp, "bundle.json");
  const output = join(temp, "out");
  const evidence = join(temp, "visual-evidence.json");
  writeFileSync(join(temp, "product-reference.jpg"), "test image bytes");
  writeFileSync(
    input,
    JSON.stringify({
      version: 1,
      product: {
        id: "product-1",
        nameEn: "Ceramic bowl",
        sourceUrls: ["https://example.com/products/ceramic-bowl"],
      },
      destinations,
      articles,
    }),
  );
  writeFileSync(
    evidence,
    JSON.stringify(
      visualEvidence ?? {
        version: 1,
        productUrl: "https://example.com/products/ceramic-bowl",
        referenceImages: ["https://example.com/images/ceramic-bowl.jpg"],
        referenceFiles: ["product-reference.jpg"],
        dimensions: "116 mm diameter, 61 mm high",
        visibleFeatures: "blue glaze and round foot",
        articles: Array.from({ length: 4 }, (_, themeIndex) => ({
          themeIndex,
          scene: `Distinct scene ${themeIndex}`,
          visualFocus: `Article angle ${themeIndex}`,
        })),
      },
    ),
  );
  return {
    result: spawnSync(
      process.execPath,
      [
        "scripts/prepare-publication.mjs",
        input,
        output,
        "--visual-evidence",
        evidence,
      ],
      { encoding: "utf8" },
    ),
    output,
  };
}

const articles = Array.from({ length: 4 }, (_, i) => ({
  id: `article-${i}`,
  themeIndex: i,
  titleEn: `A Craft Article ${i}`,
  shopifyBodyHtml: `<h1>A Craft Article ${i}</h1><p>Body</p>`,
  substackSubject: `A Craft Letter ${i}`,
  substackBody: `Body for letter ${i}`,
  sources: [],
}));

test("prepares exactly four independent publication receipts", () => {
  const { result, output } = run(articles);
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(
    readFileSync(join(output, "receipt.json"), "utf8"),
  );
  assert.equal(receipt.articles.length, 4);
  assert.equal(new Set(receipt.articles.map((a) => a.sourceHash)).size, 4);
  assert.ok(
    receipt.articles.every(
      (a) => a.shopify.status === "pending" && a.substack.status === "pending",
    ),
  );
  const prompt = readFileSync(
    join(output, receipt.articles[0].directory, "cover-prompt.txt"),
    "utf8",
  );
  assert.match(prompt, /actual product photographs as image inputs/);
  assert.match(prompt, /116 mm diameter, 61 mm high/);
});

test("rejects incomplete batches before writing a receipt", () => {
  const { result } = run(articles.slice(0, 3));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /exactly four/);
});

test("rejects duplicate article identities", () => {
  const duplicate = articles.map((article) => ({ ...article }));
  duplicate[3].id = duplicate[0].id;
  const { result } = run(duplicate);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /exactly four/);
});

test("rejects repeated scenes and missing product scale", () => {
  const { result } = run(articles, {
    version: 1,
    productUrl: "https://example.com/products/ceramic-bowl",
    referenceImages: ["https://example.com/images/ceramic-bowl.jpg"],
    referenceFiles: ["product-reference.jpg"],
    dimensions: "",
    visibleFeatures: "blue glaze",
    articles: Array.from({ length: 4 }, (_, themeIndex) => ({
      themeIndex,
      scene: "Same studio scene",
      visualFocus: "Bowl",
    })),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Visual evidence/);
});
