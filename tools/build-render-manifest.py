#!/usr/bin/env python3
"""Build a render manifest: for each ACTIVE Shopify product, join to its Etsy listing to
get the real primary product photo + material/finish, and craft a high-end environmental
staging prompt for GPT Image 2 (gpt_image_2 via Higgsfield). Ready to execute the instant
the Higgsfield + Shopify connectors reconnect."""
import json, glob, os, re, html, difflib

SCRATCH="/tmp/claude-0/-home-user-Atelier-Bismuth/890403cf-6132-5fc3-8834-c6722cfbd923/scratchpad"
def ntitle(t): return ''.join(c for c in (t or '').lower() if c.isalnum())

etsy=json.load(open('tools/etsy-full-export.json'))
EL=[]
for it in etsy:
    h=it.get('handle') or ''
    if not h: continue
    imgs=[u for u in (it.get('images') or []) if isinstance(u,str) and u.startswith('http')]
    EL.append({'handle':h,'ntitle':ntitle(it.get('title')),'title':it.get('title'),
               'images':imgs,'materials':it.get('materials'),'section':it.get('section')})

live=[]
for p in sorted(glob.glob(os.path.join(SCRATCH,'live','page_*.json'))):
    live.extend(json.load(open(p))['data']['products']['nodes'])

def match(prod):
    sh=prod['handle']; nt=ntitle(prod['title'])
    cands=[el for el in EL if sh.startswith(el['handle'])]
    if not cands: return None
    cands.sort(key=lambda el:(nt==el['ntitle'],difflib.SequenceMatcher(None,nt,el['ntitle']).ratio(),len(el['handle'])),reverse=True)
    return cands[0]

# Scene styling by product category (keyword on title) — editorial, warm travertine palette.
def scene_for(title):
    t=title.lower()
    if any(k in t for k in ['dining table','coffee table','console','desk','side table','bench','bed']):
        return ("a serene minimalist luxury interior — wide-plank oak floor, limewashed plaster walls in warm bone/oat tones, "
                "soft diffused north light from tall windows, a single sculptural shadow, styled with restraint (one ceramic vessel, a linen throw)")
    if any(k in t for k in ['pedestal','plinth','column','sculpture stand','monolith']):
        return ("a gallery-like alcove with limewashed plaster in warm travertine tones, a soft pool of directional daylight, "
                "deep quiet shadow, museum-grade staging, nothing else competing for attention")
    if any(k in t for k in ['shelf','mantle','floating','wall pocket']):
        return ("mounted on a limewashed plaster feature wall in a sunlit luxury living space, warm raking light grazing the stone texture, "
                "styled minimally with one small object and a sprig of dried botanical")
    if any(k in t for k in ['fountain','water','basin']):
        return ("a tranquil spa-like stone niche, soft mist and gentle water reflections, warm diffused light, calm luxury wellness mood")
    if any(k in t for k in ['bookend','tray','plate','coaster','cutlery','chopstick','vase','soap','organizer','candle','cable']):
        return ("an editorial still-life on a honed travertine surface, warm side light, shallow depth of field, refined tabletop styling, "
                "generous negative space, high-end product photography")
    if any(k in t for k in ['hearth','fireplace','fire pit','firepit']):
        return ("an architectural luxury living room with a modern fireplace setting, warm ambient glow, limewashed walls, dusk light, cinematic calm")
    return ("a refined minimalist luxury interior in warm stone/bone tones with soft diffused daylight and quiet editorial styling")

BASE=("Ultra-photorealistic high-end interior/product photography, editorial luxury catalogue quality, "
      "shot on medium-format, natural warm daylight, true-to-life natural travertine/limestone texture and veining preserved exactly, "
      "no text, no watermark, no people, tasteful negative space, House-of-Leon aesthetic.")

manifest=[]
skipped=[]
for prod in live:
    if prod['status']!='ACTIVE': continue
    el=match(prod)
    if not el or not el['images']:
        skipped.append((prod['handle'],prod['title'],'no source image')); continue
    src=el['images'][0]
    mat=el.get('materials')
    if isinstance(mat,list): mat=', '.join(str(x) for x in mat if x)
    mat=(mat or 'natural travertine stone')
    scene=scene_for(prod['title'])
    prompt=(f"Place the referenced {mat.lower()} piece — keep its exact shape, proportions, colour and surface — into {scene}. "
            f"{BASE}")
    manifest.append({
        'product_id':prod['id'],'handle':prod['handle'],'title':prod['title'],
        'source_image':src,'material':mat,'aspect_ratio':'4:5',
        'model':'gpt_image_2','prompt':prompt,'upscale':'4k','set_alt':True,
    })

json.dump(manifest,open('tools/render-manifest.json','w'),indent=1)
with open('tools/render-manifest-preview.txt','w') as f:
    for m in manifest[:8]:
        f.write(f"\n### {m['title']}\n  src: {m['source_image']}\n  prompt: {m['prompt']}\n")
print(f"Manifest: {len(manifest)} ACTIVE products with a source photo -> tools/render-manifest.json")
print(f"Skipped (no source image): {len(skipped)}")
for h,t,r in skipped[:12]: print(f"  - {t} ({r})")
print("\nSample prompt:\n", manifest[0]['prompt'] if manifest else "(none)")
print("\nSample source:\n", manifest[0]['source_image'] if manifest else "")
