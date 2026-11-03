// The atlas Worker against the real site-shell, in local workerd: each test is
// one `wrangler dev` session over the assembled site, with no Cloudflare
// account. It needs the assembled site in dist/ (`npm run build`, then
// `python3 backend/build_site.py --out dist --db <D1 copy>`) and a checkout of
// akshayDev17/site-themes:
//
//   SITE_THEMES_DIR=/path/to/site-themes npm run test:shell
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { before, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { APP, DIST, SHELL, THROWING_SHELL, logMatching, shellAssetBase, siteThemes, startSession, unboundConfig } from './session.mjs';

const ROOT = '/elections/india/';
const SITE = join(DIST, 'elections/india');
const META = '<meta charSet="utf-8"/>';
// Each path the Worker serves as a page, and the file behind it (under dist/). The
// country list serves page 1 for a page it does not have: the list today has one.
const PAGES = {
  [ROOT]: 'elections/india/index.html',
  [`${ROOT}?y=2024&t=stands`]: 'elections/india/index.html',
  [`${ROOT}state/`]: 'elections/india/state/index.html',
  [`${ROOT}state/?s=IN-UP&y=2024`]: 'elections/india/state/index.html',
  [`${ROOT}state/?s=IN-WB`]: 'elections/india/state/index.html',
  [`${ROOT}mp/?s=IN-UP&c=gorakhpur`]: 'elections/india/mp/index.html',
  [`${ROOT}mla/?s=IN-BR&c=agiaon`]: 'elections/india/mla/index.html',
  '/elections/': 'elections/index.html',
  '/elections/?page=999': 'elections/index.html',
};
// The crumbs (data-tail) each page's site path is drawn with: the page's own,
// after the app name, named from the data the page reads (backend/src/sitepath.js).
// The country list is the atlas's root: its slot has no data-tail, so no crumbs.
const INDIA = { label: 'India', href: ROOT };
const TAILS = {
  '/elections/': [],
  '/elections/?page=999': [],
  [ROOT]: [{ label: 'India' }],
  [`${ROOT}?y=2024&t=stands`]: [{ label: 'India' }],
  [`${ROOT}state/`]: [INDIA, { label: 'Uttar Pradesh' }],
  [`${ROOT}state/?s=IN-UP&y=2024`]: [INDIA, { label: 'Uttar Pradesh' }],
  [`${ROOT}state/?s=IN-WB`]: [INDIA, { label: 'West Bengal' }],
  [`${ROOT}mp/?s=IN-UP&c=gorakhpur`]: [INDIA, { label: 'Uttar Pradesh', href: `${ROOT}state/?s=IN-UP` }, { label: 'Gorakhpur' }],
  [`${ROOT}mla/?s=IN-BR&c=agiaon`]: [INDIA, { label: 'Bihar', href: `${ROOT}state/?s=IN-BR` }, { label: 'Agiaon (SC)' }],
};

let build, assetBase, apps;
before(async () => {
  assert.ok(siteThemes, 'set SITE_THEMES_DIR to a checkout of akshayDev17/site-themes');
  assert.ok(existsSync(SHELL), `no site-shell config at ${SHELL}`);
  assert.ok(existsSync(join(SITE, 'index.html')), 'no assembled site: run `npm run build` and backend/build_site.py first');
  build = JSON.parse(readFileSync(join(siteThemes, 'shell/generated/build.json'), 'utf8'));
  assetBase = shellAssetBase();
  // site-themes' app list (src/apps.ts, compiled into dist/): what the site path lists
  apps = (await import(pathToFileURL(join(siteThemes, 'dist/apps.js')).href)).APPS;
});

async function session(t, configs) {
  const s = await startSession(configs);
  t.after(s.stop);
  return s;
}

const asBuilt = (file) => readFileSync(join(DIST, file), 'utf8');
// The site path slot as the page renders it (the atlas pages with a data-tail),
// and its content.
const SLOT = /(<site-slot name="site-path")( data-tail="[^"]*")?(>)([\s\S]*?)(<\/site-slot>)/;
const FILLED = '<!-- the slot\'s content -->';
const attr = (s) => s.replace(/[&"<>']/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;', "'": '&#39;' })[c]);
/** `html` with the site path's content set aside, and that content. */
function setAside(html) {
  const m = html.match(SLOT);
  assert.ok(m, 'the page has a site path slot');
  return { page: html.replace(SLOT, `$1$2$3${FILLED}$5`), content: m[4] };
}

/**
 * The built page as composed for `path`, with the site path's content set
 * aside: site-shell's one insertion right after the leading <meta charset> (it
 * links the shared files at site-shell's asset base), and the slot's data-tail
 * set to the path's crumbs. Nothing else changes.
 */
function composed(file, path) {
  const page = asBuilt(file);
  assert.equal(page.split(META).length, 2, `${file} has exactly one ${META}`);
  const scripts = build.scripts.map((f) => `<script defer src="${assetBase}${build.id}/${f}"></script>`).join('');
  return page.replace(META, META + build.inline + scripts)
    .replace(SLOT, (_, open, tail, gt, _content, close) =>
      open + (tail === undefined ? '' : ` data-tail="${attr(JSON.stringify(TAILS[path]))}"`) + gt + FILLED + close);
}

/**
 * The site path site-shell filled the slot with: the row of every listed app,
 * each linked from its root, with nothing before it (no site name, no lock), the
 * atlas marked as the current app at its root (/elections/); then the page's
 * trail on its own line, led by the atlas unless its first crumb already links
 * there, each crumb a link but the last, which is the current page as plain
 * text, and no trail at all at the atlas's root.
 */
function assertSitePath(content, tail, path) {
  assert.match(content, /^<style data-site-shell>/, `${path}: the path carries its own style`);
  assert.match(content, /<\/style><nav class="sp" aria-label="Site"><ul class="sp-apps"><li>/, `${path}: the row of apps comes first`);
  assert.doesNotMatch(content, /akshayprabhakant\.com|Portfolio/, `${path}: no separate site name or crumb`);
  assert.doesNotMatch(content, /\u{1F512}|sp-lock/u, `${path}: no lock symbol`);
  const atlas = apps.find((a) => a.id === 'atlas');
  assert.equal(atlas?.path, '/elections/', 'the app list has the atlas at its root, the country list');
  for (const app of apps.filter((a) => a.listed && a.id !== 'atlas')) {
    assert.ok(content.includes(`<li><a href="${app.path}">${attr(app.label)}`), `${path}: links ${app.label}`);
  }
  const here = tail.length === 0 ? 'page' : 'true';
  assert.ok(content.includes(`<a class="sp-app" href="${atlas.path}" aria-current="${here}"><span class="sp-label">${atlas.label}</span>`),
    `${path}: the atlas is the current app, linked to its root`);
  const drawn = [...(content.match(/<nav class="sp-trail" aria-label="Breadcrumb"><ol>([\s\S]*?)<\/ol><\/nav>/)?.[1] ?? '')
    .matchAll(/<li>(?:<a href="([^"]*)">([^<]*)<\/a>|<span aria-current="page">([^<]*)<\/span>)<\/li>/g)]
    .map((m) => (m[3] !== undefined ? { label: m[3], current: true } : { label: m[2], href: m[1] }));
  const led = tail.length && tail[0].href !== atlas.path ? [{ label: atlas.label, href: atlas.path }, ...tail] : tail;
  const trail = led.length < 2 ? [] : led;
  const want = trail.map((c, i) => (i === trail.length - 1 ? { label: attr(c.label), current: true } : { label: attr(c.label), href: attr(c.href) }));
  assert.deepEqual(drawn, want, `${path}: the page's trail`);
}

test('bound to site-shell: every page gains the theme head block and its site path, and nothing else', async (t) => {
  const s = await session(t, [APP, SHELL]);
  for (const [path, file] of Object.entries(PAGES)) {
    const res = await fetch(`${s.origin}${path}`);
    const body = await res.text();
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('x-site-shell'), `${build.id}; app=atlas`, path);
    assert.equal(res.headers.get('etag'), null, `${path}: composed HTML carries no validator`);
    const { page, content } = setAside(body);
    assert.equal(page, composed(file, path), `${path}: the built page plus the head insertion and the path's crumbs`);
    assertSitePath(content, TAILS[path], path);
    assert.doesNotMatch(content, /class="back"/, `${path}: the page's own back link is replaced`);
    assert.equal(body.match(/data-site-shell/g).length, 3, `${path}: one boot <script>, one tokens <style> and the path's <style>`);
    assert.ok(body.indexOf(META) < 1024, `${path}: <meta charset> stays inside the first 1024 bytes`);
  }

  // Chunks, data and the list's cards, index and pictures stay static assets:
  // never composed, validators and 304 kept.
  const css = asBuilt('elections/india/index.html').match(/href="(\/elections\/india\/_next\/static\/css\/[^"]+\.css)"/)[1];
  const picture = asBuilt('elections/index.html').match(/src="(\/elections\/img\/[^"]+\.webp)"/)[1];
  for (const path of [css, `${ROOT}data/manifest.json`, '/elections/cards/1.json', '/elections/index.json', picture]) {
    const res = await fetch(`${s.origin}${path}`);
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('x-site-shell'), null, path);
    const etag = res.headers.get('etag');
    assert.ok(etag, `${path} keeps its ETag`);
    assert.equal((await fetch(`${s.origin}${path}`, { headers: { 'if-none-match': etag } })).status, 304, path);
  }

  // The Classic Light fallback block the pages' CSS carries declares exactly
  // what site-shell's generated fallback.css does (frontend/app/site-fallback.css
  // copies it; the CSS minifier only drops spaces after commas).
  const sheets = await Promise.all([...asBuilt('elections/india/index.html').matchAll(/href="(\/elections\/india\/_next\/static\/css\/[^"]+\.css)"/g)]
    .map(async ([, href]) => (await fetch(`${s.origin}${href}`)).text()));
  const declarations = (css) => {
    const block = css.match(/:where\(:root\)\{([^}]*)\}/)?.[1];
    assert.ok(block, 'no :where(:root) block');
    return block.split(';').map((d) => d.trim().replace(/\s*,\s*/g, ',')).filter(Boolean);
  };
  assert.deepEqual(declarations(sheets.join('\n')),
    declarations(readFileSync(join(siteThemes, 'shell/generated/fallback.css'), 'utf8')),
    'the served Classic Light fallback matches site-shell\'s generated fallback.css');

  // The redirects: the old address to the atlas, and the list's other addresses to it.
  for (const [from, to] of [
    ['/elections', '/elections/'],
    ['/elections/page/2/', '/elections/?page=2'],
    ['/work/election-atlas/state/?s=IN-UP&y=2024', `${ROOT}state/?s=IN-UP&y=2024`],
  ]) {
    const res = await fetch(`${s.origin}${from}`, { redirect: 'manual' });
    assert.equal(res.status, 308, from);
    assert.equal(res.headers.get('location'), `${s.origin}${to}`, from);
  }
});

