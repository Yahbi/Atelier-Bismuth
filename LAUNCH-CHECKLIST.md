# Atelier Bismuth — Launch Checklist

Status as of 2026-06-29. Full findings: `docs/AUDIT-2026-06-29.md`. Pricing audit trail: `tools/RECONCILIATION.md`.

The store is close. Pricing is solid (live variants match the gathered Etsy data, no $0.00),
the theme has no Liquid errors, the homepage matches the `/docs` reference, and collections/nav
are clean. What remains is a short list of code/data fixes (mostly done or staged) plus
admin/legal steps only the store owner can do in Shopify.

---

## ✅ Done this session (committed + pushed)
- **Pricing re-verified vs Etsy** and 57 diverged variants corrected (Charcoal Pedestal flat
  $300/$350 → real $479–$1,699; duplicate Floating-Shelves grid; Onyx Bookend).
- **PDP dimensions now render** — `snippets/dimensions.liquid` reads the real `specs.dimensions`
  string (products store it as one field, not per-axis keys). Fixes the empty "Dimensions" accordion + cards.
- **Brand fonts locked** — removed the font-picker settings that defaulted to "Assistant" and
  overrode Cormorant Garamond / Jost (`config/settings_schema.json`).

## 📦 Staged, ready to apply (blocked only by Shopify connector approval)
These are computed and verified; they apply in seconds once the Admin API is reachable again:
- **9 shelf prices** — Width-48 dips on 3 chiseled shelves → W46↔W50 midpoints ($1749/$1849/$1949).
- **2 Charcoal cells** — 18″/20″ × 6×6 ($280/$290 artifacts) → ~$478 (monotonic). See `tools/staged/surgical_log.txt`.
- **12 title light-cleanups** — strip trailing "- GIFT" etc., handles unchanged. See `tools/staged/titles_before_after.txt`.

## ⏳ Pending (needs Admin API; not yet stageable offline)
- **Alt text** for ~70 active products (seed from title + material).
- **Description cleanup + light polish** — remove "just message me", baked-in freight $ figures,
  the "in included" typo, emoji; tighten tone.
- **Deploy** the two changed theme files to the unpublished theme via `themeFilesUpsert`.

> To unblock: re-authorize / approve the **Shopify** connector for this session (its tool calls are
> currently returning "requires approval"). Then the staged items above can be applied immediately.

---

## 👤 Owner actions (Shopify admin — cannot be automated)
1. **Rename store** "My Store" → **"Atelier Bismuth"** (Settings → Store details). Leaks into page
   titles, footer copyright, JSON-LD, and the privacy policy.
2. **Add policies** — Refund/Return, Shipping, Terms of Service (Settings → Policies). Fill the
   Privacy-policy template `{{ placeholders }}`. Write a real freight/lead-time/damage policy for
   heavy stone (items up to ~$19,900).
3. **Create footer menus** (Online Store → Navigation): `footer-shop`, `footer-atelier`, optional
   `footer-legal` — currently both footer columns collapse to one fallback link.
4. **Decide the 27 UNLISTED products** (143 variants) — activate for launch or confirm held back.
5. **Furniture dropdown** — add "Fireplaces"; **remove** the two default collections
   (`frontpage`, `imported-products`).
6. **Review source-faithful Etsy price dips** (`tools/staged/etsy_sourced_dips_for_david.txt`) — a
   few sizes are priced out of order on Etsy itself (e.g. some shelves 26″>28″). Left untouched to
   stay faithful to Etsy; decide if you want them smoothed.
7. **Visible sale?** — currently no strike-through (the 15% is baked into the price as the regular
   price). If you want a "was/now" sale, set compare-at prices. (You chose: no visible sale.)
8. **PUBLISH the Atelier-Bismuth theme — LAST, after the above QA.** Today the public still sees the
   stock "Balance" theme; none of this work is visible until you publish.
