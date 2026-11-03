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
// national, state, MP and MLA pages in a real browser. Each page must
// draw its content with zero console errors, no uncaught exception and no failed
// request: a page fetches only the files availability.json lists, so even a
// missing file never costs a 404.
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
    await page.waitForFunction(() => document.querySelector('header site-theme-picker')?.shadowRoot?.querySelector('select'));
    assert.equal(await page.evaluate(() => window.__firstFrameTheme), expected);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), expected);
    assert.equal(await page.evaluate(() =>
      document.querySelector('header site-theme-picker').shadowRoot.querySelector('select').value), 'system');
    await context.close();
    assert.deepEqual(problems, []);
  });
}

/* The site path site-shell draws in each page's masthead (the page places
   <site-slot name="site-path">): every app inline wherever there is room, a
   bottom sheet on a portrait phone, the atlas marked as the current app, the
   page's own crumbs after it, and every target at least 44 px. It must still be
   there once the page has hydrated: React must not replace it. */
const CRUMBS = {
  'national, 2024': ['India'],
  'state, Uttar Pradesh 2024': ['India', 'Uttar Pradesh'],
  'MP, Gorakhpur': ['India', 'Uttar Pradesh', 'Gorakhpur'],
  'MLA, Agiaon': ['India', 'Bihar', 'Agiaon (SC)'],
};
const pathPages = PAGES.filter(([name]) => name in CRUMBS);

/* What the site path looks like on the page, once it has drawn. */
async function readPath(viewport, path, ready) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const problems = [];
  page.on('console', (m) => { if (isProblem(m)) problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
  await page.goto(origin + path, { waitUntil: 'networkidle0' });
  await page.waitForSelector(ready, { timeout: 15000 });
  const seen = await page.evaluate(() => {
    const nav = document.querySelector('header site-slot[name="site-path"] nav.sp');
    if (!nav) return null;
    const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const targets = [...nav.querySelectorAll('a, button, .sp-here')].filter(shown).map((el) => {
      const r = el.getBoundingClientRect();
      // the tap area: what a press just inside each edge lands on
      const hits = [[r.left + 1, r.top + r.height / 2], [r.right - 1, r.top + r.height / 2]]
        .every(([x, y]) => el.contains(document.elementFromPoint(x, y)));
      return { text: el.textContent.trim(), w: r.width, h: r.height, hits };
    });
    const pill = nav.querySelector('.sp-pill');
    const pr = pill.getBoundingClientRect();
    return {
      apps: shown(nav.querySelector('.sp-apps')),
      pill: shown(pill),
      // the pill is drawn 34 px tall and its tap area is 44: a press 4 px above
      // or below it still lands on it
      pillTap: shown(pill) && pr.height >= 34 && [pr.top - 4, pr.bottom + 4].every((y) => pill.contains(document.elementFromPoint(pr.left + pr.width / 2, y))),
      current: [...nav.querySelectorAll('.sp-apps [aria-current]')].map((el) => [el.querySelector('.sp-label')?.textContent, el.getAttribute('aria-current')]),
      crumbs: [...nav.querySelectorAll('.sp-crumb')].filter(shown).map((el) => el.textContent.replace('/', '').trim()),
      here: nav.querySelector('.sp-crumb:last-child [aria-current="page"]')?.textContent ?? null,
      targets,
      backLink: !!document.querySelector('header .back'),
    };
  });
  return { page, problems, seen };
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 844, height: 390 }]) {
  test(`site path at ${viewport.width}x${viewport.height}: the apps inline, the atlas current, the crumbs, 44 px targets`, themed, async () => {
    for (const [name, path, ready] of pathPages) {
      const { page, problems, seen } = await readPath(viewport, path, ready);
      await page.close();
      assert.ok(seen, `${name}: the site path is drawn and survives hydration`);
      assert.deepEqual(problems, [], name);
      assert.equal(seen.apps, true, `${name}: the apps sit inline`);
      assert.equal(seen.pill, false, `${name}: no pill where there is room`);
      assert.deepEqual(seen.current, [['Election Atlas', 'true']], `${name}: the atlas is the current app`);
      assert.deepEqual(seen.crumbs, CRUMBS[name], `${name}: the page's crumbs`);
      assert.equal(seen.here, CRUMBS[name].at(-1), `${name}: the last crumb is the current page`);
      assert.equal(seen.backLink, false, `${name}: the site path replaces the page's back link`);
      for (const t of seen.targets) {
        assert.ok(t.h >= 44 && t.w >= 44 && t.hits, `${name}: "${t.text}" is ${t.w}x${t.h}, a 44 px target`);
      }
    }
  });
}

