// node --experimental-strip-types --test backend/src/test_index.mjs
import assert from "node:assert/strict";
import test from "node:test";
import worker, { byteSpan, listPageNumber, movedTo, parseRange, r2Key } from "./index.js";
import { tailFiles, tailFor, tailQuery, withTail } from "./sitepath.js";

const PDF = "/elections/india/data/state-legislation/IN-AP/bills/documents/f6d43f9459-bills.pdf";

test("a PDF URL maps to its key relative to the atlas root", () => {
  assert.equal(r2Key(PDF), "data/state-legislation/IN-AP/bills/documents/f6d43f9459-bills.pdf");
});

test("dot segments and broken escapes never reach R2", () => {
  assert.equal(r2Key("/elections/india/data/state-legislation/%2e%2e/x.pdf"), null);
  assert.equal(r2Key("/elections/india/data/state-legislation//x.pdf"), null);
  assert.equal(r2Key("/elections/india/data/state-legislation/%E0%A4.pdf"), null);
});

test("byteSpan covers offset, open-ended and suffix ranges", () => {
  assert.deepEqual(byteSpan({ offset: 0, length: 100 }, 1000), { offset: 0, length: 100 });
  assert.deepEqual(byteSpan({ offset: 900 }, 1000), { offset: 900, length: 100 });
  assert.deepEqual(byteSpan({ suffix: 50 }, 1000), { offset: 950, length: 50 });
  assert.deepEqual(byteSpan({ suffix: 5000 }, 1000), { offset: 0, length: 1000 });
});

test("parseRange reads one byte range and refuses the rest", () => {
  assert.deepEqual(parseRange("bytes=0-99"), { offset: 0, length: 100 });
  assert.deepEqual(parseRange("bytes=100-"), { offset: 100 });
  assert.deepEqual(parseRange("bytes=-500"), { suffix: 500 });
  assert.equal(parseRange("bytes=0-1,5-6"), null);
  assert.equal(parseRange("bytes=9-3"), null);
  assert.equal(parseRange("items=0-1"), null);
  assert.equal(parseRange(null), null);
});

function fakeR2(objects) {
  const meta = (key, body) => ({
    size: body.length, httpEtag: `"${key}"`, writeHttpMetadata: () => {},
  });
  return {
    async head(key) { return key in objects ? meta(key, objects[key]) : null; },
    async get(key, opts = {}) {
      if (!(key in objects)) return null;
      const body = objects[key];
      const r = opts.range;
      if (!r) return { ...meta(key, body), body };
      const { offset, length } = byteSpan(r, body.length);
      if (offset >= body.length) throw new Error("range not satisfiable");
      return { ...meta(key, body), body: body.slice(offset, offset + length) };
    },
  };
}

const env = (objects) => ({
  DOCS: fakeR2(objects),
  ASSETS: { fetch: async (req) => new Response(`asset ${new URL(req.url).pathname}`) },
});
const KEY = "data/state-legislation/IN-AP/bills/documents/f6d43f9459-bills.pdf";
const BYTES = new TextEncoder().encode("%PDF-1.7 0123456789");

