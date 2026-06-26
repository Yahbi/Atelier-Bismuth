/* ============================================================================
   Atelier Bismuth — catalog builder
   ----------------------------------------------------------------------------
   Turns the Etsy export (from tools/etsy-export.js) into a Shopify product
   import CSV, complete with collection tags, dimension metafields, and image
   URLs. Shopify fetches the etsystatic image URLs server-side at import time.

   USAGE
     node tools/build-catalog.js                      # writes seed CSV (12 demo rows from the shop)
     node tools/build-catalog.js atelier-bismuth-etsy.json   # full catalog from the export

   OUTPUT
     tools/products_shopify_import.csv
   ========================================================================= */
const fs = require('fs');
const path = require('path');

/* ---- Seed data: the real pieces visible on the shop (prices incl. the
   running 15% sale → price = discounted, compare-at = original). Titles are
   provisional until replaced by the exact Etsy text via the export JSON. ---- */
const SEED = [
  { title: 'Travertine Stone Console Table with Chiseled Legs', price: 3399.15, compare: 3999.0, type: 'Furniture' },
  { title: 'Travertine Stone Console Table with Chiseled Base', price: 3391.5, compare: 3990.0, type: 'Furniture' },
  { title: 'Asymmetrical Pebble Mirror — Wabi-Sabi Travertine', price: 679.15, compare: 799.0, type: 'Mirror' },
  { title: 'Travertine Pedestal Column — Sculptural Plinth', price: 297.5, compare: 350.0, type: 'Pedestal' },
  { title: 'Travertine Fountain Column — Sculptural Water Feature', price: 764.15, compare: 899.0, type: 'Fountain' },
  { title: 'Travertine Pedestal Column — Sculptural Stand', price: 1700.0, compare: 2000.0, type: 'Pedestal' },
  { title: 'Travertine Stone Console Desk with Chiseled Detail', price: 10115.0, compare: 11900.0, type: 'Furniture' },
  { title: 'Natural Travertine Solid Stone Gas Fire Table', price: 11041.5, compare: 12990.0, type: 'Fire Table' },
  { title: 'Travertine Pedestal Column — Sculptural Display', price: 1870.0, compare: 2200.0, type: 'Pedestal' },
  { title: 'Travertine Solid Stone Bathtub — Luxury Soaking Tub', price: 14449.15, compare: 16999.0, type: 'Bath' },
  { title: 'Natural Travertine Solid Stone Wine Bottle Holder', price: 8415.0, compare: 9900.0, type: 'Decor' },
  { title: 'Chiseled Travertine Fireplace Hearth — Natural Stone', price: 3315.0, compare: 3900.0, type: 'Fireplace' },
];

/* ---- helpers ------------------------------------------------------------- */
const handleize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

// Map an Etsy "type"/title to a collection tag set
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
  if (tags.size === 0) tags.add('Home Decor');
  // Furniture is the umbrella for the larger pieces too
  if (/fire|hearth|fireplace|fountain|bath|tub/.test(t)) tags.add('Furniture');
  return [...tags];
}

// Parse dimensions out of free text (description + detail bullets)
function parseDims(text) {
  const out = {};
  if (!text) return out;
  const s = text.replace(/\s+/g, ' ');
  const num = '([\\d.,]+)';
  const grab = (re) => { const m = s.match(re); return m ? m[1].replace(',', '.') : null; };
  out.width = grab(new RegExp('(?:width|wide|w)\\s*[:=]?\\s*' + num + '\\s*(?:cm|"|in|inch)', 'i'));
  out.depth = grab(new RegExp('(?:depth|deep|d)\\s*[:=]?\\s*' + num + '\\s*(?:cm|"|in|inch)', 'i'));
  out.height = grab(new RegExp('(?:height|high|tall|h)\\s*[:=]?\\s*' + num + '\\s*(?:cm|"|in|inch)', 'i'));
  out.diameter = grab(new RegExp('(?:diameter|dia|Ø)\\s*[:=]?\\s*' + num + '\\s*(?:cm|"|in|inch)', 'i'));
  out.weight = grab(new RegExp(num + '\\s*(?:kg|kgs|lb|lbs|pounds)', 'i'));
  // W x D x H pattern e.g. 120 x 40 x 75 cm
  const wxh = s.match(new RegExp(num + '\\s*[x×]\\s*' + num + '\\s*[x×]\\s*' + num + '\\s*(cm|"|in|inch)', 'i'));
  if (wxh) { out.width = out.width || wxh[1]; out.depth = out.depth || wxh[2]; out.height = out.height || wxh[3]; }
  Object.keys(out).forEach((k) => { if (!out[k]) delete out[k]; });
  return out;
}

