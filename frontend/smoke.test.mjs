// Browser smoke over the assembled site: node --test smoke.test.mjs   (npm run test:smoke)
//
//   SMOKE_DIST       the assembled static assets (backend/build_site.py --out), default ../dist
//   CHROME_PATH      a Chrome or Chromium binary (CI: /usr/bin/google-chrome)
//   SITE_THEMES_DIR  a checkout of akshayDev17/site-themes: serve the site through
//                    the atlas Worker and the real site-shell in `wrangler dev`
//                    instead (shell-contract/session.mjs; it serves ../dist), so
//                    every page is composed as in production, with /_site/*
//                    served from site-shell's own files as the zone route does
//
// Serves SMOKE_DIST the way the Worker's asset layer does (a directory URL serves
// its index.html), or the Worker itself with SITE_THEMES_DIR, and opens the
// country list and the national, state, MP and MLA pages in a real browser. Each page must
// draw its content with zero console errors, no uncaught exception and no failed
// request: a page fetches only the files availability.json lists, so even a
// missing file never costs a 404.
// On a phone (360, 390 and 412 px) every page must also lay out at exactly the
// screen's width, so the browser never zooms the whole page out.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { APP, SHELL, shellAssetBase, siteThemes, startSession } from './shell-contract/session.mjs';

const DIST = process.env.SMOKE_DIST ?? fileURLToPath(new URL('../dist/', import.meta.url));
const CHROME = process.env.CHROME_PATH
  ?? ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.woff2': 'font/woff2',
};

function serveFile(root, req, res) {
  const url = new URL(req.url, 'http://x');
  const path = normalize(decodeURIComponent(url.pathname));
  let file = join(root, path);
  if (!file.startsWith(root)) { res.writeHead(400).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end('Not Found'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}

const serve = (root) => createServer((req, res) => serveFile(root, req, res));

/* The zone's routing in front of the local atlas Worker: site-shell's asset base
   (akshayprabhakant.com/_site/*) is its own static files, everything else the Worker. */
function route(workerOrigin, assetBase, shared) {
  return createServer((req, res) => {
    if (req.url.startsWith(assetBase)) { serveFile(shared, req, res); return; }
    const upstream = request(new URL(req.url, workerOrigin), { method: req.method, headers: req.headers }, (up) => {
      res.writeHead(up.statusCode, up.headers);
      up.pipe(res);
    });
    upstream.on('error', (err) => res.destroy(err));
    req.pipe(upstream);
  });
}

/* A console error, or any console message about hydration (React reports a
   mismatch with site-shell's head block as an error or a warning). */
const isProblem = (m) => m.type() === 'error' || /hydrat/i.test(m.text());

let server, worker, browser, origin, assetBase;

before(async () => {
  assert.ok(existsSync(join(DIST, 'elections/india/index.html')), `no assembled site at ${DIST}`);
  assert.ok(CHROME, 'set CHROME_PATH to a Chrome binary');
  if (siteThemes) {
    worker = await startSession([APP, SHELL]);
    assetBase = shellAssetBase();
    server = route(worker.origin, assetBase, join(siteThemes, 'shell/public'));
  } else {
    server = serve(normalize(DIST));
  }
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
});

after(async () => {
  await browser?.close();
  server?.close();
  await worker?.stop();
});

/* Through the Worker, every page is composed by site-shell: its boot script and
   tokens sit right after <meta charset>, and its picker script loads from
   site-shell's shared asset base, which answers. */
test('site-shell: every page is composed', { skip: !siteThemes && 'set SITE_THEMES_DIR' }, async () => {
  for (const [name, path] of PAGES) {
    const res = await fetch(origin + path);
    assert.match(res.headers.get('x-site-shell') ?? '', /^[0-9a-f]{12}; app=atlas$/, name);
    const html = await res.text();
    assert.match(html, /^<!DOCTYPE html>(?:<!--[^>]*-->)?<html[^>]*><head><meta charSet="utf-8"\/><script data-site-shell>/, name);
    const js = html.match(/<script defer src="([^"]+\/[0-9a-f]{12}\/site\.js)"><\/script>/)?.[1];
    assert.ok(js?.startsWith(assetBase), `${name}: ${js}`);
    assert.equal((await fetch(origin + js)).status, 200, `${name}: ${js}`);
  }
});

/* Open a page, wait for `ready` (a selector that only appears once the page has
   drawn) and for `expect` in its text (case-insensitive: some labels are
   uppercased by CSS), and return what went wrong on the way. */
async function visit(path, ready, expect) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const problems = [];
  page.on('console', (m) => { if (isProblem(m)) problems.push(`console: ${m.text()}`); });
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
  ['country list', '/elections/', '.card img[src$=".webp"]', /Election results, by country/],
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

/* The country list: India's card opens India's page; search, on the device over
   the small index, finds a country by an alias and jumps to its card; a page the
   list does not have leaves the address for page 1. */
test('country list: India\'s card, search by alias, and the page in the address', async () => {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const problems = [];
  page.on('console', (m) => { if (isProblem(m)) problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
  await page.goto(`${origin}/elections/?page=999`, { waitUntil: 'networkidle0' });
  assert.equal(await page.evaluate(() => location.pathname + location.search), '/elections/', 'no page 999: the address is page 1\'s');
  // the pictures load lazily: bring the card into view first
  await page.$eval('#c-india', (el) => el.scrollIntoView());
  await page.waitForFunction(() => document.querySelector('#c-india img').complete, { timeout: 15000 });
  const india = await page.$eval('#c-india', (el) => ({
    name: el.querySelector('h2').textContent,
    open: el.querySelector('a.btn').getAttribute('href'),
    picture: el.querySelector('img').complete && el.querySelector('img').naturalWidth > 0,
  }));
  assert.deepEqual(india, { name: 'India', open: '/elections/india/', picture: true });
  await page.focus('#q');
  await page.keyboard.type('bhar');
  await page.waitForFunction(() => !document.querySelector('#qlist').hidden);
  assert.equal(await page.$eval('#qlist', (el) => el.innerText.replace(/\s+/g, ' ').trim()), 'India page 1');
  assert.equal(await page.$eval('.find output', (el) => el.textContent), '1 match');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.hash === '#c-india');
  assert.equal(await page.evaluate(() => document.activeElement?.closest('article')?.id), 'c-india');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('#c-india a.btn')]);
  assert.equal(await page.evaluate(() => location.pathname), '/elections/india/');
  await page.close();
  assert.deepEqual(problems, []);
});