test("a PDF streams whole, with its length", async () => {
  const res = await worker.fetch(new Request(`https://x${PDF}`), env({ [KEY]: BYTES }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/pdf");
  assert.equal(res.headers.get("accept-ranges"), "bytes");
  assert.equal(res.headers.get("content-length"), String(BYTES.length));
});

test("a Range request gets 206 with Content-Range", async () => {
  const req = new Request(`https://x${PDF}`, { headers: { range: "bytes=0-7" } });
  const res = await worker.fetch(req, env({ [KEY]: BYTES }));
  assert.equal(res.status, 206);
  assert.equal(res.headers.get("content-range"), `bytes 0-7/${BYTES.length}`);
  assert.equal(await res.text(), "%PDF-1.7");
});

test("a suffix range gets the last bytes", async () => {
  const req = new Request(`https://x${PDF}`, { headers: { range: "bytes=-4" } });
  const res = await worker.fetch(req, env({ [KEY]: BYTES }));
  assert.equal(res.status, 206);
  assert.equal(res.headers.get("content-range"), `bytes ${BYTES.length - 4}-${BYTES.length - 1}/${BYTES.length}`);
  assert.equal(await res.text(), "6789");
});

test("a range past the end is 416", async () => {
  const req = new Request(`https://x${PDF}`, { headers: { range: "bytes=999-" } });
  const res = await worker.fetch(req, env({ [KEY]: BYTES }));
  assert.equal(res.status, 416);
  assert.equal(res.headers.get("content-range"), `bytes */${BYTES.length}`);
});

test("a PDF missing from R2 is 404", async () => {
  const res = await worker.fetch(new Request(`https://x${PDF}`), env({}));
  assert.equal(res.status, 404);
});

test("the bill index JSON and every page fall through to the static assets", async () => {
  for (const path of ["/elections/india/data/state-legislation/IN-AP/bills/index.json", "/elections/india/state/"]) {
    const res = await worker.fetch(new Request(`https://x${path}`), env({}));
    assert.equal(await res.text(), `asset ${path}`);
  }
});

const call = (url, init) => worker.fetch(new Request(url, init), env({ [KEY]: BYTES }));

test("the old address answers 308 to the same path under /elections/india/, query kept", async () => {
  const cases = [
    ["https://x/work/election-atlas", "https://x/elections/india/"],
    ["https://x/work/election-atlas/", "https://x/elections/india/"],
    ["https://x/work/election-atlas/state/?s=IN-UP&y=2024&t=stands", "https://x/elections/india/state/?s=IN-UP&y=2024&t=stands"],
    ["https://x/work/election-atlas/mp?s=IN-PB&c=bhatinda", "https://x/elections/india/mp?s=IN-PB&c=bhatinda"],
    ["https://x/work/election-atlas/data/manifest.json", "https://x/elections/india/data/manifest.json"],
    ["https://x/work/election-atlas/data/state-legislation/IN-AP/bills/documents/f6d43f9459-bills.pdf",
     `https://x${PDF}`],
  ];
  for (const [from, to] of cases) {
    const res = await call(from);
    assert.equal(res.status, 308, from);
    assert.equal(res.headers.get("location"), to, from);
  }
});

test("a HEAD or ranged request to the old address is redirected too, never served", async () => {
  const res = await call("https://x/work/election-atlas/data/state-legislation/IN-AP/bills/documents/f6d43f9459-bills.pdf",
    { method: "HEAD", headers: { range: "bytes=0-7" } });
  assert.equal(res.status, 308);
});

test("/elections answers 308 to the country list at /elections/, query kept", async () => {
  const cases = [
    ["https://x/elections", "https://x/elections/"],
    ["https://x/elections?page=2", "https://x/elections/?page=2"],
  ];
  for (const [from, to] of cases) {
    const res = await call(from);
    assert.equal(res.status, 308, from);
    assert.equal(res.headers.get("location"), to, from);
  }
});

test("a prerendered list page's own path answers 308 to /elections/?page=N", async () => {
  const cases = [
    ["https://x/elections/page/2/", "https://x/elections/?page=2"],
    ["https://x/elections/page/12", "https://x/elections/?page=12"],
    ["https://x/elections/page/3/?q=x", "https://x/elections/?q=x&page=3"],
    ["https://x/elections/page/1/", "https://x/elections/"],
    ["https://x/elections/page/0/", "https://x/elections/"],
    ["https://x/elections/page/abc/", "https://x/elections/"],
    ["https://x/elections/page/2/index.html", "https://x/elections/"],
    ["https://x/elections/page/", "https://x/elections/"],
    ["https://x/elections/page", "https://x/elections/"],
  ];
  for (const [from, to] of cases) {
    const res = await call(from);
    assert.equal(res.status, 308, from);
    assert.equal(res.headers.get("location"), to, from);
  }
});

test("other /elections paths are not redirected", () => {
  for (const u of ["https://x/elections/", "https://x/elections/?page=2", "https://x/elections/usa/",
    "https://x/elections/india", "https://x/electionsx", "https://x/elections//", "https://x/elections/pages/2/",
    "https://x/elections/cards/1.html", "https://x/elections/index.json"]) {
    assert.equal(movedTo(new URL(u)), null, u);
  }
});

test("listPageNumber reads ?page=N for a whole N from 2 up, and 1 for anything else", () => {
  const cases = [["", 1], ["?page=1", 1], ["?page=2", 2], ["?page=41", 41], ["?page=0", 1], ["?page=-2", 1],
    ["?page=2.5", 1], ["?page=02", 1], ["?page=abc", 1], ["?page=", 1], ["?y=2024", 1], ["?page=3&page=4", 3]];
  for (const [search, n] of cases) assert.equal(listPageNumber(search), n, search);
});

/** ASSETS for the list: `built` holds the pages that exist; anything else is a 404. */
function listAssets(built) {
  const calls = [];
  return {
    calls,
    fetch: async (req) => {
      const path = new URL(req.url).pathname;
      calls.push(path);
      return path in built
        ? new Response(built[path], { headers: { "content-type": "text/html" } })
        : new Response("Not Found", { status: 404, headers: { "content-type": "text/html" } });
    },
  };
}

test("/elections/?page=N serves page N's prerendered page, and page 1 for no page or a page not built", async () => {
  const built = { "/elections/": "page 1", "/elections/page/2/": "page 2", "/elections/page/3/": "page 3" };
  const cases = [
    ["/elections/", "page 1", ["/elections/"]],
    ["/elections/?page=1", "page 1", ["/elections/"]],
    ["/elections/?page=2", "page 2", ["/elections/page/2/"]],
    ["/elections/?page=3#c-x", "page 3", ["/elections/page/3/"]],
    ["/elections/?page=9", "page 1", ["/elections/page/9/", "/elections/"]],
    ["/elections/?page=abc", "page 1", ["/elections/"]],
    ["/elections/?page=0", "page 1", ["/elections/"]],
  ];
  for (const [path, body, fetched] of cases) {
    const e = { ASSETS: listAssets(built) };
    const res = await worker.fetch(new Request(`https://x${path}`), e);
    assert.equal(res.status, 200, path);
    assert.equal(await res.text(), body, path);
    assert.deepEqual(e.ASSETS.calls, fetched, path);
  }
});

test("the list's cards, search index, pictures and font are plain static assets", async () => {
  for (const path of ["/elections/cards/1.html", "/elections/index.json", "/elections/img/india-map-2024-360.webp", "/elections/fonts/newsreader.woff2"]) {
    const res = await call(`https://x${path}`);
    assert.equal(await res.text(), `asset ${path}`, path);
  }
});

test("only the old atlas prefix moves", () => {
  assert.equal(movedTo(new URL("https://x/work/election-atlasx/")), null);
  assert.equal(movedTo(new URL("https://x/work/")), null);
  assert.equal(movedTo(new URL("https://x/elections/india/")), null);
});

test("pages and data under /elections/india/ are the static assets", async () => {
  const res = await call("https://x/elections/india/state/?s=IN-UP");
  assert.equal(await res.text(), "asset /elections/india/state/");
});

// The site-shell hook, with stand-in bindings. The real compose() runs only in
// workerd; that pairing is covered by frontend/shell-contract/contract.test.mjs.
const HTML = '<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/></head><body>atlas</body></html>';

/** ASSETS: answers every path with `respond(path)` and records what was asked. */
function assets(respond = () => new Response(HTML, { headers: { "content-type": "text/html" } })) {
  const calls = [];
  return {
    calls,
    fetch: async (input) => {
      const path = new URL(input instanceof Request ? input.url : input).pathname;
      calls.push(path);
      return respond(path);
    },
  };
}

/** SHELL: compose() marks the page (reading its body, as the RPC transfer does). */
function shell({ fail } = {}) {
  const calls = { compose: [] };
  return {
    calls,
    compose: async (res, opts) => {
      calls.compose.push(opts);
      const body = await res.text();
      if (fail) throw new Error(fail);
      return new Response(body.replace('<meta charSet="utf-8"/>', "$&<script data-site-shell></script>"), {
        headers: { "content-type": "text/html", "x-site-shell": `test; app=${opts.app}` },
      });
    },
  };
}

const PAGES = ["/elections/india/", "/elections/india/state/", "/elections/india/mp/", "/elections/india/mla/"];

test("with SHELL bound, the four pages are composed with the app name", async () => {
  const e = { ASSETS: assets(), SHELL: shell() };
  for (const path of [...PAGES, "/elections/india/state/?s=IN-UP&y=2024"]) {
    const res = await worker.fetch(new Request(`https://x${path}`), e);
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get("x-site-shell"), "test; app=atlas", path);
    assert.match(await res.text(), /<meta charSet="utf-8"\/><script data-site-shell><\/script>/, path);
  }
  assert.equal(e.SHELL.calls.compose.length, 5);
  for (const opts of e.SHELL.calls.compose) assert.deepEqual(opts, { app: "atlas" });
  // one fetch per page, plus the data files the state, MP and MLA crumbs are named from
  const data = (f) => `/elections/india/data/${f}`;
  assert.deepEqual(e.ASSETS.calls, [
    "/elections/india/",
    "/elections/india/state/", data("regions.json"),
    "/elections/india/mp/", data("regions.json"), data("geo/ls/IN-UP.json"), data("parliament/IN-UP/gorakhpur.json"),
    "/elections/india/mla/", data("regions.json"), data("geo/ac/coverage.json"), data("geo/ac/IN-UP.json"),
    "/elections/india/state/", data("regions.json"),
  ]);
});

test("with SHELL bound, the country list is composed, page N too", async () => {
  const e = { ASSETS: assets(), SHELL: shell() };
  for (const path of ["/elections/", "/elections/?page=2"]) {
    const res = await worker.fetch(new Request(`https://x${path}`), e);
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get("x-site-shell"), "test; app=atlas", path);
    assert.match(await res.text(), /<meta charSet="utf-8"\/><script data-site-shell><\/script>/, path);
  }
  assert.deepEqual(e.ASSETS.calls, ["/elections/", "/elections/page/2/"]);
});

