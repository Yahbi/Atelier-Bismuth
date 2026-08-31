#!/usr/bin/env python3
"""Classify monotonicity inversions as Etsy-sourced (leave) vs extrapolation artifact (fix).
For artifacts, re-interpolate the extrapolated value monotonically between Etsy-anchored
neighbors. Emits a staged mutation for artifact fixes + a David-review list for Etsy dips."""
import json, glob, os, re, html, difflib
from collections import defaultdict

SCRATCH = "/tmp/claude-0/-home-user-Atelier-Bismuth/890403cf-6132-5fc3-8834-c6722cfbd923/scratchpad"
OUT = os.path.join(SCRATCH, "staged")
os.makedirs(OUT, exist_ok=True)
SALE = 0.85

def norm(v):
    v = html.unescape(v or "").lower().strip()
    for ch in ['"','“','”','″']: v = v.replace(ch,'')
    for suf in [' inches','inches',' inch','inch']: v = v.replace(suf,'')
    return v.replace(' ','').strip()
def ntitle(t): return ''.join(c for c in (t or '').lower() if c.isalnum())
def treg(s):
    try: return round(float(s)/SALE,2)
    except: return None
def fnum(s):
    m=re.match(r'^\s*([0-9]+(?:\.[0-9]+)?)', s or ''); return float(m.group(1)) if m else None

# etsy
etsy=json.load(open('tools/etsy-full-export.json'))
EL=[]
for it in etsy:
    h=it.get('handle') or ''
    if not h: continue
    off={}
    for o in it.get('variation_offerings') or []:
        vals=[norm(o[k]) for k in ('option1_value','option2_value','option3_value') if o.get(k)]
        if vals:
            tr=treg(o.get('price'))
            if tr is not None: off.setdefault(frozenset(vals),tr)
    EL.append({'handle':h,'ntitle':ntitle(it.get('title')),'off':off})

# live (patched with applied corrections)
live=[]
for p in sorted(glob.glob(os.path.join(SCRATCH,'live','page_*.json'))):
    live.extend(json.load(open(p))['data']['products']['nodes'])
applied={"gid://shopify/ProductVariant/45568143982771":"1749.00","gid://shopify/ProductVariant/45568144015539":"1849.00","gid://shopify/ProductVariant/45568144048307":"1949.00","gid://shopify/ProductVariant/45568150503603":"1749.00","gid://shopify/ProductVariant/45568150536371":"1849.00","gid://shopify/ProductVariant/45568150569139":"1949.00","gid://shopify/ProductVariant/45568163807411":"1749.00","gid://shopify/ProductVariant/45568163840179":"1849.00","gid://shopify/ProductVariant/45568163872947":"1949.00"}
for pid,vs in json.load(open(os.path.join(SCRATCH,'corrections2.json'))).items():
    for v in vs: applied[v['id']]=v['price']
for prod in live:
    for v in prod['variants']['nodes']:
        if v['id'] in applied: v['price']=applied[v['id']]

def match(prod):
    sh=prod['handle']; nt=ntitle(prod['title'])
    cands=[el for el in EL if sh.startswith(el['handle'])]
    if not cands: return None
    cands.sort(key=lambda el:(ntitle(prod['title'])==el['ntitle'], difflib.SequenceMatcher(None,nt,el['ntitle']).ratio(), len(el['handle'])), reverse=True)
    return cands[0]

artifact_fixes={}   # pid -> [{id,price}]
artifact_log=[]
etsy_dip_log=[]