/* Without site-shell (the static export served as built: site-shell down, or
   unbound), no theme reaches the page. It must still draw in Classic Light from
   the :where(:root) fallback block, pin no theme, and leave the picker an empty
   element, with no error (the page tests above already cover errors). */
test('no site-shell: the page draws in Classic Light from the fallback block', { skip: !!siteThemes && 'site-shell composes this run' }, async () => {
  const page = await browser.newPage();
  await page.goto(`${origin}/elections/india/?y=2024`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#map path.pc', { timeout: 15000 });
  const seen = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      theme: document.documentElement.dataset.theme ?? null,
      surface: cs.getPropertyValue('--surface').trim(),
      accent: cs.getPropertyValue('--accent').trim(),
      scheme: cs.colorScheme,
      picker: !!customElements.get('site-theme-picker'),
      inHeader: !!document.querySelector('header site-theme-picker'),
    };
  });
  await page.close();
  assert.deepEqual(seen, { theme: null, surface: '#EEF1F8', accent: '#3A4BD8', scheme: 'light', picker: false, inHeader: true });
});

/* The shared site theme, which only site-shell supplies: run these through the
   Worker (SITE_THEMES_DIR). A stored choice must already be on <html> at the
   first frame (the composed head boot script runs before anything paints), and a
   choice made with the header picker on one page must hold on the next page,
   through the one `site-theme` localStorage key every app on the origin shares. */
const themed = { skip: !siteThemes && 'the theme comes from site-shell: set SITE_THEMES_DIR' };

