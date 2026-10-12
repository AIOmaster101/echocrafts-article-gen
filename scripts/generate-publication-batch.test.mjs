import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { articleIdsFromHtml } from "./generate-publication-batch.mjs";

const generator = resolve(
  import.meta.dirname,
  "generate-publication-batch.mjs",
);
const productUrl = "https://modernjapancrafts.com/products/handmade-bowl";

function run(...args) {
  return new Promise((resolveResult) => {
    const child = spawn(process.execPath, [generator, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => resolveResult({ code, stderr }));
  });
}

test("reads four indexed article IDs from the existing app page", () => {
  const ids = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444",
  ];
  const html = ids
    .map(
      (id, index) =>
        `{"id":"${id}","created_at":"2026-10-04T00:00:00Z","theme_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","theme_index":${index}}`,
    )
    .join("");
  const actual = articleIdsFromHtml(html);
  assert.equal(actual.size, 4);
  ids.forEach((id, index) => assert.equal(actual.get(index), id));
  const escaped = articleIdsFromHtml(html.replaceAll('"', '\\"'));
  ids.forEach((id, index) => assert.equal(escaped.get(index), id));
});

test("conflicting remote article IDs stop automatic retry", () => {
  const prefix =
    '"created_at":"2026-10-04T00:00:00Z","theme_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","theme_index":0';
  const html = `"id":"11111111-1111-4111-8111-111111111111",${prefix}"id":"22222222-2222-4222-8222-222222222222",${prefix}`;
  assert.throws(() => articleIdsFromHtml(html), /Multiple saved article IDs/);
});

test("existing API sequence creates a resumable four-article bundle", async () => {
  const ids = new Map();
  const writes = {
    extract: 0,
    score: 0,
    article: 0,
    translate: 0,
    distribute: 0,
  };
  let scoreInput = null;
  const productId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, "http://localhost").pathname;
    response.setHeader("Content-Type", "application/json");
    if (path === `/products/${productId}`) {
      response.setHeader("Content-Type", "text/html");
      response.end(
        [...ids]
          .map(
            ([index, id]) =>
              `{"id":"${id}","created_at":"2026-10-04T00:00:00Z","theme_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","theme_index":${index}`,
          )
          .join(""),
      );
      return;
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    if (path === "/api/extract") {
      writes.extract++;
      response.end(
        JSON.stringify({
          productId,
          name_en: "Handmade Bowl",
          name_ja: "手作りの器",
        }),
      );
    } else if (path === "/api/score") {
      writes.score++;
      scoreInput = input;
      response.end(
        JSON.stringify({
          themes: ["faq", "what", "best", "vs"].map((type, index) => ({
            type,
            title_en: `Bowl Story ${index + 1}`,
            title_ja: `器 ${index + 1}`,
          })),
          themeIds: [0, 1, 2, 3].map(
            (index) => `ccccccc${index}-cccc-4ccc-8ccc-cccccccccccc`,
          ),
        }),
      );
    } else if (path === "/api/article") {
      writes.article++;
      const index = input.themeIndex;
      ids.set(index, `ddddddd${index}-dddd-4ddd-8ddd-dddddddddddd`);
      const contentEn = `<h1>Bowl Story ${index + 1}</h1><p><a href="${productUrl}">Product</a></p>`;
      response.end(
        JSON.stringify({
          contentEn,
          rawEn: contentEn,
          refsHtml: "",
          sources: [],
        }),
      );
    } else if (path === "/api/article/translate") {
      writes.translate++;
      response.end(JSON.stringify({ contentJa: "日本語記事" }));
    } else if (path === "/api/distribute") {
      writes.distribute++;
      response.end(
        JSON.stringify({
          distribution: {
            newsletter: {
              subject: `The Bowl ${writes.distribute}`,
              subtitle: "Craft",
              body: "A product story.",
            },
          },
        }),
      );
    } else {
      response.statusCode = 404;
      response.end(JSON.stringify({ error: "unknown endpoint" }));
    }
  });
  await new Promise((resolveListen) =>
    server.listen(0, "127.0.0.1", resolveListen),
  );
  try {
    const runDir = mkdtempSync(join(tmpdir(), "generation-batch-"));
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal(
      (
        await run(
          "extract",
          "--run-dir",
          runDir,
          "--product-url",
          productUrl,
          "--api-base",
          base,
        )
      ).code,
      0,
    );
    assert.deepEqual(
      {
        q1: JSON.parse(readFileSync(join(runDir, "run.json"))).q1,
        q2: JSON.parse(readFileSync(join(runDir, "run.json"))).q2,
      },
      { q1: "interview_no", q2: "position_auto" },
    );
    writeFileSync(
      join(runDir, "product-reviewed.json"),
      readFileSync(join(runDir, "extract.json")),
    );
    assert.equal(
      (
        await run(
          "review-source",
          "--run-dir",
          runDir,
          "--note",
          "Checked all source product facts against the live product page.",
        )
      ).code,
      0,
    );
    assert.equal((await run("generate", "--run-dir", runDir)).code, 0);
    assert.equal((await run("generate", "--run-dir", runDir)).code, 0);
    assert.deepEqual(writes, {
      extract: 1,
      score: 1,
      article: 4,
      translate: 4,
      distribute: 0,
    });
    assert.equal(scoreInput.q1, "interview_no");
    assert.equal(scoreInput.q2, "position_auto");
    for (let index = 0; index < 4; index++) {
      const result = await run(
        "review-article",
        "--run-dir",
        runDir,
        "--index",
        String(index),
        "--note",
        "Checked source claims and the product link in the article body.",
      );
      assert.equal(result.code, 0, result.stderr);
    }
    assert.equal((await run("bundle", "--run-dir", runDir)).code, 0);
    assert.equal((await run("bundle", "--run-dir", runDir)).code, 0);
    const bundle = JSON.parse(readFileSync(join(runDir, "bundle.json")));
    assert.equal(bundle.articles.length, 4);
    assert.equal(writes.distribute, 4);
    writeFileSync(join(runDir, "editorial-0.html"), "<h1>Changed</h1>");
    assert.match(
      (await run("bundle", "--run-dir", runDir)).stderr,
      /changed or lacks source evidence/,
    );
    assert.equal(existsSync(join(runDir, "inflight.json")), false);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
});

