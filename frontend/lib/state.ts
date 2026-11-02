/* The state page's arithmetic and decisions: which Lok Sabha file a year is drawn
   from, what each seat holds under the tense, the seat tables, the captions, and
   every "not available yet" sentence. Explicit input, explicit output; the page
   holds the inputs (state, years, tense, sort, selection) and renders these. */
import { byelAvailable, lsResultsAvailable, lsStateAvailable, notAvailable, stateRoster } from './atlas.ts';
import type { Candidate, SeatResolved } from './card.ts';
import type { Sort, Tense } from './national.ts';
import { resolveSeat, tallyStands } from './stands.ts';
import type { Availability, ByeSeat, CabinetDoc, StateYearDoc } from './types.ts';

export type Tally = { seats: number; votes: number };
export type StateAgg = { m: Map<string, Tally>; total: number };
export type Stands = ReturnType<typeof tallyStands>;
export type Cycle = { year: number; ok: boolean };

/* results/ac/{state}/{year}.json: the winner of each AC and every other party's
   votes there; `no_result` lists ACs the report carries no result for. */
export type AcRow = { p: string; v: number; o?: Record<string, number> };
export type AcYearDoc = { constituencies: Record<string, AcRow>; no_result?: Record<string, string> };
/* results/ac/{state}/{year}-detail.json and results/ls/detail/{year}.json. */
export type DetailDoc = { constituencies: Record<string, { ac?: string; pc?: string; c: Candidate[] }> };
/* members/ls/{year}.json, keyed by geometry unique_id. */
export type MembersDoc = { members?: Record<string, { mpsno?: number }> };
/* mplads/{state}/index.json. */
export type MpladsIndex = { mps?: { constituency: string; constituency_key: string }[] };
/* geo/ac/coverage.json: the states whose assembly boundaries are mapped. */
export type Coverage = { checked: Record<string, unknown> };

export const PAGE_SIZE = 10;
export const DEFAULT_SORT: Sort = { key: 'seats', dir: -1 };
/* The Sansad member numbers hold for the term members currently sit in. */
export const MEMBER_YEAR = 2024;

/* ── results ──────────────────────────────────────────────────────────── */

/* Seats and votes per party from a constituency file. A party that polled but
   won nothing still counts its votes. */
export function aggregateFrom(cs: Record<string, { p: string; v: number; o?: Record<string, number> }>): StateAgg {
  const m = new Map<string, Tally>();
  let total = 0;
  for (const c of Object.values(cs)) {
    const w = m.get(c.p) || { seats: 0, votes: 0 };
    w.seats++; w.votes += c.v; total += c.v;
    m.set(c.p, w);
    for (const [code, v] of Object.entries(c.o || {})) {
      const o = m.get(code) || { seats: 0, votes: 0 };
      o.votes += v; total += v; m.set(code, o);
    }
  }
  return { m, total };
}

/* The state's party seats and votes from the state-level file, the only Lok
   Sabha result for an election whose boundaries predate the atlas geometry.
   null when the file holds no entry for the state. */
export function aggregateStateLevel(doc: StateYearDoc, state: string): { agg: StateAgg; seats: number } | null {
  const r = doc.regions[state];
  if (!r) return null;
  const m = new Map<string, Tally>();
  let total = 0;
  for (const t of r.parties) {
    const w = m.get(t.code) || { seats: 0, votes: 0 };
    w.seats += t.seats; w.votes += t.votes; total += t.votes;
    m.set(t.code, w);
  }
  return { agg: { m, total }, seats: r.seats };
}

/* Which file a Lok Sabha year is drawn from: its constituency file, else its
   state-level file, else nothing ("not available yet"). */
export type LsKind = 'pc' | 'state' | 'missing';
export function lsYearKind(av: Availability, y: number): LsKind {
  if (lsResultsAvailable(av, y)) return 'pc';
  if (lsStateAvailable(av, y)) return 'state';
  return 'missing';
}

/* The India map drills in carrying the year it was showing; honour it when the
   strip has it, otherwise the latest year. */
export const firstLsYear = (years: readonly number[], wanted: number): number =>
  years.includes(wanted) ? wanted : years[years.length - 1];

/* The assembly cycle shown first: the latest one added, else the latest listed. */
export const latestCycle = (cycles: readonly Cycle[]): number | undefined =>
  (cycles.filter(c => c.ok).pop() ?? cycles[cycles.length - 1])?.year;