test("fail open: the country list's page N is fetched again as built, not page 1", async (t) => {
  t.mock.method(console, "error", () => {});
  const e = { ASSETS: assets(), SHELL: shell({ fail: "fault: compose threw" }) };
  const res = await worker.fetch(new Request("https://x/elections/?page=2"), e);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-site-shell"), null);
  assert.equal(await res.text(), HTML);
  assert.deepEqual(e.ASSETS.calls, ["/elections/page/2/", "/elections/page/2/"]);
});

test("unbound: with no SHELL binding a page is served exactly as built", async () => {
  const e = { ASSETS: assets() };
  const res = await worker.fetch(new Request("https://x/elections/india/"), e);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-site-shell"), null);
  assert.equal(await res.text(), HTML);
});

test("fail open: compose() rejecting (site-shell missing, unreachable or throwing) re-fetches the page as built", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  for (const fail of ['Worker "site-shell" not found.', "fault: compose threw"]) {
    const built = () => new Response(HTML, {
      headers: { "content-type": "text/html", etag: '"built"', "last-modified": "Tue, 03 Nov 2026 08:00:00 GMT" },
    });
    const e = { ASSETS: assets(built), SHELL: shell({ fail }) };
    const res = await worker.fetch(new Request("https://x/elections/india/mp/?s=IN-UP&c=gorakhpur"), e);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-site-shell"), null);
    assert.equal(res.headers.get("content-type"), "text/html");
    assert.equal(res.headers.get("etag"), null, "no validator, so a later visit is never a 304 onto this copy");
    assert.equal(res.headers.get("last-modified"), null);
    assert.equal(await res.text(), HTML, "the page as built, not a 500 from the spent body");
    assert.deepEqual(e.ASSETS.calls, [
      "/elections/india/mp/", "/elections/india/data/regions.json", "/elections/india/data/geo/ls/IN-UP.json",
      "/elections/india/data/parliament/IN-UP/gorakhpur.json", "/elections/india/mp/",
    ], "the same page fetched again");
  }
  assert.equal(errors.mock.callCount(), 2);
  assert.match(String(errors.mock.calls[0].arguments[0]), /site-shell: compose failed/);
});

