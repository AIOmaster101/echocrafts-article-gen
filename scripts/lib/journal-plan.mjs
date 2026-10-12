import { createHash } from "node:crypto";

export function journalDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error("Invalid publication date.");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function publicationWindow(plan, now, dailyLimit, journalAudit = null) {
  if (
    plan?.version !== 1 ||
    !Array.isArray(plan.items) ||
    !Array.isArray(plan.events) ||
    !Number.isInteger(dailyLimit) ||
    dailyLimit < 1
  ) {
    throw new Error("Invalid saved plan or daily publication limit.");
  }
  if (plan.events.length > plan.items.length) {
    throw new Error("Plan has more events than articles.");
  }
  if (
    plan.events.some(
      (event) => typeof event.handle !== "string" || !event.handle,
    )
  ) {
    throw new Error("Plan event is missing an article handle.");
  }
  const date = journalDate(now);
  const publishedHandles = new Set(
    plan.events
      .filter(
        (event) => journalDate(event.publishedAt ?? event.verifiedAt) === date,
      )
      .map((event) => event.handle),
  );
  if (journalAudit) {
    const articles = journalAudit?.data?.blogs?.nodes?.find(
      (blog) => blog.handle === "journal",
    )?.articles;
    if (
      !Array.isArray(articles?.nodes) ||
      articles?.pageInfo?.hasNextPage !== false
    ) {
      throw new Error(
        "A complete Shopify Journal audit is required for the daily limit.",
      );
    }
    for (const article of articles.nodes) {
      if (
        article.isPublished &&
        article.publishedAt &&
        journalDate(article.publishedAt) === date
      ) {
        if (typeof article.handle !== "string" || !article.handle) {
          throw new Error("Published Journal article is missing its handle.");
        }
        publishedHandles.add(article.handle);
      }
    }
  }
  const next = plan.items[plan.events.length] ?? null;
  const reservation = plan.reservation ?? null;
  if (reservation && reservation.handle !== next?.handle) {
    throw new Error("Plan reservation does not match the next article.");
  }
  const reservedToday =
    reservation && journalDate(reservation.reservedAt) === date ? 1 : 0;
  const publishedToday = publishedHandles.size;
  const usedToday = publishedToday + reservedToday;
  return {
    date,
    dailyLimit,
    publishedToday,
    usedToday,
    remainingToday: Math.max(0, dailyLimit - usedToday),
    next,
    reservation,
    state: !next
      ? "complete"
      : reservation
        ? "reconcile"
        : usedToday >= dailyLimit
          ? "wait"
          : "ready",
  };
}

function rank(seed, value) {
  return createHash("sha256").update(`${seed}:${value}`).digest("hex");
}

