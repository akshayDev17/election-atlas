/* The MLA page's data: which seat the query names, which assembly cycle the hero
   shows, the seat's result in that cycle, and the "not available yet" sentence
   when no added cycle carries it. Every function takes its inputs and returns
   what the page renders; the page holds no arithmetic of its own. */
import { DEFAULT_STATE, ECI, fold, notAvailable, titleCase } from './atlas.ts';
import type { PartiesDoc, RegionsDoc, SymbolsDoc } from './types.ts';

/* results/ac/{state}/{year}-detail.json: every candidate in every assembly seat,
   keyed by the seat's number. */
export type AcCandidate = { n: string; p: string; v: number };
export type AcDetailDoc = { year?: number; constituencies?: Record<string, { ac?: string; c?: AcCandidate[] }> };

/* geo/ac/{state}.json: one geometry per assembly seat, carrying its name, its
   number, and the Lok Sabha seat (pc) it sits inside. */
export type AcGeomProps = { ac: string; no: number | string; pc?: string; pcno?: number; dist?: string };
export type AcTopoDoc = { objects?: { acs?: { geometries?: { properties: AcGeomProps }[] } } };

/* geo/ac/coverage.json: the states whose assembly boundaries the atlas stands behind. */
export type CoverageDoc = { checked?: Record<string, unknown> };

/* ?s=IN-UP&c=behat. The state defaults to Uttar Pradesh, as it always has. */
export function readQuery(search: string): { state: string; seat: string } {
  const qs = new URLSearchParams(search);
  return { state: (qs.get('s') || DEFAULT_STATE).toUpperCase(), seat: (qs.get('c') || '').toLowerCase() };
}

export const stateNameOf = (regions: RegionsDoc | null, code: string): string =>
  regions?.regions.find(r => r.code === code)?.name || code;

/* Only a state listed in coverage.json has assembly geometry to look a seat up in. */
export const isMapped = (coverage: CoverageDoc | null, state: string): boolean => !!coverage?.checked?.[state];

/* The hero shows the latest assembly cycle whose result has been added. */
export const shownCycle = (cycles: readonly { year: number; ok: boolean }[]): number | null =>
  cycles.filter(c => c.ok).pop()?.year ?? null;

export type Seat = { name: string; no: string; pc: string };

/* The seat the key names. When the geometry has no such seat the key stands as
   the name, with no number (so no result is read) and no parent seat. */
export function findSeat(topo: AcTopoDoc | null, key: string): Seat {
  const g = (topo?.objects?.acs?.geometries ?? []).find(x => fold(x.properties.ac) === key);
  return g ? { name: g.properties.ac, no: String(g.properties.no), pc: g.properties.pc || '' } : { name: key, no: '', pc: '' };
}

/* The hero: the shown cycle's winner with their margin over the runner-up as a
   share of all votes polled, or, when no added cycle carries this seat's result,
   the sentence saying so and nothing that would read as one. */
export type Hero =
  | { kind: 'result'; year: number; winner: AcCandidate; marginPct: number; candidates: number }
  | { kind: 'missing'; message: string };

export function heroOf(opts: {
  detail: AcDetailDoc | null;
  seatNo: string;
  shownYear: number | null;
  cycles: readonly { year: number; ok: boolean }[];
  stateName: string;
}): Hero {
  const { detail, seatNo, shownYear, cycles, stateName } = opts;
  const cands = (seatNo && detail?.constituencies?.[seatNo]?.c) || [];
  const sorted = [...cands].sort((a, b) => (b.v || 0) - (a.v || 0));
  const [winner, runner] = sorted;
  if (winner && shownYear != null) {
    const totalV = sorted.reduce((n, c) => n + (c.v || 0), 0);
    const marginPct = runner && totalV ? (((winner.v || 0) - (runner.v || 0)) / totalV) * 100 : 0;
    return { kind: 'result', year: shownYear, winner, marginPct, candidates: sorted.length };
  }
  const latest = cycles.length ? cycles[cycles.length - 1].year : null;
  return { kind: 'missing', message: resultMissing(latest, stateName) };
}

export const resultMissing = (latest: number | null, stateName: string): string =>
  notAvailable(`${latest ? `the ${latest} ` : 'the '}${stateName} assembly result for this seat`, ECI);

export const formatMargin = (pct: number): string => `+${pct.toFixed(1)}%`;

/* The Lok Sabha seat this assembly seat sits inside, for the cross-link to its
   MP page; null when the geometry does not say. */
export const parentSeat = (pc: string): { title: string; key: string } | null =>
  pc ? { title: titleCase(pc), key: fold(pc) } : null;

/* A party as the hero shows it: name, colour (the registry's fallback colour for
   a party outside it), and its symbol file when one is listed. */
export function partyLook(code: string, parties: PartiesDoc | null, symbols: SymbolsDoc | null, dataRoot: string) {
  const p = parties?.parties.find(x => x.code === code);
  const file = symbols?.symbols?.[code]?.file;
  return {
    name: p?.name || code,
    colour: p?.colour || parties?.fallback?.colour || '#888',
    symbol: file ? dataRoot + file : null,
  };
}
