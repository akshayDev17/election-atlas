/* The national page's arithmetic: every figure it shows is derived here from the
   published counts, in one pass, with no state. The page holds the inputs (year,
   tense, query, sort) and renders what these return. */
import type { ByeDoc, Minister, Party, PcYearDoc, StateYearDoc } from './types.ts';

export type Tense = 'elected' | 'stands';
export type Tally = { seats: number; votes: number };
export type Aggregate = {
  byRegion: Map<string, Map<string, Tally>>;
  national: Map<string, Tally>;
  totalVotes: number;
};

const bump = (m: Map<string, Tally>, code: string, seats: number, votes: number) => {
  const w = m.get(code) || { seats: 0, votes: 0 };
  w.seats += seats; w.votes += votes; m.set(code, w);
};

/* The constituency file carries counts; seats and votes per region and
   nationally are summed from it. Parties that polled in a constituency but won
   nothing still count their votes. */
export function aggregate(year: PcYearDoc): Aggregate {
  const byRegion = new Map<string, Map<string, Tally>>();
  const national = new Map<string, Tally>();
  let totalVotes = 0;
  for (const c of Object.values(year.constituencies)) {
    let m = byRegion.get(c.st);
    if (!m) byRegion.set(c.st, m = new Map());
    bump(m, c.p, 1, c.v);
    bump(national, c.p, 1, c.v);
    totalVotes += c.v;
    for (const [code, v] of Object.entries(c.o || {})) {
      bump(m, code, 0, v);
      bump(national, code, 0, v);
      totalVotes += v;
    }
  }
  return { byRegion, national, totalVotes };
}

/* The same aggregate from the state-level file, the only Lok Sabha result for
   an election whose boundaries predate the atlas geometry. */
export function aggregateStates(doc: StateYearDoc): Aggregate {
  const byRegion = new Map<string, Map<string, Tally>>();
  const national = new Map<string, Tally>();
  let totalVotes = 0;
  for (const [code, r] of Object.entries(doc.regions)) {
    const m = new Map<string, Tally>();
    byRegion.set(code, m);
    for (const t of r.parties) {
      bump(m, t.code, t.seats, t.votes);
      bump(national, t.code, t.seats, t.votes);
      totalVotes += t.votes;
    }
  }
  return { byRegion, national, totalVotes };
}

/* The party that won most seats in a region (most votes breaks a tie), or null
   when the region has no result: the colour of a state on a state-level map. */
export function regionLeader(m: Map<string, Tally> | undefined): string | null {
  if (!m) return null;
  let best: [string, Tally] | null = null;
  for (const e of m) {
    if (e[1].seats <= 0) continue;
    if (!best || e[1].seats > best[1].seats || (e[1].seats === best[1].seats && e[1].votes > best[1].votes)) best = e;
  }
  return best ? best[0] : null;
}

/* ── the tense: as elected / as it stands ──────────────────────────────── *
 * A seat's state under the tense: the party to fill, whether it is now vacant,
 * whether its holder is unknown (a by-election whose result is not available),
 * and how many by-elections it has had. */
export type Resolved = { p: string | null; vacant: boolean; unknown: boolean; byeCount: number };

export function resolveSeats(year: PcYearDoc | null, bye: ByeDoc | null, tense: Tense): Map<string, Resolved> {
  const resolved = new Map<string, Resolved>();
  if (!year) return resolved;
  for (const [uid, c] of Object.entries(year.constituencies)) {
    resolved.set(uid, { p: c.p, vacant: false, unknown: false, byeCount: 0 });
  }
  for (const seat of bye?.seats ?? []) {
    const r = resolved.get(seat.uid);
    if (!r) continue;
    const byes = seat.events.filter(e => e.type === 'bye');
    r.byeCount = byes.length;
    if (tense !== 'stands') continue;
    const last = seat.events[seat.events.length - 1];
    if (last && last.type === 'vacated') { r.p = null; r.vacant = true; }
    else if (byes.length) {
      const w = (byes[byes.length - 1] as Extract<typeof byes[number], { type: 'bye' }>).winner;
      r.p = w ? w.p : null;
      r.unknown = !w;
    }
  }
  return resolved;
}