export function planJournalOrder(
  themes,
  recentThemeId,
  seed,
  recentVisualGroup = null,
  recentEditorialAngle = null,
) {
  if (!Array.isArray(themes) || themes.length < 2) {
    throw new Error(
      "At least two ready themes are required to avoid adjacent articles from one theme.",
    );
  }
  if (!seed || typeof seed !== "string")
    throw new Error("A saved random seed is required.");
  const ids = themes.map((theme) => theme.id);
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new Error("Theme IDs must be unique and nonempty.");
  }
  const handles = new Set();
  const queues = new Map();
  for (const theme of themes) {
    if (!Array.isArray(theme.articles) || theme.articles.length !== 4) {
      throw new Error(`Theme ${theme.id} must have exactly four articles.`);
    }
  }
  const visualGroups = themes.flatMap((theme) =>
    theme.articles.map((article) => article.visualGroup),
  );
  const useVisualGroups = visualGroups.some((group) => group !== undefined);
  if (
    useVisualGroups &&
    visualGroups.some((group) => typeof group !== "string" || !group.trim())
  ) {
    throw new Error("Every planned article needs a nonempty visualGroup.");
  }
  const editorialAngles = themes.flatMap((theme) =>
    theme.articles.map((article) => article.editorialAngle),
  );
  const useEditorialAngles = editorialAngles.some(
    (angle) => angle !== undefined,
  );
  if (
    useEditorialAngles &&
    editorialAngles.some((angle) => typeof angle !== "string" || !angle.trim())
  ) {
    throw new Error("Every planned article needs a nonempty editorialAngle.");
  }
  for (const theme of themes) {
    if (new Set(theme.articles.map((article) => article.index)).size !== 4) {
      throw new Error(
        `Theme ${theme.id} must use indexes 0 through 3 once each.`,
      );
    }
    const ordered = [...theme.articles].sort((a, b) =>
      rank(seed, `${theme.id}:${a.handle}`).localeCompare(
        rank(seed, `${theme.id}:${b.handle}`),
      ),
    );
    for (const article of ordered) {
      if (!article.handle || handles.has(article.handle)) {
        throw new Error("Article handles must be unique and nonempty.");
      }
      if (
        !Number.isInteger(article.index) ||
        article.index < 0 ||
        article.index > 3 ||
        typeof article.receiptPath !== "string" ||
        !article.receiptPath.startsWith("/")
      ) {
        throw new Error(
          "Each article requires index 0–3 and an absolute receiptPath.",
        );
      }
      handles.add(article.handle);
    }
    queues.set(theme.id, ordered);
  }
  const total = themes.length * 4;
  let attempts = 0;
  function arrange(
    items,
    previousTheme,
    previousVisualGroup,
    previousEditorialAngle,
  ) {
    if (items.length === total) return items;
    if (++attempts > 100000) {
      throw new Error("Visual order search exceeded its safety limit.");
    }
    const choices = ids
      .filter((id) => id !== previousTheme && queues.get(id).length)
      .sort(
        (a, b) =>
          queues.get(b).length - queues.get(a).length ||
          rank(seed, `${items.length}:${a}`).localeCompare(
            rank(seed, `${items.length}:${b}`),
          ),
      );
    for (const themeId of choices) {
      if (
        themes.length === 3 &&
        items
          .slice(Math.floor(items.length / 3) * 3)
          .some((item) => item.themeId === themeId)
      ) {
        continue;
      }
      const queue = queues.get(themeId);
      for (let index = 0; index < queue.length; index++) {
        const article = queue[index];
        if (
          useVisualGroups &&
          previousVisualGroup &&
          article.visualGroup === previousVisualGroup
        ) {
          continue;
        }
        if (
          useEditorialAngles &&
          previousEditorialAngle &&
          article.editorialAngle === previousEditorialAngle
        ) {
          continue;
        }
        queue.splice(index, 1);
        const result = arrange(
          [...items, { position: items.length + 1, themeId, ...article }],
          themeId,
          article.visualGroup ?? null,
          article.editorialAngle ?? null,
        );
        queue.splice(index, 0, article);
        if (result) return result;
      }
    }
    return null;
  }
  const items = arrange(
    [],
    recentThemeId,
    recentVisualGroup,
    recentEditorialAngle,
  );
  if (!items) {
    throw new Error(
      "Cannot avoid adjacent theme, visualGroup, or editorialAngle matches; revise the scenes or reader questions before publishing.",
    );
  }
  return items;
}

export function reviewAges(
  articles,
  now,
  reviewDays = 21,
  newTopicDays = 28,
  workHistory = [],
) {
  if (!Array.isArray(articles)) throw new Error("Expected an article list.");
  if (!Array.isArray(workHistory)) throw new Error("Expected work history.");
  const instant = new Date(now);
  if (Number.isNaN(instant.getTime())) throw new Error("Invalid review date.");
  const lastMaintenanceByArticle = new Map();
  for (const event of workHistory) {
    if (event.kind !== "maintenance") continue;
    const verifiedAt = new Date(event.verifiedAt);
    if (Number.isNaN(verifiedAt.getTime())) {
      throw new Error(`Invalid maintenance date for ${event.articleId}.`);
    }
    const previous = lastMaintenanceByArticle.get(event.articleId);
    if (!previous || verifiedAt > previous) {
      lastMaintenanceByArticle.set(event.articleId, verifiedAt);
    }
  }
  return articles
    .filter((article) => article.isPublished && article.publishedAt)
    .map((article) => {
      const published = new Date(article.publishedAt);
      if (Number.isNaN(published.getTime()))
        throw new Error(`Invalid publishedAt for ${article.handle}.`);
      const ageDays = Math.floor((instant - published) / 86400000);
      const maintenance = lastMaintenanceByArticle.get(article.id);
      const reviewedAt =
        maintenance && maintenance > published ? maintenance : published;
      const reviewAgeDays = Math.floor((instant - reviewedAt) / 86400000);
      return {
        id: article.id,
        handle: article.handle,
        title: article.title,
        publishedAt: article.publishedAt,
        ageDays,
        lastTextMaintenanceAt: maintenance?.toISOString() ?? null,
        reviewAgeDays,
        action:
          reviewAgeDays >= newTopicDays
            ? "review_new_question"
            : reviewAgeDays >= reviewDays
              ? "review_existing"
              : "none",
      };
    });
}
