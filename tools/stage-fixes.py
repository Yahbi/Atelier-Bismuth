#!/usr/bin/env python3
"""Stage deterministic Admin-API fixes offline from the local live snapshot + Etsy data.
Produces ready-to-fire GraphQL mutation files + human-readable diffs.
Covers: title light-cleanup, Charcoal 16-20 monotonicity (M1), D1 W48 shelves,
and a broad monotonicity sweep over ACTIVE multi-size products."""
import json, glob, os, re
from collections import defaultdict

SCRATCH = "/tmp/claude-0/-home-user-Atelier-Bismuth/890403cf-6132-5fc3-8834-c6722cfbd923/scratchpad"
OUT = os.path.join(SCRATCH, "staged")
os.makedirs(OUT, exist_ok=True)

live = []
for p in sorted(glob.glob(os.path.join(SCRATCH, 'live', 'page_*.json'))):
    live.extend(json.load(open(p))['data']['products']['nodes'])

# --- patch snapshot with corrections already applied this session (so sweep sees true state) ---
applied = {
    # D1 W48 shelves (idempotent target)
    "gid://shopify/ProductVariant/45568143982771": "1749.00",
    "gid://shopify/ProductVariant/45568144015539": "1849.00",
    "gid://shopify/ProductVariant/45568144048307": "1949.00",
    "gid://shopify/ProductVariant/45568150503603": "1749.00",
    "gid://shopify/ProductVariant/45568150536371": "1849.00",
    "gid://shopify/ProductVariant/45568150569139": "1949.00",
    "gid://shopify/ProductVariant/45568163807411": "1749.00",
    "gid://shopify/ProductVariant/45568163840179": "1849.00",
    "gid://shopify/ProductVariant/45568163872947": "1949.00",
}
# load the 57 corrections too
corr = json.load(open(os.path.join(SCRATCH, 'corrections2.json')))
for pid, vs in corr.items():
    for v in vs:
        applied[v['id']] = v['price']
for prod in live:
    for v in prod['variants']['nodes']:
        if v['id'] in applied:
            v['price'] = applied[v['id']]

# ============ 1. TITLE LIGHT-CLEANUP ============
def clean_title(t):
    segs = [s.strip() for s in t.split(' - ')]
    out = []
    seen = set()
    for s in segs:
        low = s.lower().strip().rstrip('.')
        if low in ('gift', 'gifts'):
            continue
        # drop exact duplicate segments (case-insensitive), keep first
        key = low
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
    new = ' - '.join(out)
    # also strip a trailing standalone " GIFT" not separated by dash
    new = re.sub(r'\s*[-–]?\s*\bGIFT\b\s*$', '', new, flags=re.I).strip()
    new = re.sub(r'\s{2,}', ' ', new).strip(' -–')
    return new

title_changes = []
for prod in live:
    if prod['status'] != 'ACTIVE':
        continue
    old = prod['title']
    new = clean_title(old)
    if new and new != old:
        title_changes.append((prod['id'], old, new))

with open(os.path.join(OUT, 'titles_before_after.txt'), 'w') as f:
    for pid, o, n in title_changes:
        f.write(f"- BEFORE: {o}\n  AFTER : {n}\n\n")
# productUpdate mutation (batched aliases, 1 per product)
def esc(s): return s.replace('\\', '\\\\').replace('"', '\\"')
with open(os.path.join(OUT, 'titles_mutation.txt'), 'w') as f:
    f.write('mutation{\n')
    for i, (pid, o, n) in enumerate(title_changes):
        f.write(f'  t{i}: productUpdate(product:{{id:"{pid}", title:"{esc(n)}"}}){{userErrors{{field message}}}}\n')
    f.write('}\n')
print(f"TITLES: {len(title_changes)} ACTIVE products would change -> staged/titles_mutation.txt")

# ============ 2/3/4. MONOTONICITY (charcoal M1 + D1 + broad sweep) ============
def fnum(s):
    m = re.match(r'^\s*([0-9]+(?:\.[0-9]+)?)', s or '')
    return float(m.group(1)) if m else None

# Identify, per ACTIVE product, the numeric-size option (one with mostly-numeric values).
sweep = []   # (handle, title, optname, fixedkey, [(size,vid,price)])
for prod in live:
    if prod['status'] != 'ACTIVE':
        continue
    vs = prod['variants']['nodes']
    if len(vs) < 3:
        continue
    optnames = [o['name'] for o in vs[0]['selectedOptions']]
    # find numeric option index
    numeric_idx = None
    for idx, name in enumerate(optnames):
        vals = [v['selectedOptions'][idx]['value'] for v in vs]
        if sum(1 for x in vals if fnum(x) is not None) >= max(3, 0.7*len(vals)):
            numeric_idx = idx; break
    if numeric_idx is None:
        continue
    # group by the OTHER options (fixed), then sort by numeric size
    groups = defaultdict(list)
    for v in vs:
        opts = v['selectedOptions']
        size = fnum(opts[numeric_idx]['value'])
        if size is None:
            continue
        fixed = tuple(opts[j]['value'] for j in range(len(opts)) if j != numeric_idx)
        groups[fixed].append((size, v['id'], float(v['price']), opts[numeric_idx]['value']))
    for fixed, items in groups.items():
        items.sort()
        # detect inversions: a smaller size priced > a larger size
        prices = [p for _, _, p, _ in items]
        inv = any(prices[i] > prices[i+1] for i in range(len(prices)-1))
        if inv:
            sweep.append((prod['handle'], prod['title'], prod['id'], optnames[numeric_idx], fixed, items))

with open(os.path.join(OUT, 'monotonicity_report.txt'), 'w') as f:
    for h, t, pid, opt, fixed, items in sweep:
        f.write(f"\n[{t}]  ({opt}, fixed={fixed})\n  handle: {h}\n")
        for size, vid, price, raw in items:
            f.write(f"    {opt}={raw}: ${price:.0f}\n")
print(f"MONOTONICITY: {len(sweep)} size-columns on ACTIVE products have inversions -> staged/monotonicity_report.txt")
print("  (review report before deciding corrections; charcoal 16-20 expected here)")

# Show charcoal specifically
for h, t, pid, opt, fixed, items in sweep:
    if 'charcoal-pedestal' in h:
        print(f"\n  Charcoal column fixed={fixed}: " + ", ".join(f"{r}=${p:.0f}" for s,v,p,r in items))