/* Seats as they stand under the tense, and the net change per party against
   the general election. An unknown seat counts for no party and changes none. */
export function seatMaps(year: PcYearDoc | null, resolved: Map<string, Resolved>) {
  const standsSeats = new Map<string, number>();
  for (const r of resolved.values()) if (r.p) standsSeats.set(r.p, (standsSeats.get(r.p) || 0) + 1);
  const deltaByParty = new Map<string, number>();
  if (year) {
    for (const [uid, c] of Object.entries(year.constituencies)) {
      const r = resolved.get(uid);
      if (!r || r.unknown || r.p === c.p) continue;
      deltaByParty.set(c.p, (deltaByParty.get(c.p) || 0) - 1);
      if (r.p) deltaByParty.set(r.p, (deltaByParty.get(r.p) || 0) + 1);
    }
  }
  for (const [p, d] of deltaByParty) if (!d) deltaByParty.delete(p);
  return { standsSeats, deltaByParty };
}

/* ── search ───────────────────────────────────────────────────────────── */
const norm = (s: string | undefined | null) => (s || '').toLowerCase();

/* A party matches a query on its code, name or any alias; a party outside the
   vocabulary matches on its code. An empty query matches everything. */
export function partyMatches(query: string, code: string, partyByCode: Map<string, Party>): boolean {
  if (!query) return true;
  const q = norm(query);
  const p = partyByCode.get(code);
  if (p) return [p.code, p.name, ...(p.aliases || [])].some(t => norm(t).includes(q));
  return norm(code).includes(q);
}

export function memberMatches(query: string, m: Minister): boolean {
  if (!query) return true;
  const q = norm(query);
  return [m.name, m.portfolio, m.role, m.constituency].filter(Boolean).map(norm).join(' ').includes(q);
}

/* ── the national table ───────────────────────────────────────────────── *
 * Hundreds of party codes poll nationally, so the table's cut is explicit: hold
 * a seat, OR poll half a percent. Both clauses are needed: a seats-only cut
 * would drop parties that polled in the millions and won nothing. */
export const NAT_MIN_SHARE = 0.005;
export const PAGE_SIZE = 10;
export type SortKey = 'seats' | 'votes' | 'share';
export type Sort = { key: SortKey; dir: 1 | -1 };
export const NAT_DEFAULT: Sort = { key: 'seats', dir: -1 };
export type NatRow = { code: string; seats: number; votes: number; share: number; delta: number };

export function nationalRows(opts: {
  agg: Aggregate | null;
  tense: Tense;
  standsSeats: Map<string, number>;
  deltaByParty: Map<string, number>;
  sort: Sort;
  matches?: (code: string) => boolean;
}): NatRow[] {
  const { agg, tense, standsSeats, deltaByParty, sort, matches } = opts;
  const total = agg ? agg.totalVotes : 0;
  const stands = tense === 'stands';
  const parties = new Map<string, Tally>(agg ? agg.national : []);
  if (stands) for (const code of standsSeats.keys()) if (!parties.has(code)) parties.set(code, { seats: 0, votes: 0 });
  let rows = [...parties]
    .map(([code, v]) => ({
      code,
      seats: stands ? (standsSeats.get(code) || 0) : v.seats,
      votes: v.votes,
      share: total ? v.votes / total : 0,
      delta: deltaByParty.get(code) || 0,
    }))
    .filter(r => r.seats > 0 || r.share >= NAT_MIN_SHARE);
  if (matches) rows = rows.filter(r => matches(r.code));
  return rows.sort((a, b) => sort.dir * (a[sort.key] - b[sort.key]) || b.seats - a.seats || b.votes - a.votes);
}

/* Page numbers under the table: every page when there are few, otherwise a
   window around the current page with the ends kept and gaps marked. */
export function pageList(p: number, count: number): (number | '…')[] {
  if (count <= 7) return [...Array(count).keys()];
  const pages = [...new Set([0, count - 1, p - 1, p, p + 1])]
    .filter(i => i >= 0 && i < count).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) out.push('…');
    out.push(pages[i]);
  }
  return out;
}

