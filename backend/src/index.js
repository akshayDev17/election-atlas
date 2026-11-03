// election-atlas Worker.
//
// The atlas is a static export (frontend/, Next.js) under /elections/india/,
// served by Cloudflare's asset layer without invoking this script. The script runs
// only for the paths listed in wrangler.jsonc `assets.run_worker_first`:
//
//   /elections/india/data/state-legislation/*
//     The state bill PDFs there live in the R2 bucket election-atlas-docs under the
//     same path relative to the atlas root (data/state-legislation/IN-XX/bills/
//     documents/<hash>-bills.pdf); they are streamed from R2 with Range support.
//     Every other file under that prefix (the bill index and manifest JSON) is a
//     static asset and falls through to it.
//
//   /work/election-atlas, /work/election-atlas/*
//     The atlas's old address. Every URL there answers a permanent redirect (308)
//     to the same path under /elections/india/, query kept, so old links, deep
//     links and bill PDF URLs keep working.
//
//   /elections, /elections/
//     No page lives there; both answer a permanent redirect (308) to
//     /elections/india/, query kept. Other /elections/* paths are not claimed.
//
//   /elections/india/, state/, mp/, mla/ (the four pages)
//     Served from the assets, then passed through site-shell's compose() (the
//     SHELL service binding, akshayDev17/site-themes shell/), which adds the
//     shared site theme to the page's <head> as it streams out and fills the
//     page's <site-slot name="site-path"> with the site path. The state, MP and
//     MLA pages first get their crumbs for the request's query written into
//     that slot (sitepath.js). It fails open: with site-shell missing,
//     unreachable or throwing, the page is served exactly as built. The shared
//     files the composed page links live at /_site/*, which is routed to
//     site-shell itself, not to this Worker.

import { tailFiles, tailFor, tailQuery, withTail } from "./sitepath.js";

const ATLAS_ROOT = "/elections/india/";
const OLD_ROOT = "/work/election-atlas";
const ELECTIONS_ROOT = "/elections";
const DOCS_PREFIX = `${ATLAS_ROOT}data/state-legislation/`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const moved = movedTo(url);
    if (moved) return Response.redirect(moved, 308);
    if (url.pathname.startsWith(DOCS_PREFIX) && url.pathname.endsWith(".pdf")) {
      return servePdf(request, env, url);
    }
    const page = () => env.ASSETS.fetch(request);
    return withShell(await page(), env, page, "atlas", (res) => withCrumbs(res, env, url));
  },
};

/**
 * Passes an HTML page, readied by `prepare`, through site-shell's compose(),
 * failing open: with no binding, or when site-shell is missing, unreachable or
 * throws, the visitor gets the page exactly as built. The page's body went to
 * site-shell with the call, so the fallback fetches the page again (a static
 * asset, so free); returning `res` there would answer 500 ("Body has already
 * been used").
 * That copy carries no validator, like a composed page, so the browser never
 * revalidates it into a 304 once site-shell is back.
 */
async function withShell(res, env, refetch, app, prepare) {
  const type = res.headers.get("content-type") || "";
  if (!env.SHELL || res.status !== 200 || !type.startsWith("text/html")) return res;
  try {
    return await env.SHELL.compose(await prepare(res), { app });
  } catch (err) {
    console.error("site-shell: compose failed, serving the page as built:", String(err));
    const page = await refetch();
    const headers = new Headers(page.headers);
    headers.delete("etag");
    headers.delete("last-modified");
    return new Response(page.body, { status: page.status, statusText: page.statusText, headers });
  }
}

/**
 * The page with its site path crumbs for this request written into its slot
 * (sitepath.js), read from the same data files the page reads. The national
 * page, whose crumb is fixed, is returned untouched.
 */
async function withCrumbs(res, env, url) {
  const query = tailQuery(url);
  if (!query) return res;
  const files = tailFiles(query);
  const docs = Object.fromEntries(await Promise.all(files.map(async (f) => [f, await readData(env, url, f)])));
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  const html = withTail(await res.text(), tailFor(query, docs));
  return new Response(html, { status: res.status, statusText: res.statusText, headers });
}