/* The national, state and MP pages are wider than a 390 px phone today (the
   year buttons, the party table), which grows the phone's layout viewport past
   the screen; the sheet must stay on the screen regardless (app/site-path.css). */
test('site path on a portrait phone (390x844): the apps fold into a pill that opens a bottom sheet', themed, async () => {
  for (const [name, path, ready] of pathPages) {
    const { page, problems, seen } = await readPath({ width: 390, height: 844, isMobile: true, hasTouch: true }, path, ready);
    try {
      assert.ok(seen, `${name}: the site path is drawn and survives hydration`);
      assert.equal(seen.apps, false, `${name}: the apps are folded`);
      assert.equal(seen.pill, true, `${name}: the pill shows`);
      assert.equal(seen.pillTap, true, `${name}: the pill's tap area is 44 px tall`);
      assert.deepEqual(seen.crumbs, CRUMBS[name].slice(-1), `${name}: only the last crumb shows`);
      for (const t of seen.targets) assert.ok(t.h >= 34 && t.w >= 44 && t.hits, `${name}: "${t.text}" is ${t.w}x${t.h}`);
      await page.click('.sp-pill');
      await page.waitForFunction(() => document.querySelector('#site-path-sheet')?.open);
      const sheet = await page.evaluate(() => {
        const d = document.querySelector('#site-path-sheet');
        const r = d.getBoundingClientRect();
        // on the phone's screen: inside the visual viewport, whatever the page's width
        const onScreen = (el) => {
          const b = el.getBoundingClientRect();
          return b.left >= 0 && b.right <= visualViewport.width && b.top >= 0 && b.bottom <= visualViewport.height;
        };
        return {
          modal: d.matches(':modal'),
          // its bottom on the screen's bottom edge
          bottom: Math.round(r.bottom) === Math.round(visualViewport.height),
          closeOnScreen: onScreen(d.querySelector('.sp-close')),
          rowsOnScreen: [...d.querySelectorAll('li a')].every((a) => {
            const b = a.getBoundingClientRect();
            return b.left >= 0 && b.right <= visualViewport.width;
          }),
          apps: [...d.querySelectorAll('li a')].map((a) => [a.querySelector('.sp-name').textContent.replace(/\(.*\)/, '').trim(), a.getAttribute('href'), a.getAttribute('aria-current')]),
        };
      });
      assert.equal(sheet.modal, true, `${name}: the sheet is modal`);
      assert.equal(sheet.bottom, true, `${name}: the sheet sits at the bottom`);
      assert.equal(sheet.closeOnScreen, true, `${name}: the Close button is fully on the phone's screen`);
      assert.equal(sheet.rowsOnScreen, true, `${name}: every row of the sheet is within the screen's width`);
      assert.deepEqual(sheet.apps.find(([label]) => label === 'Election Atlas'), ['Election Atlas', '/elections/india/', 'true'], name);
      assert.ok(sheet.apps.length >= 5, `${name}: every app is listed`);
      await page.click('.sp-close');
      await page.waitForFunction(() => !document.querySelector('#site-path-sheet').open);
      // Escape closes it too
      await page.click('.sp-pill');
      await page.waitForFunction(() => document.querySelector('#site-path-sheet')?.open);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#site-path-sheet').open);
      assert.deepEqual(problems, [], name);
    } finally {
      await page.close();
    }
  }
});

test('site path: the crumbs lead back up the atlas', themed, async () => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${origin}/elections/india/mp/?s=IN-UP&c=gorakhpur`, { waitUntil: 'networkidle0' });
  await Promise.all([page.waitForNavigation(), page.click('.sp-crumb a[href*="state/"]')]);
  assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, '/elections/india/state/?s=IN-UP');
  await page.waitForSelector('#map-pc path', { timeout: 15000 });
  await Promise.all([page.waitForNavigation(), page.click('.sp-crumb a[href="/elections/india/"]')]);
  assert.equal(new URL(page.url()).pathname, '/elections/india/');
  await page.close();
});

/* Without site-shell the slot keeps the page's own back link, as before: home
   from the national page, India from a state, and the seat's own state from an
   MP or MLA page. */
test('no site-shell: each page keeps its back link', { skip: !!siteThemes && 'site-shell composes this run' }, async () => {
  for (const [path, ready, text, href] of [
    ['/elections/india/?y=2024', '#map path.pc', '← Akshay Prabhakant', '/'],
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
