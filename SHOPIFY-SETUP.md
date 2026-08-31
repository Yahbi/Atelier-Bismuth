# Connect Atelier Bismuth to Shopify

Everything is prepared. This is the full runbook to take the store live.
Generate the import file any time with: `node tools/build-shopify.js`

---

## 0. Activate the store + reconnect the API
- The connected Shopify store previously returned **"unavailable for API access"** (a
  billing/plan issue). Make sure the store is on an **active paid plan** (Settings → Plan).
- The Shopify connection in this assistant **expired** — reconnect it (re-authorize the
  Shopify app/MCP) so the assistant can create collections, menus, and push the theme for you.

## 1. Import the products  (`tools/products_shopify_import.csv`)
- Shopify admin → **Products → Import → Add file** → upload the CSV → **Upload and continue**.
- 101 products · ~1,282 size variants · all import as **Draft** (review before publishing).
- Shopify fetches the **images from Etsy's CDN** automatically during import (no manual upload).
- Pricing: each variant carries the sale price + the **compare-at** (the 15% strike-through).
  Per-size price differences aren't in Etsy's export — adjust per-variant prices if needed.

## 2. Create the metafield definitions (so specs show on product pages)
Settings → **Custom data → Products → Add definition**, namespace.key + type:
| Namespace.key | Type | Name |
|---|---|---|
| `specs.dimensions` | Single line text | Dimensions |
| `specs.materials` | Single line text | Materials |
| `specs.finish` | Single line text | Finish |
| `specs.edition` | Single line text | Edition |
| `specs.lead_time` | Single line text | Lead time |
| `specs.care` | Multi-line text | Care |
| `specs.origin` | Single line text | Made in |
The CSV already fills these values; the definitions make them visible/editable. The theme's
product page renders them (`snippets/dimensions.liquid`).

## 3. Create the collections (smart, by tag — auto-populating)
Products → Collections → **Create collection** → *Smart* → condition **Product tag is equal to …**

**Top level (nav):**
- Furniture → tag `Furniture`
- Objects & Decor → tag `Objects & Decor`
- New Arrivals → tag `New Arrivals`
- Best Sellers → tag `Best Sellers`

**Sub-groups (for the category sub-sections):**
Tables & Consoles · Pedestals · Shelves · Baths & Vanities · Fireplaces · Benches ·
Mirrors · Fountains · Candle Holders · Book Ends · Plates & Trays · Objects
→ each a smart collection on its matching tag.

## 4. Navigation menu
Online Store → Navigation → **Main menu**:
- Furniture → `/collections/furniture`
- Objects & Decor → `/collections/objects-decor`
- New Arrivals → `/collections/new-arrivals`
- Best Sellers → `/collections/best-sellers`
- Collection → `/collections/all`

## 5. Deploy the theme (this repo)
The bespoke Online Store 2.0 theme lives at the repo root (`layout/ sections/ templates/ …`).
- **Option A — GitHub (recommended):** Online Store → Themes → Add theme → **Connect from GitHub**
  → repo `Yahbi/Atelier-Bismuth`, branch `claude/atelier-bismuth-shopify-8msznm` → **Publish**.
- **Option B — Shopify CLI:** from the repo root: `shopify theme push` (after `shopify login --store <your-store>`).

## 6. Go live
- Bulk-select products → **Set as Active**.
- Publish the theme.
- Set the theme header menu = Main menu; set Furniture/Pedestals/Decor collection images.

---

### Want it done for you?
Once the Shopify connection is reconnected here, the assistant can do **steps 2–4 and 5**
automatically via the API (create the metafield definitions, smart collections, the menu,
and push the theme to an unpublished copy for you to preview, then publish).