for prod in live:
    if prod['status']!='ACTIVE': continue
    vs=prod['variants']['nodes']
    if len(vs)<3: continue
    el=match(prod)
    optnames=[o['name'] for o in vs[0]['selectedOptions']]
    nidx=None
    for idx,name in enumerate(optnames):
        vals=[v['selectedOptions'][idx]['value'] for v in vs]
        if sum(1 for x in vals if fnum(x) is not None)>=max(3,0.7*len(vals)): nidx=idx; break
    if nidx is None: continue
    groups=defaultdict(list)
    for v in vs:
        opts=v['selectedOptions']; size=fnum(opts[nidx]['value'])
        if size is None: continue
        fixed=tuple(opts[j]['value'] for j in range(len(opts)) if j!=nidx)
        oset=frozenset(norm(o['value']) for o in opts if o['value']!='Default Title')
        in_etsy = bool(el) and oset in el['off']
        groups[fixed].append([size,v['id'],float(v['price']),opts[nidx]['value'],in_etsy])
    for fixed,items in groups.items():
        items.sort()
        prices=[it[2] for it in items]
        if not any(prices[i]>prices[i+1] for i in range(len(prices)-1)): continue
        # classify each inversion point; fix only extrapolated (not in etsy) values
        # Strategy: anchors = etsy-driven points (in_etsy True). Re-interpolate extrapolated points monotonically.
        anchors=[(it[0],it[2]) for it in items if it[4]]
        col_changes=[]
        if anchors:
            for it in items:
                size,vid,price,raw,in_e=it
                if in_e: continue
                # target = monotonic interpolation among anchors + already-fixed extrapolated
                lower=[a for a in anchors if a[0]<size]
                upper=[a for a in anchors if a[0]>size]
                if lower and upper:
                    (s0,p0),(s1,p1)=max(lower),min(upper)
                    tgt=round(p0+(p1-p0)*(size-s0)/(s1-s0))
                elif lower:
                    s0,p0=max(lower); tgt=round(p0+ (size-s0)*5)   # +$5/inch above top anchor
                elif upper:
                    s1,p1=min(upper); tgt=round(p1-(s1-size)*5)     # -$5/inch below bottom anchor
                else:
                    continue
                if abs(tgt-price)>0.5 and tgt>0:
                    col_changes.append((size,vid,price,tgt,raw))
        # only record if this column actually had an inversion AND we have extrapolated fixes
        is_etsy_only_dip = all(it[4] for it in items)  # every point is etsy-sourced
        if is_etsy_only_dip:
            etsy_dip_log.append((prod['title'],prod['handle'],optnames[nidx],fixed,[(it[3],it[2]) for it in items]))
        elif col_changes:
            artifact_log.append((prod['title'],prod['handle'],optnames[nidx],fixed,col_changes,[(it[3],it[2],it[4]) for it in items]))
            artifact_fixes.setdefault(prod['id'],[]).extend({'id':vid,'price':f"{tgt:.2f}"} for size,vid,price,tgt,raw in col_changes)

# write artifact mutation
def chunks(lst,n):
    for i in range(0,len(lst),n): yield lst[i:i+n]
with open(os.path.join(OUT,'monotonic_artifact_mutation.txt'),'w') as f:
    f.write('mutation{\n')
    i=0
    for pid,vlist in artifact_fixes.items():
        # dedupe by id
        seen={};
        for v in vlist: seen[v['id']]=v['price']
        vs=','.join('{id:"%s",price:"%s"}'%(k,v) for k,v in seen.items())
        f.write(f'  a{i}: productVariantsBulkUpdate(productId:"{pid}", variants:[{vs}]){{userErrors{{field message}}}}\n'); i+=1
    f.write('}\n')

with open(os.path.join(OUT,'monotonic_artifacts_log.txt'),'w') as f:
    for t,h,opt,fixed,changes,allpts in artifact_log:
        f.write(f"\n[{t}]  {opt} fixed={fixed}\n  {h}\n  current: "+", ".join(f"{r}=${p:.0f}{'*' if e else ''}" for r,p,e in allpts)+"\n")
        for size,vid,price,tgt,raw in changes:
            f.write(f"    FIX {opt}={raw}: ${price:.0f} -> ${tgt:.0f}\n")
    f.write("\n(* = Etsy-anchored value, left unchanged)\n")

with open(os.path.join(OUT,'etsy_sourced_dips_for_david.txt'),'w') as f:
    f.write("These inversions come ENTIRELY from David's own Etsy prices (every size is Etsy-sourced).\nLeft UNCHANGED to stay faithful to Etsy. David may want to review on Etsy:\n")
    for t,h,opt,fixed,pts in etsy_dip_log:
        f.write(f"\n[{t}]  {opt} fixed={fixed}\n  "+", ".join(f"{r}=${p:.0f}" for r,p in pts)+"\n")

nfix=sum(len(v) for v in artifact_fixes.values())
print(f"ARTIFACT inversions to fix: {nfix} variants across {len(artifact_fixes)} products -> monotonic_artifact_mutation.txt")
print(f"ETSY-sourced dips (flagged, untouched): {len(etsy_dip_log)} columns -> etsy_sourced_dips_for_david.txt")
print("\n--- artifact fix preview ---")
for t,h,opt,fixed,changes,allpts in artifact_log:
    print(f"[{t[:40]}] {opt} {fixed}: " + ", ".join(f"{r}:{p:.0f}->{tg:.0f}" for s,v,p,tg,r in changes))