test("non-HTML and non-200 responses never reach compose()", async () => {
  const responses = {
    "/elections/india/data/state-legislation/IN-AP/bills/index.json": () =>
      new Response("{}", { headers: { "content-type": "application/json", etag: 'W/"1"' } }),
    "/elections/india/missing/": () => new Response("nope", { status: 404, headers: { "content-type": "text/html" } }),
    "/elections/india/cached/": () => new Response(null, { status: 304, headers: { "content-type": "text/html" } }),
  };
  const e = { ASSETS: assets((path) => responses[path]()), SHELL: shell() };
  for (const path of Object.keys(responses)) {
    const res = await worker.fetch(new Request(`https://x${path}`), e);
    assert.equal(res.headers.get("x-site-shell"), null, path);
  }
  assert.equal(e.SHELL.calls.compose.length, 0);
  const json = await worker.fetch(new Request("https://x/elections/india/data/state-legislation/IN-AP/bills/index.json"), e);
  assert.equal(json.headers.get("etag"), 'W/"1"', "validators kept");
});

test("redirects and bill PDFs never touch site-shell", async () => {
  const e = { ...env({ [KEY]: BYTES }), SHELL: shell() };
  for (const path of ["/elections", "/elections/page/2/", "/work/election-atlas/state/?s=IN-UP&y=2024"]) {
    assert.equal((await worker.fetch(new Request(`https://x${path}`), e)).status, 308, path);
  }
  const pdf = await worker.fetch(new Request(`https://x${PDF}`), e);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.deepEqual(e.SHELL.calls, { compose: [] });
});

