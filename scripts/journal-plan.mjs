#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  assertReadyForPublish,
  atomicJson,
  readJson,
  validateReceipt,
  withLock,
} from "./lib/publication-harness.mjs";
import {
  planJournalOrder,
  publicationWindow,
  reviewAges,
} from "./lib/journal-plan.mjs";
import { readJournalHistory } from "./lib/journal-work-history.mjs";

const [command, ...args] = process.argv.slice(2);
const policy = readJson(
  join(import.meta.dirname, "../config/publication-policy.json"),
);
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

try {
  if (command === "plan") {
    const input = readJson(resolve(option("input")));
    const output = resolve(option("output"));
    if (input?.version !== 1) throw new Error("Expected version 1 plan input.");
    if (
      !Array.isArray(input.themes) ||
      input.themes.length !== policy.minimumReadyThemesForShopifyPublish
    ) {
      throw new Error(
        `Exactly ${policy.minimumReadyThemesForShopifyPublish} ready themes are required for a Shopify plan.`,
      );
    }
    for (const theme of input.themes) {
      for (const item of theme.articles ?? []) {
        const receiptPath = resolve(item.receiptPath);
        const receipt = readJson(receiptPath);
        validateReceipt(receipt, receiptPath);
        const article = receipt.articles.find(
          (entry) =>
            entry.themeIndex === item.index && entry.handle === item.handle,
        );
        if (!article || article.shopify?.status !== "pending") {
          throw new Error(`Theme ${theme.id} is not fully ready.`);
        }
        assertReadyForPublish(receiptPath, article);
      }
    }
    if (!input.recentThemeId || typeof input.recentThemeId !== "string") {
      throw new Error(
        "The actual Journal top card's recentThemeId is required.",
      );
    }
    if (
      input.recentVisualGroup != null &&
      (typeof input.recentVisualGroup !== "string" ||
        !input.recentVisualGroup.trim())
    ) {
      throw new Error("recentVisualGroup must be a nonempty string.");
    }
    if (
      input.recentEditorialAngle != null &&
      (typeof input.recentEditorialAngle !== "string" ||
        !input.recentEditorialAngle.trim())
    ) {
      throw new Error("recentEditorialAngle must be a nonempty string.");
    }
    if (existsSync(output))
      throw new Error("Plan already exists; resume its saved order.");
    const seed = input.seed ?? randomBytes(16).toString("hex");
    const items = planJournalOrder(
      input.themes,
      input.recentThemeId,
      seed,
      input.recentVisualGroup ?? null,
      input.recentEditorialAngle ?? null,
    );
    const plan = {
      version: 1,
      createdAt: new Date().toISOString(),
      seed,
      recentThemeId: input.recentThemeId ?? null,
      recentVisualGroup: input.recentVisualGroup ?? null,
      recentEditorialAngle: input.recentEditorialAngle ?? null,
      items,
      events: [],
      reservation: null,
    };
    atomicJson(output, plan);
    console.log(JSON.stringify(plan, null, 2));
  } else if (command === "status") {
    const plan = readJson(resolve(option("plan")));
    console.log(
      JSON.stringify(
        publicationWindow(
          plan,
          option("now", false) ?? new Date().toISOString(),
          policy.maximumShopifyArticlesPerDay,
        ),
        null,
        2,
      ),
    );
  } else if (command === "permit") {
    if (args.includes("--now")) {
      throw new Error(
        "permit always uses the current time; --now is not allowed.",
      );
    }
    const path = resolve(option("plan"));
    const handle = option("handle");
    withLock(`${path}.lock`, () => {
      const plan = readJson(path);
      const now = new Date().toISOString();
      const window = publicationWindow(
        plan,
        now,
        policy.maximumShopifyArticlesPerDay,
      );
      if (window.next?.handle !== handle) {
        throw new Error(
          `Next Shopify article is ${window.next?.handle ?? "none"}.`,
        );
      }
      const auditPath = resolve(option("audit"));
      if (Math.abs(Date.now() - statSync(auditPath).mtimeMs) > 30 * 60 * 1000) {
        throw new Error(
          "Shopify Journal audit is older than 30 minutes; fetch it again.",
        );
      }
      const auditedWindow = publicationWindow(
        plan,
        now,
        policy.maximumShopifyArticlesPerDay,
        readJson(auditPath),
      );
      if (window.reservation) {
        if (!args.includes("--confirmed-absent")) {
          throw new Error(
            `Reconcile the existing permit for ${window.reservation.handle} before another write.`,
          );
        }
        const receipt = readJson(resolve(window.next.receiptPath));
        const article = receipt?.articles?.find(
          (item) => item.themeIndex === window.next.index,
        );
        if (
          article?.handle !== handle ||
          article?.shopify?.status !== "pending"
        ) {
          throw new Error(
            "The receipt is no longer pending; verify and record the existing Shopify article.",
          );
        }
        if (auditedWindow.publishedToday >= auditedWindow.dailyLimit) {
          throw new Error(
            `Daily Shopify limit reached for ${auditedWindow.date}; resume on the next Asia/Tokyo day.`,
          );
        }
        plan.reservation = { handle, reservedAt: now };
        atomicJson(path, plan);
        console.log(
          JSON.stringify({ ...plan.reservation, reused: true }, null, 2),
        );
        return;
      }
      if (auditedWindow.state !== "ready") {
        throw new Error(
          `Daily Shopify limit reached for ${auditedWindow.date}; resume on the next Asia/Tokyo day.`,
        );
      }
      const receipt = readJson(resolve(window.next.receiptPath));
      const article = receipt?.articles?.find(
        (item) => item.themeIndex === window.next.index,
      );
      if (
        article?.handle !== handle ||
        article?.shopify?.status !== "pending"
      ) {
        throw new Error(
          "Next article is not pending; reconcile its Shopify state before a write.",
        );
      }
      assertReadyForPublish(resolve(window.next.receiptPath), article);
      plan.reservation = { handle, reservedAt: now };
      atomicJson(path, plan);
      console.log(JSON.stringify(plan.reservation, null, 2));
    });
  } else if (command === "record") {
    const path = resolve(option("plan"));
    const handle = option("handle");
    withLock(`${path}.lock`, () => {
      const plan = readJson(path);
      if (
        plan?.version !== 1 ||
        !Array.isArray(plan.items) ||
        !Array.isArray(plan.events)
      ) {
        throw new Error("Invalid saved plan.");
      }
      const next = plan.items[plan.events.length];
      if (!next || next.handle !== handle) {
        throw new Error(`Next Shopify article is ${next?.handle ?? "none"}.`);
      }
      if (plan.reservation?.handle !== handle) {
        throw new Error(
          `A saved permit for ${handle} is required before recording publication.`,
        );
      }
      if (!next.receiptPath || !Number.isInteger(next.index)) {
        throw new Error("Plan item requires receiptPath and index.");
      }
      const receipt = readJson(resolve(next.receiptPath));
      const article = receipt?.articles?.find(
        (item) => item.themeIndex === next.index,
      );
      if (
        article?.handle !== handle ||
        article?.shopify?.status !== "verified" ||
        !article.shopify.url ||
        !article.shopify.verifiedAt
      ) {
        throw new Error(
          "The receipt has no verified Shopify article for this plan item.",
        );
      }
      plan.events.push({
        position: next.position,
        themeId: next.themeId,
        handle,
        url: article.shopify.url,
        verifiedAt: article.shopify.verifiedAt ?? null,
        publishedAt: article.shopify.publishedAt ?? null,
        recordedAt: new Date().toISOString(),
      });
      plan.reservation = null;
      atomicJson(path, plan);
      console.log(JSON.stringify(plan.events.at(-1), null, 2));
    });
  } else if (command === "review") {
    const input = JSON.parse(readFileSync(resolve(option("input")), "utf8"));
    const articles =
      input?.data?.blogs?.nodes?.[0]?.articles?.nodes ??
      input?.articles ??
      input;
    const history = readJournalHistory(
      resolve(
        option("history", false) ??
          join(import.meta.dirname, "../records/journal-work-history.jsonl"),
      ),
    );
    console.log(
      JSON.stringify(
        reviewAges(
          articles,
          option("now", false) ?? new Date().toISOString(),
          policy.reviewAfterDays,
          policy.newQuestionReviewAfterDays,
          history,
        ),
        null,
        2,
      ),
    );
  } else {
    throw new Error(
      "Usage: journal-plan.mjs <plan --input FILE --output FILE|status --plan FILE [--now ISO]|permit --plan FILE --handle HANDLE --audit FILE [--confirmed-absent]|record --plan FILE --handle HANDLE|review --input FILE [--history FILE] [--now ISO]>",
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
