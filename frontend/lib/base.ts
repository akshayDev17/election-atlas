/* Where the atlas is served from. next.config.mjs sets basePath and exposes it
   here, so a page links and fetches under the same prefix the export was built
   with. */
export const BASE: string = process.env.NEXT_PUBLIC_BASE_PATH ?? '/elections/india';

/* The data directory: the JSON exported from D1 plus the committed geometry,
   registries and indexes (backend/build_site.py lays it beside the pages). */
export const DATA = `${BASE}/data/`;

/* A page of the atlas by its directory name ('' is the national page), with a
   query. Pages are linked with plain anchors, never the client router: each page
   carries its own stylesheet, and a full load keeps one page's styles off
   another. */
export function pageURL(page: '' | 'state' | 'mp' | 'mla', params: Record<string, string | number | null | undefined> = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== '') q.set(k, String(v));
  const qs = q.toString();
  return `${BASE}/${page ? page + '/' : ''}${qs ? '?' + qs : ''}`;
}
