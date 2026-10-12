import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { planJournalOrder, reviewAges } from "./lib/journal-plan.mjs";

const themes = ["wood", "glass", "ceramic"].map((id) => ({
  id,
  articles: [0, 1, 2, 3].map((index) => ({
    handle: `${id}-${index}`,
    index,
    receiptPath: "/tmp/example-receipt.json",
  })),
}));

test("seeded order is stable, complete, and has no adjacent theme", () => {
  const first = planJournalOrder(themes, "wood", "fixed-seed");
  assert.deepEqual(first, planJournalOrder(themes, "wood", "fixed-seed"));
  assert.equal(first.length, 12);
  assert.equal(new Set(first.map((item) => item.handle)).size, 12);
  assert.notEqual(first[0].themeId, "wood");
  for (let index = 1; index < first.length; index++) {
    assert.notEqual(first[index].themeId, first[index - 1].themeId);
  }
});

test("one theme cannot satisfy the adjacent theme rule", () => {
  assert.throws(
    () => planJournalOrder([themes[0]], "glass", "seed"),
    /At least two/,
  );
});

test("visual groups are separated across themes when supplied", () => {
  const paired = themes.slice(0, 2).map((theme) => ({
    ...theme,
    articles: theme.articles.map((article, index) => ({
      ...article,
      visualGroup: ["dining", "tea", "shelf", "writing"][index],
    })),
  }));
  const items = planJournalOrder(paired, "ceramic", "visual-seed", "dining");
  assert.equal(items.length, 8);
  assert.notEqual(items[0].visualGroup, "dining");
  for (let index = 1; index < items.length; index++) {
    assert.notEqual(items[index].themeId, items[index - 1].themeId);
    assert.notEqual(items[index].visualGroup, items[index - 1].visualGroup);
  }
});

test("an impossible visual sequence stops publication planning", () => {
  const sameScene = themes.slice(0, 2).map((theme) => ({
    ...theme,
    articles: theme.articles.map((article) => ({
      ...article,
      visualGroup: "dining",
    })),
  }));
  assert.throws(
    () => planJournalOrder(sameScene, "ceramic", "visual-seed"),
    /Cannot avoid adjacent theme and visualGroup/,
  );
  assert.throws(
    () =>
      planJournalOrder(
        [
          {
            ...themes[0],
            articles: [
              { ...themes[0].articles[0], visualGroup: "dining" },
              ...themes[0].articles.slice(1),
            ],
          },
          themes[1],
        ],
        "ceramic",
        "visual-seed",
      ),
    /Every planned article/,
  );
});

test("age is a review reminder, not an automatic republish", () => {
  const data = [0, 22, 30].map((days) => ({
    id: String(days),
    handle: String(days),
    title: String(days),
    isPublished: true,
    publishedAt: new Date(
      Date.parse("2026-10-12T00:00:00Z") - days * 86400000,
    ).toISOString(),
  }));
  assert.deepEqual(
    reviewAges(data, "2026-10-12T00:00:00Z").map((item) => item.action),
    ["none", "review_existing", "review_new_question"],
  );
});

test("record accepts only the next verified Shopify receipt", () => {
  const dir = mkdtempSync(join(tmpdir(), "journal-plan-"));
  const receiptPath = join(dir, "receipt.json");
  const planPath = join(dir, "plan.json");
  const run = (handle) =>
    spawnSync(
      process.execPath,
      [
        join(import.meta.dirname, "journal-plan.mjs"),
        "record",
        "--plan",
        planPath,
        "--handle",
        handle,
      ],
      { encoding: "utf8" },
    );
  writeFileSync(
    receiptPath,
    JSON.stringify({
      articles: [
        {
          themeIndex: 0,
          handle: "wood-0",
          shopify: {
            status: "verified",
            url: "https://modernjapancrafts.com/blogs/journal/wood-0",
            verifiedAt: "2026-10-12T00:00:00Z",
          },
        },
        { themeIndex: 1, handle: "glass-0", shopify: { status: "published" } },
      ],
    }),
  );
  writeFileSync(
    planPath,
    JSON.stringify({
      version: 1,
      events: [],
      items: [
        {
          position: 1,
          themeId: "wood",
          handle: "wood-0",
          index: 0,
          receiptPath,
        },
        {
          position: 2,
          themeId: "glass",
          handle: "glass-0",
          index: 1,
          receiptPath,
        },
      ],
    }),
  );
  assert.notEqual(run("glass-0").status, 0);
  assert.equal(run("wood-0").status, 0);
  assert.notEqual(run("glass-0").status, 0);
  assert.equal(JSON.parse(readFileSync(planPath, "utf8")).events.length, 1);
});
