#!/usr/bin/env python3
"""Detail report: skipped-variant breakdown + single-variant match provenance."""
import json, glob, os
from collections import defaultdict

SCRATCH = "/tmp/claude-0/-home-user-Atelier-Bismuth/890403cf-6132-5fc3-8834-c6722cfbd923/scratchpad"
ETSY = "tools/etsy-full-export.json"
SALE = 0.85

def norm(v):
    v = (v or "").lower().strip()
    for ch in ['"','“','”','″']: v = v.replace(ch,'')
    for suf in [' inches','inches',' inch','inch']: v = v.replace(suf,'')
    return v.replace(' ','').strip()

def treg(s):
    try: return round(float(s)/SALE,2)
    except: return None

etsy = json.load(open(ETSY))
etsy_listings = []
for it in etsy:
    h = it.get('handle') or ''
    if not h: continue
    offmap = {}
    for o in it.get('variation_offerings') or []:
        vals=[norm(o[k]) for k in ('option1_value','option2_value','option3_value') if o.get(k)]
        if not vals: continue
        tr=treg(o.get('price'))
        if tr is not None: offmap[frozenset(vals)] = (tr,float(o['price']),o.get('price_source'))
    single = treg(it.get('price_low') or it.get('price')) if not offmap else None
    etsy_listings.append({'handle':h,'title':it.get('title'),'offmap':offmap,'single':single,
                          'price_low':it.get('price_low'),'price':it.get('price'),'nopt':len(it.get('variations') or [])})

pages = sorted(glob.glob(os.path.join(SCRATCH,'live','page_*.json')))
live=[]
for p in pages: live.extend(json.load(open(p))['data']['products']['nodes'])

def match_listing(sh):
    cands=[]
    for el in etsy_listings:
        eh=el['handle']
        if sh==eh or sh.startswith(eh) or eh.startswith(sh):
            cands.append((len(os.path.commonprefix([sh,eh])),el))
    if not cands: return None
    cands.sort(key=lambda x:-x[0]); return cands[0][1]

skipped_by_prod=defaultdict(lambda:{'count':0,'status':'','title':'','etsy':'','samples':[]})
for prod in live:
    sh=prod['handle']; el=match_listing(sh)
    for v in prod['variants']['nodes']:
        opts=[norm(o['value']) for o in v['selectedOptions'] if o['value']!='Default Title']
        if not el:
            continue
        key=frozenset(opts)
        target=None
        if opts and key in el['offmap']: target=el['offmap'][key][0]
        elif not opts and el['single'] is not None: target=el['single']
        if target is None:
            k=(sh,prod['title'],prod['status'])
            d=skipped_by_prod[k]; d['count']+=1; d['status']=prod['status']; d['title']=prod['title']
            d['etsy']=el['handle']+f" (offmap={len(el['offmap'])} keys)"
            if len(d['samples'])<4: d['samples'].append(([o['value'] for o in v['selectedOptions']], v['price']))

print("==== SKIPPED (UNVERIFIED) VARIANTS BY PRODUCT ====")
for (sh,t,st),d in sorted(skipped_by_prod.items(), key=lambda x:-x[1]['count']):
    print(f"\n[{st}] {t}  ({d['count']} unverified)")
    print(f"   sh_handle: {sh}")
    print(f"   matched etsy: {d['etsy']}")
    for opts,pr in d['samples']:
        print(f"      {opts} = ${pr}")

print("\n\n==== SINGLE-VARIANT MISMATCH PROVENANCE ====")
for sh in ['onyx-bookend-bookshelf-organization-bookstop-gift',
           'travertine-pedestal-block-solid-stone-sculpture-stand-display-stand-bookend-gift']:
    el=match_listing(sh)
    print(f"\nshopify: {sh}")
    if el:
        print(f"   matched etsy handle: {el['handle']}")
        print(f"   etsy title: {el['title']}")
        print(f"   etsy price_low={el['price_low']} price={el['price']} -> single target={el['single']}")