test("craft fallback calls the original craft mode API payload", async () => {
  const ids = new Map();
  const calls = [];
  const productId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const craftUrl = "https://modernjapancrafts.com/blogs/crafts/kintsugi";
  const source = {
    publisher: "Museum",
    url: "https://example.org/kintsugi",
    tier: 1,
  };
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, "http://localhost").pathname;
    response.setHeader("Content-Type", "application/json");
    if (path === `/products/${productId}`) {
      response.setHeader("Content-Type", "text/html");
      response.end(
        [...ids]
          .map(
            ([index, id]) =>
              `{"id":"${id}","created_at":"2026-10-04T00:00:00Z","theme_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","theme_index":${index}`,
          )
          .join(""),
      );
      return;
    }
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const input = JSON.parse(raw);
    calls.push({ path, input });
    if (path === "/api/extract-from-craft")
      response.end(
        JSON.stringify({
          productId,
          craftItemId: "craft-1",
          craftSlug: "kintsugi",
          craftSources: [source],
          name_en: "Kintsugi",
          name_ja: "金継ぎ",
          price_jpy: 0,
          price_usd: 0,
          artisan: "",
        }),
      );
    else if (path === "/api/score")
      response.end(
        JSON.stringify({
          themes: ["faq", "what", "best", "vs"].map((type, index) => ({
            type,
            title_en: `Kintsugi ${index}`,
            title_ja: `金継ぎ ${index}`,
          })),
          themeIds: [0, 1, 2, 3].map(
            (index) => `ccccccc${index}-cccc-4ccc-8ccc-cccccccccccc`,
          ),
        }),
      );
    else if (path === "/api/article") {
      const index = input.themeIndex;
      ids.set(index, `ddddddd${index}-dddd-4ddd-8ddd-dddddddddddd`);
      const contentEn = `<h1>Kintsugi ${index}</h1><a href="${craftUrl}">Craft</a>`;
      response.end(
        JSON.stringify({
          contentEn,
          rawEn: contentEn,
          refsHtml: "",
          sources: [],
        }),
      );
    } else if (path === "/api/article/translate")
      response.end(JSON.stringify({ contentJa: "金継ぎ" }));
    else if (path === "/api/distribute")
      response.end(
        JSON.stringify({
          distribution: {
            newsletter: { subject: "Kintsugi", body: "Craft story" },
          },
        }),
      );
    else {
      response.statusCode = 404;
      response.end(JSON.stringify({ error: "unknown" }));
    }
  });
  await new Promise((resolveListen) =>
    server.listen(0, "127.0.0.1", resolveListen),
  );
  try {
    const runDir = mkdtempSync(join(tmpdir(), "craft-batch-"));
    const candidate = join(runDir, "candidate.json");
    writeFileSync(
      candidate,
      JSON.stringify({
        kind: "craft",
        craft: {
          id: "craft-1",
          slug: "kintsugi",
          url: craftUrl,
          sourceUrls: [source.url],
        },
      }),
    );
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal(
      (
        await run(
          "extract",
          "--run-dir",
          runDir,
          "--candidate",
          candidate,
          "--api-base",
          base,
        )
      ).code,
      0,
    );
    writeFileSync(
      join(runDir, "product-reviewed.json"),
      readFileSync(join(runDir, "extract.json")),
    );
    assert.equal(
      (
        await run(
          "review-source",
          "--run-dir",
          runDir,
          "--note",
          "Checked approved craft facts against the museum source.",
        )
      ).code,
      0,
    );
    assert.equal((await run("generate", "--run-dir", runDir)).code, 0);
    for (let index = 0; index < 4; index++) {
      assert.equal(
        (
          await run(
            "review-article",
            "--run-dir",
            runDir,
            "--index",
            String(index),
            "--note",
            "Checked category claims and the craft entry link.",
          )
        ).code,
        0,
      );
    }
    assert.equal((await run("bundle", "--run-dir", runDir)).code, 0);
    const articles = calls.filter((call) => call.path === "/api/article");
    assert.equal(articles.length, 4);
    assert.ok(
      articles.every(
        ({ input }) =>
          input.urls.length === 0 &&
          input.craftSlug === "kintsugi" &&
          input.craftSources[0].url === source.url,
      ),
    );
    assert.equal(calls[0].path, "/api/extract-from-craft");
    assert.equal(
      readFileSync(join(runDir, "bundle.json"), "utf8").includes(
        '"sourceType": "craft"',
      ),
      true,
    );
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
});
