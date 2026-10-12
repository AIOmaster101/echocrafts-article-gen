# Four-article publication workflow

This workflow keeps the existing extract, score, article, translation, and distribution APIs unchanged. The local `generate-publication-batch.mjs` script creates a four-article bundle after all four English articles and Substack distribution bodies exist.

## Prepare

1. Select one live Shopify product and preserve its canonical product URL and reference photographs.
2. Generate four articles through the existing application flow. Check all product claims, dates, measurements, safety statements, and comparisons against the product page and cited sources. Edit publication copies when generated text exceeds the evidence.
3. Generate the four Substack distribution bodies through the existing content distribution panel.
4. Run `node scripts/generate-publication-batch.mjs bundle --run-dir <run-dir>` to save the publication bundle after the generation and editorial review steps in [daily-publication-harness.md](daily-publication-harness.md).
5. Record verified source image URLs, downloaded local image paths, dimensions, visible features, and four distinct lifestyle scenes in `visual-evidence.json` as described in [daily-publication-harness.md](daily-publication-harness.md). Run `node scripts/prepare-publication.mjs <bundle.json> <new-output-dir> --visual-evidence <visual-evidence.json>`. This creates a separate directory for each article, a cover brief and prompt, and `receipt.json`.

## Images

Create one lifestyle image per article using the actual Shopify product photographs as image inputs. Preserve the object shape, finish, color, and measured scale. Use four distinct everyday scenes with a restrained editorial style. Review each generated image against the product references and the set as a Journal grid. Save each final image in its article directory. Use the image as the Shopify article cover and place it at the beginning of the Substack post. Do not represent a synthetic detail as an exact product feature. See [cover-refresh-plan.md](cover-refresh-plan.md) for the visual standard.

## Shopify

The destination is the `journal` blog on `xffvf7-e1.myshopify.com`. Before creating each article, search the Journal for its intended handle and title. If an article already exists, compare it and update that record instead of creating a duplicate. Upload the reviewed image to Shopify Files, then attach its Shopify CDN URL as the article image. Use the reviewed `shopify.html` as the body. Publish and verify the actual public URL, heading, body, image, and product link. Record the Shopify article ID, URL, and verification time in `receipt.json`.

## Substack

The destination is `modernjapancrafts.substack.com`. Use the reviewed `substack.txt` subject, subtitle, and body. Insert the corresponding generated image at the very beginning of the post. Link to the verified Shopify article URL. Check the audience and email delivery setting before publication. If email delivery cannot be scheduled with a clear interval, publish to the web only. Verify the actual URL and first image in the public post. Record the URL, verification time, and whether an email was sent in `receipt.json`.

Substack's [official MCP](https://support.substack.com/hc/en-us/articles/50834026608916-How-to-connect-Substack-to-your-AI-Assistant) is read-only and cannot publish posts. Its [publishing guide](https://support.substack.com/hc/en-us/articles/360037831771-How-do-I-publish-a-new-post-on-Substack) describes the editor and the email delivery option. Do not use an undocumented write endpoint for this workflow.

## Resume

The receipt tracks Shopify and Substack independently for every source article. After a partial failure, inspect the live destination before retrying. A predicted Substack URL is not proof of publication. Complete the receipt only after public verification.

The completed 2026-10-04 run is documented in [publication-run-2026-10-04.md](publication-run-2026-10-04.md).
