import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  appendJournalEvent,
  journalHistoryReport,
  readJournalHistory,
  validateJournalEvent,
} from "./lib/journal-work-history.mjs";

const event = {
  version: 1,
  eventId: "2026-10-12-lacquerware-care-correction",
  kind: "maintenance",
  articleId: "gid://shopify/Article/641122468149",
  handle: "lacquerware-care",
  url: "https://modernjapancrafts.com/blogs/journal/lacquerware-care",
  verifiedAt: "2026-10-12T03:00:00Z",
  adminReadbackAt: "2026-10-12T02:59:00Z",
  publicReadbackAt: "2026-10-12T03:00:00Z",
  changes: ["Corrected dishwasher guidance"],
  sourceUrls: ["https://modernjapancrafts.com/products/example"],
  before: {
    bodySha256: "a".repeat(64),
    publishedAt: "2025-11-08T11:00:10Z",
  },
  after: {
    bodySha256: "b".repeat(64),
    publishedAt: "2025-11-08T11:00:10Z",
  },
};

test("maintenance history is append-only, readable, and idempotent", () => {
  const dir = mkdtempSync(join(tmpdir(), "journal-history-"));
  const path = join(dir, "history.jsonl");
  appendJournalEvent(path, event);
  assert.deepEqual(readJournalHistory(path), [event]);
  assert.match(
    journalHistoryReport(readJournalHistory(path)),
    /Corrected dishwasher guidance/,
  );
  assert.throws(() => appendJournalEvent(path, event), /already recorded/);
});

test("maintenance rejects date resets and unchanged copy", () => {
  assert.throws(
    () =>
      validateJournalEvent({
        ...event,
        after: { ...event.after, publishedAt: "2026-10-12T03:00:00Z" },
      }),
    /unchanged publication date/,
  );
  assert.throws(
    () =>
      validateJournalEvent({
        ...event,
        after: { ...event.after, bodySha256: event.before.bodySha256 },
      }),
    /changed body/,
  );
});

test("new publication requires cover evidence and product identity", () => {
  const publication = {
    ...event,
    kind: "new",
    before: undefined,
    adminReadbackAt: undefined,
    themeId: "new-theme",
    productHandle: "example",
    after: { ...event.after, coverSha256: "c".repeat(64) },
  };
  assert.deepEqual(validateJournalEvent(publication), publication);
  assert.throws(
    () =>
      validateJournalEvent({
        ...publication,
        after: { ...publication.after, coverSha256: null },
      }),
    /Invalid or unverified/,
  );
});