// The site path's crumbs (sitepath.js): each page's slot as React renders it,
// with the placeholder tail the page ships.
const slotted = (tail) =>
  '<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/></head><body><header>' +
  `<site-slot name="site-path" data-tail="${tail}"><a class="back" href="/">← Akshay Prabhakant</a></site-slot>` +
  "</header></body></html>";
const REGIONS = { regions: [{ code: "IN-UP", name: "Uttar Pradesh" }, { code: "IN-BR", name: "Bihar" }, { code: "IN-JK", name: "Jammu & Kashmir" }, { code: "IN-PB", name: "Punjab" }] };
const DOCS = {
  "regions.json": REGIONS,
  "geo/ls/IN-UP.json": { objects: { pcs: { geometries: [{ properties: { ls_seat_name: "Bijnor" } }, { properties: { ls_seat_name: "Gorakhpur" } }] } } },
  "geo/ls/IN-JK.json": { objects: { pcs: { geometries: [{ properties: { ls_seat_name: "Anantnag-Rajouri" } }] } } },
  // the geometry spells the seat Bathinda; the page links it, and names it from the Lok Sabha record
  "geo/ls/IN-PB.json": { objects: { pcs: { geometries: [{ properties: { ls_seat_name: "Bathinda" } }] } } },
  "parliament/IN-PB/bhatinda.json": { profile: { constituency: "Bathinda", state: "Punjab" } },
  "geo/ac/coverage.json": { checked: { "IN-BR": true } },
  "geo/ac/IN-BR.json": { objects: { acs: { geometries: [{ properties: { ac: "Agiaon (SC)" } }, { properties: { ac: "Valmiki Nagar" } }] } } },
  // present, but not listed in coverage.json: the MLA page does not use it
  "geo/ac/IN-UP.json": { objects: { acs: { geometries: [{ properties: { ac: "Behat" } }] } } },
};
const PLACEHOLDER = "[{&quot;label&quot;:&quot;India&quot;,&quot;href&quot;:&quot;/elections/india/&quot;},{&quot;label&quot;:&quot;State&quot;}]";

