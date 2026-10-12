# Daily four-article publication harness

This is the local operating contract for one product or craft category, four English articles, four distinct covers, and two public destinations. The owner authorized recurring web publication on 2026-10-04. One run may produce eight public pages. Substack email and app delivery remain off.

## Surfaces and limits

- Product discovery and Shopify Journal writes: the connected Shopify Admin GraphQL tool for `xffvf7-e1.myshopify.com`. The checked queries and mutations are in `scripts/graphql/`. If the connector is unavailable, use authenticated Shopify CLI only after following its confirmation rules.
- Article creation: the deployed application's existing `/api/extract` or `/api/extract-from-craft`, then `/api/score`, `/api/article`, `/api/article/translate`, and `/api/distribute` endpoints. `scripts/generate-publication-batch.mjs` uses the original payload for the selected mode without changing the API contracts.
- Image creation: generate four distinct lifestyle editorial covers. In product mode, feed the actual Shopify product photographs to the image tool as image inputs and supply verified dimensions, visible features, and variant identity. Review each result against the source photographs. A synthetic cover must not be described as a literal product photograph. Follow `docs/cover-refresh-plan.md` for the visual standard and published-cover replacement.
- Substack: the authenticated editor at `modernjapancrafts.substack.com`. [The official MCP is read-only](https://support.substack.com/hc/en-us/articles/50834026608916-How-to-connect-Substack-to-your-AI-Assistant). Do not call an undocumented write endpoint. If the editor is unavailable, stop and report the blocker.
- Public verification: the local CLI checks HTTP response, title, image, and source/Shopify link. The agent also checks the visible first image and email setting in Substack.

The local repository branch is **not deployed**. Run the scripts from this checkout; publication uses the existing deployed generation API and the authenticated destination tools. The daily automation is an agent workflow, not a background Node daemon. It requires the Codex desktop host, its Shopify connection, its signed-in Substack editor, and an available image-generation tool or locally configured image API key. Substack's documented Developer API does not provide a confirmed post-image editing operation; do not substitute an unofficial cookie-based writer for the editor. Missing access stops publication; it never substitutes a random image or claims success.

## One batch

1. Read `config/publication-policy.json`, `.tmp/publication-harness/ledger.json` if present, and this runbook. If a batch is active, resume it before selecting another source. Do not launch two batches in parallel.
2. Run `scripts/graphql/publication-candidates.graphql` through the Shopify connector with `after: null`. Save its JSON data locally under `.tmp/publication-harness/catalog.json`. Run `node scripts/publication-harness.mjs select --catalog .tmp/publication-harness/catalog.json`. This excludes the previously published Ranshi product and every product in the ledger. A candidate must be active, in stock, publicly linked, described, and photographed. Inspect the actual product page and image. If source facts are weak or the product already has four articles, save the candidate JSON and run `skip --candidate <file> --reason <specific-reason>`, then select again. If selection returns `more_products`, run the query with the returned `cursor` as `after`, save that page, and select again. Do not use craft mode until the final Shopify page has been checked. On the final page, `select` reads the existing craft catalog and picks an unused category with approved or edited facts tied to Tier 1/2 HTTPS sources. Save the craft selection as `candidate.json`; verify its cited pages. If the facts are weak, use `skip --candidate <file> --reason <specific-reason>` and select again. A catalog read error stops the run.
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

5. For each `article-0.json` through `article-3.json`, review the English body against the product and cited sources. Write `editorial-0.html` through `editorial-3.html`. Remove claims the evidence does not support, keep a working link to the selected product or a verified craft source, and use plain premium brand language. Record each review:

   ```sh
   node scripts/generate-publication-batch.mjs review-article --run-dir .tmp/publication-harness/runs/<run> --index 0 --note 'Checked all product and care claims against the live source and corrected the copy.'
   ```

   Repeat for indexes 1–3. Then run `node scripts/generate-publication-batch.mjs bundle --run-dir .tmp/publication-harness/runs/<run>`. This uses the four saved article IDs to call the existing distribution API and writes `bundle.json`.

6. Write `<run-dir>/visual-evidence.json` after checking the live listing. It must contain `version: 1`, `productUrl`, one or more HTTPS `referenceImages`, matching local `referenceFiles` paths relative to the evidence file, verified `dimensions` and `visibleFeatures`, and four `articles` entries with `themeIndex` 0–3, unique `scene`, and article-specific `visualFocus`; add `variant` when relevant. For craft mode, use verified category reference images and omit product-specific claims. Download and inspect the referenced images; do not pass URLs as text alone to the image tool. The preparation command checks the files and records their hashes. Run `node scripts/prepare-publication.mjs <run-dir>/bundle.json <run-dir>/publication --visual-evidence <run-dir>/visual-evidence.json`, then `node scripts/publication-harness.mjs register --receipt <run-dir>/publication/receipt.json --candidate <run-dir>/candidate.json`. Do not register a second batch while one is active. For each article, record the editorial evidence using `review --receipt ... --index N --source-url <product-or-craft-evidence-url> --note <specific-checks>`. For craft categories, confirm the encyclopedia link is public; if not, replace it with a verified cited source in the reviewed HTML.
7. Generate four different 1536×1024 or larger covers from the article-specific `cover-brief.json` and `cover-prompt.txt`, passing the actual `sourceImageInputs` files to the image tool. Compose four different everyday scenes with distinct activities, camera positions, light, and props. Keep the product recognizable at Journal-card size and physically plausible beside known-scale objects. Never reuse a composition, show an unverified variant, or imply unsupported care or food-contact use. Inspect each image at full size and as a three-column card, comparing silhouette, proportions, rim, foot, pattern, finish, and scale against the actual source images. Reject a candidate if its physical product differs, and generate a correction from the verified source photographs. Put the chosen PNG/JPEG in its article directory and run `cover --receipt ... --index N --path <file> --note <visual-comparison>`. Never use the same cover twice.
8. For each article, query Shopify articles by `handle:<handle>` with `scripts/graphql/article-by-handle.graphql` and confirm the `journal` blog. If an exact article exists, inspect and update it with `article-update.graphql`; otherwise upload the cover with `staged-uploads-create.graphql` and `file-create.graphql`, then create with `article-create.graphql`. Use the reviewed HTML, published status, canonical handle, and Shopify CDN image URL. Check GraphQL `userErrors`. Record the returned article ID and actual URL with `publication-harness.mjs shopify ...`, then run `verify --site shopify ...`. Do not continue to Substack until Shopify is verified.
9. In the authenticated Substack editor, create or resume the exact post. Insert the matching generated cover at the very beginning. Use `substack.txt` subject, subtitle, and body, with a clickable link to the verified Shopify article. Publish **to web only**, with email and Substack app delivery disabled. Inspect the visible public post. Record its actual URL with `publication-harness.mjs substack ...`; then run `verify --site substack ...`. Never infer a URL from a draft title.
10. Run `node scripts/publication-harness.mjs status --receipt <run-dir>/publication/receipt.json`. A batch is complete only when all eight destinations are `verified`. Report all eight actual URLs, the selected product or craft category, cover paths, and any stopped step. Do not report revenue or traffic effects without measurement.

## Invocation and schedule

When the owner says “ブログ4本を1テーマで公開”, run this contract once. A named theme takes priority over automatic candidate ranking; select a live product that supports it and still apply the same evidence and duplicate checks. The daily Codex heartbeat runs this contract once per day and may publish without a new approval. It must remain quiet when there is no eligible product or craft category and no change, and report a completion, failure, or action required. If there are already four active articles for the selected product in either destination, skip it.

The Journal orders cards by publication time. Keep existing posts' dates intact. When a request runs two new four-article themes together and both sets are ready, alternate publication events between the themes so the grid does not show four near-identical products in a row. Check the actual Journal grid afterward. A daily one-theme run still needs four visibly distinct scenes.

No API keys, sessions, or customer data belong in the run directory or Git. The ledger and run artifacts live under ignored `.tmp/publication-harness/`. Preserve them across daily runs; backing up or moving this checkout requires moving that directory too.
