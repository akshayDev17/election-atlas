// The /elections page as pure functions: the derived country list in, HTML and the
// search index out. build.mjs writes what these return; landing.test.mjs tests them.
//
// One card template for every country, A to Z, PAGE_SIZE to a page, the page in the
// URL (/elections/?page=3). The Worker serves page N's prerendered HTML at that URL,
// and the pager swaps pages in place by fetching only that page's cards
// (/elections/cards/N.json). Search runs on the device over one small index of
// every country (/elections/index.json: name, aliases, slug, page); choosing a match
// fetches only that country's page of cards.
//
// Each card also carries the country's V-Dem regime pill ("V-Dem · Electoral
// autocracy"), read from lib/regime.ts by the country's ISO code: the same module
// the atlas's TypeScript tests read, so build.mjs runs under node's type stripping
// (backend/build_site.py passes --experimental-strip-types; the landing tests do).
import { NATION_REGIMES, REGIME_TIERS, VDEM, regimePillText } from '../lib/regime.ts';

export const ROOT = '/elections/';
export const PAGE_SIZE = 10;

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const nf = (n) => n.toLocaleString('en-US');

/** The number of pages for `count` countries; one page even for none. */
export const pageCount = (count) => Math.max(1, Math.ceil(count / PAGE_SIZE));

/** The countries on page `n` (1-based) of the A-to-Z list. */
export const pageSlice = (countries, n) => countries.slice((n - 1) * PAGE_SIZE, n * PAGE_SIZE);

/**
 * The page a query asks for: `?page=N` for a whole N from 1 to `pages`, else 1
 * (no page, page=0, page=abc, page=2.5, a page past the end). The page's own
 * script reads its address with this.
 */
export function pageFromQuery(search, pages) {
  const raw = new URLSearchParams(search).get('page');
  const n = raw !== null && /^[1-9]\d*$/.test(raw) ? Number(raw) : 1;
  return n <= pages ? n : 1;
}

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

const ARROW = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M4 12 12 4M5.5 4H12v6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * The card's V-Dem regime pill: the tier V-Dem's Regimes of the World gives the
 * country (lib/regime.ts, by ISO code; a country the table does not rate gets
 * none). Two controls in one shape: the text is a button that opens the page's
 * one dialog (regimeDialog below), filled for this country by the script, and
 * the slanted arrow after it is a link to the country's own view on the data
 * source, in a new tab. Neither is inside the card's links, and neither opens
 * the country page.
 */
export function regimePill(c) {
  const n = NATION_REGIMES[c.code];
  if (!n) return '';
  return `<span class="regime" data-tier="${n.tier}">`
    + `<button type="button" class="regime-btn" aria-haspopup="dialog" aria-controls="regime-dialog" data-country="${esc(c.name)}" title="What this rating means">${esc(regimePillText(n))}</button>`
    + `<a class="regime-link" href="${esc(n.externalURL)}" target="_blank" rel="noopener" aria-label="${esc(n.externalLabel)}" title="${esc(n.externalLabel)}">${ARROW}</a>`
    + '</span>';
}

/**
 * The page's one Regimes of the World dialog: what the classification is, the
 * four tiers with V-Dem's criteria and cut-offs, and the sources. The parts that
 * name a country (.regime-who, .regime-art, .regime-own, aria-current and the
 * .regime-tag on its tier's row, data-tier on the dialog) are empty here; the
 * script fills them from the pill that opens it.
 */
