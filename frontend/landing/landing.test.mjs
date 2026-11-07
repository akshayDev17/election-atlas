// The /elections page: node --experimental-strip-types --test landing/landing.test.mjs   (npm run test:landing)
//
// The render functions, the checks the builder makes before it writes anything,
// the pictures, a whole build into a scratch site, and (when the assembled site
// exists: LANDING_DIST, default ../dist) the built page itself: every card links
// a country page that exists, and the search index lists exactly the cards.
//
// Fixtures: INDIA is the real record backend/d1/countries.py derives from D1 for
// the 2024 Lok Sabha, cut to two constituencies' winners for the map. To exercise
// paging, `several()` lists that one record under other country codes; those
// copies exist only inside this test's scratch directories.
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  NONE_YET, PAGE_SIZE, ROOT, card, cardsHtml, countryHref, credits, page, pageCount, pageFromQuery, pageHref, pageSlice,
  pagerLinks, regimeDialog, regimePill, searchIndex, whereLine, CSS, TIER_CSS,
} from './render.mjs';
import { RESERVED, aToZ, build, checkCountries, fallbackCss } from './build.mjs';
import { MAP_ONLY, RESULT_MAPS, flagShapeSvg, pictureOf, rasterise } from './pictures.mjs';
import { listPageNumber } from '../../backend/src/index.js';
import { NATION_REGIMES, REGIME_TIERS, VDEM, regimePillText } from '../lib/regime.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '../..');
const OUTLINES = JSON.parse(readFileSync(join(here, 'outlines.json'), 'utf8')).outlines;
const ALIASES = JSON.parse(readFileSync(join(here, 'aliases.json'), 'utf8')).aliases;

const INDIA = {
  code: 'IN', name: 'India', slug: 'india',
  election: {
    year: 2024, label: '18th Lok Sabha', house: 'Lok Sabha', unit: 'seats', total: 542, votesPolled: 645362531,
    top: [
      { code: 'BJP', name: 'Bharatiya Janata Party', colour: '#E8590C', seats: 239, votes: 235974144, share: 36.6 },
      { code: 'INC', name: 'Indian National Congress', colour: '#00A2E8', seats: 99, votes: 136758952, share: 21.2 },
    ],
    source: { publisher: 'Election Commission of India', url: 'https://www.eci.gov.in/eci-backend/public/all_files/GE-2024-statistical-report/33-Constituency-Wise-Detailed-Result.xls' },
  },
  history: { elections: 10, first: 1980 },
  seats: { winners: { S01_1: 'YSRCP', S01_10: 'TDP' }, colours: { YSRCP: '#1565C0', TDP: '#FFC300' } },
};

/** INDIA's record under `codes`' names, A to Z: paging fixtures only. */
const NAMES = { AU: 'Australia', CA: 'Canada', DE: 'Germany', FR: 'France', GB: 'United Kingdom', IL: 'Israel', JP: 'Japan', NP: 'Nepal', RS: 'Serbia', ES: 'Spain', LK: 'Sri Lanka', UY: 'Uruguay' };
function several(codes) {
  return [INDIA, ...codes.map((code) => ({ ...INDIA, code, name: NAMES[code], slug: NAMES[code].toLowerCase().replace(/ /g, '-'), seats: null, history: null }))]
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}
const picturesFor = (list) => Object.fromEntries(list.map((c) => [c.code, pictureOf(c, OUTLINES)]));