test('theme: a stored choice is on the first frame of every page', themed, async () => {
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

test('theme: a choice made with the header picker carries over to the next page', themed, async () => {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (isProblem(m)) problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
  const pickerValue = () => page.evaluate(() =>
    document.querySelector('header site-theme-picker')?.shadowRoot?.querySelector('[role="option"][aria-selected="true"]')?.dataset.value);
  await page.goto(`${origin}/elections/india/?y=2024`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('header site-theme-picker')?.shadowRoot?.querySelector('[role="combobox"]'));
  assert.equal(await pickerValue(), 'system');
  const combobox = await page.evaluateHandle(() => document.querySelector('header site-theme-picker').shadowRoot.querySelector('[role="combobox"]'));
  // labelled for screen readers: the combobox is labelled by an element whose text is "Theme"
  assert.equal(await combobox.evaluate((c) => c.getRootNode().getElementById(c.getAttribute('aria-labelledby'))?.textContent), 'Theme');
  // the picker offers System, Classic Light and Classic Dark only
  assert.deepEqual(await combobox.evaluate((c) => [...c.getRootNode().querySelectorAll('[role="option"]')].map((o) => o.dataset.value)), ['system', 'classic-light', 'classic-dark']);
  // choose Classic Dark as a reader would: open the list, then click the option
  await combobox.click();
  await page.waitForFunction((c) => c.getAttribute('aria-expanded') === 'true', {}, combobox);
  const option = await combobox.evaluateHandle((c) => c.getRootNode().querySelector('[role="option"][data-value="classic-dark"]'));
  await option.click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'classic-dark');
  await page.goto(`${origin}/elections/india/state/?s=IN-UP&y=2024`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('header site-theme-picker')?.shadowRoot?.querySelector('[role="combobox"]'));
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'classic-dark');
  assert.equal(await pickerValue(), 'classic-dark');
  await context.close();
  assert.deepEqual(problems, []);
});

/* Slate Light and Slate Dark were removed from the shared themes. A reader who
   stored one of them lands on System (Classic Light or Classic Dark through
   prefers-color-scheme) from the first frame, with no error. */
for (const [stored, scheme, expected] of [['slate-light', 'light', 'classic-light'], ['slate-dark', 'dark', 'classic-dark']]) {
  test(`theme: a stored ${stored} falls back to System from the first frame`, themed, async () => {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const problems = [];
    page.on('console', (m) => { if (isProblem(m)) problems.push(`console: ${m.text()}`); });
    page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await page.evaluateOnNewDocument((id) => {
      localStorage.setItem('site-theme', id);
      requestAnimationFrame(() => { window.__firstFrameTheme = document.documentElement.dataset.theme; });
    }, stored);
    await page.goto(`${origin}/elections/india/?y=2024`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.querySelector('header site-theme-picker')?.shadowRoot?.querySelector('[role="combobox"]'));
    assert.equal(await page.evaluate(() => window.__firstFrameTheme), expected);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), expected);
    assert.equal(await page.evaluate(() =>
      document.querySelector('header site-theme-picker').shadowRoot.querySelector('[role="option"][aria-selected="true"]')?.dataset.value), 'system');
    await context.close();
    assert.deepEqual(problems, []);
  });
}

/* The site path site-shell draws at the top of each page's masthead (the page
   places <site-slot name="site-path">): the row of the site's apps, one line,
   the atlas marked as the current app and linked to its root, /elections/; then,
   on a line of its own, the page's trail, led by the atlas. The page's own
   heading sits under both, never beside the row. On a portrait phone the row
   scrolls sideways with the atlas scrolled into view and a faded edge where more
   apps lie past it, and nothing opens a sheet. It must still be there once the
   page has hydrated: React must not replace it. */
const ATLAS_ROOT = '/elections/';
const TRAILS = {
  'country list': [],
  'national, 2024': ['Election Atlas', 'India'],
  'state, Uttar Pradesh 2024': ['Election Atlas', 'India', 'Uttar Pradesh'],
  'MP, Gorakhpur': ['Election Atlas', 'India', 'Uttar Pradesh', 'Gorakhpur'],
  'MLA, Agiaon': ['Election Atlas', 'India', 'Bihar', 'Agiaon (SC)'],
};
const pathPages = PAGES.filter(([name]) => name in TRAILS);
// The page's own heading: the masthead's eyebrow, or the country list's title.
const HEADING = 'header .lbl, main .top h1';