export function regimeDialog() {
  const tiers = REGIME_TIERS.map((t) => `<li data-tier="${t.id}"><h3><span class="regime-dot" aria-hidden="true"></span><span class="regime-name">${esc(t.label)}</span><span class="regime-tag" hidden></span></h3><p>${esc(t.criteria)}</p><p class="regime-cut"><span class="lbl">Cut-offs</span> ${esc(t.cutoffs)}</p></li>`).join('');
  return `<dialog id="regime-dialog" class="regime-dlg" aria-labelledby="regime-title"><div class="regime-dlg-body">
<header class="regime-dlg-head"><div><p class="lbl">V-Dem · Regimes of the World</p>
<h2 id="regime-title"><span class="regime-who"></span> is rated <span class="regime-art"></span> <span class="regime-own"></span></h2>
<p class="regime-asof">V-Dem ${VDEM.version} (${VDEM.released}), data year ${VDEM.dataYear}</p></div>
<button type="button" class="regime-close" aria-label="Close">×</button></header>
<p class="regime-intro">Regimes of the World (RoW) is the V-Dem Institute’s classification of every country into four regime types, year by year since 1900. It follows Lührmann, Tannenberg and Lindberg (2018) and is coded from V-Dem’s expert-based indices: first whether a country holds de-facto multi-party, free and fair elections and meets a minimum of Dahl’s requisites of polyarchy (the democracy line), then whether its liberal guarantees (access to justice, the rule of law, courts and legislature that constrain the executive) are met.</p>
<ol class="regime-tiers">${tiers}</ol>
<footer class="regime-dlg-foot"><p class="lbl">Sources</p><ul>
<li><a href="${VDEM.codebookURL}" target="_blank" rel="noopener">V-Dem Codebook ${VDEM.version}</a>, section 5.1.1, <i>v2x_regime</i> (the tier definitions and cut-offs above are paraphrased from it).</li>
<li><a href="${VDEM.articleURL}" target="_blank" rel="noopener">${esc(VDEM.articleCitation)}</a>.</li>
<li><a href="${VDEM.reportURL}" target="_blank" rel="noopener">${esc(VDEM.reportCitation)}</a> (the tier colours are its map legend).</li>
<li><span class="regime-who"></span>’s tier as read from <a href="${VDEM.dataURL}" target="_blank" rel="noopener">Our World in Data’s chart of V-Dem ${VDEM.version}</a>; V-Dem’s own <a href="${VDEM.countryGraphURL}" target="_blank" rel="noopener">Country Graph</a> plots the underlying indices.</li>
</ul></footer>
</div></dialog>`;
}