/** A data file from the assets, parsed; null when it is missing or not JSON. */
async function readData(env, url, file) {
  try {
    const res = await env.ASSETS.fetch(new URL(`${ATLAS_ROOT}data/${file}`, url));
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Where a redirected URL lives now: /work/election-atlas[/rest][?query] is
 * /elections/india/[rest][?query] on the same host, and the bare /elections or
 * /elections/ (no page lives there) is /elections/india/[?query]. null for any
 * other URL.
 */
export function movedTo(url) {
  const { pathname } = url;
  if (pathname === ELECTIONS_ROOT || pathname === `${ELECTIONS_ROOT}/`) return `${url.origin}${ATLAS_ROOT}${url.search}`;
  if (pathname !== OLD_ROOT && !pathname.startsWith(`${OLD_ROOT}/`)) return null;
  const rest = pathname.slice(OLD_ROOT.length).replace(/^\//, "");
  return `${url.origin}${ATLAS_ROOT}${rest}${url.search}`;
}

/** The R2 key for a PDF URL, or null when the path is not a plain relative key. */
export function r2Key(pathname) {
  let key;
  try {
    key = decodeURIComponent(pathname.slice(ATLAS_ROOT.length));
  } catch {
    return null;
  }
  if (key.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) return null;
  return key;
}

/**
 * A single-range "Range: bytes=…" header as an R2 range: `{ offset, length }`,
 * `{ offset }` (to the end) or `{ suffix }` (the last N bytes); null for anything
 * else (no header, several ranges, a malformed one), which is served whole.
 */
export function parseRange(header) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((header || "").trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  if (m[1] === "") return { suffix: Number(m[2]) };
  const offset = Number(m[1]);
  if (m[2] === "") return { offset };
  const last = Number(m[2]);
  return last < offset ? null : { offset, length: last - offset + 1 };
}

/** Where an R2 range falls in an object of `size` bytes. */
export function byteSpan(range, size) {
  if (!range) return { offset: 0, length: size };
  if ("suffix" in range) {
    const length = Math.min(range.suffix, size);
    return { offset: size - length, length };
  }
  const offset = range.offset ?? 0;
  const length = Math.min(range.length ?? size - offset, size - offset);
  return { offset, length };
}

async function servePdf(request, env, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }
  const key = r2Key(url.pathname);
  if (key === null) return new Response("Not Found", { status: 404 });

  let range = request.method === "GET" ? parseRange(request.headers.get("range")) : null;
  let object;
  try {
    object = request.method === "HEAD"
      ? await env.DOCS.head(key)
      : await env.DOCS.get(key, range ? { range } : {});
  } catch (err) {
    // R2 refuses a range that runs past the end: clamp it to the object, or
    // answer 416 when it starts past the end.
    if (!range) throw err;
    const head = await env.DOCS.head(key);
    if (head === null) return new Response("Not Found", { status: 404 });
    const span = byteSpan(range, head.size);
    if (span.length <= 0 || span.offset >= head.size) {
      return new Response("Range Not Satisfiable", {
        status: 416, headers: { "content-range": `bytes */${head.size}` },
      });
    }
    range = { offset: span.offset, length: span.length };
    object = await env.DOCS.get(key, { range });
  }
  if (object === null) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", "application/pdf");
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=86400");

  if (request.method === "HEAD") {
    headers.set("content-length", String(object.size));
    return new Response(null, { status: 200, headers });
  }
  if (range) {
    const { offset, length } = byteSpan(range, object.size);
    if (length <= 0) {
      return new Response("Range Not Satisfiable", {
        status: 416, headers: { "content-range": `bytes */${object.size}` },
      });
    }
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set("content-length", String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set("content-length", String(object.size));
  return new Response(object.body, { status: 200, headers });
}
