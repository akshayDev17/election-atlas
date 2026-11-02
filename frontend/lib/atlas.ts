/* Shared by the four atlas pages: optional data, the "not available yet" state,
   and member monograms. */
import type { Availability, Region, Roster, StateYearDoc } from './types.ts';

export type Optional<T> = { ok: true; doc: T } | { ok: false; reason: 'absent' | 'error' };

/* A data file that may legitimately be missing. Never throws:
     { ok: true, doc }               the file, parsed
     { ok: false, reason: 'absent' } the server answered 404
     { ok: false, reason: 'error' }  a network failure, another status, or bad JSON */
export async function fetchOptional<T = unknown>(url: string): Promise<Optional<T>> {
  let r: Response;
  try { r = await fetch(url); } catch { return { ok: false, reason: 'error' }; }
  if (r.status === 404) return { ok: false, reason: 'absent' };
  if (!r.ok) return { ok: false, reason: 'error' };
  try { return { ok: true, doc: (await r.json()) as T }; } catch { return { ok: false, reason: 'error' }; }
}

/* data/availability.json says which optional files exist, so a page never has to
   probe for one. If the index itself cannot be read, every optional file reads
   as not available: the page shows "not available yet" rather than guessing. */
export async function loadAvailability(dataRoot: string): Promise<Availability> {
  const res = await fetchOptional<Availability>(dataRoot + 'availability.json');
  return res.ok ? res.doc : {};
}

const NO_ROSTER: Roster = { sworn_in: false, as_it_stands: false };

export const byelAvailable = (av: Availability, year: number | string): boolean => !!av.ls?.byel?.[year];
export const lsDetailAvailable = (av: Availability, year: number | string): boolean => !!av.ls?.detail?.[year];
/* The year's constituency-level Lok Sabha result (results/ls/pc/{year}.json). */
export const lsResultsAvailable = (av: Availability, year: number | string): boolean => !!av.ls?.results?.[year];
/* The year's state-level Lok Sabha result (results/ls/{year}.json). */
export const lsStateAvailable = (av: Availability, year: number | string): boolean => !!av.ls?.state?.[year];
export const unionRoster = (av: Availability, year: number | string): Roster => av.cabinet?.union?.[year] ?? NO_ROSTER;
export const stateRoster = (av: Availability, state: string, cycle: number | string): Roster =>
  av.cabinet?.state?.[state]?.[cycle] ?? NO_ROSTER;
/* The state's real assembly cycles, oldest first, each with whether it is present. */
export const acCycles = (av: Availability, state: string): { year: number; ok: boolean }[] =>
  Object.entries(av.ac?.[state]?.cycles ?? {})
    .map(([y, ok]) => ({ year: Number(y), ok: !!ok }))
    .sort((a, b) => a.year - b.year);
export const listed = (av: Availability, kind: 'parliament' | 'mplads', state: string, key: string): boolean =>
  !!av[kind]?.[state]?.includes(key);
export const membersAvailable = (av: Availability, year: number | string): boolean => !!av.members?.ls?.[year];

/* ── states formed after an election ─────────────────────────────────
   A state carved out of another (regions.json `formedFrom`) has no entry of its
   own in a state-level year held before it existed: its seats were counted in
   the state it was formed from, and the two outlines are one result. Which years
   that holds for is read from each year's file, never listed. */
export const parentsOf = (regions: readonly Region[]): Map<string, string> =>
  new Map(regions.flatMap(r => (r.formedFrom ? [[r.code, r.formedFrom] as [string, string]] : [])));

/* The entry of a state-level year's file that holds a present-day state's result:
   the state's own, else the state it was formed from when the file has that one
   instead; null when the file holds neither. */
export function resultRegion(year: StateYearDoc, code: string, parents: ReadonlyMap<string, string>): string | null {
  if (year.regions[code]) return code;
  const parent = parents.get(code);
  return parent && year.regions[parent] ? parent : null;
}

/* The present-day states whose result that year is counted in `code`'s entry. */
export const formedLater = (year: StateYearDoc, code: string, parents: ReadonlyMap<string, string>): string[] =>
  [...parents.keys()].filter(s => s !== code && resultRegion(year, s, parents) === code);

export const partOfText = (parent: string, year: number): string => `Part of ${parent} in ${year}`;

/* What a state-level seat count covers when it is not the present outline's own:
   the whole state it was part of, or the present-day states it included. */
export const coverNote = (partOf: string | null, includes: readonly string[]): string =>
  partOf ? ` across ${partOf}` : includes.length ? `, including present-day ${includes.join(', ')}` : '';

/* The one sentence a view shows when its data has not been added. It names what
   is missing and who publishes it; it never shows a number, a name or a zero. */
export const notAvailable = (what: string, publisher: string, verb = 'has'): string =>
  `Not available yet — ${what} ${verb} not been added from ${publisher}.`;

export const ECI = 'the Election Commission of India';
export const PRESIDENT = 'the President’s Secretariat';
export const CMO_UP = 'the Chief Minister’s Office, Uttar Pradesh';

/* ── formatting ───────────────────────────────────────────────────────── */
export const nf = (n: number): string => Math.round(n).toLocaleString('en-IN');
export const pc1 = (n: number): string => (n * 100).toFixed(1) + '%';
export const titleCase = (s: string | undefined | null): string =>
  (s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

/* ── members: initials, never a stored portrait ────────────────────────
   The atlas keeps no member photographs. A member is shown as their initials on
   their party's colour, with a link to their official page on sansad.in, where
   the photograph is published. */
export const initials = (name: string | undefined | null): string =>
  String(name || '').replace(/^(shri|smt|dr|prof)\.?\s+/i, '').split(/[\s,]+/)
    .filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

/* Dark or light lettering, whichever reads on the party colour (#rgb or #rrggbb). */
export function inkOn(colour: string | undefined | null): string {
  let h = String(colour || '').replace('#', '');
  if (h.length === 3) h = h.replace(/./g, c => c + c);
  if (!/^[0-9a-f]{6}$/i.test(h)) return '';
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#1a1a1a' : '#ffffff';
}

export const SANSAD_RS_MINISTERS = 'https://sansad.in/rs/members/in-council-of-ministers';

/* The member's official page on sansad.in: a Lok Sabha member's biography by their
   Sansad member number (mpsno); a Rajya Sabha minister, whose per-member page the
   atlas holds no id for, the Rajya Sabha list of ministers. '' when neither is
   known: the link is left out rather than pointed at a guess. */
export function sansadMemberURL(house: string | undefined | null, mpsno: number | string | undefined | null): string {
  if (house === 'rs') return SANSAD_RS_MINISTERS;
  return /^\d+$/.test(String(mpsno ?? ''))
    ? `https://sansad.in/ls/members/biography/${mpsno}?locale=en` : '';
}