/** THE card template, the same for every country. `pic` is pictures.mjs's description of its picture. */
export function card(c, pic) {
  const e = c.election;
  const body = `${e.label ? `${e.label}` : e.house} general election`;
  const href = countryHref(c);
  const labels = ['Most seats', 'Next'];
  const bar = e.top.map((t, j) => `<i style="--sw:${colourOf(t, j)};width:${(t.seats / e.total * 100).toFixed(2)}%"></i>`).join('');
  const rows = e.top.map((t, j) => `<div><dt><i style="--sw:${colourOf(t, j)}"></i>${labels[j]}</dt><dd>${partyLine(t, e.total)}</dd></div>`).join('');
  return `<li><article class="card" id="c-${c.slug}" aria-labelledby="h-${c.slug}">
  <figure class="fig">${figure(c, pic)}</figure>
  <div class="txt">
    <h2 id="h-${c.slug}"><a href="${href}">${esc(c.name)}</a></h2>
    <p class="meta">${e.year} · ${esc(body)}</p>
    ${regimePill(c)}
    <div class="seatbar" role="img" aria-label="${esc(e.top.map((t) => `${t.code} ${t.seats}`).join(', '))} of ${e.total} ${e.unit}">${bar}</div>
    <dl class="res">${rows}</dl>
    <p class="st">${nf(e.votesPolled)} votes polled</p>
  </div>
  <p class="go"><a class="btn" href="${href}">Open ${esc(c.name)}</a></p>
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
${pageFromQuery}
const pageOf = () => pageFromQuery(location.search, PAGES);
const pageHref = ${pageHref};
${whereLine}
${pagerLinks}
async function show(n, slug, push) {
  const ol = list();
  if (+ol.dataset.page !== n) {
    const html = cache[n] || (cache[n] = (await (await fetch(ROOT + 'cards/' + n + '.json')).json()).html);
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

// The regime pill's dialog: one <dialog> for the page, filled for the card whose pill
// opened it. The pills are swapped in with their cards, so the list, not each pill,
// listens. Escape closes it (the browser's cancel), so do the close button and a click
// on the backdrop; focus returns to the pill that opened it each time.
const dlg = document.getElementById('regime-dialog');
let opener = null, pressedOutside = false;
const outsideBox = e => { const r = dlg.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
function openRegime(btn) {
  const tier = btn.closest('.regime').dataset.tier, who = btn.dataset.country;
  const own = dlg.querySelector('.regime-tiers li[data-tier="' + tier + '"]');
  if (!own) return;
  const label = own.querySelector('.regime-name').textContent;
  dlg.dataset.tier = tier;
  for (const el of dlg.querySelectorAll('.regime-who')) el.textContent = who;
  dlg.querySelector('.regime-art').textContent = /^[aeiou]/i.test(label) ? 'an' : 'a';
  dlg.querySelector('.regime-own').textContent = label.toLowerCase();
  for (const li of dlg.querySelectorAll('.regime-tiers li')) {
    const tag = li.querySelector('.regime-tag');
    if (li === own) { li.setAttribute('aria-current', 'true'); tag.textContent = who + ', ${VDEM.dataYear}'; tag.hidden = false; }
    else { li.removeAttribute('aria-current'); tag.hidden = true; tag.textContent = ''; }
  }
  opener = btn;
  if (!dlg.open) dlg.showModal();
}
list().addEventListener('click', e => { const btn = e.target.closest('.regime-btn'); if (btn) openRegime(btn); });
// Pointer events on the backdrop are dispatched to the <dialog> itself, as are those
// on its own scrollbar and edges, and a click whose press and release straddle the body
// and the backdrop goes to their common ancestor, the dialog. So the backdrop dismisses
// on the click, and only when the primary press and the click both fall outside the
// dialog's box: a keyboard click (detail 0) never dismisses, and a cancelled press or
// the dialog closing forgets the press.
dlg.addEventListener('pointerdown', e => { pressedOutside = e.isPrimary && e.button === 0 && outsideBox(e); });
dlg.addEventListener('pointercancel', () => { pressedOutside = false; });
dlg.addEventListener('click', e => {
  const pressed = pressedOutside; pressedOutside = false;
  if (e.target.closest('.regime-close')) { dlg.close(); return; }
  if (pressed && e.detail > 0 && outsideBox(e)) dlg.close();
});
dlg.addEventListener('close', () => { pressedOutside = false; opener?.focus(); opener = null; });

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

/* Per tier, --tier (the fill) on the pill and on the dialog's markers, and
   --tier-ink (the text on the fill) on the pill alone, which is all that reads
   it, from lib/regime.ts: V-Dem's exact hex and its ink by default, and the dark
   set where <html> carries the theme site-shell always resolves to (its boot
   script sets data-theme to classic-light or classic-dark on the first frame;
   without it, the fallback block is light). Keyed on the attribute, not on a
   colour function a browser may lack, so no theme ever shows the other's set. */
const tierRules = (dark) => REGIME_TIERS.map((t) => {
  const on = dark ? 'html[data-theme="classic-dark"] ' : '';
  return `${on}:is(.regime,.regime-dlg)[data-tier="${t.id}"],${on}.regime-dlg [data-tier="${t.id}"]{--tier:${dark ? t.colourDark : t.colour}}`
    + `${on}.regime[data-tier="${t.id}"]{--tier-ink:${dark ? t.inkDark : t.ink}}`;
}).join('\n');
export const TIER_CSS = `${tierRules(false)}\n${tierRules(true)}`;

export const CSS = `
@font-face{font-family:"Newsreader";src:url(${ROOT}fonts/newsreader.woff2) format("woff2");font-weight:400 500;font-style:normal;font-display:swap}
:root{--pad:clamp(16px,3.4vw,56px);--ease:cubic-bezier(.2,0,0,1)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--surface);color:var(--text);font-family:var(--font-serif);font-optical-sizing:auto;font-size:18px;line-height:1.55;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
h1,h2,p,figure,ol,ul,dl,dd{margin:0}ol,ul{padding:0;list-style:none}a{color:inherit}img{display:block;max-width:100%}
abbr[title]{text-decoration:none}
:focus-visible{outline:2px solid var(--focus);outline-offset:3px}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.bar{display:flex;align-items:center;justify-content:space-between;gap:8px 16px;padding:20px var(--pad);font-size:16px}
.bar>site-slot{flex:0 1 auto;min-width:0}
.bar .back{text-decoration:none}.bar .back:hover{text-decoration:underline}
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
/* ── the V-Dem regime pill on each card, and the page's one dialog ──────
   The one coloured, non-party thing on a card, so its colour is the data
   source's own, flat: --tier is V-Dem's legend swatch of Figure 4, "Regimes of
   the World, 2025", in the Democracy Report 2026, exactly, on a light theme, and
   on a dark theme the tier derived from it by the rule lib/regime.ts states
   (colourDark); --tier-ink is the text that contrasts more with that fill
   (regime.ts: ink, inkDark), AA or better in both themes (TIER_CSS above sets
   both per data-tier, the dark set by html[data-theme]). The pill's fill and
   border and the dialog's tier dot and leading edge are --tier itself; only
   the dialog's headings draw the tier toward the theme's ink (--text), since
   the flat hex would not read as text on the card. No text here goes under
   12px on any screen. */
.regime{--tier:var(--text-muted);--tier-ink:var(--card);--regime-bg:var(--tier);--regime-ink:var(--tier-ink);--regime-line:var(--tier);--regime-split:color-mix(in oklab,var(--tier-ink) 40%,transparent);
  display:inline-flex;align-items:stretch;max-width:100%;margin-top:10px;font-family:var(--font-mono);font-size:13px;line-height:1.2;letter-spacing:.02em;color:var(--regime-ink)}
${TIER_CSS}
.regime-btn,.regime-link{appearance:none;margin:0;cursor:pointer;background:var(--regime-bg);color:inherit;border:1px solid var(--regime-line);font:inherit;letter-spacing:inherit;text-decoration:none;transition:box-shadow .18s var(--ease)}
.regime-btn{padding:4px 8px 4px 10px;border-radius:999px 0 0 999px;border-inline-end:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.regime-link{display:inline-flex;align-items:center;padding:0 8px 0 6px;border-radius:0 999px 999px 0;border-inline-start:1px solid var(--regime-split)}
/* Hover keeps the tier's exact fill and border: a 1px ring of the ink inside the edge. */
.regime-btn:hover,.regime-link:hover{box-shadow:inset 0 0 0 1px var(--regime-ink)}
.regime-btn:focus-visible,.regime-link:focus-visible{outline:2px solid var(--focus);outline-offset:2px;position:relative;z-index:1}
.regime-dlg{--tier:var(--text-muted);width:min(40rem,calc(100vw - 32px));max-width:none;max-height:min(85dvh,calc(100dvh - 32px));margin:auto;padding:0;border:1px solid var(--line-strong);border-radius:6px;background:var(--card);color:var(--text);box-shadow:var(--shadow-hover);overscroll-behavior:contain;font-size:16px;line-height:1.5}
.regime-dlg::backdrop{background:color-mix(in oklab,var(--text,#0F1220) 55%,transparent)}
.regime-dlg-body{padding:24px}
.regime-dlg .lbl{font-family:var(--font-mono);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted)}
.regime-dlg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--line)}
.regime-dlg h2{margin-top:4px;font-size:22px;line-height:1.25;letter-spacing:-.01em;font-weight:500}
.regime-own{color:var(--regime-ink);--regime-ink:color-mix(in oklab,var(--tier) 50%,var(--text))}
.regime-asof{margin-top:4px;font-family:var(--font-mono);font-size:12px;letter-spacing:.04em;color:var(--text-muted)}
.regime-close{appearance:none;flex:0 0 auto;width:32px;height:32px;margin:-4px -6px 0 0;padding:0;cursor:pointer;background:none;border:1px solid transparent;border-radius:999px;font-family:var(--font-serif);font-size:24px;line-height:1;color:var(--text-muted);transition:color .18s var(--ease),border-color .18s var(--ease)}
.regime-close:hover{color:var(--text);border-color:var(--line-strong)}
.regime-intro{margin-top:16px;font-size:15px;line-height:1.6;color:var(--text-body)}
.regime-tiers{margin-top:24px;display:flex;flex-direction:column;gap:12px}
.regime-tiers li{--regime-ink:color-mix(in oklab,var(--tier) 50%,var(--text));padding:12px 16px;border:1px solid var(--line);border-radius:6px;border-inline-start:3px solid var(--tier)}
.regime-tiers li[aria-current="true"]{background:color-mix(in oklab,var(--tier) 18%,var(--card));border-color:color-mix(in oklab,var(--tier) 45%,var(--card));border-inline-start-color:var(--tier)}
.regime-tiers h3{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0;font-family:var(--font-mono);font-size:13px;font-weight:500;letter-spacing:.03em;color:var(--regime-ink)}
.regime-dot{width:10px;height:10px;border-radius:50%;background:var(--tier);box-shadow:0 0 0 1px var(--regime-ink)}
.regime-tag{margin-inline-start:auto;padding:1px 8px;border-radius:999px;background:var(--regime-ink);color:var(--card);font-size:12px;font-weight:400;letter-spacing:.06em;text-transform:uppercase}
.regime-tiers p{margin-top:8px;font-size:14px;line-height:1.55;color:var(--text-body)}
.regime-cut{font-family:var(--font-mono);font-size:12px;line-height:1.5;color:var(--text-muted)}
.regime-cut .lbl{margin-inline-end:4px;font-size:inherit}
.regime-dlg-foot{margin-top:24px;padding-top:16px;border-top:1px solid var(--line)}
.regime-dlg-foot ul{margin-top:8px;padding-inline-start:1.1em;list-style:disc;font-family:var(--font-mono);font-size:12px;line-height:1.6;color:var(--text-muted)}
.regime-dlg-foot li+li{margin-top:4px}
.regime-dlg-foot a{color:var(--text);text-decoration:underline;text-underline-offset:2px}
/* The dialog's headings, per theme, through the theme's own color-scheme:
   lighter text on a dark ground, darker on a light one. A custom property takes
   any value, so this sits under @supports: a browser without light-dark() keeps
   the 50% value above. */
@supports (color:light-dark(black,white)){.regime-own,.regime-tiers li{--regime-ink:light-dark(color-mix(in oklab,var(--tier) 60%,var(--text)),color-mix(in oklab,var(--tier) 30%,var(--text)))}}
@container (max-width:420px){
  .card{grid-template-columns:104px minmax(0,1fr);grid-template-rows:auto;column-gap:16px;row-gap:12px;padding:16px}
  .fig{grid-row:1/4;grid-column:1;align-self:start}.fig img,.fig svg{inset:6px;width:calc(100% - 12px);height:calc(100% - 12px)}
  .txt{display:contents}.card h2,.meta,.seatbar{grid-column:2}.meta,.seatbar{margin-top:0}
  /* The text column beside the picture is too narrow for the pill's whole text
     (it would truncate "Electoral autocracy"), so the pill takes a row of its
     own under the result lines, before the buttons: the picture, title and
     seat bar keep their composition. */
  .regime{grid-column:1/-1;order:1;margin-top:0;justify-self:start}.card .go{order:2}
  .res,.st,.card .go{grid-column:1/-1}.card h2{font-size:26px}.res div{grid-template-columns:5.6em minmax(0,1fr)}
}
@media (max-width:760px){.bar{flex-wrap:wrap}.bar>site-slot{flex-basis:100%}.top{grid-template-columns:1fr;padding-top:16px}.top h1{font-size:clamp(40px,11vw,64px)}}
@media (prefers-reduced-motion:reduce){.btn,.btn:hover{transition:none;transform:none}.card,.regime-btn,.regime-link,.regime-close{transition:none}}
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
<nav class="pager" aria-label="Pages">${pagerLinks(n, pages)}</nav>
${regimeDialog()}` : `<p class="where">${NONE_YET}</p>`;
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
<header class="bar"><site-slot name="site-path"><a class="back" href="/">← Akshay Prabhakant</a></site-slot><site-theme-picker hide-label=""></site-theme-picker></header>
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