export const cycleAvailable = (cycles: readonly Cycle[], y: number): boolean =>
  cycles.some(c => c.year === y && c.ok);

/* Seat name → MPLADS constituency_key, mirroring the fetcher's keyify: lowercase,
   drop "(SC)"/"(ST)", then the trailing state abbreviation the MPLADS portal
   appends to seats shared across states ("HAMIRPURUP" → "hamirpur"). */
export function keyify(name: string | undefined, stateCode: string): string {
  const abbr = (stateCode.split('-')[1] || '').toLowerCase();
  let s = String(name || '').toLowerCase().replace(/\(sc\)|\(st\)/g, '');
  s = s.replace(/[^a-z0-9]/g, '');
  if (abbr && s.endsWith(abbr)) s = s.slice(0, -abbr.length);
  return s;
}

export function mpKeysByName(index: MpladsIndex | null, stateCode: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const mp of index?.mps ?? []) m.set(keyify(mp.constituency, stateCode), mp.constituency_key);
  return m;
}

/* ── the tense ────────────────────────────────────────────────────────── */

/* Every Lok Sabha seat of the state keyed by ls_seat_code, with its by-election
   events; under "as it stands" the holder is resolved from them. The tally is
   the table's seat count as it stands (null as elected). */
export function resolvePcSeats(
  pcRows: Record<string, { p: string }>,
  uidToSeat: ReadonlyMap<string, string>,
  byeSeats: readonly ByeSeat[],
  tense: Tense,
): { resolved: Map<string, SeatResolved>; stands: Stands | null } {
  const resolved = new Map<string, SeatResolved>();
  for (const [uid, c] of Object.entries(pcRows)) {
    const seat = uidToSeat.get(uid);
    if (seat) resolved.set(seat, { p: c.p, vacant: false, unknown: false, byeCount: 0, events: [] });
  }
  for (const s of byeSeats) {
    const r = s.seat !== undefined ? resolved.get(s.seat) : undefined;
    if (!r) continue;
    r.events = s.events;
    r.byeCount = s.events.filter(e => e.type === 'bye').length;
    if (tense === 'stands') Object.assign(r, resolveSeat(r.p ?? '', s.events));
  }
  return { resolved, stands: tense === 'stands' ? tallyStands(pcRows, byeSeats) : null };
}

/* "As it stands" has something to show when the Lok Sabha year's by-election
   record, or the shown assembly cycle's current council of ministers, has been
   added. */
export const standsAvailable = (av: Availability, state: string, lsYear: number | null, acYear: number | null): boolean =>
  (lsYear != null && byelAvailable(av, lsYear)) || (acYear != null && stateRoster(av, state, acYear).as_it_stands);

/* A tense asked for in the URL is withdrawn only once both panels have loaded and
   neither has anything to show for it. */
export const tenseAfterLoad = (tense: Tense, loaded: boolean, ok: boolean): Tense =>
  loaded && !ok && tense === 'stands' ? 'elected' : tense;

/* ── the maps ─────────────────────────────────────────────────────────── */

/* A seat's fill and marks. A vacant seat takes the vacancy grey; a seat with no
   known party, or whose party the selection leaves out, drops to the ground.
   By-election marks show only as it stands. */
export function seatPaint(
  party: string | null | undefined,
  r: SeatResolved | null | undefined,
  tense: Tense,
  selection: ReadonlySet<string>,
  colour: (code: string) => string,
): { fill: string; bye: boolean; vacant: boolean } {
  const vacant = !!r?.vacant;
  const bye = tense === 'stands' && !!r && r.byeCount > 0 && !vacant;
  if (vacant) return { fill: 'var(--vacant)', bye, vacant };
  const leftOut = !!party && selection.size > 0 && !selection.has(party);
  return { fill: !party || leftOut ? 'var(--paper-2)' : colour(party), bye, vacant };
}

/* The colour of the whole state on a state-level year: the party that won most
   seats (most votes breaks a tie), or null when no party won a seat. */
export function stateLeader(agg: StateAgg | null): string | null {
  if (!agg) return null;
  let best: [string, Tally] | null = null;
  for (const e of agg.m) {
    if (e[1].seats <= 0) continue;
    if (!best || e[1].seats > best[1].seats || (e[1].seats === best[1].seats && e[1].votes > best[1].votes)) best = e;
  }
  return best ? best[0] : null;
}