/* What the site path looks like on the page, once it has drawn. */
async function readPath(viewport, path, ready) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const problems = [];
  page.on('console', (m) => { if (isProblem(m)) problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
  await page.goto(origin + path, { waitUntil: 'networkidle0' });
  await page.waitForSelector(ready, { timeout: 15000 });
  // site.js scrolls the current app into view once the row has drawn
  await page.waitForFunction(() => {
    const row = document.querySelector('header site-slot[name="site-path"] .sp-apps');
    const cur = row?.querySelector('[aria-current]');
    if (!cur) return true;
    const r = row.getBoundingClientRect(), c = cur.getBoundingClientRect();
    return c.left >= r.left - 1 && c.right <= r.right + 1;
  }, { timeout: 5000 }).catch(() => {});
  const seen = await page.evaluate((headingSel) => {
    const slot = document.querySelector('header site-slot[name="site-path"]');
    const nav = slot?.querySelector('nav.sp');
    if (!nav) return null;
    const row = nav.querySelector('.sp-apps');
    const trail = slot.querySelector('.sp-trail');
    const heading = document.querySelector(headingSel);
    const rr = row.getBoundingClientRect();
    const items = [...row.querySelectorAll(':scope > li')];
    const targets = [...row.querySelectorAll('a')].map((el) => {
      const r = el.getBoundingClientRect();
      return { text: el.textContent.trim(), w: r.width, h: r.height };
    });
    const cur = row.querySelector('[aria-current]');
    const cr = cur?.getBoundingClientRect();
    // the tap area of each app in view: what a press just inside each edge lands on
    const hits = [...row.querySelectorAll('a')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= rr.left && r.right <= rr.right;
    }).every((el) => {
      const r = el.getBoundingClientRect();
      return [[r.left + 1, r.top + r.height / 2], [r.right - 1, r.top + r.height / 2]]
        .every(([x, y]) => el.contains(document.elementFromPoint(x, y)));
    });
    return {
      oneLine: new Set(items.map((li) => Math.round(li.getBoundingClientRect().top))).size === 1,
      apps: items.map((li) => li.querySelector('a').textContent.replace(/\(.*\)/, '').trim()),
      current: [...row.querySelectorAll('[aria-current]')].map((el) => [el.querySelector('.sp-label')?.textContent, el.getAttribute('href'), el.getAttribute('aria-current')]),
      currentInView: !!cr && cr.left >= rr.left - 1 && cr.right <= rr.right + 1,
      scrolls: row.scrollWidth > row.clientWidth + 1,
      more: row.dataset.more ?? null,
      trail: trail ? [...trail.querySelectorAll('li')].map((li) => li.textContent.trim()) : [],
      here: trail?.querySelector('li:last-child [aria-current="page"]')?.textContent ?? null,
      // the trail is on its own line under the row, and the page's heading under both
      trailUnder: !trail || trail.getBoundingClientRect().top >= rr.bottom - 1,
      headingUnder: !!heading && heading.getBoundingClientRect().top >= (trail ?? row).getBoundingClientRect().bottom - 1,
      targets,
      hits,
      sheet: !!document.querySelector('dialog, .sp-pill, .sp-sheet'),
      backLink: !!document.querySelector('header .back'),
    };
  }, HEADING);
  return { page, problems, seen };
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 844, height: 390, isMobile: true, hasTouch: true },
  { width: 390, height: 844, isMobile: true, hasTouch: true },
]) {
  const phone = viewport.width < 600;
  test(`site path at ${viewport.width}x${viewport.height}: one row of apps, the atlas current, the trail and then the heading under it`, themed, async () => {
    for (const [name, path, ready] of pathPages) {
      const { page, problems, seen } = await readPath(viewport, path, ready);
      await page.close();
      assert.ok(seen, `${name}: the site path is drawn and survives hydration`);
      assert.deepEqual(problems, [], name);
      assert.equal(seen.oneLine, true, `${name}: the apps are one line`);
      assert.ok(seen.apps.length >= 5 && seen.apps.at(-1) === 'Election Atlas', `${name}: every app is in the row: ${seen.apps}`);
      const root = TRAILS[name].length === 0;
      assert.deepEqual(seen.current, [['Election Atlas', ATLAS_ROOT, root ? 'page' : 'true']], `${name}: the atlas is the current app`);
      assert.equal(seen.currentInView, true, `${name}: the atlas is in view`);
      assert.deepEqual(seen.trail, TRAILS[name], `${name}: the page's trail`);
      assert.equal(seen.here, TRAILS[name].at(-1) ?? null, `${name}: the trail ends on the current page`);
      assert.equal(seen.trailUnder, true, `${name}: the trail is on its own line under the row`);
      assert.equal(seen.headingUnder, true, `${name}: the page's heading sits under the site path, not beside it`);
      assert.equal(seen.sheet, false, `${name}: no sheet`);
      assert.equal(seen.backLink, false, `${name}: the site path replaces the page's back link`);
      assert.equal(seen.hits, true, `${name}: every app in view takes a press across its width`);
      for (const t of seen.targets) assert.ok(t.h >= 44 && t.w >= 44, `${name}: "${t.text}" is ${t.w}x${t.h}, a 44 px target`);
      if (phone) {
        // reads as scrollable: wider than the screen, with a faded edge
        assert.equal(seen.scrolls, true, `${name}: the row scrolls sideways`);
        assert.ok(seen.more, `${name}: an edge with more apps past it fades`);
      } else {
        assert.equal(seen.scrolls, false, `${name}: the row fits inline`);
      }
    }
  });
}

