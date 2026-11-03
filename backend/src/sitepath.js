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

import { shownState } from "../../frontend/lib/atlas.ts";
import { findSeat as findAssemblySeat, isMapped, readQuery, stateNameOf } from "../../frontend/lib/mla.ts";
import { findSeat as findParliamentSeat, parseQuery } from "../../frontend/lib/mp.ts";

const ATLAS_ROOT = "/elections/india/";
const STATE_PAGE = `${ATLAS_ROOT}state/`;

/**
 * Which page a request is for and the query it reads, with the page's own
 * defaults (frontend/lib/mp.ts parseQuery, lib/mla.ts readQuery); null for the
 * national page and anything else.
 */
export function tailQuery(url) {
  switch (url.pathname) {
    case STATE_PAGE:
      return { page: "state", state: (url.searchParams.get("s") || "").toUpperCase() };
    case `${ATLAS_ROOT}mp/`: {
      const { S, C } = parseQuery(url.search);
      return { page: "mp", state: S, seat: C };
    }
    case `${ATLAS_ROOT}mla/`:
      return { page: "mla", ...readQuery(url.search) };
    default:
      return null;
  }
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
 * them; a file that could not be read is null), looked up with the pages' own
 * rules (frontend/lib). Each name falls back the way the page's does: an unknown
 * state to its code (the state page shows Uttar Pradesh for one), an unknown
 * seat to its key. With no data at all the crumbs still name the page, by its
 * query.
 */
export function tailFor(query, docs) {
  const regionsDoc = docs["regions.json"] ?? null;
  const regions = regionsDoc?.regions ?? [];
  // The state page's fallback needs regions.json, except for a missing state.
  const state = query.page === "state" && (regions.length > 0 || !query.state) ? shownState(regions, query.state) : query.state;
  const india = { label: "India", href: ATLAS_ROOT };
  const stateName = stateNameOf(regionsDoc, state);
  if (query.page === "state") return [india, { label: stateName }];

  const stateCrumb = { label: stateName, href: `${STATE_PAGE}?s=${encodeURIComponent(state)}` };
  if (query.page === "mp") {
    const pc = findParliamentSeat(docs[`geo/ls/${state}.json`] ?? null, state, query.seat);
    return [india, stateCrumb, { label: pc?.ls_seat_name || query.seat }];
  }
  const coverage = docs["geo/ac/coverage.json"] ?? null;
  const ac = findAssemblySeat(isMapped(coverage, state) ? docs[`geo/ac/${state}.json`] ?? null : null, query.seat);
  return [india, stateCrumb, { label: ac.name || "Assembly seat" }];
}

const escapeAttr = (s) => s.replace(/[&"<>']/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;", "'": "&#39;" })[c]);
// The slot exactly as React renders it: name first, then data-tail.
const SLOT_TAIL = /(<site-slot name="site-path" data-tail=")[^"]*(")/;

/** `html` with the site path's data-tail set to `tail`; unchanged when the page has no such slot. */
export function withTail(html, tail) {
  return html.replace(SLOT_TAIL, (_, open, close) => open + escapeAttr(JSON.stringify(tail)) + close);
}
