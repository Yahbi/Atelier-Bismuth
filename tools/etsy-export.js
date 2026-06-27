/* ============================================================================
   Atelier Bismuth — Etsy shop exporter
   ----------------------------------------------------------------------------
   Runs in YOUR browser (where you are already logged into Etsy), so it works
   even though the build environment can't reach etsy.com directly.

   HOW TO RUN
   1. Open your shop in Chrome:  https://www.etsy.com/shop/AtelierBismuth
   2. Open DevTools:  Cmd+Option+J (Mac) or Ctrl+Shift+J (Windows)
   3. If the console blocks pasting, type:  allow pasting   then Enter.
   4. Paste this whole file, press Enter, and wait. It walks every shop page
      and every listing. When it finishes it downloads:
         • atelier-bismuth-etsy.json   (titles, prices, descriptions, image URLs)
         • atelier-bismuth-images.txt  (flat list of full-res image URLs)
   5. Send both files back here. I'll turn them into a Shopify product import
      (CSV) — Shopify pulls the images straight from Etsy at import time.

   Nothing is uploaded anywhere by this script; it only reads your shop and
   saves files to your computer.
   ========================================================================= */
(async () => {
  const SHOP = (location.pathname.match(/\/shop\/([^/?#]+)/) || [])[1] || 'AtelierBismuth';
  const MAX_PAGES = 30;            // safety cap
  const PAGE_DELAY = 900;          // be polite between requests (ms)
  const LISTING_DELAY = 650;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fullRes = (u) => (u || '').replace(/il_[0-9a-zA-Z]+x[0-9A-Za-z]+/, 'il_fullxfull');
  const log = (...a) => console.log('%c[etsy-export]', 'color:#b5604f;font-weight:bold', ...a);

  // ---- 1. Collect every listing URL across all shop pages -------------------
  const listingUrls = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    let html;
    try {
      const res = await fetch(`https://www.etsy.com/shop/${SHOP}?ref=items-pagination&page=${page}`, { credentials: 'include' });
      html = await res.text();
    } catch (e) { log('page fetch failed', page, e); break; }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const before = listingUrls.size;
    doc.querySelectorAll('a[href*="/listing/"]').forEach((a) => {
      const m = a.href.match(/\/listing\/(\d+)/);
      if (m) listingUrls.add('https://www.etsy.com/listing/' + m[1]);
    });
    log(`page ${page}: ${listingUrls.size} listings found so far`);
    if (listingUrls.size === before) break;     // no new listings → done
    await sleep(PAGE_DELAY);
  }
  log(`Total unique listings: ${listingUrls.size}`);

  // ---- 2. Visit each listing, extract structured data -----------------------
  const products = [];
  const allImages = new Set();
  let i = 0;
  for (const url of listingUrls) {
    i++;
    try {
      const res = await fetch(url, { credentials: 'include' });
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Prefer JSON-LD Product data
      let ld = {};
      doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
        try {
          const j = JSON.parse(s.textContent);
          const arr = Array.isArray(j) ? j : [j];
          arr.forEach((node) => {
            const t = node['@type'] || '';
            if (t === 'Product' || (Array.isArray(t) && t.includes('Product')) || node.offers) ld = node;
          });
        } catch (e) {}
      });

      const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
      const images = (ld.image ? [].concat(ld.image) : [])
        .concat([...doc.querySelectorAll('img[src*="etsystatic"], img[data-src*="etsystatic"]')]
          .map((im) => im.getAttribute('src') || im.getAttribute('data-src')))
        .filter(Boolean)
        .map(fullRes);
      const uniqImages = [...new Set(images)].filter((u) => /il_fullxfull/.test(u) || /etsystatic/.test(u)).slice(0, 12);
      uniqImages.forEach((u) => allImages.add(u));

      // overview "Item details" bullets often hold dimensions/materials
      const details = [...doc.querySelectorAll('#product-details-content-toggle li, [data-product-details] li, .wt-content-toggle li')]
        .map((li) => li.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30);

      products.push({
        url,
        listing_id: (url.match(/\/listing\/(\d+)/) || [])[1],
        title: (ld.name || doc.querySelector('h1')?.textContent || doc.title || '').replace(/\s+/g, ' ').trim(),
        price: offer?.price || null,
        currency: offer?.priceCurrency || null,
        availability: offer?.availability || null,
        sku: ld.sku || ld.mpn || null,
        description: (ld.description || '').replace(/\r/g, '').trim(),
        details,
        images: uniqImages,
      });
      log(`(${i}/${listingUrls.size}) ${products[products.length - 1].title} — ${uniqImages.length} images`);
      await sleep(LISTING_DELAY);
    } catch (e) {
      log('listing failed', url, e);
    }
  }

  // ---- 3. Download results --------------------------------------------------
  const dl = (name, text, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  };
  dl('atelier-bismuth-etsy.json', JSON.stringify({ shop: SHOP, exported_at: new Date().toISOString(), count: products.length, products }, null, 2), 'application/json');
  dl('atelier-bismuth-images.txt', [...allImages].join('\n'), 'text/plain');

  log(`DONE — ${products.length} products, ${allImages.size} images. Two files were downloaded.`);
  console.table(products.map((p) => ({ title: p.title, price: p.price, images: p.images.length })));
})();
