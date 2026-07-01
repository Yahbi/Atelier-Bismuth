# Atelier Bismuth — Design Direction v2 (Restoration Hardware × House of Leon)

> Reconciled from a multi-agent design study (RH + House of Leon references) against the real
> theme files, with an adversarial brand/feasibility critique folded in. The theme is already
> warm, disciplined, and close — what separates it from the references is a handful of
> merchandising tells, over-cropped grids, over-scrimmed photography, and thin fragile type.

## North-star principles (stillness, not "luxury")
1. **Photography is the design.** Stone grain carries the page; type and chrome recede to a whisper. Lead with a cinematic wide angle, lightly overlaid — never veiled in black.
2. **Warmth, never cool grey.** Every neutral leans warm (r−b positive). Body text is soft warm-brown, not near-black. True white is banished from surfaces.
3. **Two voices only.** Display serif at weight 400 — never thin, never bold. Sans for body/nav/micro-labels. No script, no glyphs.
4. **Confident full price, no theatre.** One price, stated plainly. No strikethrough, no "Sale", no scarcity chips. Absence of merchandising is the signal.
5. **Whitespace does the work.** 3-up grids at gallery scale; generous, consistent vertical rhythm; air around few elements.
6. **The accent is one deliberate note.** Warm taupe ≤ 2× per page — ideally once, on Add-to-cart. Icons and prices never spend it.
7. **Sentence-case, museum-label voice.** Headings read like wall text. No forbidden words, no exclamation points, no decorative punctuation.

## Refined tokens (warm; r−b positive)
- **Type weights:** body/lead/display/h1–h4 all **400** (kill the synthetic `360`/`340`/`300` — cross-machine blur is the biggest quality-killer). *Font-family decision (keep Cormorant/Jost vs. move to the CLAUDE.md-locked Fraunces/Inter Tight) needs an ADR + your sign-off — P0 does NOT depend on it.*
- **Display size:** cap at 96px (`clamp(3.5rem,2.4rem+3.5vw,6rem)`), down from 144px.
- **Tracking:** micro-labels `0.12em` (down from 0.22em); nav/buttons `0.08em`.
- **Color:** `--color-ink-soft #564f48` for body (was `#4a463f`); retire true-white surface (verify `--color-surface` stays *darker* than bg so cards still separate — the naive `#faf7f0` inverts figure/ground); hairline quieter `#e0dacd` with a static-hex fallback before any `color-mix()`.
- **Overlay ink:** warm `rgba(30,26,23,·)` everywhere — audit out every cool `rgba(15,13,11,·)`.
- **Motion:** enter 600–900ms, exit 400ms, transform/opacity only, reduced-motion honored; no button hover-lift (tone shift instead).

## P0 — the levers that actually change the "cheap" read (reconciled)
1. **Kill strikethrough sale pricing** (PLP + PDP) → one confident price. `snippets/price.liquid`, `sections/main-product.liquid`, `assets/theme.js`, `base.css:315-316`.
2. **Delete the `Sale` badge** (keep only a whisper-subtle `One of one`, unboxed, no drop-shadow crutch — place below image on surface, not a shadow over photography). `snippets/product-card.liquid:14-21`, `base.css:309`.
3. **Un-veil the hero:** halve the scrim, warm-ink, bottom-only — and seat the headline in a solid lower band (not a text-shadow) so AA holds on any asset. `assets/base.css:289`.
4. **Warm-ink + audit ALL overlays:** replace every `rgba(15,13,11,·)` scrim (tiles, lookbook) with capped warm `rgba(30,26,23,·)`. `base.css` sweep (`:289,:392`, tiles).
5. **Clean collection tiles:** remove the inner second gradient and the arrow glyph; move title/label to a warm-ink caption *under* the photo. `sections/collection-list.liquid:27-32`.
6. **Grids 4-up → 3-up** at gallery scale — via the **section schema default**, not a class literal (docs/ is only the static preview). `main-collection`/`featured-collection` schema + `docs/index.html`.
7. **Kill synthetic font-weights → 400** (body/lead/display). Confirm which Cormorant weights ship and subset to stay ≤100KB font budget. `base.css:72,89-94`.
8. **Remove iridescent decorative gradients** (hard doctrine violation, CI-fail today). `base.css:29,199-213,428`.

## P1 (polish, after P0)
Collapse the double-row header to one elegant row + drop the "TRAVERTINE · NATURAL STONE" tagline; remove the marquee `✦` glyph (→ plain spacer); soften body to `--color-ink-soft`; introduce one wide editorial (3/2) band for rhythm; merge the two product carousels into one "Featured" row; sentence-case + strip interpuncts in nav/eyebrows ("New Arrivals" → "New arrivals"); de-accent the trust row (icons → words); quiet hairlines; tighten hero copy to museum-label restraint ("Furniture and objects cut from solid stone, finished by hand.").

## Three essentials the study almost missed (from the critique)
- **PDP three tactile layers (CLAUDE.md non-negotiable #5):** a real **zoomable texture viewer** at touchable grain resolution, multi-angle carousel, and a **provenance block** (quarry origin · finish technique · sustainability · care). "env-3 detail" alone is not enough — this is the brand's actual differentiator and the strongest anti-RH-sameness move.
- **Mobile-first as a first-class track:** specify the collapse (3-up → 1–2-up at gallery scale, ≥44px targets, filter rail → bottom sheet) and the mobile CWV budget — the theme is judged on mobile Lighthouse ≥95.
- **Maker/provenance trust layer:** beyond a review count — "made in Los Angeles", lead-time, finish-technique captions, care. Trust-the-maker is the promise.

## Image role map (degrade gracefully — most SKUs still have only raw Etsy JPGs)
- **env-1 (wide):** hero, collection tiles, lookbook, editorial bands.
- **env-2 (three-quarter):** product-card primary + hover.
- **env-3 (detail):** PDP texture viewer + card hover-reveal.
- If env-2/env-3 are missing for a SKU, fall back to the single available crop and flag it — never ship an empty slot.

## The single biggest lever
**Kill the discount grammar and let the photography breathe.** A struck-through `$4,099 → $3,484.15` under a `Sale` chip is outlet language; a 62%-black scrim over a 4-up thumbnail grid buries the one asset — touchable stone grain — the whole brand is built on. Fix pricing to a single confident number, drop grids to 3-up, halve/warm the scrim. Same files, instantly gallery-catalogue instead of marketplace. Type weight and warmth are the polish; this is the transformation.

## Open decisions (need sign-off)
1. **Font stack:** keep Cormorant Garamond/Jost (matches House of Leon, already built) **or** move to the CLAUDE.md-locked Fraunces/Inter Tight → log an ADR either way.
2. **Publish** the custom theme to replace the live Balance demo.
