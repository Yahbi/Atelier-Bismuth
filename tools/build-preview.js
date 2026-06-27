/* ============================================================================
   Atelier Bismuth — static-preview catalog builder
   ----------------------------------------------------------------------------
   Turns the Etsy export (tools/atelier-bismuth-etsy.json, produced by
   tools/etsy-export.js) into docs/catalog.js — a single `window.AB_CATALOG`
   array that both docs/index.html and docs/product.html render from. The real
   etsystatic image URLs are embedded as-is; the viewer's browser fetches them
   directly when the GitHub Pages preview loads (this build box can't reach
   etsystatic, but end-viewers can).

   USAGE
     node tools/build-preview.js                          # uses tools/atelier-bismuth-etsy.json
     node tools/build-preview.js path/to/export.json      # explicit input

   OUTPUT
     docs/catalog.js   (window.AB_CATALOG = [...])
   ========================================================================= */
const fs = require('fs');
const path = require('path');

const SALE = 0.85; // shop-wide 15% sale: shown price is discounted, compare-at = original

/* ---- helpers ------------------------------------------------------------- */
const handleize = (s) =>
  String(s || 'piece').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);

const usd = (n) =>
  n == null || isNaN(n) ? '' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function typeFor(title) {
  const t = String(title || '').toLowerCase();
  if (/console|desk|table|bench|stool|chair/.test(t)) return 'Furniture';
  if (/pedestal|column|plinth|stand/.test(t)) return 'Pedestal';
  if (/mirror/.test(t)) return 'Mirror';
  if (/fountain|water feature/.test(t)) return 'Fountain';
  if (/bath|tub|basin|sink|vanity/.test(t)) return 'Bath';
  if (/fire|hearth|fireplace/.test(t)) return 'Fireplace';
  if (/shelf|shelves|bookend/.test(t)) return 'Shelf';
  if (/plate|tray|bowl|vase|wine|candle|object|decor/.test(t)) return 'Home Decor';
  return 'Home Decor';
}

function collectionsFor(type, title) {
  const t = (type + ' ' + title).toLowerCase();
  const tags = new Set();
  if (/console|desk|table|bench|stool|chair|furniture/.test(t)) tags.add('Furniture');
  if (/pedestal|column|plinth|stand/.test(t)) tags.add('Pedestals');
  if (/mirror/.test(t)) tags.add('Mirrors');
  if (/fountain|water/.test(t)) tags.add('Fountains');
  if (/bath|tub|basin|sink|vanity/.test(t)) tags.add('Bath');
  if (/fire|hearth|fireplace/.test(t)) tags.add('Fireplaces');
  if (/plate|bookend|wine|bowl|tray|vase|object|decor|candle/.test(t)) tags.add('Home Decor');
  if (/fire|hearth|fireplace|fountain|bath|tub/.test(t)) tags.add('Furniture');
  if (tags.size === 0) tags.add('Home Decor');
  return [...tags];
}

// Parse a dimension, keeping its unit. Returns e.g. "160 cm" or "" .
function parseDimsRich(text) {
  const out = {};
  if (!text) return out;
  const s = text.replace(/\s+/g, ' ');
  const num = '([\\d.,]+)';
  const unit = '(cm|mm|m|"|in|inch|inches|kg|kgs|lb|lbs)';
  // Boundaries (?<![a-z]) / (?![a-z]) keep single-letter aliases (w/d/h) from
  // matching letters inside other words (e.g. the "h" in "widt-h").
  const grab = (label) => {
    const m = s.match(new RegExp('(?<![a-z])(?:' + label + ')(?![a-z])\\s*[:=]?\\s*' + num + '\\s*' + unit, 'i'));
    return m ? m[1].replace(',', '.') + ' ' + normUnit(m[2]) : '';
  };
  out.width = grab('width|wide|w');
  out.depth = grab('depth|deep|d');
  out.height = grab('height|high|tall|h');
  out.diameter = grab('diameter|dia|Ø');
  // W x D x H pattern, e.g. 160 x 40 x 85 cm
  const wxh = s.match(new RegExp(num + '\\s*[x×]\\s*' + num + '\\s*[x×]\\s*' + num + '\\s*' + unit, 'i'));
  if (wxh) {
    const u = normUnit(wxh[4]);
    out.width = out.width || wxh[1].replace(',', '.') + ' ' + u;
    out.depth = out.depth || wxh[2].replace(',', '.') + ' ' + u;
    out.height = out.height || wxh[3].replace(',', '.') + ' ' + u;
  }
  const wt = s.match(new RegExp(num + '\\s*(kg|kgs|lb|lbs|pounds)', 'i'));
  if (wt) out.weight = wt[1].replace(',', '.') + ' ' + (/lb|pound/i.test(wt[2]) ? 'lb' : 'kg');
  Object.keys(out).forEach((k) => { if (!out[k]) delete out[k]; });
  return out;
}
const normUnit = (u) => {
  u = u.toLowerCase();
  if (u === '"' || u === 'in' || u === 'inch' || u === 'inches') return 'in';
  if (u === 'kgs') return 'kg';
  if (u === 'lbs') return 'lb';
  return u;
};

