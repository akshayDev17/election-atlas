// The /elections page as pure functions: the derived country list in, HTML and the
// search index out. build.mjs writes what these return; landing.test.mjs tests them.
//
// One card template for every country, A to Z, PAGE_SIZE to a page, the page in the
// URL (/elections/?page=3). The Worker serves page N's prerendered HTML at that URL,
// and the pager swaps pages in place by fetching only that page's cards
// (/elections/cards/N.html). Search runs on the device over one small index of
// every country (/elections/index.json: name, aliases, slug, page); choosing a match
// fetches only that country's page of cards.

export const ROOT = '/elections/';
export const PAGE_SIZE = 10;

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const nf = (n) => n.toLocaleString('en-US');

/** The number of pages for `count` countries; one page even for none. */
export const pageCount = (count) => Math.max(1, Math.ceil(count / PAGE_SIZE));

/** The countries on page `n` (1-based) of the A-to-Z list. */
export const pageSlice = (countries, n) => countries.slice((n - 1) * PAGE_SIZE, n * PAGE_SIZE);

/** The canonical address of page `n`: /elections/ for page 1, /elections/?page=N after. */
export const pageHref = (n) => (n === 1 ? ROOT : `${ROOT}?page=${n}`);

/** The search index: every country's name, aliases, slug and page, in list order. */
export const searchIndex = (countries, aliases = {}) =>
  countries.map((c, i) => ({ n: c.name, a: aliases[c.code] ?? [], s: c.slug, p: Math.floor(i / PAGE_SIZE) + 1 }));

export const countryHref = (c) => `${ROOT}${c.slug}/`;

/** "Page 2 of 3 · countries 11–20 of 25, A to Z" */
export function whereLine(n, pages, total) {
  const a = (n - 1) * PAGE_SIZE + 1, z = Math.min(n * PAGE_SIZE, total);
  return `Page ${n} of ${pages} · ${a === z ? `country ${a}` : `countries ${a}–${z}`} of ${total}, A to Z`;
}

/** Previous, the numbered pages and Next; the current page marked, the ends disabled. */
export function pagerLinks(n, pages) {
  const link = (i, label, rel) => `<a href="${pageHref(i)}" data-p="${i}"${rel ? ` rel="${rel}"` : ''}${i === n && !rel ? ' aria-current="page"' : ''}>${label}</a>`;
  const off = (label) => `<span class="off" aria-disabled="true">${label}</span>`;
  let html = n > 1 ? link(n - 1, 'Previous', 'prev') : off('Previous');
  for (let i = 1; i <= pages; i++) html += link(i, String(i));
  return html + (n < pages ? link(n + 1, 'Next', 'next') : off('Next'));
}

const TOKENS = ['var(--text)', 'var(--text-muted)'];
const colourOf = (t, i) => t.colour || TOKENS[i];
const srcset = (base, widths) => widths.map((w) => `${ROOT}img/${base}-${w}.webp ${w}w`).join(', ');
const SIZES = '(max-width:440px) 104px, 300px';

/** The card's picture: the result map, or the outline filled with the flag under a 1px edge stroke. */
function figure(c, pic) {
  const img = `<img src="${ROOT}img/${pic.base}-360.webp" srcset="${srcset(pic.base, pic.widths)}" sizes="${SIZES}" width="${pic.w}" height="${pic.h}" alt="${esc(pic.alt)}" loading="lazy">`;
  if (pic.kind === 'result-map') return img;
  return `${img}<svg viewBox="${pic.viewBox}" aria-hidden="true"><path d="${pic.d}"/></svg>`;
}

function partyLine(t, total) {
  const name = t.name && t.name !== t.code ? `<abbr title="${esc(t.name)}">${esc(t.code)}</abbr>` : esc(t.code);
  return `${name}, ${nf(t.seats)} of ${nf(total)}${t.share != null ? ` · ${t.share}%` : ''}`;
}

