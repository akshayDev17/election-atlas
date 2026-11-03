// The atlas Worker against the real site-shell, in local workerd: each test is
// one `wrangler dev` session over the assembled site, with no Cloudflare
// account. It needs the assembled site in dist/ (`npm run build`, then
// `python3 backend/build_site.py --out dist`) and a checkout of
// akshayDev17/site-themes:
//
//   SITE_THEMES_DIR=/path/to/site-themes npm run test:shell
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { before, test } from 'node:test';
import { APP, DIST, SHELL, THROWING_SHELL, logMatching, shellAssetBase, siteThemes, startSession, unboundConfig } from './session.mjs';

const ROOT = '/elections/india/';
const SITE = join(DIST, 'elections/india');
const META = '<meta charSet="utf-8"/>';
// Each path the Worker serves as a page, and the file behind it.
const PAGES = {
  [ROOT]: 'index.html',
  [`${ROOT}?y=2024&t=stands`]: 'index.html',
  [`${ROOT}state/`]: 'state/index.html',
  [`${ROOT}state/?s=IN-UP&y=2024`]: 'state/index.html',
  [`${ROOT}mp/?s=IN-UP&c=gorakhpur`]: 'mp/index.html',
  [`${ROOT}mla/?s=IN-BR&c=agiaon`]: 'mla/index.html',
};

let build, assetBase;
before(() => {
  assert.ok(siteThemes, 'set SITE_THEMES_DIR to a checkout of akshayDev17/site-themes');
  assert.ok(existsSync(SHELL), `no site-shell config at ${SHELL}`);
  assert.ok(existsSync(join(SITE, 'index.html')), 'no assembled site: run `npm run build` and backend/build_site.py first');
  build = JSON.parse(readFileSync(join(siteThemes, 'shell/generated/build.json'), 'utf8'));
  assetBase = shellAssetBase();
});

async function session(t, configs) {
  const s = await startSession(configs);
  t.after(s.stop);
  return s;
}

const asBuilt = (file) => readFileSync(join(SITE, file), 'utf8');
/** The built page plus site-shell's one insertion, right after its leading <meta charset>; it links the shared files at site-shell's asset base. */
function composed(file) {
  const page = asBuilt(file);
  assert.equal(page.split(META).length, 2, `${file} has exactly one ${META}`);
  const scripts = build.scripts.map((f) => `<script defer src="${assetBase}${build.id}/${f}"></script>`).join('');
  return page.replace(META, META + build.inline + scripts);
}

test('bound to site-shell: every page gains the theme head block after <meta charset> and nothing else', async (t) => {
  const s = await session(t, [APP, SHELL]);
  for (const [path, file] of Object.entries(PAGES)) {
    const res = await fetch(`${s.origin}${path}`);
    const body = await res.text();
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('x-site-shell'), `${build.id}; app=atlas`, path);
    assert.equal(res.headers.get('etag'), null, `${path}: composed HTML carries no validator`);
    assert.equal(body, composed(file), `${path}: the built page plus one insertion`);
    assert.ok(body.indexOf(META) < 1024, `${path}: <meta charset> stays inside the first 1024 bytes`);
    assert.equal(body.match(/data-site-shell/g).length, 2, `${path}: one boot <script> and one tokens <style>`);
  }

  // Chunks and data stay static assets: never composed, validators and 304 kept.
  const css = asBuilt('index.html').match(/href="(\/elections\/india\/_next\/static\/css\/[^"]+\.css)"/)[1];
  for (const path of [css, `${ROOT}data/manifest.json`]) {
    const res = await fetch(`${s.origin}${path}`);
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('x-site-shell'), null, path);
    const etag = res.headers.get('etag');
    assert.ok(etag, `${path} keeps its ETag`);
    assert.equal((await fetch(`${s.origin}${path}`, { headers: { 'if-none-match': etag } })).status, 304, path);
  }

  // The redirects are unchanged.
  for (const [from, to] of [
    ['/elections', ROOT],
    ['/elections/', ROOT],
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
