// Zero-dependency static generator = the "GENERATE" stage of the pipeline.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname } from 'node:path';

const data = JSON.parse(readFileSync('./cities.json', 'utf8'));
const W = { affordability: .4, connectivity: .25, weather: .2, community: .15 };
const score = c => Math.round(Object.entries(W).reduce((s,[k,v])=>s+c.scores[k]*v,0));
const total = c => Object.values(c.cost).reduce((a,b)=>a+b,0);
const out = (p, html) => { mkdirSync(dirname(p), {recursive:true}); writeFileSync(p, html); };
const money = n => '$'+Math.round(n).toLocaleString();
const cmp = (a,b) => [a,b].sort((p,q)=> p.slug<q.slug?-1:1);
const cmpUrl = (a,b) => { const [x,y]=cmp(a,b); return `/compare/${x.slug}-vs-${y.slug}/`; };

const CSSINLINE = readFileSync('./styles.css','utf8');
const GTM_HEAD = `<!-- Google Tag Manager --><script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-NJ5Z7GX2');</script><!-- End Google Tag Manager -->`;
const GTM_BODY = `<!-- Google Tag Manager (noscript) --><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NJ5Z7GX2" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript><!-- End Google Tag Manager (noscript) -->`;
const shell = (title, desc, jsonld, body) => `<!doctype html><html lang="en"><head>${GTM_HEAD}
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><meta name="description" content="${desc}">
<style>${CSSINLINE}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`:''}
</head><body>${GTM_BODY}
<header class="site"><div class="wrap"><a class="logo" href="/">◆ NomadRoutes</a><a class="navlink" href="/cities/">All cities</a></div></header>
<main class="wrap">${body}</main>
<footer class="wrap foot"><p>Data-driven, auto-updated monthly · <a href="/methodology/">Methodology</a> · © NomadRoutes</p></footer>
<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "660c42dbf22c4a1192f9a109b086a5be"}'></script><!-- End Cloudflare Web Analytics --></body></html>`;

const bar = (k,v) => `<div class="bar"><span class="bl">${k}</span><span class="track"><span class="fill" style="width:${v}%"></span></span><span class="bv">${v}</span></div>`;
const cityCard = c => `<a class="card" data-s="${(c.name+' '+c.country+' '+c.region).toLowerCase()}" href="/city/${c.slug}/cost-of-living/"><span class="fl">${c.flag}</span><span><b>${c.name}, ${c.country}</b><span>${money(total(c))}/mo · ${c.internet_mbps} Mbps · Score ${score(c)}</span></span></a>`;

const regions = {};
for (const c of data.cities) (regions[c.region] = regions[c.region]||[]).push(c);
const pairs = [];
for (const r in regions){ const a=regions[r]; for(let i=0;i<a.length;i++) for(let j=i+1;j<a.length;j++) pairs.push(cmp(a[i],a[j])); }