/** THE card template, the same for every country. `pic` is pictures.mjs's description of its picture. */
export function card(c, pic) {
  const e = c.election;
  const body = `${e.label ? `${e.label}` : e.house} general election`;
  const href = countryHref(c);
  const labels = ['Most seats', 'Next'];
  const bar = e.top.map((t, j) => `<i style="--sw:${colourOf(t, j)};width:${(t.seats / e.total * 100).toFixed(2)}%"></i>`).join('');
  const rows = e.top.map((t, j) => `<div><dt><i style="--sw:${colourOf(t, j)}"></i>${labels[j]}</dt><dd>${partyLine(t, e.total)}</dd></div>`).join('');
  const history = c.history && c.history.elections > 1
    ? `<a href="${href}?y=${c.history.first}">History: ${plural(c.history.elections, 'election', 'elections')} →</a>` : '';
  return `<li><article class="card" id="c-${c.slug}" aria-labelledby="h-${c.slug}">
  <figure class="fig">${figure(c, pic)}</figure>
  <div class="txt">
    <h2 id="h-${c.slug}"><a href="${href}">${esc(c.name)}</a></h2>
    <p class="meta">${e.year} · ${esc(body)}</p>
    <div class="seatbar" role="img" aria-label="${esc(e.top.map((t) => `${t.code} ${t.seats}`).join(', '))} of ${e.total} ${e.unit}">${bar}</div>
    <dl class="res">${rows}</dl>
    <p class="st">${nf(e.votesPolled)} votes polled</p>
  </div>
  <p class="go"><a class="btn" href="${href}">Open ${esc(c.name)}</a>${history}</p>
</article></li>`;
}

/** What the page says while D1 lists no country (a deploy made before every import day has run). */
export const NONE_YET = 'Not available yet: no country’s national result is published in the atlas.';

/** The cards of page `n`, as the pager and search insert them. */
export const cardsHtml = (countries, n, pictures) => pageSlice(countries, n).map((c) => card(c, pictures[c.code])).join('\n');

/** The footer's credits: every listed country's result source, then the pictures' and the type's. */
export function credits(countries, pictures) {
  const results = countries.map((c) => `${esc(c.name)}, <a href="${esc(c.election.source.url)}">${esc(c.election.source.publisher)}</a>`).join('; ');
  const kinds = new Set(countries.map((c) => pictures[c.code].kind));
  const maps = countries.filter((c) => pictures[c.code].kind === 'result-map').map((c) => pictures[c.code].credit);
  const parts = countries.length ? [`<span>Results: ${results}.</span>`] : [];
  if (maps.length) parts.push(`<span>Maps: ${maps.map(esc).join(' ')}</span>`);
  if (kinds.has('flag-shape')) parts.push('<span>Country outlines: Natural Earth (public domain). Flags: flag-icons (MIT); national flag designs are public domain in most countries.</span>');
  parts.push('<span>Type: Newsreader (SIL Open Font License).</span>');
  return parts.join('');
}

