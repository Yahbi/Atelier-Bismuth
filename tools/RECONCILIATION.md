# Etsy → Shopify Reconciliation

Source of truth: full Etsy scrape (`tools/etsy-full-export.json`, 106 listings,
`tools/etsy-variations.csv`, `tools/etsy-scrape-report.md`). The original Shopify
build is kept; this pass fills in what was missing.

## DONE — Per-size / per-dimension pricing
- Etsy runs a shop-wide **15% sale**; scraped prices ÷ 0.85 = true regular prices.
- Applied **regular per-variant prices** to **56 products / 692 variants** via
  `productVariantsBulkUpdate`. Verified live (mirror 30×15″ $849 vs 35×18″ $999;
  pedestal 10″ $400 / 12″ $419 / 14″ $459 …).
- Prices keyed by normalized option values; each Shopify variant matched to exactly
  one Etsy offering (duplicate listing→product collisions de-duplicated).

## STILL MISSING — needs decision / rebuild (not auto-applied to avoid wrong data)

### A. New Etsy listings with NO Shopify product yet (create these)
- Chiseled Travertine fireplace hearth — Natural Stone hearth (listing 4521569087)
- Natural Travertine Solid Stone gas fire pit (4522561625)
- Natural Travertine Solid Stone Wine Bottle Rack (4521582919)
- Travertine fountain Column — Sculpture Stand (4525322505)
- Chiseled Travertine live edge floating shelf (1728210256)
- Long Slim 16" Wood Wall Pocket w/ Preserved Eucalyptus (1777447210)
- Universal Mounting Plates (1465640657)

### B. Structurally diverged (Etsy variation structure ≠ Shopify)
- `travertine-pedestal-column-sculpture-stand-plinth-monolith-solid-stone-block`
  Etsy now: **Color × Size (e.g. 10x10x20)**; Shopify: Width × Height. Needs variant rebuild.
- `travertine-stone-console-table-desk-tv-stand` Etsy adds a **face-finish** dimension + 70″ width.
- A few products where Etsy lists **extra large sizes** Shopify doesn't carry (left at base price).

### C. Data gaps from the scrape (public Etsy pages don't expose these)
- **Per-variant SKUs** — not public; use seller export `Variant SKU`.
- **Per-variant quantity** — not public; only in-stock/out captured.
- **Materials** missing on 17 listings (seller never filled Etsy's Materials field).
- **Tags** not shown publicly.

### D. Not started yet
- **Reviews** — a separate reviews scrape is needed to replace the homepage carousel placeholders.
- **Full descriptions** — captured in `etsy-full-export.json` (`description`), can be pushed to refresh any truncated copy.
