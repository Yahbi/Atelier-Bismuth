/* ============================================================================
   Atelier Bismuth — Shopify product import builder
   ----------------------------------------------------------------------------
   Reads tools/catalog.json (normalized from the Etsy listings export) and emits
   tools/products_shopify_import.csv in Shopify's product CSV format:
     • 101 products, unique handles
     • size variants from the Etsy variations (Option1 / Option2)
     • prices + the 15% compare-at strike-through
     • up to 10 images per product (Shopify fetches etsystatic URLs at import)
     • collection tags: category, sub-group, New Arrivals, Best Sellers
     • metafields: dimensions, materials, finish, edition, lead time, care

   Import in Shopify: Products → Import → upload this CSV (products land as
   DRAFT so you can review before publishing). Then build the collections in
   SHOPIFY-SETUP.md.
   USAGE:  node tools/build-shopify.js
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));

const EXCLUDE = /\bfee\b|shipping replacement|custom order for|\bdeposit\b|reserved for|gift ?card|add[- ]?on|payment plan|balance due/i;
let P = data.products.filter((p) => !EXCLUDE.test(p.title));
const seenH = {};
P.forEach((p) => { let h = p.handle || 'piece'; if (seenH[h]) { seenH[h] += 1; h = h + '-' + seenH[h]; } else { seenH[h] = 1; } p.handle = h; });

// SAME classifier as the storefront (keep taxonomy identical)
function classify(title) {
  const t = String(title).toLowerCase();
  const F = 'Furniture', D = 'Objects & Decor';
  const has = (...w) => w.some((x) => t.includes(x));
  if (has('bed frame')) return [F, 'Benches'];
  if (has('vanity', 'bathtub', 'bath tub', 'soaking tub', 'basin', 'sink console')) return [F, 'Baths & Vanities'];
  if (has('console', 'coffee table', 'side table', 'dining table', 'banquet', 'waterfall', 'tv stand', 'workstation', 'reception', 'front desk') || (has('desk') && !has('cable'))) return [F, 'Tables & Consoles'];
  if (has('bench', 'sofa', 'settee', 'seating')) return [F, 'Benches'];
  if (has('fireplace', 'hearth', 'fire pit')) return [F, 'Fireplaces'];
  if (has('mirror')) return [D, 'Mirrors'];
  if (has('bookend', 'book end', 'bookstop', 'bookshelf')) return [D, 'Book Ends'];
  if (has('card holder', 'cardholder', 'place card')) return [D, 'Objects'];
  if (has('fountain', 'water feature', 'water element')) return [D, 'Fountains'];
  if (has('plate', 'tray', 'trivet', 'board', 'coaster')) return [D, 'Plates & Trays'];
  if (has('candle', 'candlestick')) return [D, 'Candle Holders'];
  if (has('cutlery rest', 'chopstick')) return [D, 'Objects'];
  if (has('jewelry', 'jewellery')) return [D, 'Objects'];
  if (has('knob', 'door pull', 'hook', 'cable', 'soap', 'blocks', 'chunk', 'boulder', 'accent stone', 'prop', 'wine')) return [D, 'Objects'];
  if (has('floating shelf', 'shelf', 'mantle', 'mantel')) return [F, 'Shelves'];
  if (has('pedestal', 'column', 'plinth', 'monolith', 'cylinder')) return [F, 'Pedestals'];
  if (has('table')) return [F, 'Tables & Consoles'];
  if (has('stand', 'block')) return [F, 'Pedestals'];
  return [D, 'Objects'];
}
P.forEach((p) => { const [c, g] = classify(p.title); p.category = c; p.group = g; });

// curation tags (same rules as storefront)
P.forEach((p, i) => { p.newArrival = i < 12; });
const FURN_ORDER = ['Tables & Consoles', 'Pedestals', 'Shelves', 'Baths & Vanities', 'Fireplaces', 'Benches', 'Mirrors', 'Fountains', 'Candle Holders', 'Book Ends', 'Plates & Trays', 'Objects'];
const bsPicked = new Set();
FURN_ORDER.forEach((g) => { const c = P.find((x) => x.group === g && x.images.length && !x.newArrival && !bsPicked.has(x.handle)); if (c) bsPicked.add(c.handle); });
P.forEach((p) => { p.bestSeller = bsPicked.has(p.handle); });

const decode = (s) => String(s || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
function dims(p) {
  const t = decode(p.description).replace(/\s+/g, ' ');
  const N = '(\\d+(?:\\.\\d+)?)';
  const g = (w) => { const m = t.match(new RegExp(w + '\\s*[:=]?\\s*' + N + '\\s*(?:inches|inch|in\\b|")', 'i')) || t.match(new RegExp(N + '\\s*(?:inches|inch|in\\b|")\\s*' + w, 'i')); return m ? m[1] : null; };
  const W = g('(?:wide|width|w)'), D = g('(?:deep|depth|thick|d)'), H = g('(?:tall|high|height|h)');
  const parts = [];
  if (W) parts.push('W ' + W + '″'); if (D) parts.push('D ' + D + '″'); if (H) parts.push('H ' + H + '″');
  return parts.join(' · ');
}
const csv = (v) => { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

const META = [['specs.dimensions', 'single_line_text_field'], ['specs.materials', 'single_line_text_field'], ['specs.finish', 'single_line_text_field'], ['specs.edition', 'single_line_text_field'], ['specs.lead_time', 'single_line_text_field'], ['specs.care', 'multi_line_text_field'], ['specs.origin', 'single_line_text_field']];
const headers = ['Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
  'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy', 'Variant Fulfillment Service',
  'Variant Price', 'Variant Compare At Price', 'Variant Requires Shipping', 'Variant Taxable',
  'Image Src', 'Image Position', 'Image Alt Text', 'Status',
  ...META.map(([mf, type]) => `Metafield: ${mf} [${type}]`)];

const rows = [headers];
let variantCount = 0;

P.forEach((p) => {
  const handle = p.handle;
  const price = p.price != null ? Number(p.price).toFixed(2) : '';
  const compare = p.compare && p.compare > p.price ? Number(p.compare).toFixed(2) : '';
  const body = `<p>${decode(p.description).split(/\n+/).map((s) => s.trim()).filter(Boolean).join('</p><p>')}</p>`;
  const tags = [p.category, p.group, p.subtype, p.newArrival ? 'New Arrivals' : null, p.bestSeller ? 'Best Sellers' : null].filter(Boolean).join(', ');
  const meta = {
    'specs.dimensions': dims(p) || (p.variations[0] ? p.variations[0].type + ' options: ' + p.variations[0].values.join(', ') + '″' : ''),
    'specs.materials': (p.materials && p.materials.length ? p.materials.slice(0, 4).join(', ') : 'Solid travertine (natural stone)'),
    'specs.finish': /chisel/i.test(p.title) ? 'Hand-chiselled' : /pebble|wabi|raw|organic/i.test(p.title) ? 'Honed, organic edge' : 'Honed',
    'specs.edition': 'Made to order',
    'specs.lead_time': '3–6 weeks',
    'specs.care': 'Seal on installation and re-seal periodically. Wipe with a soft, damp cloth; avoid acidic cleaners on natural stone.',
    'specs.origin': 'Hand-finished in Los Angeles',
  };

  // build option combinations (1 or 2 options), cap at 100 variants
  const o1 = p.variations[0] || null;
  const o2 = p.variations[1] || null;
  let combos = [];
  if (o1 && o2) { o1.values.forEach((a) => o2.values.forEach((b) => combos.push([a, b]))); }
  else if (o1) { combos = o1.values.map((a) => [a, null]); }
  else { combos = [[null, null]]; }
  if (combos.length > 100) combos = combos.slice(0, 100);

  const imgs = p.images.slice(0, 10);
  // number of CSV rows = max(variant rows, image rows)
  const nRows = Math.max(combos.length, imgs.length, 1);
  for (let i = 0; i < nRows; i++) {
    const first = i === 0;
    const combo = combos[i];
    const img = imgs[i];
    const row = {};
    row['Handle'] = handle;
    if (first) {
      row['Title'] = p.title; row['Body (HTML)'] = body; row['Vendor'] = 'Atelier Bismuth';
      row['Type'] = p.group; row['Tags'] = tags; row['Published'] = 'FALSE'; row['Status'] = 'draft';
      META.forEach(([mf]) => { row[`Metafield: ${mf} [${META.find((m) => m[0] === mf)[1]}]`] = meta[mf]; });
    }
    // variant fields (one per combo row)
    if (combo) {
      variantCount++;
      row['Option1 Name'] = o1 ? o1.type : 'Title';
      row['Option1 Value'] = combo[0] != null ? combo[0] + (o1 && /width|height|length|depth|diameter|size/i.test(o1.type) ? '″' : '') : 'Default Title';
      if (o2) { row['Option2 Name'] = o2.type; row['Option2 Value'] = combo[1] + '″'; }
      row['Variant SKU'] = (handle.toUpperCase().replace(/-/g, '').slice(0, 12) + (combo[0] != null ? '-' + combo[0] : '') + (combo[1] != null ? 'x' + combo[1] : ''));
      row['Variant Grams'] = ''; row['Variant Inventory Tracker'] = 'shopify';
      row['Variant Inventory Qty'] = p.qty != null ? Math.max(p.qty, combos.length) : 5;
      row['Variant Inventory Policy'] = 'continue'; row['Variant Fulfillment Service'] = 'manual';
      row['Variant Price'] = price; row['Variant Compare At Price'] = compare;
      row['Variant Requires Shipping'] = 'TRUE'; row['Variant Taxable'] = 'TRUE';
    }
    if (img) { row['Image Src'] = img; row['Image Position'] = String(i + 1); row['Image Alt Text'] = p.title; }
    rows.push(headers.map((h) => csv(row[h] != null ? row[h] : '')));
  }
});

const out = path.join(__dirname, 'products_shopify_import.csv');
fs.writeFileSync(out, rows.map((r) => r.join(',')).join('\n'));
console.log(`Wrote ${out}`);
console.log(`${P.length} products · ${variantCount} variants · ${rows.length - 1} CSV rows`);
console.log(`Furniture: ${P.filter((p) => p.category === 'Furniture').length} · Objects & Decor: ${P.filter((p) => p.category === 'Objects & Decor').length}`);
console.log(`New Arrivals tag: ${P.filter((p) => p.newArrival).length} · Best Sellers tag: ${P.filter((p) => p.bestSeller).length}`);