// Short summary like "W160 × D40 × H85 cm" or "Ø30 × H120 cm"
function dimsSummary(d) {
  const v = (x) => (x || '').replace(/\s*(cm|mm|m|in|kg|lb)\b/i, '').trim();
  const u = (x) => { const m = (x || '').match(/(cm|mm|m|in)\b/i); return m ? m[1] : ''; };
  if (d.width && d.depth && d.height) return `W${v(d.width)} × D${v(d.depth)} × H${v(d.height)} ${u(d.height) || 'cm'}`;
  if (d.diameter && d.height) return `Ø${v(d.diameter)} × H${v(d.height)} ${u(d.height) || 'cm'}`;
  if (d.width && d.height) return `W${v(d.width)} × H${v(d.height)} ${u(d.height) || 'cm'}`;
  if (d.height) return `H${v(d.height)} ${u(d.height) || 'cm'}`;
  return '';
}

function descHtml(desc) {
  if (!desc) return '';
  return desc
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');
}
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---- assemble ------------------------------------------------------------ */
const input = process.argv[2] || path.join(__dirname, 'atelier-bismuth-etsy.json');
if (!fs.existsSync(input)) {
  console.error(`No export found at ${input}. Run tools/etsy-export.js in your browser first.`);
  process.exit(1);
}
const exp = JSON.parse(fs.readFileSync(input, 'utf8'));
const src = exp.products || [];

const seenHandles = new Set();
const catalog = src.map((p) => {
  const title = (p.title || '').replace(/\s+/g, ' ').trim() || 'Travertine piece';
  let handle = handleize(title);
  while (seenHandles.has(handle)) handle += '-x';
  seenHandles.add(handle);

  const priceNum = p.price != null && p.price !== '' ? Number(p.price) : null;
  const compareNum = priceNum != null ? Math.round(priceNum / SALE) : null;
  const type = typeFor(title);
  const dims = parseDimsRich([p.description, (p.details || []).join(' ')].join(' '));
  const images = (p.images || []).filter((u) => /^https?:\/\//.test(u)).slice(0, 8);

  const specs = {
    Width: dims.width || '',
    Depth: dims.depth || '',
    Height: dims.height || '',
    Diameter: dims.diameter || '',
    Weight: dims.weight || '',
    Materials: 'Solid travertine (natural stone)',
    Finish: /chisel/i.test(title) ? 'Hand-chiselled' : /pebble|wabi/i.test(title) ? 'Honed, organic edge' : 'Honed',
    Edition: 'Made to order',
    'Lead time': '3–6 weeks',
    Origin: 'Hand-finished by Atelier Bismuth',
  };

  return {
    handle,
    title,
    type,
    collections: collectionsFor(type, title),
    price: usd(priceNum),
    compareAt: compareNum ? usd(compareNum) : '',
    dims: dimsSummary(dims),
    specs,
    descHtml: descHtml(p.description) ||
      `<p>A solid travertine ${type.toLowerCase()} from Atelier Bismuth — cut from natural stone and finished by hand. Full dimensions in the specifications.</p>`,
    images,
    url: p.url || '',
  };
});

const out = path.join(__dirname, '..', 'docs', 'catalog.js');
const banner = `/* Generated by tools/build-preview.js from the Etsy export — do not edit by hand.
   ${catalog.length} products · source: ${path.basename(input)}${exp.exported_at ? ' · exported ' + exp.exported_at : ''} */\n`;
fs.writeFileSync(out, banner + 'window.AB_CATALOG = ' + JSON.stringify(catalog, null, 2) + ';\n');
const withImgs = catalog.filter((c) => c.images.length).length;
console.log(`Wrote ${out} — ${catalog.length} products (${withImgs} with images).`);
