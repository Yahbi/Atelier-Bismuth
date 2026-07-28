#!/usr/bin/env python3
"""Generate a faithful, self-contained homepage preview of the Atelier Bismuth theme.
Uses the theme's real design tokens (assets/base.css), the real homepage copy
(templates/index.json), inlined brand fonts, and live product names/prices.
Product photography is replaced by art-directed CSS stone panels (the proxy blocks
the real CDN images; they render on the live store)."""
import json, os

S="/tmp/claude-0/-home-user-Atelier-Bismuth/890403cf-6132-5fc3-8834-c6722cfbd923/scratchpad"
fonts=json.load(open(os.path.join(S,"fonts","fonts_b64.json")))

def face(fam,w,style="normal"):
    b64=fonts[f"{fam}|{w}"]
    return (f"@font-face{{font-family:'{fam}';font-style:{style};font-weight:{w};"
            f"font-display:swap;src:url(data:font/woff2;base64,{b64}) format('woff2');}}")
FONTFACES="\n".join([face("Cormorant Garamond",w) for w in (400,500,600)]+
                    [face("Jost",w) for w in (300,400,500)])

# Live product data (real titles trimmed for display, real prices, tonal panel class)
PRODUCTS=[
 ("Travertine Coffee Table","Natural chiselled stone","4,690","travertine"),
 ("Chiseled Travertine Mantle Shelf","Invisible-mount stone shelf","549","travertine"),
 ("White Marble Monolith Fountain","Rough-faced water element","649","marble"),
 ("Carved Pedestal Column","Shou sugi ban charred cedar","549","charcoal"),
 ("Travertine Coasters — Set of 4","Honed stone, cork-backed","50","travertine"),
 ("Charcoal Pedestal Column","Shou sugi ban plinth","280","charcoal"),
]
cards="\n".join(f'''
      <a class="card" href="#">
        <div class="card-img stone stone--{tone}"><span class="ph">Atelier Bismuth</span></div>
        <div class="card-meta">
          <h3 class="card-title">{t}</h3>
          <p class="card-sub">{s}</p>
          <p class="card-price">From ${p}</p>
        </div>
      </a>''' for (t,s,p,tone) in PRODUCTS)

