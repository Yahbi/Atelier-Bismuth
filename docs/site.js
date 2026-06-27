(function(){
function reveal(){var els=document.querySelectorAll('[data-reveal]');if(!('IntersectionObserver'in window)){els.forEach(function(e){e.classList.add('is-visible')});return}var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('is-visible');io.unobserve(en.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.05});els.forEach(function(e){io.observe(e)})}
function header(){var h=document.querySelector('.site-header');if(!h)return;var f=function(){h.classList.toggle('is-scrolled',window.scrollY>24)};f();addEventListener('scroll',f,{passive:true})}
function drawer(){var d=document.querySelector('[data-drawer]');if(!d)return;var o=function(){d.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'},c=function(){d.setAttribute('aria-hidden','true');document.body.style.overflow=''};document.querySelectorAll('[data-drawer-open]').forEach(function(b){b.onclick=o});d.querySelectorAll('[data-drawer-close],.drawer__scrim').forEach(function(b){b.onclick=c})}
function chips(){var bar=document.querySelector('[data-filter]');if(!bar)return;var grid=document.querySelector('[data-grid]');bar.addEventListener('click',function(e){var c=e.target.closest('.chip');if(!c)return;bar.querySelectorAll('.chip').forEach(function(x){x.classList.remove('is-active')});c.classList.add('is-active');var f=c.getAttribute('data-f');grid.querySelectorAll('.product-card').forEach(function(card){var t=card.getAttribute('data-cat')||'';var s=card.getAttribute('data-sub')||'';var g=card.getAttribute('data-group')||'';card.classList.toggle('is-hidden',!(f==='all'||t===f||s===f||g===f))})});var pf=new URLSearchParams(location.search).get('f');if(pf){var pb=bar.querySelector('[data-f="'+pf+'"]');if(pb)pb.click()}}
function money(){}
function pdp(){
  var mount=document.getElementById('pdp-mount');if(!mount||!window.__CATALOG__)return;
  var h=new URLSearchParams(location.search).get('h');
  var P=window.__CATALOG__;var p=P.find(function(x){return x.handle===h})||P[0];
  var imgs=p.images.length?p.images:[''];
  var sizes=(p.variations&&p.variations[0])?p.variations[0]:null;
  var rel=P.filter(function(x){return x.category===p.category&&x.handle!==p.handle}).slice(0,4);
  var specRows=[];if(p.dims)specRows.push(['Dimensions',p.dims]);if(sizes)specRows.push(['Available '+sizes.type.toLowerCase()+'s',sizes.values.join(' · ')+' in']);
  specRows.push(['Materials','Solid travertine (natural stone)']);specRows.push(['Finish','Honed / hand-chiselled']);specRows.push(['Edition',p.made]);specRows.push(['Lead time',p.lead]);
  mount.innerHTML=''+
  '<nav class="eyebrow" style="display:block;margin-bottom:1.6rem"><a href="index.html">Home</a> <span style="opacity:.5">/</span> <a href="'+(p.category==='Furniture'?'furniture.html':'objects-decor.html')+'">'+p.category+'</a> <span style="opacity:.5">/</span> <span style="color:var(--color-ink)">'+p.subtype+'</span></nav>'+
  '<div class="pdp"><div class="pdp-gallery">'+
    '<div class="pdp-main" data-main><img src="'+imgs[0]+'" alt="'+p.title.replace(/"/g,'&quot;')+'"></div>'+
    (imgs.length>1?'<div class="pdp-thumbs">'+imgs.slice(0,10).map(function(u,i){return '<div class="pdp-thumb'+(i===0?' is-active':'')+'" data-thumb="'+u+'"><img src="'+u+'" alt=""></div>'}).join('')+'</div>':'')+
  '</div>'+
  '<div class="pdp__info">'+
    '<div class="flex items-center gap-2 wrap" style="margin-bottom:.6rem"><span class="eyebrow">Atelier Bismuth</span><span class="product-card__badge" style="position:static;background:var(--color-ink);color:var(--color-bg)">'+p.badge+'</span></div>'+
    '<h1 class="h2">'+p.title.split(' - ')[0]+'</h1>'+
    '<div class="flex items-baseline gap-2 mt-2"><span class="pdp__price">'+p.price+'</span>'+(p.compare?'<span class="price--was">'+p.compare+'</span>':'')+'</div>'+
    (p.dims?'<span class="product-card__dims">'+p.dims+'</span>':'')+
    '<hr class="hairline mt-3">'+
    (sizes?'<div class="mt-3"><span class="eyebrow eyebrow--ink" style="display:block;margin-bottom:.6rem">'+sizes.type+' (in)</span><div class="size-grid">'+sizes.values.map(function(v,i){return '<button class="size-opt'+(i===0?' is-active':'')+'" data-size>'+v+'</button>'}).join('')+'</div></div>':'')+
    '<div class="flex gap-2 wrap items-center mt-3"><div class="qty" data-qty><button type="button" data-qty-minus>−</button><input type="text" value="1"><button type="button" data-qty-plus>+</button></div>'+
    '<button class="btn btn--block" style="flex:1;min-width:200px"><span>Add to cart — '+p.price+'</span></button></div>'+
    '<ul class="trust-row mt-4"><li>White-glove delivery</li><li>Hand finished</li><li>Made to order in LA</li></ul>'+
    '<div class="pdp__desc lead mt-4">'+p.paras.slice(0,2).map(function(t){return '<p>'+t+'</p>'}).join('')+'</div>'+
    '<div class="accordion mt-3">'+
      '<details class="accordion__item" open><summary class="accordion__trigger">Dimensions &amp; specifications<span class="accordion__icon"></span></summary><div class="accordion__panel"><table class="spec-table">'+specRows.map(function(r){return '<tr><th>'+r[0]+'</th><td>'+r[1]+'</td></tr>'}).join('')+'</table></div></details>'+
      (p.paras.length>2?'<details class="accordion__item"><summary class="accordion__trigger">Full description<span class="accordion__icon"></span></summary><div class="accordion__panel">'+p.paras.slice(2).map(function(t){return '<p style="margin-bottom:.8rem">'+t+'</p>'}).join('')+'</div></details>':'')+
      '<details class="accordion__item"><summary class="accordion__trigger">Care<span class="accordion__icon"></span></summary><div class="accordion__panel">Seal on installation and re-seal periodically. Wipe with a soft, damp cloth; avoid acidic cleaners on natural stone.</div></details>'+
      '<details class="accordion__item"><summary class="accordion__trigger">Shipping &amp; delivery<span class="accordion__icon"></span></summary><div class="accordion__panel">Made to order in 3–6 weeks, crated and insured, delivered white-glove to your room of choice.</div></details>'+
    '</div>'+
  '</div></div>'+
  '<section class="section" style="padding-bottom:0"><div class="center" style="margin-bottom:2rem"><span class="eyebrow">More from '+p.category+'</span><h2 class="h3 mt-2">You may also like</h2></div><div class="grid cols-4">'+
    rel.map(function(x){return '<article class="product-card"><a href="product.html?h='+x.handle+'" class="product-card__media media media-zoom"><img src="'+(x.images[0]||'')+'" loading="lazy" alt="'+x.title.replace(/"/g,'&quot;')+'"></a><div class="product-card__body"><a href="product.html?h='+x.handle+'"><h3 class="product-card__title">'+x.title.split(' - ')[0]+'</h3></a><div class="product-card__meta"><span class="product-card__type">'+x.subtype+'</span><span class="product-card__price">'+(x.compare?'<span class="price--was">'+x.compare+'</span>':'')+x.price+'</span></div></div></article>'}).join('')+
  '</div></section>';
  document.title=p.title.split(' - ')[0]+' — Atelier Bismuth';
  // gallery thumbs
  var main=mount.querySelector('[data-main] img');
  mount.querySelectorAll('[data-thumb]').forEach(function(t){t.onclick=function(){main.src=t.getAttribute('data-thumb');mount.querySelectorAll('[data-thumb]').forEach(function(x){x.classList.remove('is-active')});t.classList.add('is-active')}});
  mount.querySelectorAll('[data-size]').forEach(function(b){b.onclick=function(){b.parentElement.querySelectorAll('[data-size]').forEach(function(x){x.classList.remove('is-active')});b.classList.add('is-active')}});
  var q=mount.querySelector('[data-qty]');if(q){var inp=q.querySelector('input');q.querySelector('[data-qty-minus]').onclick=function(){inp.value=Math.max(1,(+inp.value||1)-1)};q.querySelector('[data-qty-plus]').onclick=function(){inp.value=(+inp.value||1)+1}}
  reveal();
}
document.addEventListener('DOMContentLoaded',function(){reveal();header();drawer();chips();pdp()});
})();