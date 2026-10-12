import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { withLock } from "./publication-harness.mjs";

const hashPattern = /^[a-f0-9]{64}$/;
const articlePattern = /^gid:\/\/shopify\/Article\/\d+$/;

function validDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validJournalUrl(value, handle) {
  try {
    const url = new URL(value);
    return (
      url.origin === "https://modernjapancrafts.com" &&
      url.pathname === `/blogs/journal/${handle}` &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function validateJournalEvent(event) {
  if (
    event?.version !== 1 ||
    !["new", "maintenance"].includes(event.kind) ||
    typeof event.eventId !== "string" ||
    !/^[a-z0-9][a-z0-9-]{8,100}$/.test(event.eventId) ||
    !articlePattern.test(event.articleId ?? "") ||
    !/^[a-z0-9-]+$/.test(event.handle ?? "") ||
    !validJournalUrl(event.url, event.handle) ||
    !validDate(event.verifiedAt) ||
    !validDate(event.publicReadbackAt) ||
    !Array.isArray(event.changes) ||
    !event.changes.length ||
    event.changes.some(
      (change) => typeof change !== "string" || !change.trim(),
    ) ||
    !Array.isArray(event.sourceUrls) ||
    !event.sourceUrls.length ||
    event.sourceUrls.some((value) => {
      try {
        return new URL(value).protocol !== "https:";
      } catch {
        return true;
      }
    }) ||
    !hashPattern.test(event.after?.bodySha256 ?? "") ||
    (event.kind === "new" &&
      !hashPattern.test(event.after?.coverSha256 ?? "")) ||
    !validDate(event.after?.publishedAt)
  ) {
    throw new Error("Invalid or unverified Journal work-history event.");
  }
  if (event.kind === "maintenance") {
    if (
      !hashPattern.test(event.before?.bodySha256 ?? "") ||
      event.before.bodySha256 === event.after.bodySha256 ||
      !validDate(event.before.publishedAt) ||
      event.before.publishedAt !== event.after.publishedAt ||
      !validDate(event.adminReadbackAt)
    ) {
      throw new Error(
        "Maintenance needs changed body and unchanged publication date.",
      );
    }
  } else if (
    typeof event.themeId !== "string" ||
    !event.themeId ||
    typeof event.productHandle !== "string" ||
    !event.productHandle
  ) {
    throw new Error("New publication needs theme and product identity.");
  }
  return event;
}

export function readJournalHistory(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => validateJournalEvent(JSON.parse(line)));
}

export function appendJournalEvent(path, event) {
  validateJournalEvent(event);
  mkdirSync(dirname(path), { recursive: true });
  withLock(`${path}.lock`, () => {
    const existing = readJournalHistory(path);
    if (
      existing.some(
        (item) =>
          item.eventId === event.eventId ||
          (item.articleId === event.articleId &&
            item.after.bodySha256 === event.after.bodySha256),
      )
    ) {
      throw new Error("Journal work-history event is already recorded.");
    }
    const temp = `${path}.${process.pid}.${Date.now()}.tmp`;
    try {
      writeFileSync(
        temp,
        `${[...existing, event].map((item) => JSON.stringify(item)).join("\n")}\n`,
        { flag: "wx" },
      );
      renameSync(temp, path);
    } finally {
      if (existsSync(temp)) unlinkSync(temp);
    }
  });
}

export function journalHistoryReport(events) {
  return [
    "# Journal work history",
    "",
    "| Verified (UTC) | Work | Article | Changes |",
    "| --- | --- | --- | --- |",
    ...events.map(
      (event) =>
        `| ${event.verifiedAt} | ${event.kind} | [${event.handle}](${event.url}) | ${event.changes.join("; ").replaceAll("|", "\\|")} |`,
    ),
    "",
    ...events.flatMap((event) => [
      `## ${event.eventId}`,
      "",
      `- Public URL: ${event.url}`,
      `- Article ID: ${event.articleId}`,
      `- Original published at: ${event.before?.publishedAt ?? "new article"}`,
      `- Current published at: ${event.after.publishedAt}`,
      `- Body SHA-256: ${event.before?.bodySha256 ?? "new article"} → ${event.after.bodySha256}`,
      ...(event.after.coverSha256
        ? [`- Cover SHA-256: ${event.after.coverSha256}`]
        : []),
      `- Admin readback: ${event.adminReadbackAt ?? "publication receipt"}`,
      `- Public readback: ${event.publicReadbackAt}`,
      `- Sources: ${event.sourceUrls.join(", ")}`,
      "",
    ]),
  ].join("\n");
}