/** ASSETS: the slotted page for a page path, the DOCS for data paths, 404 for the rest. */
function atlasAssets() {
  return assets((path) => {
    const file = path.replace("/elections/india/data/", "");
    if (file in DOCS) return Response.json(DOCS[file]);
    if (path.startsWith("/elections/india/data/")) return new Response("Not Found", { status: 404, headers: { "content-type": "text/html" } });
    return new Response(slotted(path === "/elections/india/" ? "[{&quot;label&quot;:&quot;India&quot;}]" : PLACEHOLDER), {
      headers: { "content-type": "text/html", "content-length": "999" },
    });
  });
}

/** The data-tail compose() is handed for `path`, decoded as compose() decodes it. */
async function tailSent(path) {
  let sent;
  const e = {
    ASSETS: atlasAssets(),
    SHELL: { compose: async (res) => { sent = await res.text(); return new Response(sent, { headers: { "content-type": "text/html" } }); } },
  };
  const res = await worker.fetch(new Request(`https://x${path}`), e);
  assert.equal(res.status, 200, path);
  const raw = sent.match(/<site-slot name="site-path" data-tail="([^"]*)">/)[1];
  return JSON.parse(raw.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
}

const INDIA = { label: "India", href: "/elections/india/" };

test("each page hands compose() its crumbs, named from the data the page reads", async () => {
  assert.deepEqual(await tailSent("/elections/india/"), [{ label: "India" }], "the national page is left as built");
  assert.deepEqual(await tailSent("/elections/india/?y=2024&t=stands"), [{ label: "India" }]);
  assert.deepEqual(await tailSent("/elections/india/state/?s=IN-BR&y=2014"), [INDIA, { label: "Bihar" }]);
  assert.deepEqual(await tailSent("/elections/india/state/?s=in-up"), [INDIA, { label: "Uttar Pradesh" }]);
  assert.deepEqual(await tailSent("/elections/india/mp/?s=IN-UP&c=gorakhpur"),
    [INDIA, { label: "Uttar Pradesh", href: "/elections/india/state/?s=IN-UP" }, { label: "Gorakhpur" }]);
  assert.deepEqual(await tailSent("/elections/india/mla/?s=IN-BR&c=agiaon"),
    [INDIA, { label: "Bihar", href: "/elections/india/state/?s=IN-BR" }, { label: "Agiaon (SC)" }]);
});