test('site path: the trail leads back up the atlas to the country list', themed, async () => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${origin}/elections/india/mp/?s=IN-UP&c=gorakhpur`, { waitUntil: 'networkidle0' });
  await Promise.all([page.waitForNavigation(), page.click('.sp-trail a[href*="state/"]')]);
  assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, '/elections/india/state/?s=IN-UP');
  await page.waitForSelector('#map-pc path', { timeout: 15000 });
  await Promise.all([page.waitForNavigation(), page.click('.sp-trail a[href="/elections/india/"]')]);
  assert.equal(new URL(page.url()).pathname, '/elections/india/');
  await page.waitForSelector('#map path.pc', { timeout: 15000 });
  await Promise.all([page.waitForNavigation(), page.click(`.sp-trail a[href="${ATLAS_ROOT}"]`)]);
  assert.equal(new URL(page.url()).pathname, ATLAS_ROOT);
  await page.close();
});

/* Without site-shell the slot keeps the page's own back link: home from the
   country list, the country list from the national page, India from a state,
   and the seat's own state from an MP or MLA page. */
test('no site-shell: each page keeps its back link', { skip: !!siteThemes && 'site-shell composes this run' }, async () => {
  for (const [path, ready, text, href] of [
    ['/elections/', '.card', '← Akshay Prabhakant', '/'],
    ['/elections/india/?y=2024', '#map path.pc', '← Election Atlas', '/elections/'],
    ['/elections/india/state/?s=IN-UP&y=2024', '#map-pc path', '← India', '/elections/india/'],
    ['/elections/india/mp/?s=IN-PB&c=bhatinda', '.page', '← State', '/elections/india/state/?s=IN-PB'],
    ['/elections/india/mla/?s=IN-BR&c=agiaon', '.page', '← State', '/elections/india/state/?s=IN-BR'],
  ]) {
    const page = await browser.newPage();
    await page.goto(origin + path, { waitUntil: 'networkidle0' });
    await page.waitForSelector(ready, { timeout: 15000 });
    await page.waitForFunction((h) => document.querySelector('header site-slot .back')?.getAttribute('href') === h, { timeout: 15000 }, href)
      .catch(() => {});
    const back = await page.evaluate(() => {
      const a = document.querySelector('header site-slot[name="site-path"] > a.back');
      return a && [a.textContent, a.getAttribute('href')];
    });
    await page.close();
    assert.deepEqual(back, [text, href], path);
  }
});

/* On a phone every page lays out at exactly the screen's width: nothing pokes
   past the right edge, so the browser never zooms the whole page out to fit it
   (a 581 px year strip on a 390 px phone shrank every page's type by a third).
   A row that needs more room, like the year strip, scrolls inside its own box.
   Both themes, where site-shell supplies them. */
const PHONE_THEMES = siteThemes ? ['classic-light', 'classic-dark'] : [null];

/* The page's layout width and, when it is wider than the screen, the elements
   reaching furthest past the screen's right edge (none is the page's own box).
   A mobile browser widens its layout viewport to hold content wider than the
   screen and zooms out, so innerWidth alone grows with the overflow: both it
   and scrollWidth are compared with the screen's own width. */
async function readLayoutWidth(context, viewport, theme, path, ready) {
  const page = await context.newPage();
  await page.setViewport(viewport);
  if (theme) await page.evaluateOnNewDocument((id) => localStorage.setItem('site-theme', id), theme);
  await page.goto(origin + path, { waitUntil: 'networkidle0' });
  await page.waitForSelector(ready, { timeout: 15000 });
  const seen = await page.evaluate((screenWidth) => {
    const root = document.documentElement;
    const past = [...document.body.querySelectorAll('*')]
      .map((el) => ({ el, right: Math.round(el.getBoundingClientRect().right) }))
      .filter(({ right }) => right > screenWidth)
      .sort((a, b) => b.right - a.right)
      .slice(0, 3)
      .map(({ el, right }) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList.length ? `.${[...el.classList].join('.')}` : ''} → ${right}`);
    return { scrollWidth: root.scrollWidth, innerWidth, theme: root.dataset.theme ?? null, past };
  }, viewport.width);
  await page.close();
  return seen;
}

