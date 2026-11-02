// node --test backend/src/test_index.mjs
import assert from "node:assert/strict";
import test from "node:test";
import worker, { byteSpan, parseRange, r2Key } from "./index.js";

const PDF = "/work/election-atlas/data/state-legislation/IN-AP/bills/documents/f6d43f9459-bills.pdf";

test("a PDF URL maps to its key relative to the atlas root", () => {
  assert.equal(r2Key(PDF), "data/state-legislation/IN-AP/bills/documents/f6d43f9459-bills.pdf");
});

test("dot segments and broken escapes never reach R2", () => {
  assert.equal(r2Key("/work/election-atlas/data/state-legislation/%2e%2e/x.pdf"), null);
  assert.equal(r2Key("/work/election-atlas/data/state-legislation//x.pdf"), null);
  assert.equal(r2Key("/work/election-atlas/data/state-legislation/%E0%A4.pdf"), null);
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
  for (const path of ["/work/election-atlas/data/state-legislation/IN-AP/bills/index.json", "/work/election-atlas/state/"]) {
    const res = await worker.fetch(new Request(`https://x${path}`), env({}));
    assert.equal(await res.text(), `asset ${path}`);
  }
});
