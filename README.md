# Atelier Bismuth — Luxury Storefront

A bespoke, high-end storefront for **Atelier Bismuth** — sculptural **travertine & natural-stone**
furniture and objects (consoles, pedestals, pebble mirrors, fountains, basins, hearths).
Design language inspired by House of Leon: warm stone palette, editorial typography,
generous whitespace, slow reveals — built to match the brand's premium price point.

This repository contains two things:

1. **A production Shopify theme** (Online Store 2.0 / Liquid) — the real store.
2. **A static design preview** (`/docs`) — so you can *visualize and judge the site before
   we go live*, served as a plain GitHub Pages link or opened locally. No Shopify account needed.

---

## 1. See the design now (preview)

The preview is a self-contained static build of the exact theme design, with the real
travertine identity, real products & prices, and the full product-page layout.

### Option A — local (instant)
```bash
# from the repo root
python3 -m http.server 8080 --directory docs
# then open http://localhost:8080
```
Or just open `docs/index.html` directly in your browser.

### Option B — GitHub Pages (shareable link)
1. Push this branch (done — see the PR).
2. Repo **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: `claude/atelier-bismuth-shopify-8msznm` (or `main` after merge), folder **`/docs`**
3. Save. The site publishes at **`https://yahbi.github.io/atelier-bismuth/`**.

Preview pages: `docs/index.html` (home) and `docs/product.html` (product detail with the
full dimensions/specifications experience). Both render from `docs/catalog.js`
(`window.AB_CATALOG`) — `product.html?handle=<handle>` shows any piece. Regenerate that file
from an Etsy export with `node tools/build-preview.js` (then `node tools/build-standalone.js`
to refresh the single-file bundles).

> Until the real export is loaded, the preview ships with an 8-piece seed and placeholder
> stone texture. Real Atelier Bismuth photography (the `i.etsystatic.com` URLs from the export)
> drops straight into the same slots — see §3.

---

## 2. The Shopify theme

Standard OS 2.0 structure: `assets/ config/ layout/ locales/ sections/ snippets/ templates/`.

Highlights:
- **Homepage** (`templates/index.json`): hero, collection tiles (Furniture / Pedestals / Decor),
  featured products, atelier story, marquee, values, lookbook, testimonial, newsletter.
- **Product page** (`sections/main-product.liquid`): gallery, variant pills, async add-to-cart,
  and a **dimensions & specifications table** plus materials / care / shipping accordions.
- **Collection, list, cart (+ drawer), search, 404, page, about** templates all included.
- Fully theme-editor friendly — every section has a `{% schema %}` with settings & presets.

### Deploy the theme to a store
```bash
npm i -g @shopify/cli @shopify/theme
shopify theme dev    # local preview against a store
shopify theme push   # upload to the store
```
(Requires the store to be on an active plan — see Notes.)

### Dimensions = metafields
Every measurement renders from product metafields in the **`specs`** namespace
(`width, depth, height, diameter, seat_height, weight, materials, finish, wood,
upholstery, edition, origin, lead_time, care, sustainability`). Create these as
product metafield definitions in Shopify (Settings → Custom data → Products), or let
the import CSV (§3) carry them. If none are set, the product page shows a graceful
"dimensions on request" fallback.

---

## 3. Bringing the Etsy catalog in

> **Why there's a script instead of an auto-scrape:** this build runs in an isolated cloud
> container whose network policy blocks `etsy.com` at the gateway, so nothing server-side
> here can read the shop. Your own browser *can*. The script below runs in your browser and
> does the capture; Shopify then fetches the images server-side at import time.

**Step 1 — export from Etsy (your browser).**
Open your shop in Chrome, open the DevTools console, paste `tools/etsy-export.js`, run it.
It walks every page + listing and downloads `atelier-bismuth-etsy.json` (titles, prices,
descriptions, full-res image URLs) + `atelier-bismuth-images.txt`.

**Step 2 — build the Shopify import.**
```bash
node tools/build-catalog.js atelier-bismuth-etsy.json
# → tools/products_shopify_import.csv
```
The builder maps each item to collections (Furniture, Pedestals, Mirrors, Fountains, Bath,
Fireplaces, Home Decor), parses dimensions into `specs.*` metafields, and puts the Etsy
image URLs in `Image Src`.

**Step 3 — import to Shopify.**
Products → Import → upload the CSV. Shopify pulls the images directly from Etsy. Review the
drafts, then publish. Done — the whole Etsy catalog, in your luxury store.

> Run `node tools/build-catalog.js` with no argument to generate a seed CSV from the 12
> pieces currently visible on the shop, so you can see the format immediately.

---

## Notes / status
- **Shopify Admin API for the connected store currently returns a billing/plan error**
  (`operation_not_allowed`). Resolve the plan/billing to let the theme push and the Etsy
  import run live.
- The preview palette and copy reflect the true brand: **travertine / natural stone**, not the
  earlier placeholder assumption.
- Prices in the seed data mirror the running Etsy 15% sale (price = discounted,
  compare-at = original). Adjust to taste.

## Structure
```
assets/        base.css (design system), theme.js
config/        settings_schema.json, settings_data.json
layout/        theme.liquid
locales/       en.default.json
sections/      header, footer, hero, product, collection, etc. (+ section groups)
snippets/      product-card, price, dimensions, cart-drawer, icon, meta-tags
templates/     index, product, collection, list-collections, cart, page, page.about, search, 404
docs/          static design preview (GitHub Pages)
tools/         etsy-export.js (browser capture), build-catalog.js (CSV builder)
```
