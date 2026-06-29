#!/usr/bin/env python3
"""Compare live Shopify variant prices against Etsy source data (sale/0.85 = regular)."""
import json, glob, os, sys

SCRATCH = "/tmp/claude-0/-home-user-Atelier-Bismuth/890403cf-6132-5fc3-8834-c6722cfbd923/scratchpad"
ETSY = "tools/etsy-full-export.json"
SALE = 0.85  # Etsy shop-wide 15% off -> regular = sale / 0.85

def norm(v):
    v = (v or "").lower().strip()
    for ch in ['"', '“', '”', '″']:
        v = v.replace(ch, '')
    for suf in [' inches', 'inches', ' inch', 'inch']:
        v = v.replace(suf, '')
    v = v.replace(' ', '').strip()
    return v

def target_regular(sale_price):
    try:
        s = float(sale_price)
    except (TypeError, ValueError):
        return None
    return round(s / SALE, 2)

# ---- load etsy ----
etsy = json.load(open(ETSY))

# Build per-listing offering maps keyed by normalized value-set (frozenset).
# Also keep single-price (price_low) for no-offering listings.
etsy_listings = []
for it in etsy:
    h = it.get('handle') or ''
    if not h:
        continue
    offmap = {}
    for o in it.get('variation_offerings') or []:
        vals = []
        for k in ('option1_value', 'option2_value', 'option3_value'):
            vv = o.get(k)
            if vv:
                vals.append(norm(vv))
        if not vals:
            continue
        key = frozenset(vals)
        tr = target_regular(o.get('price'))
        if tr is not None:
            offmap[key] = (tr, float(o['price']), o.get('price_source'))
    single = None
    if not offmap:
        pl = it.get('price_low') or it.get('price')
        single = target_regular(pl)
    etsy_listings.append({'handle': h, 'title': it.get('title'), 'offmap': offmap,
                          'single': single, 'on_sale': it.get('on_sale')})

# ---- load live pages ----
pages = sorted(glob.glob(os.path.join(SCRATCH, 'live', 'page_*.json')))
live_products = []
for p in pages:
    d = json.load(open(p))
    nodes = d['data']['products']['nodes']
    live_products.extend(nodes)

print(f"Live products: {len(live_products)}  | Etsy listings: {len(etsy_listings)}")

# ---- match each live product to best etsy listing (prefix) ----
def match_listing(sh_handle):
    cands = []
    for el in etsy_listings:
        eh = el['handle']
        if sh_handle == eh or sh_handle.startswith(eh) or eh.startswith(sh_handle):
            cands.append((len(os.path.commonprefix([sh_handle, eh])), el))
    if not cands:
        return None
    cands.sort(key=lambda x: -x[0])
    return cands[0][1]

mismatches = []
matched_ok = 0
no_etsy = []
no_offer_match = 0
corrections = {}  # product_gid -> list of {id, price}

for prod in live_products:
    sh = prod['handle']
    status = prod['status']
    el = match_listing(sh)
    if not el:
        no_etsy.append((sh, prod['title'], status))
        continue
    pid = prod['id']
    for v in prod['variants']['nodes']:
        opts = [norm(o['value']) for o in v['selectedOptions'] if o['value'] != 'Default Title']
        live_price = float(v['price'])
        target = None; src = None; sale = None
        if opts:
            key = frozenset(opts)
            if key in el['offmap']:
                target, sale, src = el['offmap'][key]
        if target is None:
            # single-variant or unmatched option combo
            if not opts and el['single'] is not None:
                target = el['single']; src = 'single'
            else:
                no_offer_match += 1
                continue
        if abs(live_price - target) <= 0.5:
            matched_ok += 1
        else:
            mismatches.append({
                'handle': sh, 'title': prod['title'], 'status': status,
                'variant_id': v['id'], 'options': [o['value'] for o in v['selectedOptions']],
                'live': live_price, 'target': target, 'etsy_sale': sale, 'src': src
            })
            corrections.setdefault(pid, []).append({'id': v['id'], 'price': f"{target:.2f}"})

print(f"Matched OK: {matched_ok}")
print(f"MISMATCHES: {len(mismatches)}")
print(f"Live variants with no Etsy offering match (skipped): {no_offer_match}")
print(f"Live products with NO Etsy listing match: {len(no_etsy)}")

# group mismatches by product
from collections import defaultdict
bygroup = defaultdict(list)
for m in mismatches:
    bygroup[(m['handle'], m['title'], m['status'])].append(m)

print("\n==== MISMATCHES BY PRODUCT ====")
for (h, t, st), ms in sorted(bygroup.items(), key=lambda x: -len(x[1])):
    print(f"\n[{st}] {t}  ({len(ms)} variants)")
    print(f"   handle: {h}")
    for m in ms[:6]:
        print(f"   {m['options']}: live=${m['live']:.0f}  ->  target=${m['target']:.0f} (etsy sale ${m['etsy_sale']}, {m['src']})")
    if len(ms) > 6:
        print(f"   ... +{len(ms)-6} more")

print("\n==== PRODUCTS WITH NO ETSY MATCH ====")
for sh, t, st in no_etsy:
    print(f"   [{st}] {t}  ({sh})")

json.dump(mismatches, open(os.path.join(SCRATCH, 'mismatches.json'), 'w'), indent=1)
json.dump(corrections, open(os.path.join(SCRATCH, 'corrections.json'), 'w'), indent=1)
tot = sum(len(v) for v in corrections.values())
print(f"\nWrote corrections for {tot} variants across {len(corrections)} products -> corrections.json")
