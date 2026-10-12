import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  journalDate,
  planJournalOrder,
  publicationWindow,
  reviewAges,
} from "./lib/journal-plan.mjs";
import { sha256 } from "./lib/publication-harness.mjs";

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
  for (let index = 0; index < first.length; index += 3) {
    assert.equal(
      new Set(first.slice(index, index + 3).map((item) => item.themeId)).size,
      3,
    );
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

test("three-theme order separates product, lifestyle scene, and reader angle", () => {
  const varied = themes.map((theme) => ({
    ...theme,
    articles: theme.articles.map((article, index) => ({
      ...article,
      visualGroup: ["dining", "shelf", "desk", "travel"][index],
      editorialAngle: ["care", "craft", "selection", "comparison"][index],
    })),
  }));
  const items = planJournalOrder(
    varied,
    "previous",
    "three-scene-seed",
    "desk",
    "selection",
  );
  assert.equal(items.length, 12);
  assert.notEqual(items[0].visualGroup, "desk");
  assert.notEqual(items[0].editorialAngle, "selection");
  for (let index = 1; index < items.length; index++) {
    assert.notEqual(items[index].themeId, items[index - 1].themeId);
    assert.notEqual(items[index].visualGroup, items[index - 1].visualGroup);
    assert.notEqual(
      items[index].editorialAngle,
      items[index - 1].editorialAngle,
    );
  }
});

test("Shopify plan CLI requires three ready themes", () => {
  const dir = mkdtempSync(join(tmpdir(), "journal-plan-minimum-"));
  const inputPath = join(dir, "input.json");
  writeFileSync(
    inputPath,
    JSON.stringify({
      version: 1,
      recentThemeId: "previous",
      themes: themes.slice(0, 2),
    }),
  );
  const result = spawnSync(
    process.execPath,
    [
      join(import.meta.dirname, "journal-plan.mjs"),
      "plan",
      "--input",
      inputPath,
      "--output",
      join(dir, "plan.json"),
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Exactly 3 ready themes/);
});

test("twelve prepared articles release at most three on each Tokyo day", () => {
  const plan = {
    version: 1,
    items: planJournalOrder(themes, "previous", "four-day-seed"),
    events: [],
  };
  const dates = [
    "2026-10-12T01:00:00Z",
    "2026-10-13T01:00:00Z",
    "2026-10-14T01:00:00Z",
    "2026-10-15T01:00:00Z",
  ];
  for (const date of dates) {
    for (let count = 0; count < 3; count++) {
      const window = publicationWindow(plan, date, 3);
      assert.equal(window.state, "ready");
      plan.events.push({
        handle: window.next.handle,
        publishedAt: date,
      });
    }
    const window = publicationWindow(plan, date, 3);
    assert.equal(window.remainingToday, 0);
    assert.equal(window.state, plan.events.length === 12 ? "complete" : "wait");
  }
  assert.equal(plan.events.length, 12);
});

test("Tokyo date boundary and existing verified events count toward today's cap", () => {
  assert.equal(journalDate("2026-10-11T15:00:00Z"), "2026-10-12");
  const plan = {
    version: 1,
    items: [{ handle: "a" }, { handle: "b" }, { handle: "c" }, { handle: "d" }],
    events: [
      { handle: "a", verifiedAt: "2026-10-11T16:00:00Z" },
      { handle: "b", verifiedAt: "2026-10-12T05:00:00Z" },
    ],
  };
  assert.equal(
    publicationWindow(plan, "2026-10-12T06:00:00Z", 3).remainingToday,
    1,
  );
  plan.reservation = { handle: "c", reservedAt: "2026-10-12T06:01:00Z" };
  assert.equal(
    publicationWindow(plan, "2026-10-12T06:02:00Z", 3).state,
    "reconcile",
  );
  assert.equal(
    publicationWindow(plan, "2026-10-12T06:02:00Z", 3).remainingToday,
    0,
  );
  assert.equal(
    publicationWindow(plan, "2026-10-12T15:00:00Z", 3).state,
    "reconcile",
  );
});

test("a complete Journal audit counts other plans toward the daily cap", () => {
  const plan = {
    version: 1,
    items: [{ handle: "next" }],
    events: [],
  };
  const audit = {
    data: {
      blogs: {
        nodes: [
          {
            handle: "journal",
            articles: {
              nodes: ["other-1", "other-2", "other-3"].map((handle) => ({
                handle,
                isPublished: true,
                publishedAt: "2026-10-12T05:00:00Z",
              })),
              pageInfo: { hasNextPage: false },
            },
          },
        ],
      },
    },
  };
  assert.equal(
    publicationWindow(plan, "2026-10-12T06:00:00Z", 3, audit).state,
    "wait",
  );
  audit.data.blogs.nodes[0].articles.pageInfo.hasNextPage = true;
  assert.throws(
    () => publicationWindow(plan, "2026-10-12T06:00:00Z", 3, audit),
    /complete Shopify Journal audit/,
  );
});

test("permit is saved before a write and reused only after an absence check", () => {
  const dir = mkdtempSync(join(tmpdir(), "journal-permit-"));
  const articleDir = join(dir, "article-0");
  mkdirSync(articleDir);
  const body = "<p>Reviewed article</p>";
  const cover = Buffer.from("reviewed-cover");
  writeFileSync(join(articleDir, "shopify.html"), body);
  writeFileSync(join(articleDir, "cover.png"), cover);
  const receiptPath = join(dir, "receipt.json");
  writeFileSync(
    receiptPath,
    JSON.stringify({
      articles: [
        {
          themeIndex: 0,
          handle: "wood-0",
          directory: "article-0",
          editorial: {
            reviewedAt: "2026-10-12T00:00:00Z",
            note: "Checked source.",
            sha256: sha256(body),
          },
          cover: {
            reviewed: true,
            path: "article-0/cover.png",
            sha256: sha256(cover),
          },
          shopify: { status: "pending" },
        },
      ],
    }),
  );
  const planPath = join(dir, "plan.json");
  const auditPath = join(dir, "audit.json");
  writeFileSync(
    auditPath,
    JSON.stringify({
      data: {
        blogs: {
          nodes: [
            {
              handle: "journal",
              articles: {
                nodes: [],
                pageInfo: { hasNextPage: false },
              },
            },
          ],
        },
      },
    }),
  );
  writeFileSync(
    planPath,
    JSON.stringify({
      version: 1,
      items: [{ handle: "wood-0", index: 0, receiptPath }],
      events: [],
    }),
  );
  const run = (...extra) =>
    spawnSync(
      process.execPath,
      [
        join(import.meta.dirname, "journal-plan.mjs"),
        "permit",
        "--plan",
        planPath,
        "--handle",
        "wood-0",
        "--audit",
        auditPath,
        ...extra,
      ],
      { encoding: "utf8" },
    );
  assert.equal(run().status, 0);
  assert.equal(
    JSON.parse(readFileSync(planPath, "utf8")).reservation.handle,
    "wood-0",
  );
  assert.match(run().stderr, /Reconcile the existing permit/);
  assert.match(
    run("--now", "2099-01-01T00:00:00Z").stderr,
    /--now is not allowed/,
  );
  writeFileSync(
    auditPath,
    JSON.stringify({
      data: {
        blogs: {
          nodes: [
            {
              handle: "journal",
              articles: {
                nodes: ["other-1", "other-2", "other-3"].map((handle) => ({
                  handle,
                  isPublished: true,
                  publishedAt: new Date().toISOString(),
                })),
                pageInfo: { hasNextPage: false },
              },
            },
          ],
        },
      },
    }),
  );
  assert.match(run("--confirmed-absent").stderr, /Daily Shopify limit reached/);
  writeFileSync(
    auditPath,
    JSON.stringify({
      data: {
        blogs: {
          nodes: [
            {
              handle: "journal",
              articles: {
                nodes: [],
                pageInfo: { hasNextPage: false },
              },
            },
          ],
        },
      },
    }),
  );
  assert.equal(run("--confirmed-absent").status, 0);
  assert.match(run("--confirmed-absent").stdout, /"reused": true/);
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
    /Cannot avoid adjacent theme, visualGroup, or editorialAngle/,
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

test("verified text maintenance resets only the editorial review clock", () => {
  const now = "2026-10-12T00:00:00Z";
  const article = {
    id: "article-1",
    handle: "old-article",
    title: "Old article",
    isPublished: true,
    publishedAt: "2026-01-01T00:00:00Z",
  };
  const history = [
    {
      kind: "new",
      articleId: article.id,
      verifiedAt: "2026-10-11T00:00:00Z",
    },
    {
      kind: "maintenance",
      articleId: article.id,
      verifiedAt: "2026-10-10T00:00:00Z",
    },
  ];
  const [result] = reviewAges([article], now, 21, 28, history);
  assert.equal(result.ageDays, 284);
  assert.equal(result.reviewAgeDays, 2);
  assert.equal(result.lastTextMaintenanceAt, "2026-10-10T00:00:00.000Z");
  assert.equal(result.action, "none");
  assert.equal(result.publishedAt, article.publishedAt);
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
      reservation: { handle: "wood-0", reservedAt: "2026-10-12T00:00:00Z" },
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
