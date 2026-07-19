// Zero-dependency static generator = the "GENERATE" stage of the pipeline.
// Mirrors the Astro templates so pages are viewable without the full toolchain.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname } from 'node:path';

const data = JSON.parse(readFileSync('./cities.json', 'utf8'));
const W = { affordability: .4, connectivity: .25, weather: .2, community: .15 };
const score = c => Math.round(Object.entries(W).reduce((s,[k,v])=>s+c.scores[k]*v,0));
const out = (p, html) => { mkdirSync(dirname(p), {recursive:true}); writeFileSync(p, html); };

const CSSINLINE = readFileSync('./styles.css','utf8');
const shell = (title, desc, body, jsonld) => `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><meta name="description" content="${desc}">
<style>${CSSINLINE}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`:''}
</head><body>
<header class="site"><div class="wrap"><a class="logo" href="/">◆ NomadRoutes</a></div></header>
<main class="wrap">${body}</main>
<footer class="wrap foot"><p>Data-driven, auto-updated monthly · <a href="/methodology/">Methodology</a> · © NomadRoutes</p></footer>
</body></html>`;

const bar=(k,v)=>`<div class="bar"><span class="bl">${k}</span><span class="track"><span class="fill" style="width:${v}%"></span></span><span class="bv">${v}</span></div>`;

for (const c of data.cities) {
  const cost=c.cost, total=Object.values(cost).reduce((a,b)=>a+b,0), ns=score(c);
  const tiers=[['Lean',.78],['Comfortable',1],['Premium',1.5]];
  const faqs=[
    {q:`How much does it cost to live in ${c.name} as a digital nomad?`,a:`About $${Math.round(total).toLocaleString()} per month for a comfortable solo setup, covering rent ($${cost.rent_1br}), food ($${cost.food}), coworking ($${cost.coworking}), transport ($${cost.transport}) and other costs.`},
    {q:`Is the internet fast enough in ${c.name}?`,a:`Average fixed broadband is around ${c.internet_mbps} Mbps, which handles video calls and uploads comfortably.`},
    {q:`What is the weather like in ${c.name}?`,a:c.climate+'.'},
  ];
  const jsonld={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}}))};
  const title=`Cost of Living in ${c.name} for Digital Nomads (2026)`;
  const desc=`${c.name}, ${c.country}: a remote worker needs about $${Math.round(total).toLocaleString()}/month. Full breakdown — rent, food, coworking, internet (${c.internet_mbps} Mbps) and our Nomad Score.`;
  const body=`
  <div class="crumb"><a href="/">Home</a> › <a href="/">Cities</a> › ${c.name}</div>
  <h1>${title}</h1>
  <p class="sub">${c.flag} ${c.region} · updated ${data._meta.updated} · auto-refreshed monthly</p>
  <div class="answer"><h2>Quick answer</h2><div class="grid">
    <div class="kv"><div class="k">Comfortable / month</div><div class="v">$${Math.round(total).toLocaleString()}</div></div>
    <div class="kv"><div class="k">1-bed rent</div><div class="v">$${cost.rent_1br}</div></div>
    <div class="kv"><div class="k">Internet</div><div class="v">${c.internet_mbps} Mbps</div></div>
  </div></div>
  <div class="scorecard"><div><div class="bignum">${ns}</div><div class="lab">Nomad Score</div></div>
    <div class="bars">${Object.entries(c.scores).map(([k,v])=>bar(k,v)).join('')}</div></div>
  <section><h2>Monthly budget — three lifestyles</h2><div class="tiers">
    ${tiers.map(([lab,m])=>`<div class="tier${lab==='Comfortable'?' mid':''}"><div class="lab">${lab}</div><div class="amt">$${Math.round(total*m).toLocaleString()}</div><div class="sub" style="margin:0">per month</div></div>`).join('')}
  </div></section>
  <section><h2>Full cost breakdown</h2><table>
    <tr><th>Rent (1-bed, central)</th><td>$${cost.rent_1br}</td></tr>
    <tr><th>Food & groceries</th><td>$${cost.food}</td></tr>
    <tr><th>Coworking</th><td>$${cost.coworking}</td></tr>
    <tr><th>Local transport</th><td>$${cost.transport}</td></tr>
    <tr><th>Other (SIM, gym, leisure)</th><td>$${cost.misc}</td></tr>
    <tr><th><b>Total</b></th><td><b>$${Math.round(total).toLocaleString()}/month</b></td></tr>
  </table></section>
  <section class="faq"><h2>FAQ</h2>${faqs.map(f=>`<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('')}</section>
  <section><h2>Compare with other hubs</h2><div class="cards">
    ${data.cities.filter(o=>o.slug!==c.slug).slice(0,4).map(o=>`<a class="card" href="/city/${o.slug}/cost-of-living/"><span class="fl">${o.flag}</span><span><b>${o.name}</b><span>${o.country}</span></span></a>`).join('')}
  </div></section>
  <p class="foot">Sources: ${c.sources.join(', ')}. Figures are aggregated estimates, auto-updated monthly — verify before major decisions.</p>`;
  out(`dist/city/${c.slug}/cost-of-living/index.html`, shell(title,desc,body,jsonld));
}

// index
const wc=data.cities.map(c=>({...c,total:Object.values(c.cost).reduce((a,b)=>a+b,0),score:score(c)})).sort((a,b)=>a.total-b.total);
const idxBody=`<h1>Where can you live and work remotely?</h1>
<p class="sub">Real monthly budgets, internet speeds and our Nomad Score — ${data.cities.length} cities, refreshed ${data._meta.updated}.</p>
<div class="cards">${wc.map(c=>`<a class="card" href="/city/${c.slug}/cost-of-living/"><span class="fl">${c.flag}</span><span><b>${c.name}, ${c.country}</b><span>$${Math.round(c.total).toLocaleString()}/mo · ${c.internet_mbps} Mbps · Score ${c.score}</span></span></a>`).join('')}</div>`;
out('dist/index.html', shell('NomadRoutes — Cost of Living & City Data for Digital Nomads','Data-driven monthly budgets, internet speeds and Nomad Scores.',idxBody));

// methodology
const methBody=`<h1>Methodology</h1><p class="sub">Transparency about our data is our main trust signal.</p>
<section><h2>Where the numbers come from</h2><p>Cost-of-living figures aggregate Numbeo crowd data; internet speeds come from the Ookla Speedtest Global Index; climate uses long-run normals. Every city page lists its own sources.</p>
<h2>Nomad Score</h2><p>A weighted composite: affordability 40%, connectivity 25%, weather 20%, community 15% — our own metric, computed identically for every city.</p>
<h2>How often it updates</h2><p>An automated pipeline refreshes costs and FX monthly and internet rankings quarterly, then rebuilds and redeploys. Each page shows its last-updated month.</p></section>`;
out('dist/methodology/index.html', shell('Methodology — NomadRoutes','How our data works.',methBody));

// static assets + sitemap
copyFileSync('./styles.css','dist/styles.css');
copyFileSync('./robots.txt','dist/robots.txt');
const urls=['/','/methodology/',...data.cities.map(c=>`/city/${c.slug}/cost-of-living/`)];
out('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`<url><loc>https://nomadroutes.pages.dev${u}</loc></url>`).join('\n')}\n</urlset>`);

console.log('BUILD OK — pages generated:');
console.log('  dist/index.html');
data.cities.forEach(c=>console.log(`  dist/city/${c.slug}/cost-of-living/index.html`));
console.log('  dist/methodology/index.html + sitemap.xml');