HTML=f"""<style>
{FONTFACES}
:root{{
  --color-bg:#f4f1ea; --color-surface:#fff; --color-surface-alt:#ece7dc;
  --color-ink:#1c1a17; --color-ink-soft:#564f48; --color-muted:#8a8479;
  --color-line:#e0dacd; --color-accent:#6b5b4a; --color-shou:#171310; --color-paper:#faf7f0;
  --stone-1:#e7ddcb; --stone-2:#d8c9ad; --stone-3:#c5b393; --stone-4:#b09a78; --stone-5:#8a6f4e;
  --font-display:"Cormorant Garamond","EB Garamond",Garamond,serif;
  --font-body:"Jost",ui-sans-serif,system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  --tracking-wide:0.22em; --tracking-mid:0.12em;
  --fs-eyebrow:0.72rem;
  --fs-body:clamp(0.95rem,0.9rem + 0.2vw,1.05rem);
  --fs-lead:clamp(1.1rem,1rem + 0.6vw,1.4rem);
  --fs-h3:clamp(1.5rem,1.2rem + 1.4vw,2.4rem);
  --fs-h2:clamp(2rem,1.4rem + 2.6vw,3.5rem);
  --fs-h1:clamp(2.6rem,1.6rem + 4.6vw,6rem);
  --fs-display:clamp(3.5rem,2.4rem + 3.5vw,6rem);
  --content-max:1180px; --page-max:1600px;
  --gutter:clamp(1.15rem,0.6rem + 3vw,4.5rem);
  --section-y:clamp(3.5rem,2rem + 6vw,9rem);
  --radius:2px; --ease:cubic-bezier(0.22,1,0.36,1);
  color-scheme:light;
}}
*{{box-sizing:border-box;margin:0;padding:0}}
html{{-webkit-text-size-adjust:100%}}
body{{background:var(--color-bg);color:var(--color-ink-soft);font-family:var(--font-body);
  font-size:var(--fs-body);line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}}
h1,h2,h3,h4{{color:var(--color-ink);font-family:var(--font-display);font-weight:500;
  line-height:1.02;letter-spacing:-0.01em;text-wrap:balance}}
a{{color:inherit;text-decoration:none}}
img{{max-width:100%;display:block}}
.wrap{{max-width:var(--content-max);margin-inline:auto;padding-inline:var(--gutter)}}
.eyebrow{{font-family:var(--font-body);font-weight:400;font-size:var(--fs-eyebrow);
  text-transform:uppercase;letter-spacing:var(--tracking-wide);color:var(--color-accent)}}
.rule{{width:38px;height:1px;background:var(--color-accent);opacity:.6;margin:1.4rem 0}}
.btn{{display:inline-block;font-family:var(--font-body);font-size:.74rem;font-weight:500;
  text-transform:uppercase;letter-spacing:var(--tracking-mid);padding:.95rem 1.9rem;
  border:1px solid var(--color-ink);color:var(--color-ink);border-radius:var(--radius);
  transition:background .5s var(--ease),color .5s var(--ease)}}
.btn:hover{{background:var(--color-ink);color:var(--color-bg)}}
.btn--light{{border-color:rgba(244,241,234,.55);color:var(--color-bg)}}
.btn--light:hover{{background:var(--color-bg);color:var(--color-shou)}}

/* ---- art-directed stone panels (stand-in for photography) ---- */
.stone{{position:relative;overflow:hidden;background-color:var(--stone-3)}}
.stone::before{{content:"";position:absolute;inset:-20%;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>");
  background-size:200px 200px;mix-blend-mode:multiply;opacity:.16}}
.stone::after{{content:"";position:absolute;inset:0;
  background:radial-gradient(120% 90% at 30% 20%,rgba(255,255,255,.28),transparent 55%),
             radial-gradient(120% 120% at 80% 100%,rgba(0,0,0,.30),transparent 60%)}}
.stone .ph{{position:absolute;inset:0;display:grid;place-items:center;z-index:2;
  font-family:var(--font-display);font-size:1.05rem;letter-spacing:.30em;text-transform:uppercase;
  color:rgba(28,26,23,.20)}}
.stone--travertine{{background:linear-gradient(150deg,#efe7d6,#d8c9ad 55%,#b09a78)}}
.stone--marble{{background:linear-gradient(150deg,#f6f3ec,#e5e0d5 55%,#cfc7b6)}}
.stone--marble .ph{{color:rgba(28,26,23,.16)}}
.stone--charcoal{{background:linear-gradient(150deg,#3b332c,#241d18 55%,#171310)}}
.stone--charcoal .ph{{color:rgba(244,241,234,.16)}}

/* ---- header ---- */
header.site{{position:sticky;top:0;z-index:40;background:rgba(244,241,234,.86);
  backdrop-filter:blur(10px);border-bottom:1px solid var(--color-line)}}
.nav{{max-width:var(--page-max);margin-inline:auto;padding:1.1rem var(--gutter);
  display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:1rem}}
.brand{{font-family:var(--font-display);font-weight:600;font-size:1.15rem;
  letter-spacing:.18em;text-transform:uppercase;color:var(--color-ink);line-height:1}}
.brand small{{display:block;font-family:var(--font-body);font-weight:400;font-size:.56rem;
  letter-spacing:.34em;color:var(--color-muted);margin-top:.35rem}}
.menu{{display:flex;gap:2.1rem;justify-content:center}}
.menu a{{font-size:.76rem;text-transform:uppercase;letter-spacing:var(--tracking-mid);
  color:var(--color-ink-soft);padding-bottom:2px;border-bottom:1px solid transparent;transition:border-color .4s}}
.menu a:hover{{border-color:var(--color-accent)}}
.nav-r{{display:flex;gap:1.4rem;justify-content:flex-end;font-size:.76rem;
  text-transform:uppercase;letter-spacing:var(--tracking-mid);color:var(--color-ink-soft)}}

/* ---- hero ---- */
.hero{{position:relative;min-height:88vh;display:flex;align-items:flex-end;
  color:var(--color-bg);isolation:isolate}}
.hero .stone{{position:absolute;inset:0;z-index:-1}}
.hero::after{{content:"";position:absolute;inset:0;z-index:-1;
  background:linear-gradient(180deg,rgba(23,19,16,.12),rgba(23,19,16,.42) 60%,rgba(23,19,16,.66))}}
.hero-inner{{max-width:var(--page-max);margin-inline:auto;width:100%;
  padding:0 var(--gutter) clamp(3rem,7vw,7rem)}}
.hero .eyebrow{{color:rgba(244,241,234,.82)}}
.hero h1{{color:var(--color-bg);font-size:var(--fs-display);font-weight:400;
  margin:.6rem 0 1rem;max-width:14ch}}
.hero p.sub{{font-size:var(--fs-lead);max-width:34ch;color:rgba(244,241,234,.9);font-weight:300}}
.scrollcue{{margin-top:2.4rem;font-size:.66rem;letter-spacing:.34em;text-transform:uppercase;
  color:rgba(244,241,234,.7);display:flex;align-items:center;gap:.7rem}}
.scrollcue::before{{content:"";width:46px;height:1px;background:rgba(244,241,234,.6)}}

/* ---- editorial chapters ---- */
.chapter{{padding:var(--section-y) 0}}
.chapter .grid{{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,5.5rem);
  align-items:center;max-width:var(--content-max);margin-inline:auto;padding-inline:var(--gutter)}}
.chapter--flip .media{{order:2}}
.chapter .media{{aspect-ratio:4/5;border-radius:var(--radius)}}
.chapter.bone{{background:var(--color-bg)}}
.chapter.paper{{background:var(--color-paper)}}
.chapter h2{{font-size:var(--fs-h2);font-weight:400;margin:.4rem 0 1.2rem;white-space:pre-line}}
.chapter .body{{max-width:38ch;color:var(--color-ink-soft)}}
.chapter .btn{{margin-top:1.9rem}}

/* ---- dark band ---- */
.dark{{background:var(--color-shou);color:var(--color-bg);position:relative;isolation:isolate}}
.dark .grid{{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(2rem,5vw,5.5rem);
  align-items:center;max-width:var(--content-max);margin-inline:auto;
  padding:var(--section-y) var(--gutter)}}
.dark .media{{aspect-ratio:1/1;border-radius:var(--radius)}}
.dark h2{{color:var(--color-bg);font-size:var(--fs-h2);font-weight:400;white-space:pre-line;margin:.4rem 0 1.2rem}}
.dark .eyebrow{{color:var(--stone-3)}}
.dark .body{{color:rgba(244,241,234,.72);max-width:40ch}}

/* ---- manifesto ---- */
.manifesto{{padding:calc(var(--section-y) * 1.15) 0;text-align:center;background:var(--color-surface-alt)}}
.manifesto .inner{{max-width:760px;margin-inline:auto;padding-inline:var(--gutter)}}
.manifesto p{{font-family:var(--font-display);font-size:clamp(1.5rem,1rem + 2.4vw,2.6rem);
  line-height:1.28;color:var(--color-ink);font-weight:400;margin-top:1.4rem}}
.manifesto em{{font-style:italic;color:var(--color-accent)}}

/* ---- featured ---- */
.featured{{padding:var(--section-y) 0;background:var(--color-bg)}}
.feat-head{{text-align:center;max-width:var(--content-max);margin:0 auto clamp(2.4rem,4vw,3.6rem);
  padding-inline:var(--gutter)}}
.feat-head h2{{font-size:var(--fs-h2);font-weight:400;margin-top:.5rem}}
.grid-cards{{max-width:var(--content-max);margin-inline:auto;padding-inline:var(--gutter);
  display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(1.2rem,2.5vw,2.4rem)}}
.card-img{{aspect-ratio:4/5;border-radius:var(--radius);margin-bottom:1.1rem}}
.card:hover .card-img{{filter:brightness(1.03)}}
.card-title{{font-family:var(--font-display);font-size:var(--fs-h3);font-weight:500;
  line-height:1.1;color:var(--color-ink)}}
.card-sub{{font-size:.82rem;color:var(--color-muted);margin-top:.35rem;
  text-transform:uppercase;letter-spacing:.06em}}
.card-price{{font-size:.95rem;color:var(--color-ink-soft);margin-top:.7rem;
  font-variant-numeric:tabular-nums}}
.feat-cta{{text-align:center;margin-top:clamp(2.6rem,4vw,3.6rem)}}

/* ---- closing ---- */
.closing{{position:relative;min-height:66vh;display:flex;align-items:center;justify-content:center;
  text-align:center;color:var(--color-bg);isolation:isolate}}
.closing .stone{{position:absolute;inset:0;z-index:-1}}
.closing::after{{content:"";position:absolute;inset:0;z-index:-1;background:rgba(23,19,16,.5)}}
.closing h2{{color:var(--color-bg);font-size:var(--fs-h1);font-weight:400;white-space:pre-line;margin:.6rem 0 1.8rem}}
.closing .eyebrow{{color:rgba(244,241,234,.82)}}

/* ---- newsletter ---- */
.news{{background:var(--color-surface-alt);padding:var(--section-y) 0;text-align:center}}
.news .inner{{max-width:560px;margin-inline:auto;padding-inline:var(--gutter)}}
.news h2{{font-size:var(--fs-h2);font-weight:400;margin:.5rem 0 .9rem}}
.news form{{display:flex;gap:.6rem;margin-top:1.8rem}}
.news input{{flex:1;background:transparent;border:1px solid var(--color-line);
  border-radius:var(--radius);padding:.9rem 1rem;font-family:var(--font-body);
  font-size:.9rem;color:var(--color-ink)}}
.news input:focus{{outline:2px solid var(--color-accent);outline-offset:2px}}

/* ---- footer ---- */
footer.site{{background:var(--color-shou);color:rgba(244,241,234,.72);padding:clamp(3rem,6vw,5rem) 0 2rem}}
.foot{{max-width:var(--content-max);margin-inline:auto;padding-inline:var(--gutter);
  display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:2.4rem}}
.foot .brand{{color:var(--color-bg)}}
.foot h4{{color:var(--color-bg);font-family:var(--font-body);font-size:.7rem;font-weight:500;
  text-transform:uppercase;letter-spacing:var(--tracking-mid);margin-bottom:1.1rem}}
.foot ul{{list-style:none;display:flex;flex-direction:column;gap:.6rem;font-size:.86rem}}
.foot a:hover{{color:var(--color-bg)}}
.foot-bottom{{max-width:var(--content-max);margin:3rem auto 0;padding:1.6rem var(--gutter) 0;
  border-top:1px solid rgba(244,241,234,.14);display:flex;justify-content:space-between;
  font-size:.72rem;letter-spacing:.04em;color:rgba(244,241,234,.5);flex-wrap:wrap;gap:.6rem}}

.note{{background:var(--color-ink);color:var(--color-bg);text-align:center;
  font-size:.72rem;letter-spacing:.08em;padding:.6rem 1rem}}
.note b{{color:var(--stone-3);font-weight:500}}

@media(max-width:820px){{
  .nav{{grid-template-columns:1fr auto;gap:.6rem}}
  .menu,.nav-r{{display:none}}
  .chapter .grid,.dark .grid{{grid-template-columns:1fr;gap:1.6rem}}
  .chapter--flip .media{{order:0}}
  .grid-cards{{grid-template-columns:1fr 1fr;gap:1.2rem}}
  .foot{{grid-template-columns:1fr 1fr;gap:1.8rem}}
}}
@media(max-width:520px){{.grid-cards{{grid-template-columns:1fr}}}}
@media(prefers-reduced-motion:reduce){{*{{transition:none!important}}}}
</style>

<div class="note">Design preview of the unpublished <b>Atelier&nbsp;Bismuth</b> theme — real layout, type &amp; copy. Stone panels stand in for product photography, which renders on the live store.</div>

<header class="site">
  <div class="nav">
    <div class="brand">Atelier Bismuth<small>Los Angeles</small></div>
    <nav class="menu">
      <a href="#">Furniture</a><a href="#">Pedestals</a><a href="#">Objects</a>
      <a href="#">Fountains</a><a href="#">All</a>
    </nav>
    <div class="nav-r"><span>Search</span><span>Cart (0)</span></div>
  </div>
</header>

<section class="hero">
  <div class="stone stone--travertine"></div>
  <div class="hero-inner">
    <p class="eyebrow">Atelier Bismuth — Los Angeles</p>
    <h1>Carved from a single stone</h1>
    <p class="sub">Furniture and objects cut from solid stone, finished by hand.</p>
    <div class="scrollcue">Scroll</div>
  </div>
</section>

<section class="chapter bone">
  <div class="grid">
    <div class="media stone stone--travertine"><span class="ph">Furniture</span></div>
    <div class="txt">
      <p class="eyebrow">The furniture</p>
      <div class="rule"></div>
      <h2>A table with{chr(10)}the weight{chr(10)}of the earth</h2>
      <p class="body">Consoles, tables and benches cut from solid travertine — each edge left chiselled, each face a record of the quarry it came from.</p>
      <a class="btn" href="#">View furniture</a>
    </div>
  </div>
</section>

<section class="chapter paper chapter--flip">
  <div class="grid">
    <div class="media stone stone--marble"><span class="ph">Pedestals</span></div>
    <div class="txt">
      <p class="eyebrow">The pedestals</p>
      <div class="rule"></div>
      <h2>Made to hold{chr(10)}what matters</h2>
      <p class="body">Monoliths and plinths that stand still in a room and let a single object become the whole of it.</p>
      <a class="btn" href="#">View pedestals</a>
    </div>
  </div>
</section>

<section class="dark">
  <div class="grid">
    <div class="txt">
      <p class="eyebrow">Shou sugi ban</p>
      <div class="rule" style="background:var(--stone-3)"></div>
      <h2>Wood, charred{chr(10)}by hand until{chr(10)}it turns to shadow</h2>
      <p class="body">The old Japanese craft of burning cedar — the grain preserved, the surface made permanent. A darkness that holds the light.</p>
      <a class="btn btn--light" href="#" style="margin-top:1.9rem">See the charred pieces</a>
    </div>
    <div class="media stone stone--charcoal"><span class="ph">Shou sugi ban</span></div>
  </div>
</section>

<section class="chapter bone">
  <div class="grid">
    <div class="media stone stone--travertine"><span class="ph">Objects</span></div>
    <div class="txt">
      <p class="eyebrow">Objects</p>
      <div class="rule"></div>
      <h2>The small{chr(10)}weight of stone{chr(10)}in the hand</h2>
      <p class="body">Trays, bowls, bookends and mirrors — the daily objects, given the gravity of the pieces they sit beside.</p>
      <a class="btn" href="#">View objects</a>
    </div>
  </div>
</section>

<section class="manifesto">
  <div class="inner">
    <p class="eyebrow">One material, worked by hand</p>
    <p>Every piece begins as a block pulled from the earth and ends in a quiet room. Nothing is cast, nothing is veneered — only <em>stone, chiselled, honed, and left</em> with the marks of the making.</p>
  </div>
</section>

<section class="featured">
  <div class="feat-head">
    <p class="eyebrow">The pieces</p>
    <h2>In the atelier now</h2>
  </div>
  <div class="grid-cards">
    {cards}
  </div>
  <div class="feat-cta"><a class="btn" href="#">View all pieces</a></div>
</section>

<section class="closing">
  <div class="stone stone--charcoal"></div>
  <p class="eyebrow">Made in Los Angeles</p>
  <div style="text-align:center">
    <h2>Built to{chr(10)}outlast us</h2>
    <a class="btn btn--light" href="#">Enter the collection</a>
  </div>
</section>

<section class="news">
  <div class="inner">
    <p class="eyebrow">The Atelier Letter</p>
    <h2>First to the new pieces</h2>
    <p>Join the list for early access to new stone editions, restocks, and private sales.</p>
    <form onsubmit="return false">
      <input type="email" placeholder="Your email" aria-label="Your email">
      <button class="btn" type="submit">Join</button>
    </form>
  </div>
</section>

<footer class="site">
  <div class="foot">
    <div><div class="brand">Atelier Bismuth<small>Los Angeles</small></div>
      <p style="margin-top:1.1rem;font-size:.84rem;max-width:26ch">Solid-stone furniture and objects, cut and finished by hand in Los Angeles.</p></div>
    <div><h4>Shop</h4><ul><li><a href="#">Furniture</a></li><li><a href="#">Pedestals</a></li><li><a href="#">Objects &amp; Decor</a></li><li><a href="#">Fountains</a></li></ul></div>
    <div><h4>Atelier</h4><ul><li><a href="#">Our story</a></li><li><a href="#">Materials</a></li><li><a href="#">Commissions</a></li><li><a href="#">Contact</a></li></ul></div>
    <div><h4>Care</h4><ul><li><a href="#">Shipping</a></li><li><a href="#">Returns</a></li><li><a href="#">Trade program</a></li></ul></div>
  </div>
  <div class="foot-bottom"><span>© 2026 Atelier Bismuth</span><span>Carved from a single stone</span></div>
</footer>
"""
open(os.path.join(S,"preview","index.html"),"w").write(HTML) if os.path.isdir(os.path.join(S,"preview")) else (os.makedirs(os.path.join(S,"preview")),open(os.path.join(S,"preview","index.html"),"w").write(HTML))
print("wrote preview/index.html  size:",len(HTML),"bytes")