test('unbound: with no SHELL binding every page is served exactly as built', async (t) => {
  const s = await session(t, [unboundConfig()]);
  for (const [path, file] of Object.entries(PAGES)) {
    const res = await fetch(`${s.origin}${path}`);
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('x-site-shell'), null, path);
    assert.equal(await res.text(), asBuilt(file), path);
  }
});

test('bound, site-shell not running: compose rejects and the page is fetched again as built', async (t) => {
  const s = await session(t, [APP]);
  for (const [path, file] of Object.entries(PAGES)) {
    const res = await fetch(`${s.origin}${path}`);
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('x-site-shell'), null, path);
    assert.equal(res.headers.get('etag'), null, `${path}: the fail-open copy carries no validator`);
    assert.equal(await res.text(), asBuilt(file), path);
  }
  assert.match(await logMatching(s, /site-shell: compose failed/), /site-shell: compose failed/);
});

test('site-shell throws: fail open to the page as built', async (t) => {
  const s = await session(t, [APP, THROWING_SHELL]);
  for (const [path, file] of Object.entries(PAGES)) {
    const res = await fetch(`${s.origin}${path}`);
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('x-site-shell'), null, path);
    assert.equal(res.headers.get('etag'), null, `${path}: the fail-open copy carries no validator`);
    assert.equal(await res.text(), asBuilt(file), path);
  }
  assert.match(await logMatching(s, /fault: compose threw/), /fault: compose threw/);
});
