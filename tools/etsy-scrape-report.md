# Etsy Full Export — Scrape Report

- Shop: **AtelierBismuth**
- Listings found (shop pagination + seed): **106**
- Listings captured: **106**
- Listings NOT captured: **0**
- Total priced variation rows captured: **1089**
- Listings with per-variation price differences (size etc.): **70**
- Listings with 2 variation dimensions: **28** (of which 19 had true combination pricing read by driving dropdowns)
- Listings without a confident handle match: **2**

## Data gaps to fill manually

These are fields the public Etsy page did not expose for specific listings (left empty, never fabricated).

### Listings with no Materials on the page (17)
_The seller did not fill Etsy's Materials attribute; it appears nowhere on the page. Add from your records / seller CSV._

- 1808816451 — Beige Limestone Bath Tray - Chiseled Edge Meditation Shelf
- 4497269117 — Carved Pedestal Column - Shou sugi ban Wood Plinth - Monolith - S
- 1728210256 — Chiseled Travertine live edge floating shelf - Natural Stone Shel
- 4466332652 — Custom order for Candice
- 4459676740 — Custom order for Shannon
- 4508863251 — Custom order for Tammy
- 4378268884 — Live Edge Wood Floating Shelf: Shou Sugi Ban Charred wood
- 4506437473 — Marble and Onyx fountain trio - monolith fountain with rough face
- 1788036690 — Shell Limestone floating shelf with chiseled edges. natural stone
- 4522053872 — Travertine Pedestal Column - Sculpture Stand - Plinth - Monolith 
- 4518397100 — Travertine coffee table - Natural Stone Table
- 4513989337 — Travertine stone console table with Chiseled Raw Edge - Desk - TV
- 4521533501 — Travertine stone side table with Chiseled Raw Edge - Pedestal
- 1465640657 — Universal Mounting Plates
- 4298534985 — Utah green accent stone boulder.  This pieces is beautifull and w
- 4384111780 — White marble floating shelf with chiseled edges - Sandblast finis
- 1783609272 — travertine floating shelves, custom natural travertine chiseled S

### Listings with no images (3)
_These are 'Custom order for …' private listings, which have no public photos._

- 4466332652 — Custom order for Candice
- 4459676740 — Custom order for Shannon
- 4508863251 — Custom order for Tammy

### Other parse issues (0)
_None._

## Listings without a confident Shopify handle (match manually)

_Newly listed on Etsy since your Shopify import — no handle exists yet._

- 1777447210 — Long Slim 16 Inch Wood Wall Pocket with Preserved Eucalyptus (unsure:0.11)
- 1465640657 — Universal Mounting Plates (unsure:0.00)

## Known public-page limitations (apply to ALL listings)

- Per-variation **SKUs** are not exposed on public Etsy listing pages; the `sku` column is blank for variation rows (and falls back to the JSON-LD value — which Etsy sets to the listing_id — for no-variation rows). Real SKUs live in your seller export (`Variant SKU` in products_shopify_import.csv).
- Per-variation **quantity** is not exposed publicly; the JSON-LD `availability` (InStock/OutOfStock) is captured per listing instead. Variation `availability` is recorded (available/unavailable) where Etsy disables a combination.
- Seller **tags** are not shown on public listing pages (`tags` empty for all; use your seller export's `Tags` column).
- Per-variation **prices** are taken from the option label when Etsy embeds them there, or read from the live rendered buy-box DOM by selecting each dropdown combination (the `price_source` field per offering records which method was used).