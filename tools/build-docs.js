/* ============================================================================
   Atelier Bismuth — docs preview data injector
   ----------------------------------------------------------------------------
   Reads the Etsy export (tools/atelier-bismuth-etsy.json) and injects the real
   catalog — titles, prices, dimensions, descriptions and full-res photo URLs —
   into the /docs preview pages. The pages are data-driven: each has a marked
   data island (between /*__AB_DATA__*​/ markers) that this script rewrites.

   USAGE
     node tools/build-docs.js                          # uses tools/atelier-bismuth-etsy.json
     node tools/build-docs.js path/to/export.json

   AFTER
     node tools/build-standalone.js                    # rebuild the bundled HTML
   ========================================================================= */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = process.argv[2] || path.join(__dirname, 'atelier-bismuth-etsy.json');
const exp = JSON.parse(fs.readFileSync(src, 'utf8'));
const raw = (exp.products || []).filter((p) => p && p.title && p.images && p.images.length);

/* ---- helpers ------------------------------------------------------------- */
const money = (n) =>
  n == null ? '' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Original price before the running 15% sale (sale = original × 0.85)
const compareOf = (price) => (price ? Math.round(Number(price) / 0.85) : null);

function typeOf(title) {
  const t = (title || '').toLowerCase();
  if (/console|desk|table|bench|stool|chair/.test(t)) return 'Furniture';
  if (/pedestal|column|plinth|stand|monolith/.test(t)) return 'Pedestal';
  if (/mirror/.test(t)) return 'Mirror';
  if (/fountain|water feature/.test(t)) return 'Fountain';
  if (/bath|tub|basin|sink|vanity/.test(t)) return 'Bath';
  if (/fire|hearth|fireplace/.test(t)) return 'Fireplace';
  if (/lamp|light|sconce/.test(t)) return 'Lighting';
  if (/plate|bookend|wine|bowl|tray|vase|candle|incense|coaster|holder/.test(t)) return 'Home Decor';
  return 'Home Decor';
}

const decodeEntities = (s) =>
  String(s || '')
    .replace(/&quot;/g, '"').replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&nbsp;/g, ' ');