/* ---- assemble rows ------------------------------------------------------- */
const arg = process.argv[2];
let items = SEED.map((s) => ({ ...s, images: [], description: '', details: [] }));
if (arg) {
  const exp = JSON.parse(fs.readFileSync(arg, 'utf8'));
  items = (exp.products || []).map((p) => ({
    title: p.title,
    price: p.price ? Number(p.price) : null,
    compare: null,
    type: p.title && /console|desk|table|bench/i.test(p.title) ? 'Furniture'
      : p.title && /pedestal|column/i.test(p.title) ? 'Pedestal'
      : p.title && /mirror/i.test(p.title) ? 'Mirror'
      : p.title && /fountain/i.test(p.title) ? 'Fountain'
      : p.title && /bath|tub/i.test(p.title) ? 'Bath'
      : p.title && /fire|hearth/i.test(p.title) ? 'Fireplace' : 'Home Decor',
    images: p.images || [],
    description: p.description || '',
    details: p.details || [],
  }));
  console.log(`Loaded ${items.length} products from ${arg}`);
}

const META = [
  ['specs.width', 'width', 'single_line_text_field'],
  ['specs.depth', 'depth', 'single_line_text_field'],
  ['specs.height', 'height', 'single_line_text_field'],
  ['specs.diameter', 'diameter', 'single_line_text_field'],
  ['specs.weight', 'weight', 'single_line_text_field'],
  ['specs.materials', 'materials', 'single_line_text_field'],
  ['specs.finish', 'finish', 'single_line_text_field'],
  ['specs.edition', 'edition', 'single_line_text_field'],
  ['specs.origin', 'origin', 'single_line_text_field'],
  ['specs.lead_time', 'lead_time', 'single_line_text_field'],
  ['specs.care', 'care', 'multi_line_text_field'],
];

const headers = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value', 'Variant SKU', 'Variant Grams',
  'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
  'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price',
  'Variant Requires Shipping', 'Variant Taxable', 'Image Src', 'Image Position', 'Image Alt Text', 'Status',
  ...META.map(([mf, , type]) => `Metafield: ${mf} [${type}]`),
];

const rows = [headers];

items.forEach((it) => {
  const handle = handleize(it.title || 'piece');
  const dims = parseDims([it.description, (it.details || []).join(' ')].join(' '));
  const tags = collectionsFor(it.type, it.title);
  const body = it.description
    ? `<p>${it.description.replace(/\n+/g, '</p><p>')}</p>`
    : `<p>A solid travertine ${it.type.toLowerCase()} from Atelier Bismuth — cut from natural stone and finished by hand. Full dimensions listed in specifications.</p>`;

  const meta = {
    'specs.width': dims.width || '',
    'specs.depth': dims.depth || '',
    'specs.height': dims.height || '',
    'specs.diameter': dims.diameter || '',
    'specs.weight': dims.weight ? dims.weight + ' kg' : '',
    'specs.materials': 'Solid travertine (natural stone)',
    'specs.finish': /chisel/i.test(it.title) ? 'Hand-chiselled' : /pebble|wabi/i.test(it.title) ? 'Honed, organic edge' : 'Honed',
    'specs.edition': 'Made to order',
    'specs.origin': 'Hand-finished by Atelier Bismuth',
    'specs.lead_time': '3–6 weeks',
    'specs.care': 'Seal on installation and re-seal periodically. Wipe with a soft, damp cloth; avoid acidic cleaners on natural stone.',
  };

  const firstImg = it.images[0] || '';
  const base = {
    Handle: handle, Title: it.title, 'Body (HTML)': body, Vendor: 'Atelier Bismuth', Type: it.type,
    Tags: tags.join(', '), Published: 'FALSE', 'Option1 Name': 'Title', 'Option1 Value': 'Default Title',
    'Variant SKU': handle.toUpperCase().replace(/-/g, '').slice(0, 16),
    'Variant Grams': '', 'Variant Inventory Tracker': 'shopify', 'Variant Inventory Qty': '1',
    'Variant Inventory Policy': 'deny', 'Variant Fulfillment Service': 'manual',
    'Variant Price': it.price != null ? it.price.toFixed(2) : '', 'Variant Compare At Price': it.compare ? it.compare.toFixed(2) : '',
    'Variant Requires Shipping': 'TRUE', 'Variant Taxable': 'TRUE',
    'Image Src': firstImg, 'Image Position': firstImg ? '1' : '', 'Image Alt Text': firstImg ? it.title : '',
    Status: 'draft',
  };
  rows.push(headers.map((h) => {
    const mfMatch = h.match(/^Metafield: (\S+)/);
    if (mfMatch) return meta[mfMatch[1]] || '';
    return base[h] != null ? base[h] : '';
  }));

  // additional image rows (Shopify wants one row per extra image, handle only)
  it.images.slice(1).forEach((img, idx) => {
    const r = headers.map((h) => {
      if (h === 'Handle') return handle;
      if (h === 'Image Src') return img;
      if (h === 'Image Position') return String(idx + 2);
      if (h === 'Image Alt Text') return it.title;
      return '';
    });
    rows.push(r);
  });
});

const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
const outPath = path.join(__dirname, 'products_shopify_import.csv');
fs.writeFileSync(outPath, csv);
console.log(`Wrote ${outPath} — ${items.length} products, ${rows.length - 1} CSV rows.`);
