// Run after a build: node --test export.test.mjs   (npm run test:export)
// EXPORT_DIR names the export: `out` after `npm run build`, `.next-build` after
// `npm run build:check` (a custom distDir is where Next writes the export).
//
// The contract backend/build_site.py and the Worker rely on: the four pages at
// their directory URLs, everything they load under /elections/india/, chunks
// content-hashed (so a cached chunk is never stale), and no data in the export
// (the data directory is laid beside it from D1's export and the repository).
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const BASE = '/elections/india';
const out = fileURLToPath(new URL(`./${process.env.EXPORT_DIR ?? 'out'}/`, import.meta.url));
const PAGES = ['index.html', 'state/index.html', 'mp/index.html', 'mla/index.html'];
const files = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? files(p) : [p];
});
const all = files(out).map((p) => relative(out, p).split('\\').join('/'));

test('the four pages are exported at their directory URLs', () => {
  for (const page of PAGES) assert.ok(existsSync(join(out, page)), `${page} missing`);
});

test('every page and asset a page links is under /elections/india/', () => {
  for (const page of PAGES) {
    const html = readFileSync(join(out, page), 'utf8');
    const refs = [...html.matchAll(/\b(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
    assert.ok(refs.length > 0, page);
    // "/" alone is the way back to the site's home page
    for (const ref of refs) assert.ok(ref === '/' || ref.startsWith(`${BASE}/`), `${page} links ${ref}`);
  }
});

test('chunks are content-hashed', () => {
  const chunks = all.filter((p) => p.startsWith('_next/static/') && /\.(js|css)$/.test(p));
  assert.ok(chunks.length > 0);
  for (const c of chunks) {
    // a hash in the file name (name-<hash>.js, or <hash>.css), or a per-build
    // directory (the build id) that holds it
    assert.match(c, /(^|[-/.])[0-9a-f]{16}\.(js|css)$|^_next\/static\/[A-Za-z0-9_-]{16,}\//, c);
  }
});

test('the export carries no data and no hand-written page code', () => {
  assert.ok(!all.some((p) => p.startsWith('data/')), 'data/ belongs to build_site, not the export');
  assert.ok(!all.some((p) => p.startsWith('lib/') || p.startsWith('vendor/')));
});

test('no page or chunk says "synthetic"', () => {
  for (const p of all.filter((f) => /\.(html|js)$/.test(f))) {
    assert.doesNotMatch(readFileSync(join(out, p), 'utf8'), /synthetic/i, p);
  }
});

test('each page has its own title', () => {
  const titles = PAGES.map((p) => readFileSync(join(out, p), 'utf8').match(/<title>([^<]*)<\/title>/)?.[1]);
  for (const t of titles) assert.match(t ?? '', /Election Atlas of India/);
  assert.equal(new Set(titles).size, PAGES.length, titles.join(' | '));
});

// The shared site theme is not in the export: site-shell adds the boot script
// and tokens to each page at the edge and links the script that defines
// <site-theme-picker>. The export only places the picker in each header, pins
// no theme, and carries no theme code or theme rules of its own.
test('no page carries the theme boot script or pins a theme, and each has the picker in its header', () => {
  for (const page of PAGES) {
    const html = readFileSync(join(out, page), 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    assert.doesNotMatch(head, /site-theme|__siteThemeBoot|data-site-shell/, `${page}: theme code in <head>`);
    assert.doesNotMatch(html.match(/<html[^>]*>/)?.[0] ?? '', /data-theme/, page);
    assert.match(html, /<header[^>]*>(?:(?!<\/header>)[\s\S])*<site-theme-picker hide-label=""><\/site-theme-picker>/, `${page}: no picker in header`);
  }
  const js = all.filter((p) => p.startsWith('_next/static/') && p.endsWith('.js')).map((p) => readFileSync(join(out, p), 'utf8'));
  assert.ok(!js.some((src) => /__siteThemeBoot|customElements\.define\(/.test(src)), 'no chunk defines the picker or boots a theme');
});

// If the composed theme never arrives (site-shell down, `next dev`), the shared
// tokens must still be defined: the pages' CSS carries the Classic Light block
// under :where(:root) (zero specificity, so the composed theme always wins), and
// no other rule declares a shared token or themes by [data-theme].
test('the CSS declares the shared tokens only in the :where(:root) Classic Light fallback', () => {
  const css = all.filter((p) => p.startsWith('_next/static/css/')).map((p) => readFileSync(join(out, p), 'utf8')).join('\n');
  const blocks = [...css.matchAll(/:where\(:root\)\{([^}]*)\}/g)].map((m) => m[1]);
  assert.equal(blocks.length, 1, 'exactly one :where(:root) block');
  assert.match(blocks[0], /^color-scheme:light;--surface:#EEF1F8;/);
  const shared = new Set([...blocks[0].matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]));
  assert.ok(shared.size >= 20, [...shared].join(' '));
  const rest = css.replace(/:where\(:root\)\{[^}]*\}/, '');
  const declared = [...rest.matchAll(/[{;]\s*(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]).filter((n) => shared.has(n));
  assert.deepEqual(declared, [], 'a shared token declared outside the fallback would override the theme');
  assert.doesNotMatch(rest, /\[data-theme/, 'theme rules belong to site-shell');
});