const scratch = mkdtempSync(join(tmpdir(), 'landing-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

/** A scratch site holding each listed country's page and the atlas files India's map reads. */
function site(list) {
  const root = mkdtempSync(join(scratch, 'site-'));
  for (const c of list) {
    mkdirSync(join(root, 'elections', c.slug), { recursive: true });
    writeFileSync(join(root, 'elections', c.slug, 'index.html'), '<!DOCTYPE html>');
  }
  const map = RESULT_MAPS.IN;
  for (const [rel, from] of [[map.seats, 'data/geo/india-pcs.json'], [map.borders, 'data/geo/india-states.json'], [map.parties, 'data/parties.json']]) {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    cpSync(join(repo, from), join(root, rel));
  }
  return root;
}

// ── pagination and the address ──────────────────────────────────────────

test('ten countries to a page, A to Z, and one page even for one country', () => {
  assert.equal(PAGE_SIZE, 10);
  assert.deepEqual([0, 1, 10, 11, 20, 41].map(pageCount), [1, 1, 1, 2, 2, 5]);
  const list = several(Object.keys(NAMES));
  assert.deepEqual(pageSlice(list, 1).map((c) => c.name), list.slice(0, 10).map((c) => c.name));
  assert.deepEqual(pageSlice(list, 2).map((c) => c.name), ['Sri Lanka', 'United Kingdom', 'Uruguay']);
  assert.deepEqual(pageSlice(list, 3), []);
});

const QUERIES = ['', '?page=1', '?page=2', '?page=5', '?page=6', '?page=0', '?page=-1', '?page=2.5', '?page=02',
  '?page=two', '?page=', '?y=2024', '?page=3&page=4', '?y=2024&page=4'];

test('?page=N is read as a whole page the list has; anything else is page 1', () => {
  const want = [1, 1, 2, 5, 1, 1, 1, 1, 1, 1, 1, 1, 3, 4];
  QUERIES.forEach((search, i) => assert.equal(pageFromQuery(search, 5), want[i], search));
  assert.equal(pageFromQuery('?page=2', 1), 1, 'with one page, page 2 does not exist');
});

test('the page\'s script and the Worker read ?page= alike for every page the list has', () => {
  for (const search of QUERIES) {
    const worker = listPageNumber(search);
    assert.equal(pageFromQuery(search, 5), worker <= 5 ? worker : 1, search);
  }
});

test('the pager: the current page marked, the ends disabled, every link a ?page= address', () => {
  assert.equal(pageHref(1), '/elections/');
  assert.equal(pageHref(3), '/elections/?page=3');
  assert.equal(pagerLinks(1, 1),
    '<span class="off" aria-disabled="true">Previous</span><a href="/elections/" data-p="1" aria-current="page">1</a><span class="off" aria-disabled="true">Next</span>');
  const middle = pagerLinks(2, 3);
  assert.match(middle, /^<a href="\/elections\/" data-p="1" rel="prev">Previous<\/a>/);
  assert.match(middle, /<a href="\/elections\/\?page=2" data-p="2" aria-current="page">2<\/a>/);
  assert.match(middle, /<a href="\/elections\/\?page=3" data-p="3" rel="next">Next<\/a>$/);
  assert.equal((middle.match(/aria-current/g) || []).length, 1);
  assert.equal(whereLine(1, 1, 1), 'Page 1 of 1 · country 1 of 1, A to Z');
  assert.equal(whereLine(2, 2, 13), 'Page 2 of 2 · countries 11–13 of 13, A to Z');
});

// ── the search index ────────────────────────────────────────────────────

test('the search index holds every country once: name, aliases, slug and page, in list order', () => {
  assert.deepEqual(searchIndex([INDIA], ALIASES), [{ n: 'India', a: ['Bharat'], s: 'india', p: 1 }]);
  const list = several(Object.keys(NAMES));
  const index = searchIndex(list, ALIASES);
  assert.deepEqual(index.map((o) => o.s), list.map((c) => c.slug));
  assert.deepEqual(index.map((o) => o.p), list.map((_, i) => (i < 10 ? 1 : 2)));
  const us = { ...INDIA, code: 'US', name: 'United States', slug: 'united-states' };
  assert.deepEqual(searchIndex([us], ALIASES)[0].a, ['USA', 'US', 'America', 'United States of America']);
  assert.deepEqual(index.find((o) => o.s === 'nepal').a, []);
  assert.deepEqual(Object.keys(index[0]).sort(), ['a', 'n', 'p', 's'], 'nothing but what search needs');
});

// ── the card ────────────────────────────────────────────────────────────

test('every card carries its name as text, links its country page and shows the cited result', () => {
  const html = card(INDIA, pictureOf(INDIA, OUTLINES));
  assert.match(html, /<h2 id="h-india"><a href="\/elections\/india\/">India<\/a><\/h2>/);
  assert.match(html, /<a class="btn" href="\/elections\/india\/">Open India<\/a>/);
  assert.match(html, /2024 · 18th Lok Sabha general election/);
  assert.match(html, /<abbr title="Bharatiya Janata Party">BJP<\/abbr>, 239 of 542 · 36.6%/);
  assert.match(html, /<abbr title="Indian National Congress">INC<\/abbr>, 99 of 542 · 21.2%/);
  assert.match(html, /645,362,531 votes polled/);
  assert.match(html, /aria-label="BJP 239, INC 99 of 542 seats"/);
  assert.match(html, /href="\/elections\/india\/\?y=1980">History: 10 elections →<\/a>/);
  assert.match(html, /<img src="\/elections\/img\/india-map-2024-360.webp"[^>]+alt="Map of India, 2024 Lok Sabha election: each of the 2 constituencies with a result/);
  assert.doesNotMatch(html.match(/<figure class="fig">[\s\S]*?<\/figure>/)[0], /<svg/, 'a result map has no outline stroke over it');
  assert.equal(countryHref(INDIA), `${ROOT}india/`);
});

test('a flag-shape card draws the 1px edge stroke over the flag and keeps its text label', () => {
  const uk = several(['GB']).find((c) => c.code === 'GB');
  const pic = pictureOf(uk, OUTLINES);
  assert.equal(pic.kind, 'flag-shape');
  const html = card(uk, pic);
  assert.match(html, /<img src="\/elections\/img\/united-kingdom-flag-360.webp"[^>]+alt="Outline of United Kingdom filled with its national flag"/);
  assert.match(html, new RegExp(`<svg viewBox="${pic.viewBox}" aria-hidden="true"><path d="M`));
  assert.match(html, />United Kingdom<\/a><\/h2>/);
  assert.doesNotMatch(html, /History:/, 'no history link without more than one election');
});

/* Every interactive element inside an <a> in `html`: none is allowed (a button
   or a link nested in a link is invalid HTML and a tap that goes two places). */
const nestedInLinks = (html) => [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)]
  .flatMap(([, inner]) => inner.match(/<(?:a|button|input|select|textarea|dialog)\b/g) ?? []);

test('India\'s card carries its V-Dem pill from lib/regime.ts, by ISO code, outside every link', () => {
  const html = card(INDIA, pictureOf(INDIA, OUTLINES));
  const pill = regimePill(INDIA);
  assert.equal(regimePillText(NATION_REGIMES.IN), 'V-Dem · Electoral autocracy');
  assert.equal(pill,
    '<span class="regime" data-tier="electoral-autocracy">'
    + '<button type="button" class="regime-btn" aria-haspopup="dialog" aria-controls="regime-dialog" data-country="India" title="What this rating means">V-Dem · Electoral autocracy</button>'
    + '<a class="regime-link" href="https://ourworldindata.org/grapher/political-regime?country=~IND" target="_blank" rel="noopener" aria-label="India’s V-Dem rating on Our World in Data (opens in a new tab)" title="India’s V-Dem rating on Our World in Data (opens in a new tab)">'
    + '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M4 12 12 4M5.5 4H12v6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a></span>');
  // once, right after the meta line, inside the card's text block
  assert.equal(html.split(pill).length, 2);
  assert.match(html, /<p class="meta">2024 · 18th Lok Sabha general election<\/p>\s*<span class="regime"/);
  assert.deepEqual(nestedInLinks(html), [], 'nothing interactive inside the card\'s links');
  // the tier is read from the card's code, never the template: the same record under another code draws none
  const uk = several(['GB']).find((c) => c.code === 'GB');
  assert.equal(regimePill(uk), '');
  assert.doesNotMatch(card(uk, pictureOf(uk, OUTLINES)), /regime/);
  assert.equal(regimePill({ ...INDIA, code: 'GB' }), '');
  assert.match(regimePill({ ...uk, code: 'IN' }), /data-tier="electoral-autocracy"[^>]*><button[^>]*data-country="United Kingdom"/);
});

test('the page holds the Regimes of the World dialog once, empty of any country, and the cards file holds none', () => {
  const dialog = regimeDialog();
  const html = page([INDIA], 1, picturesFor([INDIA]), { fallbackCss: fallbackCss() });
  assert.equal(html.split('<dialog id="regime-dialog"').length, 2, 'one dialog');
  assert.equal(html.split('<dialog ').length, 2, 'and no other');
  assert.ok(html.includes(dialog));
  assert.match(dialog, /^<dialog id="regime-dialog" class="regime-dlg" aria-labelledby="regime-title">/);
  assert.match(dialog, /<h2 id="regime-title"><span class="regime-who"><\/span> is rated <span class="regime-art"><\/span> <span class="regime-own"><\/span><\/h2>/);
  assert.match(dialog, new RegExp(`<p class="regime-asof">V-Dem ${VDEM.version} \\(${VDEM.released}\\), data year ${VDEM.dataYear}</p>`));
  assert.match(dialog, /<button type="button" class="regime-close" aria-label="Close">×<\/button>/);
  assert.deepEqual([...dialog.matchAll(/<li data-tier="([^"]+)"><h3><span class="regime-dot" aria-hidden="true"><\/span><span class="regime-name">([^<]+)<\/span><span class="regime-tag" hidden><\/span><\/h3>/g)].map((m) => [m[1], m[2]]),
    REGIME_TIERS.map((t) => [t.id, t.label]));
  for (const t of REGIME_TIERS) assert.ok(dialog.includes(`<p>${t.criteria}</p><p class="regime-cut"><span class="lbl">Cut-offs</span> ${t.cutoffs}</p>`), t.id);
  assert.doesNotMatch(dialog, /aria-current|data-tier="[^"]*"[^>]*class="regime-dlg"/, 'no country marked until a pill opens it');
  for (const url of [VDEM.codebookURL, VDEM.articleURL, VDEM.reportURL, VDEM.dataURL, VDEM.countryGraphURL]) {
    assert.ok(dialog.includes(`<a href="${url}" target="_blank" rel="noopener">`), url);
  }
  assert.deepEqual(nestedInLinks(dialog), []);
  assert.doesNotMatch(cardsHtml([INDIA], 1, picturesFor([INDIA])), /<dialog/, 'the pager swaps cards, not the dialog');
});

test('the stylesheet paints each tier in V-Dem\'s exact colour from lib/regime.ts, its dark set and inks beside it, flat on the pill', () => {
  const html = page([INDIA], 1, picturesFor([INDIA]), { fallbackCss: '' });
  assert.ok(html.includes(TIER_CSS), 'the page carries the tier rules');
  const DARK = 'html[data-theme="classic-dark"] ';
  for (const t of REGIME_TIERS) {
    // the light values by default; the dark set under the theme attribute site-shell resolves on <html>
    const fill = (on) => `${on}:is(.regime,.regime-dlg)[data-tier="${t.id}"],${on}.regime-dlg [data-tier="${t.id}"]`;
    assert.ok(TIER_CSS.includes(`${fill('')}{--tier:${t.colour}}.regime[data-tier="${t.id}"]{--tier-ink:${t.ink}}`), t.id);
    assert.ok(TIER_CSS.includes(`${fill(DARK)}{--tier:${t.colourDark}}${DARK}.regime[data-tier="${t.id}"]{--tier-ink:${t.inkDark}}`), t.id);
  }
  assert.doesNotMatch(TIER_CSS, /@supports|light-dark\(/, 'the theme attribute, not a colour function a browser may lack, selects the set');
  // --tier-ink is the pill's alone: the dialog declares and reads only --tier
  assert.doesNotMatch(TIER_CSS, /\.regime-dlg[^{]*\{[^}]*--tier-ink/);
  assert.doesNotMatch(CSS.match(/\.regime-dlg\{[^}]*\}/)[0], /--tier-ink/);
  // the pill is the tier itself: fill, border and ink come from --tier and --tier-ink, with no tint into the card
  assert.match(CSS, /\.regime\{[^}]*--regime-bg:var\(--tier\);--regime-ink:var\(--tier-ink\);--regime-line:var\(--tier\)/);
  assert.doesNotMatch(CSS.match(/\.regime\{[^}]*\}/)[0], /color-mix\(in oklab,var\(--tier\)/, 'the pill\'s fill is not mixed into the card');
  assert.doesNotMatch(CSS, /\.regime-btn:hover[^{]*\{[^}]*(background|border-color)/, 'hover keeps the exact fill and border');
  // no colour but the tiers' own (and the backdrop's fallback for --text) is written into the pill's and dialog's rules
  const hexes = [...CSS.matchAll(/\.regime[^{]*\{[^}]*\}/g)].flatMap(([rule]) => rule.match(/#[0-9a-fA-F]{6}\b/g) ?? []);
  const own = REGIME_TIERS.flatMap((t) => [t.colour, t.colourDark, t.ink, t.inkDark]);
  assert.deepEqual([...new Set(hexes.map((h) => h.toLowerCase()))].sort(), [...new Set([...own, '#0f1220'])].sort());
});

test('credits name each listed country\'s source and only the picture sources in use', () => {
  const one = credits([INDIA], picturesFor([INDIA]));
  assert.match(one, /India, <a href="https:\/\/www\.eci\.gov\.in\/[^"]+">Election Commission of India<\/a>/);
  assert.match(one, /constituency boundaries/);
  assert.doesNotMatch(one, /flag-icons|Natural Earth/);
  const list = several(['GB']);
  assert.match(credits(list, picturesFor(list)), /Natural Earth \(public domain\)\. Flags: flag-icons \(MIT\)/);
});

// ── the page ────────────────────────────────────────────────────────────

test('one country: the search box, the pager and the page line still show', () => {
  const html = page([INDIA], 1, picturesFor([INDIA]), { fallbackCss: fallbackCss() });
  assert.ok(html.startsWith('<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/>'), 'charset first, where site-shell composes');
  assert.match(html, /<label for="q">Find a country<\/label><input id="q" type="text" role="combobox"/);
  assert.match(html, /<nav class="pager" aria-label="Pages"><span class="off" aria-disabled="true">Previous<\/span><a href="\/elections\/" data-p="1" aria-current="page">1<\/a>/);
  assert.match(html, /<p class="where">Page 1 of 1 · country 1 of 1, A to Z<\/p>/);
  assert.match(html, /<p class="count">1 country\.<\/p>/);
  assert.match(html, /data-page="1" data-pages="1" data-total="1"/);
  assert.equal((html.match(/<article class="card"/g) || []).length, 1);
  assert.match(html, /<title>Election Atlas<\/title>/);
  assert.match(html, /<site-theme-picker hide-label=""><\/site-theme-picker>/);
});

test('the page loads its own font and nothing from another host, and never fades in', () => {
  const list = several(['GB']);
  const html = page(list, 1, picturesFor(list), { fallbackCss: fallbackCss() });
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/);
  assert.match(html, /<link rel="preload" href="\/elections\/fonts\/newsreader\.woff2" as="font" type="font\/woff2" crossorigin>/);
  assert.match(html, /@font-face\{font-family:"Newsreader";src:url\(\/elections\/fonts\/newsreader\.woff2\)/);
  const loads = [...html.matchAll(/<(?:link|script|img)\b[^>]*\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const url of loads) assert.ok(url.startsWith('/elections/') || url === 'data:,', url);
  assert.doesNotMatch(html, /@keyframes|animation:|opacity:0/, 'no entrance motion');
  assert.match(html, /:where\(:root\)\{color-scheme:light;--surface:#EEF1F8/, 'the Classic Light fallback block');
});

test('page 2 of the list is its own page, with its own cards, title and canonical address', () => {
  const list = several(Object.keys(NAMES));
  const html = page(list, 2, picturesFor(list), { fallbackCss: fallbackCss() });
  assert.match(html, /<title>Election Atlas: page 2<\/title>/);
  assert.match(html, /<link rel="canonical" href="\/elections\/\?page=2">/);
  assert.deepEqual([...html.matchAll(/<h2 id="h-[^"]+"><a href="[^"]+">([^<]+)</g)].map((m) => m[1]), ['Sri Lanka', 'United Kingdom', 'Uruguay']);
  assert.equal(cardsHtml(list, 2, picturesFor(list)).match(/<article/g).length, 3);
  assert.match(html, /<p class="count">13 countries, 10 per page\.<\/p>/);
});

// ── the builder's checks ────────────────────────────────────────────────

test('the builder refuses a list it cannot publish', () => {
  const root = site([INDIA]);
  assert.equal(checkCountries([INDIA], root).length, 1);
  const refuse = (list, needle) => assert.throws(() => checkCountries(list, root), needle);
  refuse({}, /not a list/);
  const uk = several(['GB']).find((c) => c.code === 'GB');
  refuse([INDIA, uk], /no country page at \/elections\/united-kingdom\//);
  refuse([{ ...INDIA, slug: 'cards' }], /path of the \/elections page itself/);
  refuse([INDIA, INDIA], /listed twice/);
  refuse([{ ...INDIA, election: { ...INDIA.election, source: { ...INDIA.election.source, url: 'http://eci.gov.in/' } } }], /no https source/);
  refuse([{ ...INDIA, election: { ...INDIA.election, top: [{ ...INDIA.election.top[0], seats: 600 }] } }], /seats out of range/);
  refuse([{ ...INDIA, code: 'IND' }], /bad country code/);
  for (const name of ['page', 'cards', 'img', 'fonts']) assert.ok(RESERVED.has(name), name);
});

// ── the pictures ────────────────────────────────────────────────────────

test('a picture is the result map where the atlas draws one, else the flag shape, else the build stops', () => {
  assert.equal(pictureOf(INDIA, OUTLINES).kind, 'result-map');
  const uk = several(['GB']).find((c) => c.code === 'GB');
  assert.equal(pictureOf(uk, OUTLINES).kind, 'flag-shape', 'no result map for it');
  assert.throws(() => pictureOf({ ...uk, code: 'ZZ', name: 'Nowhere' }, OUTLINES), /no picture for Nowhere \(ZZ\): no outline/);
});

test('India and the USA are drawn only as result maps: never a flag shape, though both have an outline and a flag', async () => {
  assert.deepEqual([...MAP_ONLY].sort(), ['IN', 'US']);
  const us = { ...INDIA, code: 'US', name: 'United States', slug: 'united-states', seats: null, history: null };
  assert.ok(OUTLINES.US && OUTLINES.IN, 'an outline exists for each, so a flag shape could be drawn');
  assert.throws(() => pictureOf(us, OUTLINES), /no picture for United States \(US\): it is drawn only as a result map, and the atlas has no result map for it/);
  assert.throws(() => pictureOf({ ...INDIA, seats: null }, OUTLINES), /no picture for India \(IN\): it is drawn only as a result map, and D1 names no seat winners/);
  const list = [INDIA, us];
  const root = site(list);
  await assert.rejects(build({ countries: list, site: root }), /United States \(US\): it is drawn only as a result map/);
  assert.ok(!existsSync(join(root, 'elections', 'index.html')), 'nothing written: the USA is not listed');
});

test('a flag shape is the flag stretched to the outline box and clipped to the outline', () => {
  const pic = pictureOf(several(['GB']).find((c) => c.code === 'GB'), OUTLINES);
  const svg = flagShapeSvg(pic, 240);
  assert.match(svg, /<clipPath id="landing-outline"><path d="M/);
  assert.match(svg, new RegExp(`<svg x="0" y="0" width="${pic.w}" height="${pic.h}" viewBox="0 0 640 480" preserveAspectRatio="none">`));
  assert.match(svg, / width="240" height="\d+">/);
});

test('pictures rasterise to WebP at 240, 360 and 720 px wide', async () => {
  const root = site([INDIA]);
  const files = await rasterise(INDIA, pictureOf(INDIA, OUTLINES), root);
  assert.deepEqual(Object.keys(files), ['india-map-2024-240.webp', 'india-map-2024-360.webp', 'india-map-2024-720.webp']);
  for (const b of Object.values(files)) {
    assert.equal(b.subarray(0, 4).toString(), 'RIFF');
    assert.equal(b.subarray(8, 12).toString(), 'WEBP');
  }
});

// ── a whole build ───────────────────────────────────────────────────────

const listed = (dir) => (existsSync(dir) ? readdirSync(dir).sort() : []);

test('one country: page 1, its cards, the search index, its pictures and the font, and no page 2', async () => {
  const root = site([INDIA]);
  const r = await build({ countries: [INDIA], site: root });
  assert.deepEqual([r.countries, r.pages], [1, 1]);
  const out = join(root, 'elections');
  assert.ok(existsSync(join(out, 'index.html')));
  assert.deepEqual(listed(join(out, 'cards')), ['1.json']);
  assert.ok(!existsSync(join(out, 'page')));
  assert.deepEqual(JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')), [{ n: 'India', a: ['Bharat'], s: 'india', p: 1 }]);
  assert.deepEqual(listed(join(out, 'img')), ['india-map-2024-240.webp', 'india-map-2024-360.webp', 'india-map-2024-720.webp']);
  assert.ok(existsSync(join(out, 'fonts/newsreader.woff2')));
});

test('the builder puts the derived list A to Z itself, as the page\'s locale orders accented names', async () => {
  const as = (code, name) => ({ ...INDIA, code, name, slug: name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), seats: null, history: null });
  const derived = [as('AL', 'Albania'), as('AX', 'Åland'), as('TM', 'Turkmenistan'), as('TR', 'Türkiye')];
  const root = site(derived);
  await build({ countries: derived, site: root });
  const out = join(root, 'elections');
  const want = ['Åland', 'Albania', 'Türkiye', 'Turkmenistan'];
  assert.deepEqual(JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')).map((o) => o.n), want);
  const cards = JSON.parse(readFileSync(join(out, 'cards/1.json'), 'utf8')).html;
  assert.deepEqual([...cards.matchAll(/<h2 id="h-[^"]+"><a href="[^"]+">([^<]+)</g)].map((m) => m[1]), want);
  assert.deepEqual(aToZ([as('TR', 'Twin'), as('AL', 'Twin')]).map((c) => c.code), ['AL', 'TR'], 'the code breaks a tie');
});

test('thirteen countries: two pages, each prerendered with its cards file', async () => {
  const list = several(Object.keys(NAMES));
  const root = site(list);
  const r = await build({ countries: list, site: root });
  assert.equal(r.pages, 2);
  const out = join(root, 'elections');
  assert.deepEqual(listed(join(out, 'cards')), ['1.json', '2.json']);
  assert.ok(existsSync(join(out, 'page/2/index.html')));
  assert.equal(JSON.parse(readFileSync(join(out, 'cards/2.json'), 'utf8')).html.match(/<article/g).length, 3);
  assert.equal(JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')).filter((o) => o.p === 2).length, 3);
  assert.equal(listed(join(out, 'img')).length, 13 * 3);
});

test('no country yet: the page says results are not available yet, with no card, pager, search or script', async () => {
  const root = site([]);
  const r = await build({ countries: [], site: root });
  assert.deepEqual([r.countries, r.pages], [0, 1]);
  const out = join(root, 'elections');
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(html, new RegExp(`<p class="where">${NONE_YET}</p>`));
  assert.match(NONE_YET, /^Not available yet/);
  assert.doesNotMatch(html, /<article|class="list"|class="pager"|class="find"|<script|Results:/);
  assert.match(html, /<h1 id="h1">Election results, by country<\/h1>/);
  assert.match(html, /Type: Newsreader/);
  assert.deepEqual(JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')), []);
  assert.deepEqual(listed(join(out, 'img')), []);
});

// ── the assembled site ──────────────────────────────────────────────────

const DIST = process.env.LANDING_DIST ?? join(repo, 'dist');
const built = existsSync(join(DIST, 'elections/index.html'));

test('the built /elections: every card links a country page that exists, and search indexes exactly the cards', { skip: !built && `no assembled site at ${DIST}` }, () => {
  const out = join(DIST, 'elections');
  const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8'));
  if (index.length === 0) {
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    assert.match(html, new RegExp(`<p class="where">${NONE_YET}</p>`), 'no country listed: built only with --pending-ok, and it says so');
    assert.doesNotMatch(html, /<article/);
    return;
  }
  const pages = Math.max(...index.map((o) => o.p));
  const slugs = [];
  for (let n = 1; n <= pages; n++) {
    const cards = JSON.parse(readFileSync(join(out, 'cards', `${n}.json`), 'utf8')).html;
    const whole = readFileSync(join(out, n === 1 ? 'index.html' : `page/${n}/index.html`), 'utf8');
    for (const html of [cards, whole]) {
      for (const [, href] of html.matchAll(/<a class="btn" href="\/elections\/([^"]+)\/">Open /g)) {
        assert.ok(existsSync(join(out, href, 'index.html')), `/elections/${href}/ has no page`);
      }
    }
    slugs.push(...[...cards.matchAll(/<article class="card" id="c-([^"]+)"/g)].map((m) => m[1]));
  }
  assert.deepEqual(slugs, index.map((o) => o.s));
  assert.ok(!existsSync(join(out, 'page', String(pages + 1))));
  assert.ok(index.some((o) => o.s === 'india'), 'India is listed: D1 holds its published result and its page exists');
  // India's card carries its V-Dem pill, in the page and in the cards file alike, and the page its one dialog
  const first = JSON.parse(readFileSync(join(out, 'cards/1.json'), 'utf8')).html;
  const whole = readFileSync(join(out, 'index.html'), 'utf8');
  for (const html of [first, whole]) {
    assert.match(html, /<article class="card" id="c-india"[\s\S]*?<span class="regime" data-tier="electoral-autocracy"><button type="button" class="regime-btn"[^>]*>V-Dem · Electoral autocracy<\/button>[\s\S]*?<\/article>/);
  }
  assert.equal(whole.split('<dialog id="regime-dialog"').length, 2);
  assert.doesNotMatch(first, /<dialog/);
});
