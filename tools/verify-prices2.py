#!/usr/bin/env python3
"""Robust Shopify<->Etsy 1:1 match + price verification.
Match rule: shopify_handle.startswith(etsy_handle) (Etsy handles are truncated to 70).
Disambiguate collisions by (1) title similarity, (2) offering-coverage of the product's
variants, (3) longer/more-specific etsy handle. Emit CONFIDENT vs AMBIGUOUS corrections.
"""
import json, glob, os, html, difflib
from collections import defaultdict

SCRATCH = "/tmp/claude-0/-home-user-Atelier-Bismuth/890403cf-6132-5fc3-8834-c6722cfbd923/scratchpad"
ETSY = "tools/etsy-full-export.json"
SALE = 0.85

def norm(v):
    v = html.unescape(v or "")            # decode &quot; etc
    v = v.lower().strip()
    for ch in ['"','“','”','″']: v = v.replace(ch,'')
    for suf in [' inches','inches',' inch','inch']: v = v.replace(suf,'')
    return v.replace(' ','').strip()

def ntitle(t):
    return ''.join(ch for ch in (t or '').lower() if ch.isalnum())

def treg(s):
    try: return round(float(s)/SALE,2)
    except: return None

# ---- etsy ----
etsy=json.load(open(ETSY))
EL=[]
for it in etsy:
    h=it.get('handle') or ''
    if not h: continue
    offmap={}
    for o in it.get('variation_offerings') or []:
        vals=[norm(o[k]) for k in ('option1_value','option2_value','option3_value') if o.get(k)]
        if not vals: continue
        tr=treg(o.get('price'))
        if tr is not None: offmap.setdefault(frozenset(vals),(tr,float(o['price']),o.get('price_source')))
    single=treg(it.get('price_low') or it.get('price')) if not offmap else None
    EL.append({'handle':h,'title':it.get('title'),'ntitle':ntitle(it.get('title')),
               'offmap':offmap,'single':single,'on_sale':it.get('on_sale')})

# ---- live ----
live=[]
for p in sorted(glob.glob(os.path.join(SCRATCH,'live','page_*.json'))):
    live.extend(json.load(open(p))['data']['products']['nodes'])

def variant_optsets(prod):
    out=[]
    for v in prod['variants']['nodes']:
        opts=[norm(o['value']) for o in v['selectedOptions'] if o['value']!='Default Title']
        out.append((v,opts))
    return out

def coverage(el, vsets):
    if not el['offmap']:
        # single-variant listing: covered iff product is single-variant
        return 1.0 if (len(vsets)==1 and not vsets[0][1]) else 0.0
    hit=sum(1 for _,opts in vsets if opts and frozenset(opts) in el['offmap'])
    tot=sum(1 for _,opts in vsets if opts)
    return hit/tot if tot else 0.0

def best_match(prod):
    sh=prod['handle']; nt=ntitle(prod['title']); vsets=variant_optsets(prod)
    cands=[el for el in EL if sh.startswith(el['handle'])]
    if not cands: return None,0,0,[]
    scored=[]
    for el in cands:
        tsim=difflib.SequenceMatcher(None, nt, el['ntitle']).ratio()
        cov=coverage(el,vsets)
        # exact title bonus
        exact=1.0 if nt==el['ntitle'] else 0.0
        score=(exact*2)+tsim+cov+len(el['handle'])/1000.0
        scored.append((score,tsim,cov,exact,el))
    scored.sort(key=lambda x:-x[0])
    top=scored[0]
    return top[4], top[1], top[2], scored

mism=[]              # confident corrections
ambig=[]             # ambiguous / low-confidence findings
unmatched=[]
ok=0; unverified=0
corrections=defaultdict(list)

for prod in live:
    el,tsim,cov,scored = best_match(prod)
    vsets=variant_optsets(prod)
    if el is None:
        unmatched.append((prod['handle'],prod['title'],prod['status']))
        continue
    # confidence: exact title OR (good title sim AND decent coverage); no rival within 0.05 score
    rival_close = len(scored)>1 and (scored[0][0]-scored[1][0])<0.15
    confident = (ntitle(prod['title'])==el['ntitle']) or (tsim>=0.92 and cov>=0.5)
    confident = confident and not (rival_close and ntitle(prod['title'])!=el['ntitle'])
    for v,opts in vsets:
        live_price=float(v['price']); target=None; src=None; sale=None
        if opts and frozenset(opts) in el['offmap']:
            target,sale,src=el['offmap'][frozenset(opts)]
        elif not opts and el['single'] is not None:
            target,src=el['single'],'single'
        if target is None:
            unverified+=1; continue
        if abs(live_price-target)<=0.5:
            ok+=1; continue
        rec={'handle':prod['handle'],'title':prod['title'],'status':prod['status'],
             'pid':prod['id'],'vid':v['id'],
             'options':[o['value'] for o in v['selectedOptions']],
             'live':live_price,'target':target,'sale':sale,'src':src,
             'etsy_handle':el['handle'],'etsy_title':el['title'],'tsim':round(tsim,3),'cov':round(cov,3)}
        if confident:
            mism.append(rec); corrections[prod['id']].append({'id':v['id'],'price':f"{target:.2f}"})
        else:
            ambig.append(rec)

print(f"Live products: {len(live)}  Etsy: {len(EL)}")
print(f"OK: {ok}  | CONFIDENT mismatches: {len(mism)}  | AMBIGUOUS: {len(ambig)}  | unverified: {unverified}  | no-match products: {len(unmatched)}")

def show(recs,label):
    by=defaultdict(list)
    for r in recs: by[(r['handle'],r['title'],r['status'],r['etsy_title'],r['tsim'],r['cov'])].append(r)
    print(f"\n===== {label} ({len(recs)} variants, {len(by)} products) =====")
    for (h,t,st,et,ts,cv),rs in sorted(by.items(),key=lambda x:-len(x[1])):
        print(f"\n[{st}] {t}  ({len(rs)} variants)  tsim={ts} cov={cv}")
        print(f"   -> etsy: {et}")
        for r in rs[:4]:
            print(f"   {r['options']}: live ${r['live']:.0f} -> ${r['target']:.0f}  (sale {r['sale']}, {r['src']})")
        if len(rs)>4: print(f"   ... +{len(rs)-4} more")

show(mism,"CONFIDENT CORRECTIONS (will apply)")
show(ambig,"AMBIGUOUS (needs review, NOT applying)")

json.dump(mism,open(os.path.join(SCRATCH,'mism_confident.json'),'w'),indent=1)
json.dump(ambig,open(os.path.join(SCRATCH,'mism_ambiguous.json'),'w'),indent=1)
json.dump(corrections,open(os.path.join(SCRATCH,'corrections2.json'),'w'),indent=1)
print(f"\nConfident corrections: {sum(len(v) for v in corrections.values())} variants / {len(corrections)} products -> corrections2.json")