// Client: page swap (fetch only that page's cards) and search over the small index.
export const CLIENT = String.raw`
const PAGES = +document.querySelector('.list').dataset.pages, TOTAL = +document.querySelector('.list').dataset.total, PAGE_SIZE = ${PAGE_SIZE}, ROOT = '${ROOT}';
const list = () => document.querySelector('.list'), cache = {};
const pageOf = () => { const raw = new URLSearchParams(location.search).get('page'); const n = /^[1-9]\d*$/.test(raw || '') ? +raw : 1; return n <= PAGES ? n : 1; };
const pageHref = ${pageHref};
${whereLine}
${pagerLinks}
async function show(n, slug, push) {
  const ol = list();
  if (+ol.dataset.page !== n) {
    const html = cache[n] || (cache[n] = await (await fetch(ROOT + 'cards/' + n + '.html')).text());
    ol.innerHTML = html; ol.dataset.page = n;
  }
  document.querySelector('.where').textContent = whereLine(n, PAGES, TOTAL);
  document.querySelector('.pager').innerHTML = pagerLinks(n, PAGES);
  document.title = n > 1 ? 'Election Atlas: page ' + n : 'Election Atlas';
  if (push) history.pushState({ n }, '', pageHref(n) + (slug ? '#c-' + slug : ''));
  if (slug) {
    const el = document.getElementById('c-' + slug);
    if (!el) return;
    el.scrollIntoView({ block: 'center' }); el.classList.add('hit');
    el.querySelector('h2 a').focus({ preventScroll: true });
    setTimeout(() => el.classList.remove('hit'), 1600);
  } else if (push) document.querySelector('.where').scrollIntoView();
}
// The address names the page shown: drop a page the list does not have (or page=1).
if (location.search && pageHref(pageOf()) !== location.pathname + location.search) history.replaceState(null, '', pageHref(pageOf()) + location.hash);
document.addEventListener('click', e => { const a = e.target.closest('.pager a[data-p]'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); show(+a.dataset.p, null, true); });
addEventListener('popstate', () => show(pageOf(), location.hash.slice(3) || null, false));

// Search: one small index (name, aliases, slug, page) for every country; nothing else loads until a choice.
const find = document.querySelector('.find');
find.hidden = false;
const q = find.querySelector('input'), lb = find.querySelector('[role=listbox]'), out = find.querySelector('output');
let index = null, opts = [], sel = -1;
const load = () => index ? Promise.resolve(index) : fetch(ROOT + 'index.json').then(r => r.json()).then(j => index = j);
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const text = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const close = () => { lb.hidden = true; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); sel = -1; };
const pick = o => { close(); q.value = o.n; out.textContent = o.n + ', page ' + o.p; show(o.p, o.s, true); };
const render = () => {
  lb.innerHTML = opts.map((o, i) => '<li role="option" id="o' + i + '" aria-selected="' + (i === sel) + '">' + text(o.n) + '<span>page ' + o.p + '</span></li>').join('');
  lb.hidden = !opts.length; q.setAttribute('aria-expanded', String(!!opts.length));
  if (sel >= 0) q.setAttribute('aria-activedescendant', 'o' + sel); else q.removeAttribute('aria-activedescendant');
};
q.addEventListener('focus', load, { once: true });
q.addEventListener('input', async () => {
  const s = fold(q.value.trim()); await load(); sel = -1;
  opts = !s ? [] : index.filter(o => [o.n, ...o.a].some(x => fold(x).startsWith(s) || fold(x).includes(' ' + s))).slice(0, 8);
  if (s && !opts.length) opts = index.filter(o => [o.n, ...o.a].some(x => fold(x).includes(s))).slice(0, 8);
  out.textContent = !s ? '' : opts.length ? opts.length + (opts.length === 1 ? ' match' : ' matches') : 'No country matches';
  render();
});
q.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' && opts.length) { sel = (sel + 1) % opts.length; render(); e.preventDefault(); }
  else if (e.key === 'ArrowUp' && opts.length) { sel = (sel - 1 + opts.length) % opts.length; render(); e.preventDefault(); }
  else if (e.key === 'Enter' && opts.length) { pick(opts[Math.max(sel, 0)]); e.preventDefault(); }
  else if (e.key === 'Escape') close();
});
lb.addEventListener('mousedown', e => { const li = e.target.closest('[role=option]'); if (li) { e.preventDefault(); pick(opts[+li.id.slice(1)]); } });
q.addEventListener('blur', () => setTimeout(close, 120));
`;

