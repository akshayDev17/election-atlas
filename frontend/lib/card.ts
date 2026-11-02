/* The hover card for one seat, built only from that seat's own data. The model
   says whether there is anything to show; when there is not, the page hides the
   card, so a seat never shows another seat's card. The page renders the model;
   nothing here formats markup. */
import type { Tense } from './national.ts';
import type { ByeEvent } from './types.ts';

/* One candidate of a constituency's detailed result. */
export type Candidate = { n: string; p: string; v: number };

/* A Lok Sabha seat under the tense: who holds it, whether it is vacant or its
   holder unknown, and its by-election events (always, under either tense). */
export type SeatResolved = {
  p: string | null;
  vacant: boolean;
  unknown: boolean;
  byeCount: number;
  events: readonly ByeEvent[];
};

export type CardSeat = {
  which: 'ac' | 'pc';
  key: string;
  name: string;
  cands: readonly Candidate[] | undefined;
  r: SeatResolved | null | undefined;
  tense: Tense;
  /* The assembly cycle has not been added. */
  acMissing: boolean;
  /* The AC is listed in the result file's no_result (e.g. a countermanded poll). */
  noResult: boolean;
};

export type CandidateRow = { p: string; n: string; v: number; share: number };

export type CardHead =
  | {
      kind: 'result';
      sub: string;
      name: string;
      candidates: number;
      polled: number;
      rows: CandidateRow[];
      more: { count: number; v: number; share: number } | null;
      winner: { n: string; p: string };
    }
  | { kind: 'noResult'; sub: string; name: string; note: string }
  | { kind: 'acMissing'; sub: string; name: string }
  | { kind: 'noDetail'; sub: string; name: string; note: string };

export type ByeRow =
  | { kind: 'vacated'; date: string; reason: string }
  | { kind: 'unknown'; date: string }
  | { kind: 'won'; date: string; n: string; p: string; v: number; turnout: number | undefined };

export type CardFoot =
  | { kind: 'none' }
  | { kind: 'vacant'; note: string }
  | { kind: 'byes'; rows: ByeRow[] };

export type CardModel = { show: false } | { show: true; head: CardHead; foot: CardFoot };

export const CARD_ROWS = 6;
export const NO_RESULT_NOTE = 'Result not available yet (countermanded or not in this report)';
export const NO_DETAIL_NOTE = 'Candidate detail not available yet for this year';
export const VACANT_NOTE = 'Seat vacant — no by-election has been held.';

const subFor = (which: 'ac' | 'pc') => (which === 'ac' ? 'Assembly constituency' : 'Lok Sabha constituency');

export function cardModel(seat: CardSeat): CardModel {
  const { which, key, name, cands, r, tense, acMissing, noResult } = seat;
  const byes = r?.events ?? [];
  const hasCands = !!cands && cands.length > 0;
  if (!hasCands && !byes.length && !r?.vacant && !acMissing && !noResult) return { show: false };

  let head: CardHead;
  if (hasCands) {
    const total = cands.reduce((n, c) => n + c.v, 0);
    const share = (v: number) => (total ? v / total : 0);
    const rest = cands.slice(CARD_ROWS);
    const restV = rest.reduce((n, c) => n + c.v, 0);
    head = {
      kind: 'result', sub: subFor(which), name,
      candidates: cands.length, polled: total,
      rows: cands.slice(0, CARD_ROWS).map(c => ({ p: c.p, n: c.n, v: c.v, share: share(c.v) })),
      more: rest.length ? { count: rest.length, v: restV, share: share(restV) } : null,
      winner: { n: cands[0].n, p: cands[0].p },
    };
  } else if (noResult) {
    /* The report carries no result for this AC: its own name and number, and
       that the result is not available yet. */
    head = { kind: 'noResult', sub: `Assembly constituency ${key}`, name, note: NO_RESULT_NOTE };
  } else if (acMissing) {
    /* The cycle has not been added: the seat's name, and nothing that would read
       as a result. */
    head = { kind: 'acMissing', sub: 'Assembly constituency', name };
  } else {
    head = { kind: 'noDetail', sub: subFor(which), name, note: NO_DETAIL_NOTE };
  }

  let foot: CardFoot = { kind: 'none' };
  if (r?.vacant && tense === 'stands') foot = { kind: 'vacant', note: VACANT_NOTE };
  else if (byes.length && tense === 'stands') {
    foot = {
      kind: 'byes',
      rows: byes.map((ev): ByeRow => {
        if (ev.type === 'vacated') return { kind: 'vacated', date: ev.date, reason: ev.reason ?? '' };
        const w = ev.winner;
        if (!w) return { kind: 'unknown', date: ev.date };
        return { kind: 'won', date: ev.date, n: w.n, p: w.p, v: w.v, turnout: ev.turnout };
      }),
    };
  }
  return { show: true, head, foot };
}
