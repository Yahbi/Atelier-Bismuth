# Atelier Bismuth — project state & handoff

> Read this first in any new session, then continue. Active work branch is
> `claude/atelier-bismuth-etsy-catalog-miwrnm` (forked from, and identical history
> to, `claude/atelier-bismuth-shopify-8msznm`).

## What we're building
A luxury e-commerce experience for **Atelier Bismuth** (House-of-Leon-level):
1. A bespoke **Shopify Online Store 2.0 theme** (the production storefront).
2. A **static preview** in `/docs` (+ standalone HTML) so the design can be
   reviewed from a link before the Shopify store is live.

## Brand identity (confirmed from the live Etsy shop)
- **Atelier Bismuth** — sculptural **travertine / natural-stone** furniture & decor.
- Los Angeles, CA · **11 years on Etsy** · **5.0★ (64 reviews)** · **445 sales** · 464 admirers.
- **101 items.** Logo = serif **“AB” monogram**. Banner = travertine coffee table + linen sofa, warm minimalist room.
- Categories seen: Furniture, Pedestals (16), table (18), Shelf (15), fountain (6),
  mirror (2), Plate (9), Bookend (2). Pieces: console tables, desks, pedestals/columns,
  pebble mirrors, fountains, bathtubs/basins, fireplace hearths, wine holders.
- Pricing is high-end ($300–$17k); a running **15% sale** (price = discounted, compare-at = original).
- Palette: warm bone/oat/travertine; serif display (Cormorant) + clean sans (Jost). NOT iridescent.

## What's built (in this repo)
- Shopify theme: `layout/ config/ locales/ sections/ snippets/ templates/`
  - Homepage (`templates/index.json`), product (`main-product.liquid`, full dimensions via
    `specs` metafields), collection, list-collections, cart, page, about, search, 404.
  - Header/footer section groups, cart drawer, reveal animations, variant logic.
- Static preview: `docs/index.html`, `docs/product.html` (+ `base.css`, `theme.js`, `.nojekyll`).
  - **Data-driven:** both pages render from `docs/catalog.js` (`window.AB_CATALOG`).
    Home shows the first 8 as featured cards; `product.html?handle=<handle>` renders
    any piece (gallery, full spec table, related). Falls back to textured placeholders
    when a piece has no images.
- Standalone (double-click) bundles: `atelier-bismuth-home.html`, `atelier-bismuth-product.html`
  (inline `catalog.js` + `base.css` + `theme.js`).
- Tools:
  - `tools/etsy-export.js` — browser-console exporter (run on etsy.com).
  - `tools/build-preview.js` — Etsy JSON → `docs/catalog.js` (parses dims w/ units, maps
    collections, embeds etsystatic image URLs). **Run this to load the catalog into the preview.**
  - `tools/build-catalog.js` — Etsy JSON → `tools/products_shopify_import.csv` (Shopify import).
  - `tools/build-standalone.js` — bundles `/docs` into single-file HTML.
  - `tools/atelier-bismuth-etsy.seed.json` — 8-piece seed (interim fallback until the real export lands).
- `.github/workflows/pages.yml` — manual Pages deploy. Root `index.html` redirects to `/docs`.

## Environment constraints (important)
- **Cloud Claude Code sessions cannot reach `etsy.com`** (egress policy blocks it) and have no browser.
  → To browse/scrape Etsy, run **Claude Code locally** with the Playwright MCP (see `SETUP-LOCAL.md`).
- **Etsy actively blocks automation** (bot-detection page), even from a real machine.
  → Scrape **gently**: reuse collected listing URLs, one at a time, 5–8s randomized delay, save incrementally.

## Data pipeline
Local session (Playwright) scrapes the shop → `tools/atelier-bismuth-etsy.json`, then:
- **Preview:** `node tools/build-preview.js` → `docs/catalog.js`, then
  `node tools/build-standalone.js` → rebuilt single-file bundles.
- **Shopify:** `node tools/build-catalog.js tools/atelier-bismuth-etsy.json` → `products_shopify_import.csv`.

Images stay as `i.etsystatic.com` URLs (…`il_fullxfull`…); viewers' browsers render them on the
preview, and Shopify fetches them server-side at CSV import.

> **Note (this session's environment):** general outbound is still blocked — only GitHub +
> package registries are allowlisted; `example.com`, Google, `i.etsystatic.com`, and even
> `*.github.io` return errors from the proxy. So the real scrape must run **locally** and be
> pushed; this box can't reach Etsy or self-verify the live Pages render (uses the GitHub API instead).

## Next steps
1. Finish the gentle Etsy scrape → `tools/atelier-bismuth-etsy.json` (commit it).
2. Load the real catalog into the preview: `node tools/build-preview.js` (writes `docs/catalog.js`),
   then `node tools/build-standalone.js` (rebuilds the bundles). No HTML edits needed — the
   pages are data-driven. Shopify theme reads products from the store dynamically.
3. Push; review at `https://yahbi.github.io/Atelier-Bismuth/`.
   **Pages must be enabled first:** Settings → Pages → Source → **GitHub Actions** (the `pages.yml`
   workflow uses the Actions deploy path; its first run failed only because Pages wasn't enabled).
4. When the Shopify store's API is active, import `products_shopify_import.csv` and set up
   the metafield definitions (namespace `specs`: width, depth, height, diameter, weight,
   materials, finish, edition, origin, lead_time, care).

## To get the live preview link
Repo **Settings → Pages → Deploy from a branch → `claude/atelier-bismuth-shopify-8msznm` → `/docs`**.
→ Publishes at `https://yahbi.github.io/Atelier-Bismuth/`.
