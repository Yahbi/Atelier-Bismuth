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

---

## UPDATE — New products created + verification

### Created 5 new products (David's listings missing from Shopify)
All ACTIVE, with full per-size variants, regular prices (Etsy sale-adjusted),
all images (READY on CDN), and correct collection tags:
| Product | Variants | From price |
|---|---|---|
| Natural Travertine Gas Fire Pit | 2 (Shape) | $12,990 |
| Chiseled Travertine Fireplace Hearth | 15 (W×D) | $3,900 |
| Travertine Wine Bottle Rack | 3 (Width) | $9,900 |
| Travertine Fountain Column | 44 (Color×Height) | $899 |
| Chiseled Travertine Live-Edge Floating Shelf | 24 (W×D) | $390 |

Tagged into Furniture / Objects & Decor / New Arrivals / Fireplaces / Shelves /
Fountains (smart collections auto-populate).

### Correctly SKIPPED (not David's shop)
The scrape's "related listings" noise — verified by Etsy shop id on the images:
- "Long Slim 16" Wood Wall Pocket" — shop 24669047 (not David's)
- "Universal Mounting Plates" — shop 29049809 (not David's)

### Descriptions
Spot-checked: existing Shopify descriptions are already full/complete from the
original import. No refresh needed.

## STILL OPEN (need David's input — not auto-applied)
1. **2 diverged products** — Etsy changed the variation structure vs the Shopify
   import (pedestal now Color×Size; one console gained a face-finish option).
   Rebuilding deletes existing variants, and the "right" structure is a judgment
   call — left as-is pending David's decision.
2. **Reviews** — need the reviews scrape to replace homepage carousel placeholders.
3. **SKUs / per-variant quantities / materials (17 listings)** — not on public Etsy
   pages; need David's Etsy seller CSV (Shop Manager → Settings → Download Data).

---

## UPDATE — Pricing & size availability fix

### Extra sizes (sizes the site offers beyond Etsy's ~71-variation cap)
Kept all sizes; **corrected 153 variant prices** across 15 products. Method:
fit each product's additive per-size price pattern from Etsy's data, then price
the extra (larger) sizes by extending David's own boundary rate (e.g. shelves
+$100 per 2″ width; pedestals +$100 per 2″). Validated: residual < $1.50 on the
fitted points; no absurd values (range $370–$2,699). Applied via
productVariantsBulkUpdate.

### Missing sizes (Etsy offers, site lacked)
Added **8 variants** at exact Etsy regular prices:
- Seashell pedestal: +14″ ($520)
- Travertine front desk: +50″ ($9,900), +60″ ($10,900)
- Travertine pedestal (plinth/monolith): +34–42″ ($1,399–$1,799)

### Deliberately NOT changed (need David)
- **Diverged structure** (Etsy variation set differs from the import) — need a rebuild decision:
  - Pedestal "sculpture-stand…solid-stone-block": Etsy now **Color × Size** (68 combos) vs site Width × Height
  - Coffee table: Etsy adds a Height dimension
  - TV-stand console: Etsy adds a **face-finish** dimension (+70″)
- **Ambiguous pricing** (no reliable pattern): jewelry-stand styles G/H, vanity "+walnut" option, boulder-bed sizes

---

## UPDATE — Display verification ("is pricing/sizes showing everywhere?")

**Theme:** product template renders price, sale strikethrough, a size pill for
every option value, sold-out state, and a JS variant map (price updates on size
select). Collection cards show price. ✅

**Data audit (live, all ~104 products):**
- No $0 / empty prices anywhere; every product has ≥1 priced variant. ✅
- Fixed one more flat shelf found in the audit:
  `chiseled-travertine-floating-shelf…invisible-shelf` (76 sizes) → now $549–$2,599
  (matched its Etsy listing, 0.99 confidence).

**Still flat (ambiguous near-duplicate products — need David to confirm the Etsy
source before pricing; flat is safer than a wrong guess):**
- `chiseled-travertine-floating-shelf…invisible-shelves` (24 @ $390)
- `travertine-pedestal-column-plinth-monolith-solid-stone-block` (14 @ $380)
- `marble-pedestal-column-sculpture-stand-plinth-monolith-solid-stone-block` (13 @ $380)
- `limestone-coffee-table-stone-table` (3 @ $3,799)
- `handcrafted-limestone-floating-shelf-chiseled-edge` (6 @ $330, unlisted)
