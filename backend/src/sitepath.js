// The atlas's crumbs in the site path (akshayprabhakant.com / the apps / India /
// Uttar Pradesh / Gorakhpur).
//
// Each page places <site-slot name="site-path" data-tail="…"> (frontend/
// components/SitePath.tsx), and site-shell's compose() draws the path from it,
// reading data-tail as the page's own crumbs after the app name. A page's HTML is
// one file for every query, so the state, MP and MLA pages ship placeholder
// labels there; before compose() runs, the Worker writes the real crumbs for the
// request's query into that attribute. The names come from the same data files,
// with the same defaults, the page itself reads, so the path names what the page
// shows:
//
//   state/?s=IN-UP          India / Uttar Pradesh
//   mp/?s=IN-UP&c=gorakhpur India / Uttar Pradesh / Gorakhpur
//   mla/?s=IN-BR&c=agiaon   India / Bihar / Agiaon
//
// The national page's crumb ("India") is fixed, so its HTML is left as built.

const ATLAS_ROOT = "/elections/india/";
const STATE_PAGE = `${ATLAS_ROOT}state/`;
// The defaults each page applies to a missing query (frontend/lib/mp.ts,
// lib/mla.ts, components/StateView.tsx).
const DEFAULT_STATE = "IN-UP";
const DEFAULT_MP_SEAT = "gorakhpur";

/**
 * Which page a request is for and the query it reads, with the page's own
 * defaults; null for the national page and anything else.
 */
export function tailQuery(url) {
  const q = url.searchParams;
  const state = (q.get("s") || "").toUpperCase();
  const seat = (q.get("c") || "").toLowerCase();
  switch (url.pathname) {
    case STATE_PAGE:
      return { page: "state", state };
    case `${ATLAS_ROOT}mp/`:
      return { page: "mp", state: state || DEFAULT_STATE, seat: seat || DEFAULT_MP_SEAT };
    case `${ATLAS_ROOT}mla/`:
      return { page: "mla", state: state || DEFAULT_STATE, seat };
    default:
      return null;
  }
}

// The seat key the state page links with (frontend/lib/atlas.ts fold and
// seatFold): lowercase, no (SC)/(ST), letters and digits only, and for seatFold
// no trailing state abbreviation.
const fold = (s) => String(s || "").toLowerCase().replace(/\(sc\)|\(st\)/g, "").replace(/[^a-z0-9]/g, "");
function seatFold(name, state) {
  const abbr = (state.split("-")[1] || "").toLowerCase();
  const k = fold(name);
  return abbr && k.endsWith(abbr) ? k.slice(0, -abbr.length) : k;
}

// A state code as regions.json writes them; any other ?s= names no file.
const STATE_CODE = /^IN-[A-Z]{2}$/;

/** The data files a page's crumbs are named from, relative to the data directory. */
export function tailFiles(query) {
  if (query.page === "state") return ["regions.json"];
  const own = STATE_CODE.test(query.state);
  if (query.page === "mp") return own ? ["regions.json", `geo/ls/${query.state}.json`] : ["regions.json"];
  return own ? ["regions.json", "geo/ac/coverage.json", `geo/ac/${query.state}.json`] : ["regions.json"];
}

/**
 * The crumbs for `query`, from its data files (`docs`, keyed as tailFiles names
 * them; a file that could not be read is null). Each name falls back the way
 * the page's does: an unknown state to its code (the state page shows Uttar
 * Pradesh for one), an unknown seat to its key. With no data at all the crumbs
 * still name the page, by its query.
 */
export function tailFor(query, docs) {
  const regions = docs["regions.json"]?.regions ?? [];
  const known = (code) => regions.find((r) => r.code === code);
  // The state page shows Uttar Pradesh for a missing or unknown state (known only
  // once regions.json is read).
  const unknown = !query.state || (regions.length > 0 && !known(query.state));
  const state = query.page === "state" && unknown ? DEFAULT_STATE : query.state;
  const stateName = known(state)?.name || state;
  const india = { label: "India", href: ATLAS_ROOT };
  if (query.page === "state") return [india, { label: stateName }];

  const stateCrumb = { label: stateName, href: `${STATE_PAGE}?s=${encodeURIComponent(state)}` };
  if (query.page === "mp") {
    const pcs = docs[`geo/ls/${state}.json`]?.objects?.pcs?.geometries ?? [];
    const pc = pcs.find((g) => g.properties && (seatFold(g.properties.ls_seat_name, state) === query.seat || fold(g.properties.ls_seat_name) === query.seat));
    return [india, stateCrumb, { label: pc?.properties.ls_seat_name || query.seat }];
  }
  // The MLA page looks a seat up only in a state coverage.json lists.
  const mapped = !!docs["geo/ac/coverage.json"]?.checked?.[state];
  const acs = mapped ? docs[`geo/ac/${state}.json`]?.objects?.acs?.geometries ?? [] : [];
  const ac = acs.find((g) => fold(g.properties?.ac) === query.seat);
  return [india, stateCrumb, { label: ac?.properties.ac || query.seat || "Assembly seat" }];
}

const escapeAttr = (s) => s.replace(/[&"<>']/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;", "'": "&#39;" })[c]);
// The slot exactly as React renders it: name first, then data-tail.
const SLOT_TAIL = /(<site-slot name="site-path" data-tail=")[^"]*(")/;

/** `html` with the site path's data-tail set to `tail`; unchanged when the page has no such slot. */
export function withTail(html, tail) {
  return html.replace(SLOT_TAIL, (_, open, close) => open + escapeAttr(JSON.stringify(tail)) + close);
}
