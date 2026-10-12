import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { sha256 } from "./lib/publication-harness.mjs";

const script = resolve(import.meta.dirname, "cover-refresh-harness.mjs");

function fixture() {
  const home = mkdtempSync(join(tmpdir(), "cover-refresh-"));
  const manifestPath = join(home, "manifest.json");
  for (let batch = 0; batch < 6; batch += 1) {
    const publication =
      batch === 0
        ? join(home, ".tmp/live-batch/publication")
        : join(
            home,
            `.tmp/publication-harness/runs/batch-${batch}/publication`,
          );
    mkdirSync(publication, { recursive: true });
    const productUrl = `https://modernjapancrafts.com/products/product-${batch}`;
    if (batch > 0) {
      writeFileSync(
        join(dirname(publication), "candidate.json"),
        JSON.stringify({ product: { url: productUrl } }),
      );
    }
    const articles = [0, 1, 2, 3].map((themeIndex) => {
      const oldPath = join(publication, `old-${themeIndex}.png`);
      const bytes = Buffer.from(`old image ${batch}-${themeIndex}`);
      writeFileSync(oldPath, bytes);
      return {
        themeIndex,
        title: `Article ${batch}-${themeIndex}`,
        cover: { path: oldPath, sha256: sha256(bytes) },
        evidenceUrl: productUrl,
        shopify: {
          id: `gid://shopify/Article/${batch * 4 + themeIndex}`,
          url: `https://modernjapancrafts.com/blogs/journal/article-${batch}-${themeIndex}`,
          verifiedAt: "2026-10-10T00:00:00Z",
        },
        substack: {
          url: `https://modernjapancrafts.substack.com/p/article-${batch}-${themeIndex}`,
          verifiedAt: "2026-10-10T00:00:00Z",
        },
      };
    });
    writeFileSync(
      join(publication, "receipt.json"),
      JSON.stringify({ articles }),
    );
  }
  const run = (...args) =>
    spawnSync(process.execPath, [script, ...args], {
      encoding: "utf8",
      env: {
        ...process.env,
        COVER_REFRESH_SOURCE_ROOT: home,
        COVER_REFRESH_MANIFEST: manifestPath,
      },
    });
  return { home, manifestPath, run };
}

test("builds 24 unique historical pairs and verifies each destination separately", () => {
  const { home, manifestPath, run } = fixture();
  assert.equal(run("init").status, 0);
  const initial = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(initial.articles.length, 24);
  assert.equal(new Set(initial.articles.map((row) => row.shopify.id)).size, 24);
  const row = initial.articles[0];
  const cover = join(home, "new-cover.png");
  const reference = join(home, "source.jpg");
  const evidencePath = join(home, "visual-evidence.json");
  writeFileSync(cover, "new image bytes");
  writeFileSync(reference, "source image bytes");
  writeFileSync(
    evidencePath,
    JSON.stringify({
      version: 1,
      productUrl: row.productUrl,
      referenceImages: ["https://cdn.shopify.com/source.jpg"],
      referenceFiles: ["source.jpg"],
      dimensions: "150 by 128 mm oval plate",
      visibleFeatures: "Gold leaf finish and shallow oval rim",
      articles: [0, 1, 2, 3].map((themeIndex) => ({
        scene: `Different scene ${themeIndex}`,
        sourceIndices: [0],
      })),
    }),
  );
  const stage = run(
    "stage",
    "--index",
    "0",
    "--path",
    cover,
    "--evidence",
    evidencePath,
    "--note",
    "Checked the rim, finish, scale, and scene against source.",
  );
  assert.equal(stage.status, 0, stage.stderr);
  const oldImageUrl = "https://cdn.shopify.com/old.png";
  const newImageUrl = "https://cdn.shopify.com/new.png";
  assert.equal(
    run(
      "record",
      "--index",
      "0",
      "--site",
      "shopify",
      "--old-image-url",
      oldImageUrl,
      "--new-image-url",
      newImageUrl,
    ).status,
    0,
  );
  assert.notEqual(
    run(
      "verify",
      "--index",
      "0",
      "--site",
      "shopify",
      "--observed-image-url",
      oldImageUrl,
    ).status,
    0,
  );
  assert.equal(
    run(
      "verify",
      "--index",
      "0",
      "--site",
      "shopify",
      "--observed-image-url",
      newImageUrl,
    ).status,
    0,
  );
  const current = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(current.articles[0].shopify.status, "verified");
  assert.equal(current.articles[0].substack.status, "pending");
  assert.equal(current.articles[0].newCover.sourceImages.length, 1);
});