export const CSS = `
@font-face{font-family:"Newsreader";src:url(${ROOT}fonts/newsreader.woff2) format("woff2");font-weight:400 500;font-style:normal;font-display:swap}
:root{--pad:clamp(16px,3.4vw,56px);--ease:cubic-bezier(.2,0,0,1)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--surface);color:var(--text);font-family:var(--font-serif);font-optical-sizing:auto;font-size:18px;line-height:1.55;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
h1,h2,p,figure,ol,ul,dl,dd{margin:0}ol,ul{padding:0;list-style:none}a{color:inherit}img{display:block;max-width:100%}
abbr[title]{text-decoration:none}
:focus-visible{outline:2px solid var(--focus);outline-offset:3px}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.bar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px var(--pad);font-size:16px}
.bar a{text-decoration:none}.bar a:hover{text-decoration:underline}
site-theme-picker{font-size:15px;min-height:24px}
.btn{display:inline-block;background:var(--text);color:var(--surface);text-decoration:none;font-size:16px;line-height:1;padding:13px 18px;transition:transform .18s var(--ease),opacity .18s var(--ease)}
.btn:hover{transform:translateY(-2px)}.btn:active{transform:none;opacity:.85}
.top{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:24px 48px;align-items:end;padding:40px var(--pad) 0}
.top h1{font-size:clamp(44px,5.6vw,88px);line-height:.98;letter-spacing:-.035em;font-weight:500}
.top p{font-size:18px;color:var(--text-body);max-width:44ch}.top p.count{font-size:16px;color:var(--text-muted);margin-top:8px}
.find{position:relative;margin-top:16px;display:grid;gap:6px}.find label{font-size:16px}
.find input{font:inherit;font-size:18px;padding:10px 12px;background:var(--card);color:var(--text);border:2px solid var(--line-strong);border-radius:0;width:100%}
.find input:focus{border-color:var(--text);outline:none}
.find [role=listbox]{position:absolute;top:100%;left:0;right:0;z-index:5;background:var(--card);border:2px solid var(--text);border-top:0;max-height:320px;overflow:auto;box-shadow:var(--shadow-hover)}
.find [role=option]{display:flex;justify-content:space-between;gap:12px;padding:9px 12px;cursor:pointer;font-size:17px}
.find [role=option] span{color:var(--text-muted);font-size:15px}
.find [role=option][aria-selected=true],.find [role=option]:hover{background:var(--surface-2)}
.find output{font-size:15px;color:var(--text-muted)}
.where{padding:28px var(--pad) 0;font-size:16px;color:var(--text-muted)}
.list{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr));gap:20px;padding:14px var(--pad) 0}
.list > li{container-type:inline-size;display:grid}
.card{display:grid;grid-template-rows:auto 1fr auto;background:var(--card);padding:20px;gap:16px;transition:outline-color .6s}
.card.hit{outline:3px solid var(--text);outline-offset:-3px}
.fig{aspect-ratio:4/3;background:var(--surface-2);position:relative;overflow:hidden}
.fig img,.fig svg{position:absolute;inset:12px;width:calc(100% - 24px);height:calc(100% - 24px);object-fit:contain}
.fig svg path{fill:none;stroke:var(--text-muted);stroke-width:1;vector-effect:non-scaling-stroke}
.card h2{font-size:30px;line-height:1.05;letter-spacing:-.02em;font-weight:500}
.card h2 a{text-decoration:none}.card h2 a:hover{text-decoration:underline;text-underline-offset:5px}
.meta{font-size:15px;color:var(--text-muted);margin-top:6px}
.seatbar{display:flex;height:10px;margin-top:14px;background:var(--line-strong)}.seatbar i{display:block;background:var(--sw)}
.res{margin-top:10px;display:grid;gap:4px;font-size:16px}
.res div{display:grid;grid-template-columns:6.6em minmax(0,1fr);gap:8px;align-items:baseline}
.res dt{color:var(--text-muted)}.res dt i{display:inline-block;width:10px;height:10px;margin-right:6px;background:var(--sw)}
.st{font-size:14px;color:var(--text-muted);margin-top:6px}
.go{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center}
.pager{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;padding:36px var(--pad) 0;font-size:17px}
.pager a,.pager span{display:inline-grid;place-items:center;min-width:44px;min-height:44px;padding:0 12px;text-decoration:none;background:var(--card)}
.pager a:hover{background:var(--surface-2)}
.pager [aria-current=page]{background:var(--text);color:var(--surface)}
.pager .off{color:var(--text-muted);background:transparent}
.foot{padding:100px var(--pad) 40px;font-size:15px;color:var(--text-muted);display:flex;gap:8px 24px;flex-wrap:wrap}
@container (max-width:420px){
  .card{grid-template-columns:104px minmax(0,1fr);grid-template-rows:auto;column-gap:16px;row-gap:12px;padding:16px}
  .fig{grid-row:1/4;grid-column:1;align-self:start}.fig img,.fig svg{inset:6px;width:calc(100% - 12px);height:calc(100% - 12px)}
  .txt{display:contents}.card h2,.meta,.seatbar{grid-column:2}.meta,.seatbar{margin-top:0}
  .res,.st,.card .go{grid-column:1/-1}.card h2{font-size:26px}.res div{grid-template-columns:5.6em minmax(0,1fr)}
}
@media (max-width:760px){.top{grid-template-columns:1fr;padding-top:16px}.top h1{font-size:clamp(40px,11vw,64px)}}
@media (prefers-reduced-motion:reduce){.btn,.btn:hover{transition:none;transform:none}.card{transition:none}}
`;

