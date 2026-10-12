# Journal work report — 2026-10-12

## Verified maintenance

- Updated the existing article [Can You Use Lacquerware Bowls Every Day?](https://modernjapancrafts.com/blogs/journal/can-you-use-lacquerware-bowls-every-day-understanding-durability-and-care) at its original URL.
- Replaced blanket hand-washing and unsupported temperature, durability, sustainability, and repair claims with item-specific guidance and direct product evidence.
- Shopify Admin readback retained `publishedAt: 2025-11-08T11:00:10Z`. The public URL returned HTTP 200 and displayed the new guidance. The before/after body hashes and proof times are in [the work history](journal-work-history.md).
- Updated [Can You Use Japanese Tableware in the Microwave or Dishwasher?](https://modernjapancrafts.com/blogs/journal/can-you-use-japanese-tableware-in-the-microwave-or-dishwasher-what-to-know-before-using-japanese-dis) at its original URL. Replaced blanket material rules and broken reference links with four current product examples and separate microwave and dishwasher guidance. Edited the body and summary only.
- Admin readback retained its original `publishedAt: 2026-02-10T11:00:31Z`, ID, handle, and image URL. The public URL returned HTTP 200, showed the new guidance, and no longer showed the old blanket claim or broken reference. The hashes and proof times are in [the work history](journal-work-history.md).

## New article queue — prepared, not published

| Theme                             | Source product                                                                                                            | Reviewed English articles | Cover state                                                    | Shopify state                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------: | -------------------------------------------------------------- | ---------------------------------------------------- |
| Climbing Peacock Makie Flat Plate | [Product listing](https://modernjapancrafts.com/products/climbing-peacock-makie-flat-plate-dishwasher-safe-lacquer-glass) |                         4 | Lifestyle briefs and source photos ready; images not generated | Unregistered receipt; no public article              |
| Gold & Silver Dragon Wooden Cup   | [Product listing](https://modernjapancrafts.com/products/gold-silver-dragon-wooden-cup-japanese-lacquerware-kiri-box)     |                         4 | Lifestyle briefs and source photos ready; images not generated | Unregistered receipt; no public article              |
| Gold Leaf Perfume Spray Bottle    | [Product listing](https://modernjapancrafts.com/products/gold-leaf-perfume-spray-bottle-10ml-japanese-urushi-lacquer)     |                         4 | Lifestyle briefs and source photos ready; images not generated | Unregistered Shopify-only receipt; no public article |

The original Claude-backed generator produced four articles per product. Editorial review removed unsupported history, chemistry, care, refill, and superiority claims. Three product themes now have twelve reviewed HTML bodies, source photos, and unregistered receipts in the ignored local run directory under `.tmp/publication-harness/runs/2026-10-12-*` in the original checkout. The perfume-bottle titles were also rewritten to describe four distinct reader questions. A draft seeded order for all twelve passes adjacent product, lifestyle scene, and editorial angle checks. The final publication plan will be saved only after all covers pass visual review. Public URLs will be recorded only after live readback.

The optional Substack distribution call for the perfume-bottle theme returned HTTP 422 (`Failed to parse distribution content from Claude`). The Shopify-only bundle was prepared from the reviewed copy without that call. Its failed distribution checkpoint remains in the ignored run directory for later reconciliation if Substack is requested.

## Current publication gate

The built-in image generation tool is unavailable in this session. The owner approved proceeding with the image API CLI, but this host has no `OPENAI_API_KEY`, and the supplied `ENV.md` is unrelated to image generation. The image skill requires the key for CLI fallback. Twelve covers, three-theme Shopify registration, publication, and public verification remain pending. Both text-only maintenance corrections are already public and verified; they do not depend on the image key.