/* "No match" and "matched, but below this table's cut" are different facts: a
   query can hit a real party that neither won a seat nor polled 0.5%. */
export function belowCutMessage(agg: Aggregate | null, query: string, matches: (code: string) => boolean): string {
  if (!query || !agg) return 'No party matches your search.';
  const below = [...agg.national.keys()].filter(matches);
  if (!below.length) return 'No party matches your search.';
  return below.length === 1
    ? `${below[0]} polled below 0.5% and won no seats.`
    : `${below.length} parties polled below 0.5% and won no seats.`;
}

/* The map's status line for a constituency-level year. Without a by-election
   record the seats are the general-election result under either tense, and the
   line says so; only a by-election file that lists no events can say there were
   none. */
export function byeNote(y: number, tense: Tense, bye: ByeDoc | null, resolved: Map<string, Resolved>): string {
  if (!bye) {
    return tense === 'elected'
      ? `As elected · ${y} · by-election record not available yet`
      : `As it stands · ${y} · by-election record not available yet, so seats show as elected`;
  }
  if (tense === 'elected') return `As elected · ${y}`;
  const seats = bye.seats || [];
  const byes = seats.reduce((n, s) => n + s.events.filter(e => e.type === 'bye').length, 0);
  const vacant = [...resolved.values()].filter(r => r.vacant).length;
  if (!byes && !vacant) return `As it stands · ${y} — no by-elections on record`;
  const dates = seats.flatMap(s => s.events.map(e => e.date)).sort();
  const lastDate = dates.length ? dates[dates.length - 1] : '';
  const unknown = seats.reduce((n, s) => n + s.events.filter(e => e.type === 'bye' && !e.winner).length, 0);
  const unknownTxt = unknown ? ` (${unknown} result${unknown === 1 ? '' : 's'} not available yet)` : '';
  return `As it stands · ${byes} by-election${byes === 1 ? '' : 's'}${unknownTxt} · ${vacant} vacant · as of ${lastDate}`;
}

/* ── the council of ministers ─────────────────────────────────────────── *
 * Ministries are long and stackable ("Minister of X; and Minister of Y"), so a
 * card shows a compacted first ministry and a "+N" count; the full list is the
 * hover readout. Splitting on ';' and dropping a leading "and" normalises the
 * two spellings the source prints. */
export const portfolioList = (p: string | undefined): string[] =>
  (p || '').split(';').map(s => s.trim().replace(/^and\s+/i, '')).filter(Boolean);

export const shortMinistry = (m: string | undefined): string => (m || '')
  .replace(/^Minister of State \(Independent Charge\) of the Ministry of\s*/i, '')
  .replace(/^Minister of State in the Ministry of\s*/i, '')
  .replace(/^Minister of State in the\s*/i, '')
  .replace(/^Minister of\s*/i, '')
  .split(',')[0].trim();

export function compactPortfolio(p: string | undefined): { main: string; plus: number } {
  const list = portfolioList(p);
  if (!list.length) return { main: '', plus: 0 };
  return { main: shortMinistry(list[0]), plus: list.length - 1 };
}

export const RANK_LABEL: Record<string, string> = {
  pm: 'Prime Minister', cabinet: 'Cabinet Minister',
  'mos-ic': 'Minister of State (Independent Charge)', mos: 'Minister of State',
};

const RANK_ORDER: Record<string, number> = { pm: 0, cm: 0, cabinet: 1, 'mos-ic': 2, mos: 3 };

/* Rank first (Prime Minister, Cabinet, MoS (IC), MoS), then name. */
export const sortMinisters = (members: readonly Minister[]): Minister[] =>
  [...members].sort((a, b) =>
    (RANK_ORDER[a.rank ?? ''] ?? 9) - (RANK_ORDER[b.rank ?? ''] ?? 9) || (a.name || '').localeCompare(b.name || ''));

/* A minister's seat line: their constituency, or the Rajya Sabha when they sit
   there for a state. */
export const seatLabel = (m: Minister): string => m.constituency || (m.state ? 'Rajya Sabha' : '');
