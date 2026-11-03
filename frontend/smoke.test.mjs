// Browser smoke over the assembled site: node --test smoke.test.mjs   (npm run test:smoke)
//
//   SMOKE_DIST   the assembled static assets (backend/build_site.py --out), default ../dist
//   CHROME_PATH  a Chrome or Chromium binary (CI: /usr/bin/google-chrome)
//
// Serves SMOKE_DIST the way the Worker's asset layer does (a directory URL serves
// its index.html) and opens the national, state, MP and MLA pages in a real browser. Each page must
// draw its content with zero console errors, no uncaught exception and no failed
// request: a page fetches only the files availability.json lists, so even a
// missing file never costs a 404.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const DIST = process.env.SMOKE_DIST ?? fileURLToPath(new URL('../dist/', import.meta.url));
const CHROME = process.env.CHROME_PATH
  ?? ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.woff2': 'font/woff2',
};

function serve(root) {
  return createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const path = normalize(decodeURIComponent(url.pathname));
    let file = join(root, path);
    if (!file.startsWith(root)) { res.writeHead(400).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end('Not Found'); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
}

let server, browser, origin;

before(async () => {
  assert.ok(existsSync(join(DIST, 'elections/india/index.html')), `no assembled site at ${DIST}`);
  assert.ok(CHROME, 'set CHROME_PATH to a Chrome binary');
  server = serve(normalize(DIST));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
});

after(async () => {
  await browser?.close();
  server?.close();
});

/* Open a page, wait for `ready` (a selector that only appears once the page has
   drawn) and for `expect` in its text (case-insensitive: some labels are
   uppercased by CSS), and return what went wrong on the way. */
async function visit(path, ready, expect) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(origin)) problems.push(`${r.status()}: ${r.url()}`);
  });
  await page.goto(origin + path, { waitUntil: 'networkidle0' });
  await page.waitForSelector(ready, { timeout: 15000 });
  await page.waitForFunction((src) => new RegExp(src, 'i').test(document.body.innerText), { timeout: 15000 }, expect.source)
    .catch(() => {});
  const text = await page.evaluate(() => document.body.innerText);
  await page.close();
  return { problems, text };
}

const PAGES = [
  ['national, 2024', '/elections/india/?y=2024', '#map path.pc', /Union council of ministers · 2024/],
  ['national, 2024 as it stands', '/elections/india/?y=2024&t=stands', '#map path.pc', /As it stands · \d+ by-election/],
  ['national, 1980 (state level)', '/elections/india/?y=1980', '#map path.stf', /state-level result/],
  ['state, Uttar Pradesh 2024', '/elections/india/state/?s=IN-UP&y=2024', '#map-pc path', /Uttar Pradesh/],
  ['state, West Bengal 2014 as it stands', '/elections/india/state/?s=IN-WB&y=2014&t=stands', '#map-pc path', /West Bengal/],
  ['state, Bihar 1980 (state level)', '/elections/india/state/?s=IN-BR&y=1980', '#map-pc', /state-level result/],
  ['MP, Gorakhpur', '/elections/india/mp/?s=IN-UP&c=gorakhpur', '.page', /Gorakhpur/],
  ['MP, Bhatinda', '/elections/india/mp/?s=IN-PB&c=bhatinda', '.page', /Bhatinda|Bathinda/],
  ['MLA, Agiaon', '/elections/india/mla/?s=IN-BR&c=agiaon', '.page', /Agiaon/],
];

for (const [name, path, ready, expect] of PAGES) {
  test(`${name}: draws with zero console errors`, async () => {
    const { problems, text } = await visit(path, ready, expect);
    assert.deepEqual(problems, []);
    assert.match(text, new RegExp(expect.source, 'i'));
    assert.doesNotMatch(text, /could not be loaded/i);
  });
}

/* The shared site theme. A stored choice must already be on <html> at the first
   frame (the head boot script runs before anything paints), and a choice made
   with the header picker on one page must hold on the next page, through the one
   `site-theme` localStorage key every app on the origin shares. */
test('theme: a stored choice is on the first frame of every page', async () => {
  // its own profile, so the stored choice does not leak into the other tests
  const context = await browser.createBrowserContext();
  for (const [name, path, ready] of PAGES) {
    const page = await context.newPage();
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('site-theme', 'classic-dark');
      // the first animation frame runs before the first paint
      requestAnimationFrame(() => { window.__firstFrameTheme = document.documentElement.dataset.theme; });
    });
    await page.goto(origin + path, { waitUntil: 'networkidle0' });
    await page.waitForSelector(ready, { timeout: 15000 });
    assert.equal(await page.evaluate(() => window.__firstFrameTheme), 'classic-dark', name);
    await page.close();
  }
  await context.close();
});

test('theme: a choice made with the header picker carries over to the next page', async () => {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
  const pickerValue = () => page.evaluate(() =>
    document.querySelector('header site-theme-picker')?.shadowRoot?.querySelector('select')?.value);
  await page.goto(`${origin}/elections/india/?y=2024`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('header site-theme-picker')?.shadowRoot?.querySelector('select'));
  assert.equal(await pickerValue(), 'system');
  const select = await page.evaluateHandle(() => document.querySelector('header site-theme-picker').shadowRoot.querySelector('select'));
  // labelled for screen readers: the select sits inside a <label> whose text is "Theme"
  assert.equal(await select.evaluate((s) => s.labels?.[0]?.firstElementChild?.textContent), 'Theme');
  // the picker offers System, Classic Light and Classic Dark only
  assert.deepEqual(await select.evaluate((s) => [...s.options].map((o) => o.value)), ['system', 'classic-light', 'classic-dark']);
  await select.select('classic-dark');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'classic-dark');
  await page.goto(`${origin}/elections/india/state/?s=IN-UP&y=2024`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('header site-theme-picker')?.shadowRoot?.querySelector('select'));
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'classic-dark');
  assert.equal(await pickerValue(), 'classic-dark');
  await context.close();
  assert.deepEqual(problems, []);
});

/* Slate Light and Slate Dark were removed in site-themes v0.2.0. A reader who
   stored one of them lands on System (Classic Light or Classic Dark through
   prefers-color-scheme) from the first frame, with no error. */
for (const [stored, scheme, expected] of [['slate-light', 'light', 'classic-light'], ['slate-dark', 'dark', 'classic-dark']]) {
  test(`theme: a stored ${stored} falls back to System from the first frame`, async () => {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const problems = [];
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
    page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await page.evaluateOnNewDocument((id) => {
      localStorage.setItem('site-theme', id);
      requestAnimationFrame(() => { window.__firstFrameTheme = document.documentElement.dataset.theme; });
    }, stored);
    await page.goto(`${origin}/elections/india/?y=2024`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.querySelector('header site-theme-picker')?.shadowRoot?.querySelector('select'));
    assert.equal(await page.evaluate(() => window.__firstFrameTheme), expected);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), expected);
    assert.equal(await page.evaluate(() =>
      document.querySelector('header site-theme-picker').shadowRoot.querySelector('select').value), 'system');
    await context.close();
    assert.deepEqual(problems, []);
  });
}