for (const width of [360, 390, 412]) {
  test(`phone at ${width} px: every page lays out at exactly the screen's width`, async () => {
    const viewport = { width, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 3 };
    const wrong = [];
    for (const theme of PHONE_THEMES) {
      const context = await browser.createBrowserContext();
      for (const [name, path, ready] of PAGES) {
        const seen = await readLayoutWidth(context, viewport, theme, path, ready);
        const label = theme ? `${name} (${theme})` : name;
        if (seen.theme !== theme) wrong.push(`${label}: draws in ${seen.theme}`);
        if (seen.scrollWidth !== width || seen.innerWidth !== width) {
          wrong.push(`${label}: lays out at ${seen.scrollWidth} px (innerWidth ${seen.innerWidth}); past the edge: ${seen.past.join(', ')}`);
        }
      }
      await context.close();
    }
    assert.deepEqual(wrong, []);
  });
}

/* The footer credits come after everything above them: no row, list item,
   heading or control of the page is drawn under the footer. The national page
   is one screen on a desktop, and on a phone it flows, so the party table pushes
   the footer down rather than running on under it (at 390 px the table once
   overflowed a bounded region and the credits sat across its BJP and INC rows).
   Every atlas page, on each phone width, a tablet and a desktop one, in both themes. */
async function readFooterOverlaps(context, viewport, theme, path, ready) {
  const page = await context.newPage();
  await page.setViewport(viewport);
  if (theme) await page.evaluateOnNewDocument((id) => localStorage.setItem('site-theme', id), theme);
  await page.goto(origin + path, { waitUntil: 'networkidle0' });
  await page.waitForSelector(ready, { timeout: 15000 });
  const seen = await page.evaluate(() => {
    const footer = document.querySelector('footer.credits');
    if (!footer) return null;
    const fb = footer.getBoundingClientRect();
    return [...document.querySelectorAll('td,th,tr,li,p,h1,h2,h3,button,a')]
      .filter((el) => !footer.contains(el) && !el.contains(footer))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
          && r.bottom > fb.top + 1 && r.top < fb.bottom - 1 && r.right > fb.left && r.left < fb.right;
      })
      .map((el) => `${el.tagName.toLowerCase()} "${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24)}"`);
  });
  await page.close();
  return seen;
}

for (const viewport of [
  ...[360, 390, 412].map((width) => ({ width, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })),
  { width: 800, height: 1000 },
  { width: 1280, height: 800 },
]) {
  test(`footer at ${viewport.width} px: nothing on any atlas page is drawn under the credits`, async () => {
    const wrong = [];
    for (const theme of PHONE_THEMES) {
      const context = await browser.createBrowserContext();
      for (const [name, path, ready] of PAGES.filter(([n]) => n !== 'country list')) {
        const hits = await readFooterOverlaps(context, viewport, theme, path, ready);
        const label = theme ? `${name} (${theme})` : name;
        if (hits === null) wrong.push(`${label}: no footer.credits`);
        else if (hits.length) wrong.push(`${label}: ${hits.length} under the credits: ${hits.slice(0, 4).join(', ')}`);
      }
      await context.close();
    }
    assert.deepEqual(wrong, []);
  });
}