/**
 * Page `n` of the list, whole. `fallbackCss` is site-shell's Classic Light
 * fallback block (frontend/app/site-fallback.css), which keeps every shared token
 * defined when the page is served without site-shell. The charset meta is written
 * as the Next pages write it: site-shell's compose() puts the theme right after it.
 */
export function page(countries, n, pictures, { fallbackCss }) {
  const pages = pageCount(countries.length), total = countries.length;
  const top = total ? `
    <p class="count">${plural(total, 'country', 'countries')}${pages > 1 ? `, ${PAGE_SIZE} per page` : ''}.</p>
    <div class="find" hidden><label for="q">Find a country</label><input id="q" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="qlist" autocomplete="off" spellcheck="false"><ul id="qlist" role="listbox" aria-label="Matching countries" hidden></ul><output role="status"></output></div>` : '';
  const list = total ? `<p class="where">${whereLine(n, pages, total)}</p>
<ol class="list" data-page="${n}" data-pages="${pages}" data-total="${total}">
${cardsHtml(countries, n, pictures)}
</ol>
<nav class="pager" aria-label="Pages">${pagerLinks(n, pages)}</nav>` : `<p class="where">${NONE_YET}</p>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${n > 1 ? `Election Atlas: page ${n}` : 'Election Atlas'}</title>
<meta name="description" content="The latest national election result for each country the Election Atlas holds, from that country’s own election authority.">
<link rel="canonical" href="${pageHref(n)}">
<link rel="icon" href="data:,">
<link rel="preload" href="${ROOT}fonts/newsreader.woff2" as="font" type="font/woff2" crossorigin>
<style>${fallbackCss.trim()}
${CSS.trim()}</style>
</head>
<body>
<header class="bar"><a href="/">← Akshay Prabhakant</a><site-theme-picker hide-label=""></site-theme-picker></header>
<main>
<section class="top" aria-labelledby="h1">
  <h1 id="h1">Election results, by country</h1>
  <div>
    <p>The latest national result for each country the atlas holds, from that country’s own election authority, A to Z.</p>${top}
  </div>
</section>
<section aria-labelledby="h-list"><h2 class="vh" id="h-list">Countries</h2>
${list}
</section>
</main>
<footer class="foot"><a href="/">← Akshay Prabhakant</a>${credits(countries, pictures)}</footer>
${total ? `<script type="module">${CLIENT.trim()}</script>
` : ''}</body>
</html>
`;
}
