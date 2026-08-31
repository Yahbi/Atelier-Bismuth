#!/usr/bin/env python3
"""Surgical monotonicity fix: only cells that are (a) extrapolated (not in Etsy) AND
(b) a strict local minimum below both immediate neighbors. Set to neighbor midpoint.
Iterates to convergence per column. Leaves all Etsy-sourced values untouched."""
import json, glob, os, re, html, difflib
from collections import defaultdict

SCRATCH="/tmp/claude-0/-home-user-Atelier-Bismuth/890403cf-6132-5fc3-8834-c6722cfbd923/scratchpad"
OUT=os.path.join(SCRATCH,"staged"); os.makedirs(OUT,exist_ok=True)
SALE=0.85
def norm(v):
    v=html.unescape(v or "").lower().strip()
    for ch in ['"','“','”','″']: v=v.replace(ch,'')
    for s in [' inches','inches',' inch','inch']: v=v.replace(s,'')
    return v.replace(' ','').strip()
def ntitle(t): return ''.join(c for c in (t or '').lower() if c.isalnum())
def treg(s):
    try: return round(float(s)/SALE,2)
    except: return None
def fnum(s):
    m=re.match(r'^\s*([0-9]+(?:\.[0-9]+)?)',s or ''); return float(m.group(1)) if m else None

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
def match(prod):
    sh=prod['handle']; nt=ntitle(prod['title'])
    cands=[el for el in EL if sh.startswith(el['handle'])]
    if not cands: return None
    cands.sort(key=lambda el:(nt==el['ntitle'],difflib.SequenceMatcher(None,nt,el['ntitle']).ratio(),len(el['handle'])),reverse=True)
    return cands[0]

live=[]
for p in sorted(glob.glob(os.path.join(SCRATCH,'live','page_*.json'))):
    live.extend(json.load(open(p))['data']['products']['nodes'])
applied={"gid://shopify/ProductVariant/45568143982771":"1749.00","gid://shopify/ProductVariant/45568144015539":"1849.00","gid://shopify/ProductVariant/45568144048307":"1949.00","gid://shopify/ProductVariant/45568150503603":"1749.00","gid://shopify/ProductVariant/45568150536371":"1849.00","gid://shopify/ProductVariant/45568150569139":"1949.00","gid://shopify/ProductVariant/45568163807411":"1749.00","gid://shopify/ProductVariant/45568163840179":"1849.00","gid://shopify/ProductVariant/45568163872947":"1949.00"}
for pid,vs in json.load(open(os.path.join(SCRATCH,'corrections2.json'))).items():
    for v in vs: applied[v['id']]=v['price']
for prod in live:
    for v in prod['variants']['nodes']:
        if v['id'] in applied: v['price']=applied[v['id']]

fixes={}; log=[]
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
        in_e=bool(el) and oset in el['off']
        groups[fixed].append([size,v['id'],float(v['price']),opts[nidx]['value'],in_e])
    for fixed,items in groups.items():
        items.sort()
        changed=[]
        for _ in range(10):
            did=False
            for i in range(1,len(items)-1):
                size,vid,price,raw,in_e=items[i]
                lp=items[i-1][2]; rp=items[i+1][2]
                if (not in_e) and price<lp and price<rp:  # strict local min, extrapolated
                    tgt=round((lp+rp)/2)
                    if tgt!=price:
                        items[i][2]=float(tgt); did=True
                        changed.append((raw,price,tgt,vid))
            if not did: break
        # also handle leftmost/rightmost extrapolated endpoint dipping below its single neighbor
        if len(items)>=2:
            s,vid,price,raw,in_e=items[0]
            if (not in_e) and price>items[1][2] and not items[1][4]:
                pass  # leave endpoints unless clearly broken; conservative
        if changed:
            for raw,old,tgt,vid in changed:
                fixes.setdefault(prod['id'],{})[vid]=f"{tgt:.2f}"
            log.append((prod['title'],prod['handle'],optnames[nidx],fixed,changed,[(it[3],it[2]) for it in items]))

with open(os.path.join(OUT,'surgical_mutation.txt'),'w') as f:
    f.write('mutation{\n')
    for i,(pid,vmap) in enumerate(fixes.items()):
        vs=','.join('{id:"%s",price:"%s"}'%(k,v) for k,v in vmap.items())
        f.write(f'  s{i}: productVariantsBulkUpdate(productId:"{pid}", variants:[{vs}]){{userErrors{{field message}}}}\n')
    f.write('}\n')
with open(os.path.join(OUT,'surgical_log.txt'),'w') as f:
    for t,h,opt,fixed,changed,final in log:
        f.write(f"\n[{t}] {opt} fixed={fixed}\n  {h}\n  final: "+", ".join(f"{r}=${p:.0f}" for r,p in final)+"\n")
        for raw,old,tgt,vid in changed:
            f.write(f"    {opt}={raw}: ${old:.0f} -> ${tgt:.0f}\n")
n=sum(len(v) for v in fixes.values())
print(f"SURGICAL fixes: {n} cells across {len(fixes)} products")
for t,h,opt,fixed,changed,final in log:
    print(f"  [{t[:38]}] {fixed}: "+", ".join(f"{r} ${o:.0f}->${tg:.0f}" for r,o,tg,v in changed))
