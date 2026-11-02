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
import { BOOT_CONFIG } from 'site-themes/boot';

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

// The shared site theme (site-themes, bundled at build time). Each page sets
// <html data-theme> from an inline head script, so the first frame is themed and
// nothing is fetched for it, and carries the picker in its header.
test('each page inlines the theme boot script in <head> and has the picker in its header', () => {
  for (const page of PAGES) {
    const html = readFileSync(join(out, page), 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    const inline = [...head.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.ok(inline.some((js) => js.includes(`(window,${JSON.stringify(BOOT_CONFIG)})`)), `${page}: no inline boot script`);
    assert.doesNotMatch(head, /<script[^>]*\bsrc="[^"]*site-theme/, `${page}: boot script must be inline`);
    // the boot script owns data-theme; the server HTML must not pin one
    assert.doesNotMatch(html.match(/<html[^>]*>/)?.[0] ?? '', /data-theme/, page);
    assert.match(html, /<header[^>]*>(?:(?!<\/header>)[\s\S])*<site-theme-picker hide-label=""/, `${page}: no picker in header`);
  }
});