// ---------- CITY PAGES ----------
for (const c of data.cities) {
  const cost=c.cost, tot=total(c), ns=score(c);
  const tiers=[['Lean',.78],['Comfortable',1],['Premium',1.5]];
  const peers = (regions[c.region]||[]).filter(o=>o.slug!==c.slug).slice(0,6);
  const faqs=[
    {q:`How much does it cost to live in ${c.name} as a digital nomad?`,a:`About ${money(tot)} per month for a comfortable solo setup, covering rent ($${cost.rent_1br}), food ($${cost.food}), coworking ($${cost.coworking}), transport ($${cost.transport}) and other costs.`},
    {q:`Is the internet fast enough in ${c.name}?`,a:`Average fixed broadband is around ${c.internet_mbps} Mbps, which handles video calls and uploads comfortably.`},
    {q:`What is the weather like in ${c.name}?`,a:c.climate+'.'},
  ];
  const jsonld={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}}))};
  const title=`Cost of Living in ${c.name} for Digital Nomads (2026)`;
  const desc=`${c.name}, ${c.country}: a remote worker needs about ${money(tot)}/month. Full breakdown — rent, food, coworking, internet (${c.internet_mbps} Mbps) and our Nomad Score.`;
  const body=`
  <div class="crumb"><a href="/">Home</a> › <a href="/cities/">Cities</a> › ${c.name}</div>
  <h1>${title}</h1>
  <p class="sub">${c.flag} ${c.region} · updated ${data._meta.updated} · auto-refreshed monthly</p>
  <div class="answer"><h2>Quick answer</h2><div class="grid">
    <div class="kv"><div class="k">Comfortable / month</div><div class="v">${money(tot)}</div></div>
    <div class="kv"><div class="k">1-bed rent</div><div class="v">$${cost.rent_1br}</div></div>
    <div class="kv"><div class="k">Internet</div><div class="v">${c.internet_mbps} Mbps</div></div>
  </div></div>
  <div class="scorecard"><div><div class="bignum">${ns}</div><div class="lab">Nomad Score</div></div>
    <div class="bars">${Object.entries(c.scores).map(([k,v])=>bar(k,v)).join('')}</div></div>
  <section><h2>Monthly budget — three lifestyles</h2><div class="tiers">
    ${tiers.map(([lab,m])=>`<div class="tier${lab==='Comfortable'?' mid':''}"><div class="lab">${lab}</div><div class="amt">${money(tot*m)}</div><div class="sub" style="margin:0">per month</div></div>`).join('')}
  </div></section>
  <section><h2>Full cost breakdown</h2><table>
    <tr><th>Rent (1-bed, central)</th><td>$${cost.rent_1br}</td></tr>
    <tr><th>Food & groceries</th><td>$${cost.food}</td></tr>
    <tr><th>Coworking</th><td>$${cost.coworking}</td></tr>
    <tr><th>Local transport</th><td>$${cost.transport}</td></tr>
    <tr><th>Other (SIM, gym, leisure)</th><td>$${cost.misc}</td></tr>
    <tr><th><b>Total</b></th><td><b>${money(tot)}/month</b></td></tr>
  </table></section>
  <section class="faq"><h2>FAQ</h2>${faqs.map(f=>`<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('')}</section>
  <section><h2>Compare ${c.name} with nearby hubs</h2>
    <p class="sub">Head-to-head on cost, internet and Nomad Score.</p>
    <div class="cards">${peers.map(o=>`<a class="card" href="${cmpUrl(c,o)}"><span class="fl">${o.flag}</span><span><b>${c.name} vs ${o.name}</b><span>compare cost &amp; internet</span></span></a>`).join('')}</div>
  </section>
  <p class="foot">Sources: ${c.sources.join(', ')}. Figures are aggregated estimates, auto-updated monthly — verify before major decisions.</p>`;
  out(`dist/city/${c.slug}/cost-of-living/index.html`, shell(title,desc,jsonld,body));
}

// ---------- COMPARE PAGES ----------
const winRow = (label, av, bv, higherBetter, fmt=(x=>x)) => {
  const eq = av===bv; const aWin = higherBetter ? av>bv : av<bv;
  const star = '<span class="win">★</span>';
  return `<tr><th>${label}</th><td class="${!eq&&aWin?'w':''}">${fmt(av)} ${!eq&&aWin?star:''}</td><td class="${!eq&&!aWin?'w':''}">${fmt(bv)} ${!eq&&!aWin?star:''}</td></tr>`;
};
for (const [a,b] of pairs) {
  const ta=total(a), tb=total(b), sa=score(a), sb=score(b);
  const cheaper = ta<tb ? a : b, faster = a.internet_mbps>b.internet_mbps ? a : b, higher = sa>sb ? a : b;
  const other = w => w===a?b:a;
  const title=`${a.name} vs ${b.name} for Digital Nomads (2026)`;
  const desc=`${a.name} (${money(ta)}/mo) vs ${b.name} (${money(tb)}/mo) — compare cost of living, internet speed, weather and Nomad Score for remote workers.`;
  const faqs=[
    {q:`Is ${a.name} or ${b.name} cheaper for digital nomads?`,a:`${cheaper.name} is cheaper — about ${money(total(cheaper))}/month vs ${money(total(other(cheaper)))}/month for a comfortable solo setup.`},
    {q:`Which has faster internet, ${a.name} or ${b.name}?`,a:`${faster.name} has faster average broadband (${faster.internet_mbps} Mbps vs ${other(faster).internet_mbps} Mbps).`},
    {q:`Which has the higher Nomad Score?`,a:`${higher.name} scores ${score(higher)} vs ${score(other(higher))} on our composite of affordability, connectivity, weather and community.`},
  ];
  const jsonld={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}}))};
  const body=`
  <div class="crumb"><a href="/">Home</a> › <a href="/cities/">Cities</a> › ${a.name} vs ${b.name}</div>
  <h1>${a.name} vs ${b.name} for Digital Nomads</h1>
  <p class="sub">${a.flag} ${a.name} &nbsp;vs&nbsp; ${b.flag} ${b.name} · updated ${data._meta.updated}</p>
  <div class="answer"><h2>Verdict</h2><p style="margin:0">Cheaper: <b>${cheaper.name}</b> · Faster internet: <b>${faster.name}</b> · Higher Nomad Score: <b>${higher.name}</b>.</p></div>
  <section><h2>Head-to-head</h2>
  <table class="vs"><tr><th></th><th>${a.flag} ${a.name}</th><th>${b.flag} ${b.name}</th></tr>
  ${winRow('Comfortable / month', ta, tb, false, money)}
  ${winRow('1-bed rent', a.cost.rent_1br, b.cost.rent_1br, false, x=>'$'+x)}
  ${winRow('Food', a.cost.food, b.cost.food, false, x=>'$'+x)}
  ${winRow('Coworking', a.cost.coworking, b.cost.coworking, false, x=>'$'+x)}
  ${winRow('Internet (Mbps)', a.internet_mbps, b.internet_mbps, true)}
  ${winRow('Affordability', a.scores.affordability, b.scores.affordability, true)}
  ${winRow('Weather', a.scores.weather, b.scores.weather, true)}
  ${winRow('Community', a.scores.community, b.scores.community, true)}
  ${winRow('Nomad Score', sa, sb, true)}
  <tr><th>Climate</th><td>${a.climate}</td><td>${b.climate}</td></tr>
  </table>
  <p class="sub" style="margin-top:8px">★ = better on that row. Figures are aggregated estimates.</p></section>
  <section class="faq"><h2>FAQ</h2>${faqs.map(f=>`<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('')}</section>
  <section><h2>Full city guides</h2><div class="cards">
    <a class="card" href="/city/${a.slug}/cost-of-living/"><span class="fl">${a.flag}</span><span><b>${a.name}</b><span>cost of living guide</span></span></a>
    <a class="card" href="/city/${b.slug}/cost-of-living/"><span class="fl">${b.flag}</span><span><b>${b.name}</b><span>cost of living guide</span></span></a>
  </div></section>`;
  out(`dist/compare/${cmp(a,b)[0].slug}-vs-${cmp(a,b)[1].slug}/index.html`, shell(title,desc,jsonld,body));
}

// ---------- HOME + ALL CITIES ----------
const cheapest = [...data.cities].sort((x,y)=>total(x)-total(y)).slice(0,12);
const regionOrder = Object.keys(regions).sort((r1,r2)=>regions[r2].length-regions[r1].length);
const regionSections = regionOrder.map(r=>`<h2 class="region">${r} <span class="rc">${regions[r].length}</span></h2>
  <div class="cards">${regions[r].slice().sort((x,y)=>total(x)-total(y)).map(cityCard).join('')}</div>`).join('');
const searchScript=`<script>(function(){var q=document.getElementById('q');if(!q)return;var cards=[].slice.call(document.querySelectorAll('.card[data-s]'));var heads=[].slice.call(document.querySelectorAll('h2.region'));q.addEventListener('input',function(){var v=q.value.trim().toLowerCase();cards.forEach(function(c){c.style.display=(!v||c.getAttribute('data-s').indexOf(v)>-1)?'':'none';});heads.forEach(function(h){var g=h.nextElementSibling;if(!g)return;var any=[].slice.call(g.querySelectorAll('.card')).some(function(c){return c.style.display!=='none';});h.style.display=any?'':'none';g.style.display=any?'':'none';});});})();</script>`;

const idxBody=`<h1>Where can you live and work remotely?</h1>
<p class="sub">Real monthly budgets, internet speeds and our Nomad Score — ${data.cities.length} cities across ${regionOrder.length} regions, refreshed ${data._meta.updated}.</p>
<input id="q" class="search" type="search" placeholder="Search ${data.cities.length} cities — try Lisbon, Thailand, Asia…" autocomplete="off">
<h2 class="region">Cheapest right now</h2><div class="cards">${cheapest.map(cityCard).join('')}</div>
${regionSections}${searchScript}`;
out('dist/index.html', shell('NomadRoutes — Cost of Living & City Data for Digital Nomads','Compare monthly budgets, internet speeds and Nomad Scores for '+data.cities.length+' remote-work cities. Auto-updated.',null,idxBody));

const allBody=`<div class="crumb"><a href="/">Home</a> › Cities</div>
<h1>All ${data.cities.length} cities</h1>
<p class="sub">Every city we track, grouped by region. Search or browse.</p>
<input id="q" class="search" type="search" placeholder="Search ${data.cities.length} cities…" autocomplete="off">
${regionSections}${searchScript}`;
out('dist/cities/index.html', shell(`All ${data.cities.length} digital nomad cities — cost of living`,'Browse and search cost of living for '+data.cities.length+' digital nomad cities worldwide.',null,allBody));

// ---------- METHODOLOGY ----------
const methBody=`<h1>Methodology</h1><p class="sub">Transparency about our data is our main trust signal.</p>
<section><h2>Where the numbers come from</h2><p>Cost-of-living figures aggregate Numbeo-style crowd data; internet speeds come from the Ookla Speedtest Global Index; climate uses long-run normals. Every city page lists its own sources. Figures are seed estimates and should be verified before major decisions.</p>
<h2>Nomad Score</h2><p>A weighted composite: affordability 40%, connectivity 25%, weather 20%, community 15% — our own metric, computed identically for every city so pages stay comparable.</p>
<h2>How often it updates</h2><p>An automated pipeline refreshes costs and FX monthly and internet rankings quarterly, then rebuilds and redeploys. Each page shows its last-updated month.</p></section>`;
out('dist/methodology/index.html', shell('Methodology — NomadRoutes','How our data works.',null,methBody));

// ---------- ASSETS + SITEMAP ----------
copyFileSync('./styles.css','dist/styles.css');
copyFileSync('./robots.txt','dist/robots.txt');
copyFileSync('./google4366e78331d5dae5.html','dist/google4366e78331d5dae5.html');
const urls=['/','/cities/','/methodology/',
  ...data.cities.map(c=>`/city/${c.slug}/cost-of-living/`),
  ...pairs.map(([a,b])=>`/compare/${cmp(a,b)[0].slug}-vs-${cmp(a,b)[1].slug}/`)];
out('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`<url><loc>https://nomadroutes.pages.dev${u}</loc></url>`).join('\n')}\n</urlset>`);

console.log('BUILD OK | cities:', data.cities.length, '| compare pages:', pairs.length, '| sitemap urls:', urls.length);