/* Candidate lists for the hover cards, keyed as the map's shapes are: a Lok
   Sabha seat by ls_seat_code, an AC by its number (only ACs on the map). */
export function pcCardRows(detail: DetailDoc | null, uidToSeat: ReadonlyMap<string, string>): Map<string, Candidate[]> {
  const rows = new Map<string, Candidate[]>();
  for (const [uid, d] of Object.entries(detail?.constituencies ?? {})) {
    const seat = uidToSeat.get(uid);
    if (seat) rows.set(seat, d.c);
  }
  return rows;
}
export function acCardRows(detail: DetailDoc | null, acNums: ReadonlySet<string>): Map<string, Candidate[]> {
  return new Map(Object.entries(detail?.constituencies ?? {}).filter(([k]) => acNums.has(k)).map(([k, v]) => [k, v.c]));
}

/* Party → its seats on the map, for focusing a party's seats from its row. */
export function seatsByParty(seatParty: ReadonlyMap<string, string | null>): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const [seat, p] of seatParty) {
    if (!p) continue;
    const arr = m.get(p);
    if (arr) arr.push(seat); else m.set(p, [seat]);
  }
  return m;
}

/* ── the tables ───────────────────────────────────────────────────────── */
export type TableRow = { code: string; seats: number; votes: number; share: number; delta: number };

/* Every party that won a seat or polled a vote, sorted. As it stands, seats come
   from the tally and a party holding seats it did not win at the general
   election still gets a row. */
export function tableRows(agg: StateAgg, sort: Sort, stands: Stands | null): TableRow[] {
  const parties = new Map(agg.m);
  if (stands) for (const code of stands.seats.keys()) if (!parties.has(code)) parties.set(code, { seats: 0, votes: 0 });
  const rows = [...parties].map(([code, v]) => ({
    code, votes: v.votes,
    seats: stands ? (stands.seats.get(code) || 0) : v.seats,
    delta: stands ? (stands.delta.get(code) || 0) : 0,
    share: agg.total ? v.votes / agg.total : 0,
  })).filter(r => r.seats > 0 || r.votes > 0);
  return rows.sort((a, b) => sort.dir * (a[sort.key] - b[sort.key]) || b.seats - a.seats);
}

export const pageCountOf = (n: number): number => Math.max(1, Math.ceil(n / PAGE_SIZE));

export const unknownSeatsText = (n: number): string =>
  `${n} seat${n === 1 ? '' : 's'}: by-election result not available yet`;

/* ── captions and "not available yet" ─────────────────────────────────── */

/* The Lok Sabha caption carries the by-election status under "As it stands": a
   count only from a by-election record that exists, and "none" only when that
   record exists and lists none. A state-level year says why there is no
   constituency map. */
export function pcCaption(o: {
  kind: 'pc' | 'state';
  seats: number;
  tense: Tense;
  byeKnown: boolean;
  byeSeats: readonly ByeSeat[];
  regionName: string;
}): string {
  let txt = `${o.seats} seats`;
  if (o.kind === 'state') txt += ' · state-level result: this election’s constituency boundaries predate the atlas map';
  if (o.tense !== 'stands') return txt;
  if (!o.byeKnown) return txt + ' · by-election record not available yet, so seats show as elected';
  const byes = o.byeSeats.reduce((k, s) => k + s.events.filter(e => e.type === 'bye').length, 0);
  return txt + (byes
    ? ` · as it stands · ${byes} by-election${byes === 1 ? '' : 's'} in ${o.regionName}`
    : ` · as it stands · none in ${o.regionName}`);
}

export const missingCaption = (seatCount: number): string => `${seatCount} seats · not available yet`;

export const cabinetPublisher = (stateCode: string, regionName: string, cmoUP: string): string =>
  stateCode === 'IN-UP' ? cmoUP : `the Government of ${regionName}`;

/* The council of ministers for the shown cycle: each tense reads its own roster
   and neither stands in for the other. */
export function beltVoidText(regionName: string, tense: Tense, cycle: number, publisher: string): string {
  return notAvailable(
    `the ${regionName} council of ministers ${tense === 'elected' ? 'as sworn in' : 'as it stands'} for the ${cycle} assembly`,
    publisher);
}

export const beltAsOf = (tense: Tense, doc: CabinetDoc): string =>
  tense === 'stands' ? `as it stands · fetched ${doc.fetchedAt}` : `as sworn in · ${doc.swornIn}`;