test("crumbs follow the pages' own defaults and fallbacks", async () => {
  // no state, or one regions.json does not know: the state page shows Uttar Pradesh
  assert.deepEqual(await tailSent("/elections/india/state/"), [INDIA, { label: "Uttar Pradesh" }]);
  assert.deepEqual(await tailSent("/elections/india/state/?s=IN-XX"), [INDIA, { label: "Uttar Pradesh" }]);
  // the MP page defaults to Gorakhpur, Uttar Pradesh
  assert.deepEqual(await tailSent("/elections/india/mp/"),
    [INDIA, { label: "Uttar Pradesh", href: "/elections/india/state/?s=IN-UP" }, { label: "Gorakhpur" }]);
  // a seat the geometry does not have stands as its key, as on the page
  assert.deepEqual(await tailSent("/elections/india/mp/?s=IN-UP&c=nowhere"),
    [INDIA, { label: "Uttar Pradesh", href: "/elections/india/state/?s=IN-UP" }, { label: "nowhere" }]);
  // a Lok Sabha record names the seat ahead of the geometry, as on the page
  assert.deepEqual(await tailSent("/elections/india/mp/?s=IN-PB&c=bhatinda"),
    [INDIA, { label: "Punjab", href: "/elections/india/state/?s=IN-PB" }, { label: "Bathinda" }]);
  // a state coverage.json does not list has no assembly lookup, so the key stands
  assert.deepEqual(await tailSent("/elections/india/mla/?s=IN-UP&c=behat"),
    [INDIA, { label: "Uttar Pradesh", href: "/elections/india/state/?s=IN-UP" }, { label: "behat" }]);
  assert.deepEqual(await tailSent("/elections/india/mla/?s=IN-BR"),
    [INDIA, { label: "Bihar", href: "/elections/india/state/?s=IN-BR" }, { label: "Assembly seat" }]);
  // a name with characters that need escaping survives the attribute
  assert.deepEqual(await tailSent("/elections/india/mp/?s=IN-JK&c=anantnagrajouri"),
    [INDIA, { label: "Jammu & Kashmir", href: "/elections/india/state/?s=IN-JK" }, { label: "Anantnag-Rajouri" }]);
});

test("a query that is not a state code reads no state file", () => {
  assert.deepEqual(tailFiles(tailQuery(new URL("https://x/elections/india/mp/?s=../../x&c=y"))), ["regions.json"]);
  assert.deepEqual(tailFiles(tailQuery(new URL("https://x/elections/india/mla/?s=IN-UP%2F..&c=y"))), ["regions.json"]);
  assert.deepEqual(tailFiles(tailQuery(new URL("https://x/elections/india/mp/?s=IN-UP&c=..%2F..%2Fx"))),
    ["regions.json", "geo/ls/IN-UP.json"], "a seat that is not a key reads no record");
  assert.equal(tailQuery(new URL("https://x/elections/india/")), null);
  assert.equal(tailQuery(new URL("https://x/elections/india/data/x.json")), null);
  // with no data at all, the crumbs still name the page by its query
  assert.deepEqual(tailFor(tailQuery(new URL("https://x/elections/india/mp/?s=../../x&c=y")), {}),
    [INDIA, { label: "../../X", href: "/elections/india/state/?s=..%2F..%2FX" }, { label: "y" }]);
});

test("withTail rewrites only the site path's data-tail, escaped for the attribute", () => {
  const page = slotted(PLACEHOLDER);
  const out = withTail(page, [{ label: `"Q" & A's <b>` }]);
  assert.equal(out, page.replace(PLACEHOLDER, "[{&quot;label&quot;:&quot;\\&quot;Q\\&quot; &amp; A&#39;s &lt;b&gt;&quot;}]"));
  assert.equal(withTail(HTML, [{ label: "x" }]), HTML, "a page with no slot is unchanged");
});

test("crumbs never cost the page: unreadable data falls back to the query, and the length header is dropped", async () => {
  const e = {
    ASSETS: assets((path) => path.includes("/data/")
      ? Promise.reject(new Error("asset fetch failed"))
      : new Response(slotted(PLACEHOLDER), { headers: { "content-type": "text/html", "content-length": "999" } })),
    SHELL: shell(),
  };
  const res = await worker.fetch(new Request("https://x/elections/india/state/?s=IN-BR"), e);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-site-shell"), "test; app=atlas");
  assert.match(await res.text(), /data-tail="\[\{&quot;label&quot;:&quot;India&quot;,&quot;href&quot;:&quot;\/elections\/india\/&quot;\},\{&quot;label&quot;:&quot;IN-BR&quot;\}\]"/);
});
