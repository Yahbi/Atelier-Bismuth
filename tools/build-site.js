/* ============================================================================
   Atelier Bismuth — static site generator (luxury preview)
   ----------------------------------------------------------------------------
   Reads tools/catalog.json (normalized from the Etsy listings export) and
   generates the full navigable preview in /docs:
     index · furniture · objects-decor · new-arrivals · best-sellers ·
     collection (shop all, filterable) · product (dynamic PDP by ?h=handle)
   Plus shared docs/site.css and docs/site.js.

   USAGE:  node tools/build-site.js   then   node tools/build-standalone.js
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const docs = path.join(root, 'docs');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));
let P = data.products;

/* ---------- helpers ---------- */
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => (n == null ? '' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const decode = (s) => String(s || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');

// dimensions from description (Etsy mostly inches)
function dimsLabel(p) {
  const t = decode(p.description).replace(/\s+/g, ' ');
  const N = '(\\d+(?:\\.\\d+)?)';
  const g = (w) => { const m = t.match(new RegExp(w + '\\s*[:=]?\\s*' + N + '\\s*(?:inches|inch|in\\b|")', 'i')) || t.match(new RegExp(N + '\\s*(?:inches|inch|in\\b|")\\s*' + w, 'i')); return m ? m[1] : null; };
  const W = g('(?:wide|width|w)'), D = g('(?:deep|depth|thick|d)'), H = g('(?:tall|high|height|h)');
  const parts = [];
  if (W) parts.push('W' + W); if (D) parts.push('D' + D); if (H) parts.push('H' + H);
  if (parts.length >= 2) return parts.join(' × ') + ' in';
  // fall back to size variation range
  const v = (p.variations || []).find((x) => /width|height|length|size|diameter/i.test(x.type));
  if (v && v.values.length) {
    const nums = v.values.map(Number).filter((n) => !isNaN(n));
    if (nums.length) return v.type + ' ' + Math.min(...nums) + '–' + Math.max(...nums) + ' in';
  }
  return '';
}
function paras(desc) {
  return decode(desc).split(/\n{1,}/).map((s) => s.trim()).filter(Boolean);
}

/* ---------- curation (no dates/sales in the listings export) ---------- */
// New Arrivals: first 12 in shop/export order (editor-adjustable).
P.forEach((p, i) => { p.newArrival = i < 12; });
// Best Sellers: a varied signature cross-section — first piece of each key subtype.
const bsOrder = ['Console', 'Coffee table', 'Pedestal', 'Mirror', 'Fountain', 'Shelf', 'Vanity', 'Dining table', 'Bath', 'Bookend', 'Bench', 'Tray', 'Candle'];
const bsPicked = new Set();
bsOrder.forEach((st) => { const c = P.find((p) => p.subtype === st && !bsPicked.has(p.handle)); if (c) bsPicked.add(c.handle); });
P.forEach((p) => { p.bestSeller = bsPicked.has(p.handle); });

function badge(p) {
  if (p.newArrival) return 'New';
  if (p.bestSeller) return 'Best seller';
  if (p.qty != null && p.qty <= 1) return 'One of one';
  return 'Made to order';
}

/* ---------- shared chrome ---------- */
const NAV = [
  ['Furniture', 'furniture.html'],
  ['Objects &amp; Decor', 'objects-decor.html'],
  ['New Arrivals', 'new-arrivals.html'],
  ['Best Sellers', 'best-sellers.html'],
  ['Collection', 'collection.html'],
];
const head = (title, desc) => `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} — Atelier Bismuth</title>
<meta name="description" content="${esc(desc || 'Sculptural travertine furniture and objects, finished by hand.')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="./base.css"><link rel="stylesheet" href="./site.css">
<script>document.documentElement.className='js';</script>
</head>
<body class="template-${esc(title.toLowerCase().replace(/[^a-z]+/g,'-'))}">`;

const header = (active) => `
<header class="site-header" data-header>
  <div class="page-width header-top">
    <div class="header-side">
      <button class="nav-toggle icon-btn" data-drawer-open aria-label="Menu">${ICON.menu}</button>
    </div>
    <a href="index.html" class="brand-wordmark">Atelier Bismuth<small>Travertine · Natural Stone</small></a>
    <div class="header-side header-icons" style="justify-content:flex-end">
      <button class="icon-btn" aria-label="Search">${ICON.search}</button>
      <button class="icon-btn" aria-label="Cart">${ICON.cart}<span class="cart-count" style="display:none">0</span></button>
    </div>
  </div>
  <nav class="header-bar" aria-label="Primary"><div class="page-width header-bar__inner">
    ${NAV.map(([t, h]) => `<a href="${h}" class="nav-link${active === h ? ' is-active' : ''}">${t}</a>`).join('')}
  </div></nav>
</header>
<div class="drawer" data-drawer aria-hidden="true" role="dialog" aria-label="Menu">
  <div class="drawer__scrim" data-drawer-close></div>
  <div class="drawer__panel">
    <div class="flex items-center justify-between" style="margin-bottom:1rem"><span class="brand-wordmark" style="font-size:1.4rem">Atelier Bismuth</span><button class="icon-btn" data-drawer-close aria-label="Close">${ICON.close}</button></div>
    <nav class="stack" style="--stack-gap:0.3rem">${NAV.map(([t, h]) => `<a href="${h}" class="nav-link" data-drawer-close>${t}</a>`).join('')}</nav>
  </div>
</div>`;

const footer = () => `
<footer class="site-footer">
  <div class="page-width">
    <div class="footer-grid">
      <div>
        <p class="footer-wordmark">Atelier Bismuth</p>
        <p class="lead" style="color:#b9b3a6;max-width:34ch;margin-top:1rem;font-size:1.05rem">Sculptural travertine furniture and objects for the considered home. Cut from solid stone, finished by hand in Los Angeles.</p>
        <p class="footer-title" style="margin-top:1.4rem">5.0 ★ · 445 sales · 11 years on Etsy</p>
      </div>
      <div><p class="footer-title">Shop</p><ul class="footer-links">${NAV.map(([t, h]) => `<li><a href="${h}" style="font-size:0.9rem">${t}</a></li>`).join('')}</ul></div>
      <div><p class="footer-title">Atelier</p><ul class="footer-links"><li><a href="#">Our story</a></li><li><a href="#">Custom orders</a></li><li><a href="#">Trade program</a></li><li><a href="#">Contact</a></li></ul></div>
      <div><p class="footer-title">The Atelier Letter</p><p style="font-size:0.92rem;margin-bottom:1.2rem;color:#b9b3a6">Early access to new stone editions, restocks, and private sales.</p>
        <form class="newsletter-form" onsubmit="return false"><input type="email" placeholder="Email address"><button type="submit">→</button></form></div>
    </div>
    <div class="footer-bottom"><span>© 2026 Atelier Bismuth. All editions reserved.</span><span class="footer-social" style="gap:1.4rem"><a href="#">Privacy</a><a href="#">Returns</a><a href="#">Shipping</a><a href="https://www.etsy.com/shop/AtelierBismuth" target="_blank" rel="noopener">Etsy</a></span></div>
  </div>
</footer>
<script src="./site.js"></script></body></html>`;

const ICON = {
  menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  cart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 7h16l-1.2 11.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 7Z"/><path d="M8.5 7V5.5a3.5 3.5 0 0 1 7 0V7"/></svg>',
  arrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

/* ---------- product card ---------- */
function card(p, i) {
  const img = p.images[0] || '';
  const alt = p.images[1] || '';
  const dims = dimsLabel(p);
  return `<article class="product-card" data-reveal data-reveal-delay="${(i % 4) + 1}">
    <a href="product.html?h=${p.handle}" class="product-card__media media media-zoom" aria-label="${esc(p.title)}">
      <span class="product-card__badge">${badge(p)}</span>
      ${img ? `<img src="${img}" loading="lazy" width="700" height="875" alt="${esc(p.title)}">` : '<div class="placeholder-iri" style="position:absolute;inset:0"></div>'}
      ${alt ? `<img class="alt-img" src="${alt}" loading="lazy" alt="" aria-hidden="true">` : ''}
    </a>
    <div class="product-card__body">
      <a href="product.html?h=${p.handle}"><h3 class="product-card__title">${esc(p.title.split(' - ')[0])}</h3></a>
      ${dims ? `<span class="product-card__dims">${dims}</span>` : `<span class="product-card__dims">${esc(p.subtype)}</span>`}
      <div class="product-card__meta"><span class="product-card__type">${esc(p.subtype)}</span>
        <span class="product-card__price">${p.compare && p.compare > p.price ? `<span class="price--was">${money(p.compare)}</span>` : ''}<span class="${p.compare > p.price ? 'price--sale' : ''}">${money(p.price)}</span></span></div>
    </div>
  </article>`;
}

/* ---------- listing page ---------- */
function listingPage({ file, nav, eyebrow, title, copy, items, chips }) {
  const html = head(title, copy) + header(nav) + `
<main>
  <section class="cat-hero">
    <div class="page-width">
      <span class="eyebrow" data-reveal>${eyebrow}</span>
      <h1 class="h1 cat-hero__title" data-reveal data-reveal-delay="1">${title}</h1>
      ${copy ? `<p class="lead measure-wide" data-reveal data-reveal-delay="2">${copy}</p>` : ''}
      <p class="cat-hero__count" data-reveal data-reveal-delay="2">${items.length} pieces</p>
    </div>
  </section>
  <section class="section bg-surface" style="padding-top:clamp(1.5rem,3vw,2.5rem)">
    <div class="page-width">
      ${chips ? `<div class="filter-chips" data-filter>${chips}</div>` : ''}
      <div class="grid cols-4" data-grid>
        ${items.map((p, i) => card(p, i)).join('\n')}
      </div>
    </div>
  </section>
</main>` + footer();
  fs.writeFileSync(path.join(docs, file), html);
  console.log('wrote', file, '—', items.length, 'pieces');
}

/* ---------- HOME ---------- */
function home() {
  const hero = P.find((p) => p.subtype === 'Console' && p.images[0]) || P[0];
  const tileFurniture = P.find((p) => p.category === 'Furniture' && p.images[0]);
  const tilePedestal = P.find((p) => p.subtype === 'Pedestal' && p.images[0]);
  const tileDecor = P.find((p) => p.category === 'Objects & Decor' && p.images[0]);
  const newItems = P.filter((p) => p.newArrival).slice(0, 8);
  const bestItems = P.filter((p) => p.bestSeller).slice(0, 4);
  const story = P.find((p) => p.subtype === 'Pedestal' && p !== hero && p.images[0]) || P[3];
  const lookbook = P.find((p) => p.subtype === 'Coffee table' && p.images[0]) || P[5];
  const tile = (p, label, link, sub) => `<a href="${link}" class="collection-tile" data-reveal>
    <div class="media media--tall media-zoom"><img src="${p.images[0]}" loading="lazy" alt="${esc(label)}">
      <div class="tile-grad"></div>
      <div class="tile-cap"><span class="eyebrow" style="color:rgba(244,241,234,.85)">${sub}</span><h3 class="h3">${label}</h3><span class="link-underline">Explore ${ICON.arrow}</span></div>
    </div></a>`;
  const html = head('Travertine & Natural Stone Furniture', 'Sculptural travertine furniture and objects — consoles, pedestals, basins and hearths, cut from solid stone and finished by hand in Los Angeles.')
    + header('') + `
<main>
  <section class="hero">
    <div class="hero__media"><img src="${hero.images[0]}" alt="${esc(hero.title)}"><div class="hero__scrim"></div></div>
    <div class="hero__inner page-width"><div class="measure-wide">
      <span class="eyebrow" style="color:rgba(244,241,234,.85)" data-reveal>Atelier Bismuth · Los Angeles</span>
      <h1 class="hero__title display" data-reveal data-reveal-delay="1">Carved from<br>a single stone</h1>
      <p class="hero__sub lead" data-reveal data-reveal-delay="2">Sculptural travertine furniture and objects — consoles, pedestals, basins and hearths, shaped by hand for the considered home.</p>
      <div class="hero__actions" data-reveal data-reveal-delay="3"><a href="collection.html" class="btn btn--light">Shop the collection</a><a href="furniture.html" class="btn btn--ghost-light">Furniture</a></div>
    </div></div>
    <div class="scroll-cue">Scroll<span></span></div>
  </section>

  <section class="section"><div class="page-width">
    <div class="center" style="margin-bottom:clamp(2rem,4vw,4rem)" data-reveal><span class="eyebrow">The Collections</span><h2 class="h2 mt-2">Furniture &amp; objects in stone</h2></div>
    <div class="grid cols-3">
      ${tile(tileFurniture, 'Furniture', 'furniture.html', 'Consoles · Tables · Benches')}
      ${tile(tilePedestal, 'Pedestals', 'collection.html?f=Pedestal', 'Sculptural plinths')}
      ${tile(tileDecor, 'Objects &amp; Decor', 'objects-decor.html', 'Mirrors · Plates · Shelves')}
    </div>
  </div></section>

  <section class="section bg-surface"><div class="page-width">
    <div class="row-head" data-reveal><div><span class="eyebrow">Just added</span><h2 class="h2 mt-2">New arrivals</h2></div><a href="new-arrivals.html" class="link-underline link-arrow">View all ${ICON.arrow}</a></div>
    <div class="grid cols-4">${newItems.map((p, i) => card(p, i)).join('')}</div>
  </div></section>

  <section class="section"><div class="page-width"><div class="feature">
    <div class="feature__media media media--portrait media-zoom" data-reveal><img src="${story.images[0]}" loading="lazy" alt="${esc(story.title)}"></div>
    <div class="feature__copy" data-reveal data-reveal-delay="1"><span class="eyebrow">The Atelier</span><h2 class="h2 mt-2">One material, worked by hand</h2>
      <div class="feature__body lead mt-3"><p>Each piece is cut from solid travertine and finished by hand — chiselled, honed, or left raw — so the grain of the earth stays visible in your home.</p><p style="margin-top:1rem">Every measurement is published, so the piece you imagine is the piece that arrives.</p></div>
      <a href="collection.html" class="btn btn--outline mt-4">Explore all ${P.length} pieces</a></div>
  </div></div></section>

  <div class="marquee bg-surface" aria-hidden="true"><div class="marquee__track">${Array(2).fill('<span>Solid travertine</span><span>Hand chiselled</span><span>One of a kind</span><span>Made to order</span><span>Built to outlast us</span>').join('')}</div></div>

  <section class="section bg-surface"><div class="page-width">
    <div class="row-head" data-reveal><div><span class="eyebrow">Signature pieces</span><h2 class="h2 mt-2">Best sellers</h2></div><a href="best-sellers.html" class="link-underline link-arrow">View all ${ICON.arrow}</a></div>
    <div class="grid cols-4">${bestItems.map((p, i) => card(p, i)).join('')}</div>
  </div></section>

  <section class="section--flush"><div class="collection-hero" style="min-height:78vh">
    <div class="collection-hero__media"><img src="${lookbook.images[0]}" loading="lazy" alt="${esc(lookbook.title)}"></div>
    <div class="page-width" style="position:relative;z-index:1;width:100%"><div class="measure" data-reveal>
      <span class="eyebrow" style="color:rgba(244,241,234,.85)">Lookbook · 2026</span><h2 class="h2 mt-2" style="color:#f4f1ea">Stone, light, and quiet rooms</h2>
      <p class="lead mt-2" style="color:rgba(244,241,234,.88)">A study in mass and warmth — our travertine pieces in lived-in interiors.</p>
      <a href="collection.html" class="btn btn--light mt-4">Explore the collection</a></div></div>
  </div></section>

  <section class="section bg-ink"><div class="content-width center">
    <span class="eyebrow" data-reveal>445 sales · 464 admirers</span>
    <blockquote class="h2 serif-italic mt-3" data-reveal data-reveal-delay="1" style="font-weight:300;line-height:1.18;color:#efece4">“Exactly as described, down to the last centimetre — and more beautiful in stone than on screen.”</blockquote>
    <p class="eyebrow mt-3" data-reveal data-reveal-delay="2">Verified Etsy buyer · 5.0 ★ (64 reviews)</p>
  </div></section>
</main>` + footer();
  fs.writeFileSync(path.join(docs, 'index.html'), html);
  console.log('wrote index.html — hero + new arrivals + best sellers');
}

/* ---------- PRODUCT (dynamic) ---------- */
function productPage() {
  const lite = P.map((p) => ({
    handle: p.handle, title: p.title, price: money(p.price), compare: p.compare > p.price ? money(p.compare) : '',
    category: p.category, subtype: p.subtype, images: p.images, badge: badge(p),
    variations: p.variations, dims: dimsLabel(p), paras: paras(p.description).slice(0, 8),
    materials: p.materials, made: 'Made to order', lead: '3–6 weeks',
  }));
  const html = head('Product', 'Atelier Bismuth piece') + header('') + `
<main id="pdp"><div class="page-width section bg-surface"><div id="pdp-mount"></div></div></main>
<script>window.__CATALOG__=${JSON.stringify(lite)};</script>` + footer();
  fs.writeFileSync(path.join(docs, 'product.html'), html);
  console.log('wrote product.html — dynamic PDP for', P.length, 'products');
}

/* ---------- site.css (luxe additions) ---------- */
const SITE_CSS = `/* Atelier Bismuth — luxe additions on top of base.css */
.nav-link.is-active{color:var(--color-ink)}
.nav-link.is-active::after{width:100%}
/* two-row header: wordmark on top, category nav bar beneath */
.header-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;min-height:66px;gap:1rem}
.header-side{display:flex;align-items:center;gap:1rem}
.site-header .brand-wordmark{text-align:center}
.header-bar{border-top:1px solid var(--color-line)}
.header-bar__inner{display:flex;justify-content:center;flex-wrap:wrap;gap:clamp(1.3rem,3vw,2.8rem);padding:.9rem 0}
.header-bar .nav-link{font-size:.72rem}
.nav-toggle{display:none}
@media (max-width:900px){.header-bar{display:none}.nav-toggle{display:inline-flex}.header-top{min-height:58px;grid-template-columns:auto 1fr auto}.site-header .brand-wordmark{text-align:left}}
.hero__scrim{position:absolute;inset:0;background:linear-gradient(to top,rgba(15,13,11,.62),rgba(15,13,11,.1) 45%,rgba(15,13,11,.28))}
.tile-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(15,13,11,.55),transparent 55%)}
.tile-cap{position:absolute;left:1.6rem;right:1.6rem;bottom:1.5rem;color:#f4f1ea}
.tile-cap .h3{margin:.3rem 0 .5rem}
.row-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:clamp(1.5rem,3vw,2.5rem)}
.cat-hero{padding:clamp(3rem,7vw,7rem) 0 clamp(1.5rem,3vw,2.5rem);border-bottom:1px solid var(--color-line)}
.cat-hero .page-width{display:flex;flex-direction:column;gap:.6rem}
.cat-hero__title{margin-top:.4rem}
.cat-hero__count{font-size:.72rem;letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--color-muted)}
.filter-chips{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:clamp(1.5rem,3vw,2.5rem)}
.chip{padding:.55rem 1.1rem;border:1px solid var(--color-line);border-radius:100px;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .3s var(--ease);background:var(--color-surface)}
.chip:hover{border-color:var(--color-ink)}
.chip.is-active{background:var(--color-ink);color:var(--color-bg);border-color:var(--color-ink)}
.product-card.is-hidden{display:none}
/* PDP */
.pdp-gallery{display:grid;gap:.6rem}
.pdp-main{aspect-ratio:4/5;position:relative;overflow:hidden;border-radius:var(--radius);background:var(--color-surface-alt)}
.pdp-main img{width:100%;height:100%;object-fit:cover}
.pdp-thumbs{display:grid;grid-template-columns:repeat(5,1fr);gap:.5rem}
.pdp-thumb{aspect-ratio:1;overflow:hidden;border-radius:2px;cursor:pointer;opacity:.6;transition:opacity .3s;border:1px solid transparent}
.pdp-thumb img{width:100%;height:100%;object-fit:cover}
.pdp-thumb.is-active{opacity:1;border-color:var(--color-ink)}
.size-grid{display:flex;flex-wrap:wrap;gap:.5rem}
.size-opt{min-width:48px;padding:.6rem .9rem;border:1px solid var(--color-line);border-radius:2px;text-align:center;font-size:.85rem;cursor:pointer;transition:all .25s}
.size-opt:hover{border-color:var(--color-ink)}
.size-opt.is-active{background:var(--color-ink);color:var(--color-bg);border-color:var(--color-ink)}
@media (max-width:900px){.pdp-thumbs{grid-template-columns:repeat(5,1fr)}}`;
fs.writeFileSync(path.join(docs, 'site.css'), SITE_CSS);

/* ---------- site.js (shared behaviours + PDP renderer) ---------- */
const SITE_JS = `(function(){
function reveal(){var els=document.querySelectorAll('[data-reveal]');if(!('IntersectionObserver'in window)){els.forEach(function(e){e.classList.add('is-visible')});return}var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('is-visible');io.unobserve(en.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.05});els.forEach(function(e){io.observe(e)})}
function header(){var h=document.querySelector('.site-header');if(!h)return;var f=function(){h.classList.toggle('is-scrolled',window.scrollY>24)};f();addEventListener('scroll',f,{passive:true})}
function drawer(){var d=document.querySelector('[data-drawer]');if(!d)return;var o=function(){d.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'},c=function(){d.setAttribute('aria-hidden','true');document.body.style.overflow=''};document.querySelectorAll('[data-drawer-open]').forEach(function(b){b.onclick=o});d.querySelectorAll('[data-drawer-close],.drawer__scrim').forEach(function(b){b.onclick=c})}
function chips(){var bar=document.querySelector('[data-filter]');if(!bar)return;var grid=document.querySelector('[data-grid]');bar.addEventListener('click',function(e){var c=e.target.closest('.chip');if(!c)return;bar.querySelectorAll('.chip').forEach(function(x){x.classList.remove('is-active')});c.classList.add('is-active');var f=c.getAttribute('data-f');grid.querySelectorAll('.product-card').forEach(function(card){var t=card.getAttribute('data-cat')||'';var s=card.getAttribute('data-sub')||'';card.classList.toggle('is-hidden',!(f==='all'||t===f||s===f))})})}
function money(){}
function pdp(){
  var mount=document.getElementById('pdp-mount');if(!mount||!window.__CATALOG__)return;
  var h=new URLSearchParams(location.search).get('h');
  var P=window.__CATALOG__;var p=P.find(function(x){return x.handle===h})||P[0];
  var imgs=p.images.length?p.images:[''];
  var sizes=(p.variations&&p.variations[0])?p.variations[0]:null;
  var rel=P.filter(function(x){return x.category===p.category&&x.handle!==p.handle}).slice(0,4);
  var specRows=[];if(p.dims)specRows.push(['Dimensions',p.dims]);if(sizes)specRows.push(['Available '+sizes.type.toLowerCase()+'s',sizes.values.join(' · ')+' in']);
  specRows.push(['Materials','Solid travertine (natural stone)']);specRows.push(['Finish','Honed / hand-chiselled']);specRows.push(['Edition',p.made]);specRows.push(['Lead time',p.lead]);
  mount.innerHTML=''+
  '<nav class="eyebrow" style="display:block;margin-bottom:1.6rem"><a href="index.html">Home</a> <span style="opacity:.5">/</span> <a href="'+(p.category==='Furniture'?'furniture.html':'objects-decor.html')+'">'+p.category+'</a> <span style="opacity:.5">/</span> <span style="color:var(--color-ink)">'+p.subtype+'</span></nav>'+
  '<div class="pdp"><div class="pdp-gallery">'+
    '<div class="pdp-main" data-main><img src="'+imgs[0]+'" alt="'+p.title.replace(/"/g,'&quot;')+'"></div>'+
    (imgs.length>1?'<div class="pdp-thumbs">'+imgs.slice(0,10).map(function(u,i){return '<div class="pdp-thumb'+(i===0?' is-active':'')+'" data-thumb="'+u+'"><img src="'+u+'" alt=""></div>'}).join('')+'</div>':'')+
  '</div>'+
  '<div class="pdp__info">'+
    '<div class="flex items-center gap-2 wrap" style="margin-bottom:.6rem"><span class="eyebrow">Atelier Bismuth</span><span class="product-card__badge" style="position:static;background:var(--color-ink);color:var(--color-bg)">'+p.badge+'</span></div>'+
    '<h1 class="h2">'+p.title.split(' - ')[0]+'</h1>'+
    '<div class="flex items-baseline gap-2 mt-2"><span class="pdp__price">'+p.price+'</span>'+(p.compare?'<span class="price--was">'+p.compare+'</span>':'')+'</div>'+
    (p.dims?'<span class="product-card__dims">'+p.dims+'</span>':'')+
    '<hr class="hairline mt-3">'+
    (sizes?'<div class="mt-3"><span class="eyebrow eyebrow--ink" style="display:block;margin-bottom:.6rem">'+sizes.type+' (in)</span><div class="size-grid">'+sizes.values.map(function(v,i){return '<button class="size-opt'+(i===0?' is-active':'')+'" data-size>'+v+'</button>'}).join('')+'</div></div>':'')+
    '<div class="flex gap-2 wrap items-center mt-3"><div class="qty" data-qty><button type="button" data-qty-minus>−</button><input type="text" value="1"><button type="button" data-qty-plus>+</button></div>'+
    '<button class="btn btn--block" style="flex:1;min-width:200px"><span>Add to cart — '+p.price+'</span></button></div>'+
    '<ul class="trust-row mt-4"><li>White-glove delivery</li><li>Hand finished</li><li>Made to order in LA</li></ul>'+
    '<div class="pdp__desc lead mt-4">'+p.paras.slice(0,2).map(function(t){return '<p>'+t+'</p>'}).join('')+'</div>'+
    '<div class="accordion mt-3">'+
      '<details class="accordion__item" open><summary class="accordion__trigger">Dimensions &amp; specifications<span class="accordion__icon"></span></summary><div class="accordion__panel"><table class="spec-table">'+specRows.map(function(r){return '<tr><th>'+r[0]+'</th><td>'+r[1]+'</td></tr>'}).join('')+'</table></div></details>'+
      (p.paras.length>2?'<details class="accordion__item"><summary class="accordion__trigger">Full description<span class="accordion__icon"></span></summary><div class="accordion__panel">'+p.paras.slice(2).map(function(t){return '<p style="margin-bottom:.8rem">'+t+'</p>'}).join('')+'</div></details>':'')+
      '<details class="accordion__item"><summary class="accordion__trigger">Care<span class="accordion__icon"></span></summary><div class="accordion__panel">Seal on installation and re-seal periodically. Wipe with a soft, damp cloth; avoid acidic cleaners on natural stone.</div></details>'+
      '<details class="accordion__item"><summary class="accordion__trigger">Shipping &amp; delivery<span class="accordion__icon"></span></summary><div class="accordion__panel">Made to order in 3–6 weeks, crated and insured, delivered white-glove to your room of choice.</div></details>'+
    '</div>'+
  '</div></div>'+
  '<section class="section" style="padding-bottom:0"><div class="center" style="margin-bottom:2rem"><span class="eyebrow">More from '+p.category+'</span><h2 class="h3 mt-2">You may also like</h2></div><div class="grid cols-4">'+
    rel.map(function(x){return '<article class="product-card"><a href="product.html?h='+x.handle+'" class="product-card__media media media-zoom"><img src="'+(x.images[0]||'')+'" loading="lazy" alt="'+x.title.replace(/"/g,'&quot;')+'"></a><div class="product-card__body"><a href="product.html?h='+x.handle+'"><h3 class="product-card__title">'+x.title.split(' - ')[0]+'</h3></a><div class="product-card__meta"><span class="product-card__type">'+x.subtype+'</span><span class="product-card__price">'+(x.compare?'<span class="price--was">'+x.compare+'</span>':'')+x.price+'</span></div></div></article>'}).join('')+
  '</div></section>';
  document.title=p.title.split(' - ')[0]+' — Atelier Bismuth';
  // gallery thumbs
  var main=mount.querySelector('[data-main] img');
  mount.querySelectorAll('[data-thumb]').forEach(function(t){t.onclick=function(){main.src=t.getAttribute('data-thumb');mount.querySelectorAll('[data-thumb]').forEach(function(x){x.classList.remove('is-active')});t.classList.add('is-active')}});
  mount.querySelectorAll('[data-size]').forEach(function(b){b.onclick=function(){b.parentElement.querySelectorAll('[data-size]').forEach(function(x){x.classList.remove('is-active')});b.classList.add('is-active')}});
  var q=mount.querySelector('[data-qty]');if(q){var inp=q.querySelector('input');q.querySelector('[data-qty-minus]').onclick=function(){inp.value=Math.max(1,(+inp.value||1)-1)};q.querySelector('[data-qty-plus]').onclick=function(){inp.value=(+inp.value||1)+1}}
  reveal();
}
document.addEventListener('DOMContentLoaded',function(){reveal();header();drawer();chips();pdp()});
})();`;
fs.writeFileSync(path.join(docs, 'site.js'), SITE_JS);

/* ---------- generate everything ---------- */
home();
productPage();
listingPage({ file: 'furniture.html', nav: 'furniture.html', eyebrow: 'The Collection', title: 'Furniture', copy: 'Consoles, dining and coffee tables, benches, vanities, fountains, hearths and sculptural pedestals — each cut from solid travertine and finished by hand.', items: P.filter((p) => p.category === 'Furniture') });
listingPage({ file: 'objects-decor.html', nav: 'objects-decor.html', eyebrow: 'The Collection', title: 'Objects &amp; Decor', copy: 'Mirrors, plates and trays, floating shelves, candle holders and bookends — small stone objects with the same considered hand.', items: P.filter((p) => p.category === 'Objects & Decor') });
listingPage({ file: 'new-arrivals.html', nav: 'new-arrivals.html', eyebrow: 'Just added', title: 'New Arrivals', copy: 'The latest pieces to leave the atelier.', items: P.filter((p) => p.newArrival) });
listingPage({ file: 'best-sellers.html', nav: 'best-sellers.html', eyebrow: 'Signature pieces', title: 'Best Sellers', copy: 'The pieces our collectors return for, across every category.', items: P.filter((p) => p.bestSeller) });

// collection / shop all — with filter chips by category + key subtype
const subtypes = [...new Set(P.map((p) => p.subtype))];
const chipList = ['<button class="chip is-active" data-f="all">All ' + P.length + '</button>',
  '<button class="chip" data-f="Furniture">Furniture</button>',
  '<button class="chip" data-f="Objects &amp; Decor">Objects &amp; Decor</button>']
  .concat(['Console', 'Pedestal', 'Coffee table', 'Shelf', 'Fountain', 'Plate', 'Mirror', 'Bookend'].filter((s) => subtypes.includes(s)).map((s) => `<button class="chip" data-f="${s}">${s}s</button>`))
  .join('');
function collectionPage() {
  const items = P;
  const html = head('Collection', 'The complete Atelier Bismuth collection.') + header('collection.html') + `
<main>
  <section class="cat-hero"><div class="page-width">
    <span class="eyebrow" data-reveal>Everything in stone</span>
    <h1 class="h1 cat-hero__title" data-reveal data-reveal-delay="1">The Collection</h1>
    <p class="lead measure-wide" data-reveal data-reveal-delay="2">All ${P.length} pieces — filter by type below.</p>
    <p class="cat-hero__count" data-reveal data-reveal-delay="2">${P.length} pieces</p>
  </div></section>
  <section class="section bg-surface" style="padding-top:clamp(1.5rem,3vw,2.5rem)"><div class="page-width">
    <div class="filter-chips" data-filter>${chipList}</div>
    <div class="grid cols-4" data-grid>
      ${items.map((p, i) => card(p, i).replace('<article class="product-card"', `<article class="product-card" data-cat="${p.category}" data-sub="${p.subtype}"`)).join('\n')}
    </div>
  </div></section>
</main>` + footer();
  fs.writeFileSync(path.join(docs, 'collection.html'), html);
  console.log('wrote collection.html —', items.length, 'pieces (filterable)');
}
collectionPage();

console.log('\nDone. ' + P.length + ' products. Furniture: ' + P.filter((p) => p.category === 'Furniture').length + ', Objects & Decor: ' + P.filter((p) => p.category === 'Objects & Decor').length + '. Next: node tools/build-standalone.js');