// Parse structured measurements out of the listing text. Etsy stores these in
// wildly varied forms — "Height: 30 inches Depth: 16 inches", "30tallx8widex5deep",
// "24 inches tall x 7.5 inches wide x 3.25 inches thick", "4x1x0.75 Inch" — and
// almost always in inches. Returns { W, D, H, L, dia, unit, triple }.
function parseDims(description, details) {
  const text = decodeEntities([description || '', (details || []).join(' • ')].join(' • ')).replace(/\s+/g, ' ');
  const N = '(\\d+(?:\\.\\d+)?)';
  const U = '(inches|inch|in\\b|cm|mm|")';
  const res = { unit: null };
  const setUnit = (u) => {
    if (!u) return;
    u = u.toLowerCase();
    if (/in|"/.test(u)) res.unit = res.unit || 'in';
    else if (u === 'cm') res.unit = res.unit || 'cm';
    else if (u === 'mm') res.unit = res.unit || 'mm';
  };
  const WORDS = { H: '(?:tall|high|height)', W: '(?:wide|width)', D: '(?:deep|depth|thick(?:ness)?)', L: '(?:long|length)', dia: '(?:diameter|dia\\b|Ø)' };
  for (const [key, w] of Object.entries(WORDS)) {
    // Prefer the explicit "Height: 30 inches" label form (reliable, usually in
    // Etsy's structured Item details) over loose prose like "32 34 tall".
    let m = text.match(new RegExp(w + '\\s*[:=]\\s*' + N + '\\s*' + U + '?', 'i'));
    if (!m) m = text.match(new RegExp(N + '\\s*(?:to\\s*[\\d.]+\\s*)?' + U + '?\\s*' + w, 'i')); // "30 inches tall", "5deep"
    if (m) { if (res[key] == null) res[key] = m[1]; setUnit(m[2]); }
  }
  // Bare triple fallback when we couldn't label at least two dimensions.
  const labelled = ['H', 'W', 'D', 'L', 'dia'].filter((k) => res[k] != null).length;
  if (labelled < 2) {
    const tri = text.match(new RegExp(N + '\\s*\\w{0,6}?\\s*[x×]\\s*' + N + '\\s*\\w{0,6}?\\s*[x×]\\s*' + N + '\\s*' + U + '?', 'i'));
    if (tri) { res.triple = [tri[1], tri[2], tri[3]]; setUnit(tri[4]); }
  }
  if (!res.unit) res.unit = 'in';
  return res;
}

// Compact dimension string for product cards, e.g. "W60 × D16 × H30 in".
function fmtDims(res) {
  const u = res.unit;
  const parts = [];
  if (res.dia) parts.push('Ø' + res.dia);
  if (!res.W && res.L) parts.push('L' + res.L);
  if (res.W) parts.push('W' + res.W);
  if (res.D) parts.push('D' + res.D);
  if (res.H) parts.push('H' + res.H);
  if (parts.length) return parts.join(' × ') + ' ' + u;
  if (res.triple) return res.triple.join(' × ') + ' ' + u;
  return '';
}

// Detailed spec rows for the product page, from the same parsed measurements.
function specRows(res, finishHint) {
  const u = res.unit;
  const rows = [];
  const add = (label, val) => { if (val != null) rows.push([label, val + ' ' + u]); };
  add('Width', res.W);
  add('Depth', res.D);
  add('Height', res.H);
  add('Length', !res.W ? res.L : null);
  add('Diameter', res.dia);
  if (!rows.length && res.triple) rows.push(['Dimensions', res.triple.join(' × ') + ' ' + u]);
  rows.push(['Materials', 'Solid travertine (natural stone)']);
  rows.push(['Finish', finishHint]);
  rows.push(['Edition', 'Made to order']);
  rows.push(['Lead time', '3–6 weeks']);
  return rows;
}

/* ---- build the catalog model -------------------------------------------- */
const catalog = raw.map((p) => {
  const price = p.price ? Number(p.price) : null;
  const compare = p.compare != null ? Number(p.compare) : compareOf(price); // real strike-through, fallback to 15%-off estimate
  const type = typeOf(p.title);
  const struct = parseDims(p.description, p.details);
  const finish = /chisel/i.test(p.title) ? 'Hand-chiselled' : /pebble|wabi|raw|organic/i.test(p.title) ? 'Honed, organic edge' : 'Honed';
  return {
    t: p.title,
    p: money(price),
    c: compare && price && compare > price ? money(compare) : '',
    type,
    dim: fmtDims(struct),
    img: p.images[0] || '',
    images: p.images.slice(0, 5),
    desc: decodeEntities(p.description || '').split(/\n+/).filter(Boolean).slice(0, 3).join('\n'),
    url: p.url || '',
    finish,
    __struct: struct,
  };
});

// pick the first product of a given type that has a photo
const byType = (re) => catalog.find((x) => re.test(x.type) && x.img);
const distinctImg = (used) => catalog.find((x) => x.img && !used.has(x.img));

const furniture = byType(/Furniture/);
const pedestal = byType(/Pedestal/);
const decor = byType(/Mirror|Home Decor|Fountain/);
const used = new Set();
const shot = (c) => { if (c && c.img) { used.add(c.img); return c.img; } return ''; };

const shots = {
  hero: shot(furniture) || (catalog[0] && catalog[0].img) || '',
  'col-furniture': furniture ? furniture.img : '',
  'col-pedestal': pedestal ? pedestal.img : '',
  'col-decor': decor ? decor.img : '',
  feature: shot(distinctImg(used)) || '',
  lookbook: shot(distinctImg(used)) || '',
};

// featured product for the PDP preview = first console/furniture piece
const featured = furniture || catalog[0];
const featuredPayload = featured
  ? {
      t: featured.t,
      p: featured.p,
      c: featured.c,
      type: featured.type,
      dim: featured.dim,
      images: featured.images,
      desc: featured.desc,
      url: featured.url,
      specs: specRows(featured.__struct, featured.finish),
    }
  : null;

// related = four pieces of varied type, excluding the featured one
const related = [];
const wantTypes = ['Pedestal', 'Mirror', 'Fountain', 'Fireplace', 'Bath', 'Home Decor', 'Furniture'];
for (const wt of wantTypes) {
  if (related.length >= 4) break;
  const c = catalog.find((x) => x.type === wt && x !== featured && !related.includes(x) && x.img);
  if (c) related.push({ t: c.t, p: c.p, type: c.type, img: c.img });
}

/* ---- inject between the data-island markers ----------------------------- */
function inject(file, jsBody) {
  const full = path.join(root, file);
  let html = fs.readFileSync(full, 'utf8');
  const re = /\/\*__AB_DATA__\*\/[\s\S]*?\/\*__\/AB_DATA__\*\//;
  if (!re.test(html)) throw new Error('data markers not found in ' + file);
  html = html.replace(re, '/*__AB_DATA__*/\n' + jsBody + '\n/*__/AB_DATA__*/');
  fs.writeFileSync(full, html);
  console.log('injected', catalog.length, 'products →', file);
}

const publicCatalog = catalog.map(({ __struct, finish, ...x }) => x);
const homeData =
  'window.__CATALOG__ = ' + JSON.stringify(publicCatalog) + ';\n' +
  'window.__SHOTS__ = ' + JSON.stringify(shots) + ';';
const productData =
  'window.__FEATURED__ = ' + JSON.stringify(featuredPayload) + ';\n' +
  'window.__RELATED__ = ' + JSON.stringify(related) + ';';

inject('docs/index.html', homeData);
inject('docs/product.html', productData);

console.log(`\nDone. ${catalog.length} products, ${Object.values(shots).filter(Boolean).length}/6 hero shots, featured: ${featured ? featured.t : '—'}.`);
console.log('Next: node tools/build-standalone.js');
