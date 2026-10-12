# Daily four-article publication harness

This is the local operating contract for one product or craft category, four English articles, and four distinct covers. Existing runs used two public destinations. A newly registered run may target Shopify only. Substack email and app delivery remain off.

## Surfaces and limits

- Product discovery and Shopify Journal writes: the connected Shopify Admin GraphQL tool for `xffvf7-e1.myshopify.com`. The checked queries and mutations are in `scripts/graphql/`. If the connector is unavailable, use authenticated Shopify CLI only after following its confirmation rules.
- Article creation: the deployed application's existing Claude-backed `/api/extract` or `/api/extract-from-craft`, then `/api/score`, `/api/article`, `/api/article/translate`, and `/api/distribute` endpoints. `scripts/generate-publication-batch.mjs` uses the original payload for the selected mode without changing the API contracts. A Shopify-only bundle skips the optional Substack distribution step.
- Image creation: use the separate OpenAI image-generation stage for four distinct lifestyle editorial covers. In product mode, feed the actual Shopify product photographs to the image tool as image inputs and supply verified dimensions, visible features, and variant identity. Review each result against the source photographs. The OpenAI image key does not authenticate the Claude article endpoints. A synthetic cover must not be described as a literal product photograph. Follow `docs/cover-refresh-plan.md` for the visual standard and published-cover replacement.
- Substack: the authenticated editor at `modernjapancrafts.substack.com`. [The official MCP is read-only](https://support.substack.com/hc/en-us/articles/50834026608916-How-to-connect-Substack-to-your-AI-Assistant). Do not call an undocumented write endpoint. If the editor is unavailable, stop and report the blocker.
- Public verification: the local CLI checks HTTP response, title, image, and source/Shopify link. The agent also checks the visible first image and email setting in Substack.

The local repository branch is **not deployed**. Run the scripts from this checkout; publication uses the existing deployed generation API and the authenticated destination tools. The daily automation is an agent workflow, not a background Node daemon. It requires the Codex desktop host, its Shopify connection, its signed-in Substack editor, and an available image-generation tool or locally configured image API key. Substack's documented Developer API does not provide a confirmed post-image editing operation; do not substitute an unofficial cookie-based writer for the editor. Missing access stops publication; it never substitutes a random image or claims success.

For OpenAI CLI fallback, the owner has authorized an external image-key file. Load its `OPENAI_API_KEY` assignment into the image CLI process environment at runtime only. If the file is Markdown-escaped, remove `\_` escapes in both the variable name and value before using it. Never print the key, write it into `.tmp`, add it to Git, or pass it to the Claude article endpoints. Keep the external file readable only by its owner. The key-file location is recorded in the owner's private cross-project memory, not in this repository.

## One batch

1. Read `config/publication-policy.json`, `.tmp/publication-harness/ledger.json` if present, and this runbook. Resume an active batch until its four articles have reviewed copy and covers. Then `select --next-theme` may choose another source while earlier themes remain queued. At most three unfinished themes may coexist. Do not publish until all three are ready and a Journal order plan is saved.
2. Run `scripts/graphql/publication-candidates.graphql` through the Shopify connector with `after: null`. Save its JSON data locally under `.tmp/publication-harness/catalog.json`. Run `node scripts/publication-harness.mjs select --catalog .tmp/publication-harness/catalog.json`; add `--next-theme` only after the first queued batch is fully reviewed and covered. This excludes the previously published Ranshi product and every product in the ledger. A candidate must be active, in stock, publicly linked, described, and photographed. Inspect the actual product page and image. If source facts are weak or the product already has four articles, save the candidate JSON and run `skip --candidate <file> --reason <specific-reason>`, then select again. If selection returns `more_products`, run the query with the returned `cursor` as `after`, save that page, and select again. Do not use craft mode until the final Shopify page has been checked. On the final page, `select` reads the existing craft catalog and picks an unused category with approved or edited facts tied to Tier 1/2 HTTPS sources. Save the craft selection as `candidate.json`; verify its cited pages. If the facts are weak, use `skip --candidate <file> --reason <specific-reason>` and select again. A catalog read error stops the run.
3. Save the returned candidate JSON under the new run directory, for example `.tmp/publication-harness/runs/YYYY-MM-DD-<handle>/candidate.json`. Start generation:

   ```sh
   node scripts/generate-publication-batch.mjs extract --run-dir .tmp/publication-harness/runs/<run> --product-url https://modernjapancrafts.com/products/<handle>
   # For a craft selection, use this command instead:
   node scripts/generate-publication-batch.mjs extract --run-dir .tmp/publication-harness/runs/<run> --candidate .tmp/publication-harness/runs/<run>/candidate.json
   ```

   This records the original generator UI's Q1 and Q2 values. The default is `interview_no` and `position_auto`; use `--q1` or `--q2` only with another value from `types/index.ts` that the product evidence supports. Do not claim an interview exists without one.

4. Compare `extract.json` with the product page or approved craft facts and their cited pages. Correct unsupported history, origin, artisan, care, safety, numbers, and specifications. Save `product-reviewed.json` in the run directory, preserving `productId`. Record the reason:

   ```sh
   node scripts/generate-publication-batch.mjs review-source --run-dir .tmp/publication-harness/runs/<run> --note 'Checked material, care, origin, and measurements against the current product page.'
   node scripts/generate-publication-batch.mjs generate --run-dir .tmp/publication-harness/runs/<run>
   ```

   The generator checkpoints each remote request. If `inflight.json` exists, the outcome is uncertain: inspect the app's saved records before retrying. Never delete that file just to repeat a write. The generator reads the four article IDs from the app's current product page; it stops if the page format changes or the IDs conflict.

5. For each `article-0.json` through `article-3.json`, review the English body against the product and cited sources. Write `editorial-0.html` through `editorial-3.html`. Remove claims the evidence does not support, keep a working link to the selected product or a verified craft source, and use plain premium brand language. If a generated title promises unverified instructions or comparisons, write `editorial-titles.json` with `version: 1` and exactly four `{ "index": 0, "titleEn": "...", "titleJa": "..." }` entries. The bundle uses these reviewed titles for distribution and Shopify. Record each review:

   ```sh
   node scripts/generate-publication-batch.mjs review-article --run-dir .tmp/publication-harness/runs/<run> --index 0 --note 'Checked all product and care claims against the live source and corrected the copy.'
   ```

   Repeat for indexes 1–3. For a Shopify-only run, use `node scripts/generate-publication-batch.mjs bundle --run-dir .tmp/publication-harness/runs/<run> --destinations shopify`; this writes the reviewed Shopify bundle without calling the Substack distribution API. Omit the destination flag only when Substack copy is required. Both modes retain the four saved article IDs and write `bundle.json`.

6. Write `<run-dir>/visual-evidence.json` after checking the live listing. It must contain `version: 1`, `productUrl`, one or more HTTPS `referenceImages`, matching local `referenceFiles` paths relative to the evidence file, verified `dimensions` and `visibleFeatures`, and four `articles` entries with `themeIndex` 0–3, unique `scene`, and article-specific `visualFocus`; add `variant` when relevant. For craft mode, use verified category reference images and omit product-specific claims. Download and inspect the referenced images; do not pass URLs as text alone to the image tool. The preparation command checks the files and records their hashes. Run `node scripts/prepare-publication.mjs <run-dir>/bundle.json <run-dir>/publication --visual-evidence <run-dir>/visual-evidence.json`, then `node scripts/publication-harness.mjs register --receipt <run-dir>/publication/receipt.json --candidate <run-dir>/candidate.json`. Add `--destinations shopify` when this run is Shopify only; omission retains the existing two-destination contract. A second or third batch can register only after every earlier queued batch has four reviewed articles and covers, before any Shopify write. For each article, record the editorial evidence using `review --receipt ... --index N --source-url <product-or-craft-evidence-url> --note <specific-checks>`. For craft categories, confirm the encyclopedia link is public; if not, replace it with a verified cited source in the reviewed HTML.
7. Generate four different 1536×1024 or larger covers from the article-specific `cover-brief.json` and `cover-prompt.txt`, passing the actual `sourceImageInputs` files to the image tool. Compose four different everyday scenes with distinct activities, camera positions, light, and props. Keep the product recognizable at Journal-card size and physically plausible beside known-scale objects. Never reuse a composition, show an unverified variant, or imply unsupported care or food-contact use. Inspect each image at full size and as a three-column card, comparing silhouette, proportions, rim, foot, pattern, finish, and scale against the actual source images. Reject a candidate if its physical product differs, and generate a correction from the verified source photographs. Put the chosen PNG/JPEG in its article directory and run `cover --receipt ... --index N --path <file> --note <visual-comparison>`. Never use the same cover twice.
8. Before any Shopify write, require three ready four-article themes and save the Journal order plan described below. Fewer than three ready themes stay queued; publishing its four articles together would repeat the current visual problem. For each article in the saved plan order, query Shopify articles by `handle:<handle>` with `scripts/graphql/article-by-handle.graphql` and confirm the `journal` blog. If an exact article exists, inspect and update it with `article-update.graphql`; otherwise upload the cover with `staged-uploads-create.graphql` and `file-create.graphql`, then create with `article-create.graphql`. Use the reviewed HTML, published status, canonical handle, and Shopify CDN image URL. Check GraphQL `userErrors`. Record the returned article ID and actual URL with `publication-harness.mjs shopify ...`, then run `verify --site shopify ...` and `journal-plan.mjs record`. Do not continue to Substack until Shopify is verified.
9. Only when the receipt requires Substack, use its authenticated editor to create or resume the exact post. Insert the matching generated cover at the very beginning. Use `substack.txt` subject, subtitle, and body, with a clickable link to the verified Shopify article. Publish **to web only**, with email and Substack app delivery disabled. Inspect the visible public post. Record its actual URL with `publication-harness.mjs substack ...`; then run `verify --site substack ...`. Never infer a URL from a draft title. Shopify-only receipts must not write to Substack.
10. Run `node scripts/publication-harness.mjs status --receipt <run-dir>/publication/receipt.json`. A batch is complete only when every required destination is `verified`: four Shopify URLs for a Shopify-only receipt, or eight URLs for a two-destination receipt. Report the actual URLs, the selected product or craft category, cover paths, and any stopped step. Do not report revenue or traffic effects without measurement.

## Invocation and schedule

When the owner says “ブログ4本を1テーマで公開”, prepare the four-article batch and queue it. A named theme takes priority over automatic candidate ranking; select a live product that supports it and still apply the same evidence and duplicate checks. Publish only after three ready themes exist and the saved order plan interleaves them. The daily Codex heartbeat may prepare a theme without a new approval, but it must not publish four same-theme Shopify cards consecutively. It must remain quiet when there is no eligible product or craft category and no change, and report a completion, failure, or action required. If there are already four active articles for the selected product in either destination, skip it.

The Journal orders cards by publication time. The live grid showed nine articles per page on 2026-10-12; verify pagination at each release because the theme may change. Keep existing posts' dates intact. Do not randomize the visible card order per page load: that would make pagination and internal-link prominence unstable. When three new four-article themes are ready, interleave publication events among them using one saved random seed so the grid does not show four near-identical products in a row. Assign each cover a broad `visualGroup` based on its visible scene, such as `tea-table`, `shelf`, or `writing-desk`, and use the plan's optional visual guard to separate matching groups across themes. Set an `editorialAngle` such as `care`, `craft`, `selection`, or `comparison` for every planned article to prevent neighboring cards from repeating the same reader question. Check the actual desktop and mobile Journal grid afterward; metadata cannot replace visual inspection. Four visibly distinct scenes remain required within each theme. This changes future batches; the existing October 10 groups remain consecutive until other content is published above them or the storefront layout is separately changed.

### Shopify order and aging review

Before publishing, query `scripts/graphql/journal-audit.graphql` and save the complete result in the ignored run directory. Check `pageInfo.hasNextPage` and continue pagination if necessary. Run `node scripts/journal-plan.mjs review --input <audit.json> --history records/journal-work-history.jsonl`. The 21-day and 28-day marks are editorial reminders only. `ageDays` is the article's original publication age; `reviewAgeDays` counts from its latest verified text maintenance, or from publication if none exists. A cover edit does not reset this review clock. Review older pages for outdated facts, weak or duplicate content, and useful additions. Preserve the URL and original `publishedAt` for a substantive correction. Create a new article only for a distinct, sourced reader question. Do not make token text changes or reset dates for a presumed search boost. Google does not define a 3–4 week ranking expiry.

When three four-article themes are fully reviewed and covered, save a version-1 plan input with `recentThemeId`, optional `recentVisualGroup`, optional `recentEditorialAngle`, optional `seed`, and `themes`. Each theme has a unique `id` and four `articles`; each article needs `handle`, zero-based `index`, and absolute `receiptPath`. `recentThemeId`, `recentVisualGroup`, and `recentEditorialAngle` describe the current top card from the Shopify readback. If any planned article has `visualGroup` or `editorialAngle`, all planned articles must have that field. The planner then rejects adjacent theme, visual-group, or editorial-angle matches and asks for different scenes or questions if no complete order exists. Example:

```json
{
  "version": 1,
  "recentThemeId": "peony-bowl",
  "recentVisualGroup": "tea-table",
  "themes": [
    {
      "id": "new-glass",
      "articles": [
        {
          "handle": "example-one",
          "index": 0,
          "visualGroup": "shelf",
          "receiptPath": "/absolute/path/to/receipt.json"
        },
        {
          "handle": "example-two",
          "index": 1,
          "visualGroup": "writing-desk",
          "receiptPath": "/absolute/path/to/receipt.json"
        },
        {
          "handle": "example-three",
          "index": 2,
          "visualGroup": "tea-table",
          "receiptPath": "/absolute/path/to/receipt.json"
        },
        {
          "handle": "example-four",
          "index": 3,
          "visualGroup": "reading-chair",
          "receiptPath": "/absolute/path/to/receipt.json"
        }
      ]
    },
    {
      "id": "new-ceramic",
      "articles": [
        {
          "handle": "another-one",
          "index": 0,
          "visualGroup": "tea-table",
          "receiptPath": "/absolute/path/to/other-receipt.json"
        },
        {
          "handle": "another-two",
          "index": 1,
          "visualGroup": "shelf",
          "receiptPath": "/absolute/path/to/other-receipt.json"
        },
        {
          "handle": "another-three",
          "index": 2,
          "visualGroup": "reading-chair",
          "receiptPath": "/absolute/path/to/other-receipt.json"
        },
        {
          "handle": "another-four",
          "index": 3,
          "visualGroup": "writing-desk",
          "receiptPath": "/absolute/path/to/other-receipt.json"
        }
      ]
    }
  ]
}
```

Run `node scripts/journal-plan.mjs plan --input <input.json> --output <plan.json>`. This saves a random seed and a reproducible order that forbids adjacent theme matches, including the current top card. Publish the next planned article through the normal Shopify steps, verify its public page with `publication-harness.mjs verify`, and then run `node scripts/journal-plan.mjs record --plan <plan.json> --handle <handle>`. Continue in plan order. If a write has an uncertain outcome, inspect Shopify by handle and the receipt before retrying. Finally re-query the actual Journal, confirm the twelve new cards match the recorded order in reverse across pagination, and keep the query result beside the plan. Fewer than three ready themes remain queued under the current policy.

### Channel evidence before resuming Substack

The 2026-10-12 Clavio acquisition readback covers GA4 through 2026-10-09. Over its 30-day window, 435 of 791 Shopify-site sessions landed under blog paths across Journal and Crafts. The ranked Journal rows show at least 60 sessions across four URLs. No session source is labeled Substack, but the current Substack-to-Shopify links have no UTM tags and Clavio does not include Substack's own post-view or subscriber totals. This supports Shopify as the immediate owned content destination; it does not establish that Substack has no readers or commercial value. Before restarting Substack, inspect its native per-post views and subscriptions over the same dates and add distinct UTM-tagged links to the Shopify article and product. Compare source-specific sessions and downstream actions without claiming a sale was caused by a post solely from a landing-page row.

No API keys, sessions, or customer data belong in the run directory or Git. The ledger and run artifacts live under ignored `.tmp/publication-harness/`. Preserve them across daily runs; backing up or moving this checkout requires moving that directory too.

### Verified work history

After each Shopify article has a verified public URL, record one `new` event in `records/journal-work-history.jsonl`. Include the Shopify article ID, handle, canonical URL, product and theme IDs, reviewed body and cover hashes, public readback time, source URLs, and what was published. Do not log a draft as a new publication. Use `node scripts/journal-work-history.mjs append --history records/journal-work-history.jsonl --event <verified-event.json>`. The command rejects duplicate article/body pairs and incomplete proof fields.

Text maintenance is an independent lane. It needs no cover, image API key, or three-theme publication plan. For maintenance, save an ignored before Admin readback with the article ID, handle, `publishedAt`, image URL, body, and summary. Compare factual claims with current source pages. Make a substantive source-backed correction to the body and summary using `articleUpdate` without passing image, handle, or a new publish date. Read the article again through Admin and at its public URL; require the ID, handle, `publishedAt`, and image URL to remain unchanged, the body hash to change, and the public page to show the correction. Record a `maintenance` event with before/after body hashes, verification times, source URLs, and exact reasons. Regenerate the report. An age reminder alone is not a maintenance event.

Regenerate the readable report with `node scripts/journal-work-history.mjs report --history records/journal-work-history.jsonl > docs/journal-work-history.md`. Commit both the JSONL and Markdown report with the harness code; keep ignored HTML snapshots, credentials, and local run state out of Git.

At the end of each run, report the outcome directly in the UI chat. Lead with two counts from verified history: new Shopify articles published and existing articles whose text was updated. State prepared but unpublished articles separately. Keep this chat summary short; the tracked work history retains the detailed evidence. Do not count drafts, attempted writes, or unverified pages as completed work.
