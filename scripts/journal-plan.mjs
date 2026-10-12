#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { atomicJson, readJson, withLock } from "./lib/publication-harness.mjs";
import { planJournalOrder, reviewAges } from "./lib/journal-plan.mjs";

const [command, ...args] = process.argv.slice(2);
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
    if (existsSync(output))
      throw new Error("Plan already exists; resume its saved order.");
    const seed = input.seed ?? randomBytes(16).toString("hex");
    const items = planJournalOrder(
      input.themes,
      input.recentThemeId,
      seed,
      input.recentVisualGroup ?? null,
    );
    const plan = {
      version: 1,
      createdAt: new Date().toISOString(),
      seed,
      recentThemeId: input.recentThemeId ?? null,
      recentVisualGroup: input.recentVisualGroup ?? null,
      items,
      events: [],
    };
    atomicJson(output, plan);
    console.log(JSON.stringify(plan, null, 2));
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
        !article.shopify.url
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
        recordedAt: new Date().toISOString(),
      });
      atomicJson(path, plan);
      console.log(JSON.stringify(plan.events.at(-1), null, 2));
    });
  } else if (command === "review") {
    const input = JSON.parse(readFileSync(resolve(option("input")), "utf8"));
    const articles =
      input?.data?.blogs?.nodes?.[0]?.articles?.nodes ??
      input?.articles ??
      input;
    const policy = readJson(
      join(import.meta.dirname, "../config/publication-policy.json"),
    );
    console.log(
      JSON.stringify(
        reviewAges(
          articles,
          option("now", false) ?? new Date().toISOString(),
          policy.reviewAfterDays,
          policy.newQuestionReviewAfterDays,
        ),
        null,
        2,
      ),
    );
  } else {
    throw new Error(
      "Usage: journal-plan.mjs <plan --input FILE --output FILE|record --plan FILE --handle HANDLE|review --input FILE [--now ISO]>",
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
