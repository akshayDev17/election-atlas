/* The member-of-Parliament page's data adapters: which seat a query names, who
   holds it on the page's evidence, the MPLADS fund and works, the Lok Sabha
   record, and the assembly seats under the constituency. Every function takes
   its inputs explicitly and returns what the page renders; nothing here fetches
   or holds state. */
import { notAvailable, titleCase } from './atlas.ts';

/* ── the data files this page reads (fields it uses only) ─────────────── */

/* parliament/{S}/{c}.json: the member's Lok Sabha record from sansad.in. */
export type Bill = { billNumber?: string | number | null; billName?: string; introducedOn?: string; status?: string; sourceUrl?: string };
export type Question = {
  questionNumber?: number;
  subject?: string;
  ministry?: string;
  type?: string;
  date?: string;
  pdfUrl?: string;
  sourceUrl?: string;
  replyText?: string;
};
export type ParliamentDoc = {
  mpsno?: number | string;
  profile?: { name?: string; party?: string; constituency?: string; state?: string; dateOfBirth?: string };
  attendance?: { signedDays?: number; totalDays?: number };
  bills?: Bill[];
  questions?: Question[];
};

/* mplads/{S}/{c}.json: the eSAKSHI portal's tiles, charts and works ledger. */
export type Work = {
  category?: string;
  description?: string;
  agency?: string;
  recommended_amount?: number;
  stage?: string;
  recommended_date?: string;
};
export type MpladsDoc = {
  tiles?: Record<string, unknown[]>;
  charts?: Record<string, Record<string, number | string>>;
  works?: Work[];
};

/* results/ls/detail/2024.json: every candidate in each seat. */
export type Candidate = { n: string; p: string; v: number };
export type DetailDoc = { constituencies: Record<string, { pc?: string; c: Candidate[] }> };

/* members/ls/2024.json: each seat's 2024 winner with their Sansad member number. */
export type LsMember = { name?: string; party?: string; mpsno?: number | string };
export type MembersDoc = { members?: Record<string, LsMember> };

/* geo/ls/{S}.json and geo/ac/{S}.json: only the properties the page reads. */
export type PcGeomProps = { ls_seat_name: string; unique_id: string };
export type AcGeomProps = { ac: string; no?: number; pc?: string };
type TopoWith<K extends string, P> = { objects?: Partial<Record<K, { geometries?: { properties?: P }[] }>> };
export type PcTopo = TopoWith<'pcs', PcGeomProps>;
export type AcTopo = TopoWith<'acs', AcGeomProps>;

/* ── the query ────────────────────────────────────────────────────────── */
export const DEFAULT_STATE = 'IN-UP';
export const DEFAULT_SEAT = 'gorakhpur';

export function parseQuery(search: string): { S: string; C: string } {
  const qs = new URLSearchParams(search);
  return {
    S: (qs.get('s') || DEFAULT_STATE).toUpperCase(),
    C: (qs.get('c') || DEFAULT_SEAT).toLowerCase(),
  };
}

/* ── which seat ───────────────────────────────────────────────────────── *
 * The constituency key resolves to a seat through the state's own geometry, with
 * the fold the state page uses to link here (lowercase, no (SC)/(ST), no
 * trailing state abbreviation); the seat's unique_id then joins the 2024 result.
 * That never depends on how the result file spells the name ("Baharaich"). */
export const fold = (s: string | undefined | null): string =>
  String(s || '').toLowerCase().replace(/\(sc\)|\(st\)/g, '').replace(/[^a-z0-9]/g, '');

export function seatFold(name: string, state: string): string {
  const abbr = (state.split('-')[1] || '').toLowerCase();
  const k = fold(name);
  return abbr && k.endsWith(abbr) ? k.slice(0, -abbr.length) : k;
}

export function findSeat(topo: PcTopo | null, state: string, key: string): PcGeomProps | null {
  const geoms = topo?.objects?.pcs?.geometries ?? [];
  const g = geoms.find(x => x.properties && (seatFold(x.properties.ls_seat_name, state) === key || fold(x.properties.ls_seat_name) === key));
  return g?.properties ?? null;
}

/* The candidate with most votes in the seat, or null when the result file has no
   such seat. */
export function winnerOf(results: DetailDoc | null, seatKey: string): Candidate | null {
  const seat = seatKey && results ? results.constituencies[seatKey] : undefined;
  if (!seat || !seat.c.length) return null;
  return [...seat.c].sort((a, b) => b.v - a.v)[0];
}

/* ── who, and on what evidence ────────────────────────────────────────── *
 * With the Sansad record the page names the sitting member and their age. With
 * only the 2024 result it names who won the seat at that general election, and
 * says so: a later by-election would not be reflected. With neither it says the
 * result is not available yet, and names nobody. */
export type Evidence = 'record' | 'winner' | 'none';
export type Member = {
  evidence: Evidence;
  constituency: string;
  stateName: string;
  name: string;          // the raw name the monogram is drawn from ('' when none)
  displayName: string;   // honorific dropped, title case
  party: string;         // party code ('' when none)
  mpsno: string;
  nameLine: string;
  roleLine: string;
  profileURL: string;
};

export const stripHonorific = (name: string): string => titleCase(String(name).replace(/^(shri|smt|dr|prof)\.?\s+/i, ''));

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Age in whole years on `now` from a sansad.in date of birth ("17-Jul-1969");
   '' when the date cannot be read. */
export function ageFrom(dob: string | undefined, now: Date): number | '' {
  const m = String(dob || '').match(/(\d{1,2})-(\w{3})-(\d{4})/);
  if (!m) return '';
  const month = Math.max(0, MONTHS.indexOf(m[2]));
  const d = new Date(+m[3], month, +m[1]);
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a;
}

export function resolveMember(input: {
  key: string;
  par: ParliamentDoc | null;
  seat: PcGeomProps | null;
  winner: Candidate | null;
  lsMember: LsMember | null;
  regionName: string;
  now: Date;
}): Member {
  const { key, par, seat, winner, lsMember, regionName, now } = input;
  const profile = par?.profile ?? {};
  const name = profile.name || (winner ? winner.n : '');
  const mpsno = String(par?.mpsno || lsMember?.mpsno || '');
  const evidence: Evidence = par ? 'record' : winner ? 'winner' : 'none';
  const displayName = stripHonorific(name);
  return {
    evidence,
    constituency: profile.constituency || (seat ? seat.ls_seat_name : key),
    stateName: profile.state || regionName,
    name,
    displayName,
    party: profile.party || (winner ? winner.p : ''),
    mpsno,
    nameLine: evidence === 'none' ? 'Result not available yet' : displayName,
    roleLine: evidence === 'record' ? `MP · Lok Sabha · Age ${ageFrom(profile.dateOfBirth, now)}`
      : evidence === 'winner' ? 'Won the seat · 2024 general election'
      : 'Member of Parliament · Lok Sabha',
    profileURL: mpsno ? `https://sansad.in/ls/members/biography/${mpsno}?locale=en` : 'https://sansad.in/ls/members',
  };
}

export function caveatText(hasRecord: boolean, hasMplads: boolean): string {
  const sources = [
    hasRecord ? 'the Lok Sabha record (sansad.in)' : 'the 2024 result (Election Commission of India)',
    hasMplads ? 'MPLADS (eSAKSHI portal)' : null,
  ].filter(Boolean);
  return `Figures from official sources: ${sources.join(' and ')}. ` +
    (hasRecord ? 'Every question and bill links to its official document. ' : '') +
    'Where a section says “not available yet”, that data has not been added.';
}

export const MPLADS_MISSING = notAvailable('this member’s MPLADS record', 'the eSAKSHI MPLADS portal');
export const RECORD_MISSING = notAvailable('this member’s Sansad record', 'the Lok Sabha Secretariat (sansad.in)');

/* ── MPLADS ───────────────────────────────────────────────────────────── */
export const cr = (v: number): string => '₹' + (v / 1e7).toFixed(2) + ' Cr';
const clampPct = (pct: number): number => Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));

/* A portal tile is [count?, rupees, "x.xx Crore"]: a count only when it has
   three entries; the crore string is always last. */
export function tile(doc: MpladsDoc, key: string): { count: string | null; rupees: number | null; crore: string } {
  const a = doc.tiles?.[key] ?? [];
  const rupees = a.length >= 2 ? parseFloat(String(a[a.length - 2]).replace(/,/g, '')) : NaN;
  return {
    count: a.length >= 3 ? String(a[0]) : null,
    rupees: Number.isFinite(rupees) ? rupees : null,
    crore: a.length ? String(a[a.length - 1] ?? '') : '',
  };
}

export type FundStep = { k: string; v: string; s?: string };
export type Gauge = { id: 'fun' | 'work'; pct: number; cap: string; sub: string };
export type BarRow = { label: string; value: number; pct: number; cls: '' | 'mid' | 'lo' };
export type Fund = {
  steps: FundStep[];
  gauges: Gauge[];
  panels: { k: string; rows: BarRow[] }[];
};

export function fundModel(doc: MpladsDoc): Fund {
  const allocated = tile(doc, 'Allocated Limit for Hon\'ble MPs').crore;
  const expen = tile(doc, 'Expenditure on Completed and On-going Works as on Date').crore;
  const rec = tile(doc, 'Works Recommended');
  const sanc = tile(doc, 'Works Sanctioned');
  const comp = tile(doc, 'Works Completed');
  const steps: FundStep[] = [
    { k: 'Allocated limit', v: allocated },
    { k: 'Recommended', v: rec.count ?? '', s: rec.crore },
    { k: 'Sanctioned', v: sanc.count ?? '', s: sanc.crore },
    { k: 'Completed', v: comp.count ?? '', s: comp.crore },
    { k: 'Expenditure', v: expen },
  ];
  const gauges: Gauge[] = [
    { id: 'fun', pct: clampPct(100 * (parseFloat(expen) / parseFloat(allocated))), cap: 'Fund utilised', sub: `${expen} of ${allocated}` },
    { id: 'work', pct: clampPct(100 * (parseFloat(comp.count || '0') / parseFloat(rec.count || '1'))), cap: 'Works completed', sub: `${comp.count ?? ''} of ${rec.count ?? ''}` },
  ];

  /* Each bar is its amount's share of the total recommended (the Works
     Recommended tile, in rupees). Without that total no bar is drawn. */
  const ch = doc.charts ?? {};
  const num = (o: Record<string, number | string> | undefined, k: string): number => Number(o?.[k]) || 0;
  const loc = ch['Location wise Development Work Recommendation'];
  const st = ch['Development Work Recommendation Status'];
  const cat = ch['Work Category wise Development Work Recommendation'];
  const total = rec.rupees;
  const row = (label: string, value: number, cls: BarRow['cls'] = ''): BarRow =>
    ({ label, value, pct: total ? clampPct(100 * value / total) : 0, cls });
  return {
    steps,
    gauges,
    panels: [
      { k: 'Location', rows: [row('🏙️ Urban', num(loc, 'Urban')), row('🌾 Rural', num(loc, 'Rural'))] },
      { k: 'Status', rows: [
        row('⏳ Unsanctioned', num(st, 'Unsanctioned')),
        row('🚧 On going', num(st, 'On Going'), 'mid'),
        row('✅ Completed', num(st, 'Completed'), 'lo'),
      ] },
      { k: 'Category', rows: [row('Normal / others', num(cat, 'Normal and Others'))] },
    ],
  };
}

/* ── works ledger ─────────────────────────────────────────────────────── */
export const WORK_FILTERS = ['All', 'Pending', 'Partially', 'Completed'] as const;
export type WorkFilter = typeof WORK_FILTERS[number];

export function stageKey(stage: string | undefined): 'partial' | 'done' | 'pending' {
  const s = (stage || '').toLowerCase();
  if (s.includes('partially')) return 'partial';
  if (s.includes('complete')) return 'done';
  return 'pending';
}
export const stageLabel = (stage: string | undefined): string => titleCase((stage || '').replace(/^work\s+/, ''));

/* A filter matches on the stage's own words, so "Completed" also takes
   "Work partially Completed", as the portal's wording does. */
export const filterWorks = (works: readonly Work[], filter: WorkFilter): Work[] =>
  filter === 'All' ? [...works] : works.filter(w => (w.stage || '').toLowerCase().includes(filter.toLowerCase()));

export const WORKS_PAGE = 5;
export const QUESTIONS_PAGE = 10;

/* One page of rows: the requested page clamped into range, its rows, and the
   page count (at least 1). */
export function pageOf<T>(rows: readonly T[], page: number, size: number): { page: number; count: number; rows: T[] } {
  const count = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.max(0, Math.min(page, count - 1));
  return { page: p, count, rows: rows.slice(p * size, p * size + size) };
}

/* ── the Lok Sabha record ─────────────────────────────────────────────── */
export const GOOD_ATTENDANCE = 85;

export function recordModel(par: ParliamentDoc) {
  const att = par.attendance ?? {};
  const attPct = att.totalDays ? 100 * (att.signedDays ?? 0) / att.totalDays : 0;
  const questions = (par.questions ?? []).map(q => ({
    ...q, subject: String(q.subject || '').trim(), ministry: String(q.ministry || '').trim(),
  }));
  const starred = questions.filter(q => q.type === 'STARRED').length;
  return {
    attPct,
    attGood: attPct >= GOOD_ATTENDANCE,
    signedDays: att.signedDays,
    totalDays: att.totalDays,
    bills: par.bills ?? [],
    questions,
    starred,
    unstarred: questions.length - starred,
  };
}

export const QUESTION_FILTERS = ['All', 'Starred', 'Unstarred'] as const;
export type QuestionFilter = typeof QUESTION_FILTERS[number];
export const filterQuestions = <T extends { type?: string }>(qs: readonly T[], filter: QuestionFilter): T[] =>
  filter === 'All' ? [...qs] : qs.filter(q => q.type === filter.toUpperCase());

/* "12.08.2026" → "12 Aug 2026"; anything else unchanged. */
export function fmtDate(s: string | undefined): string {
  const m = String(s || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return m ? `${+m[1]} ${MONTHS[+m[2] - 1]} ${m[3]}` : (s ?? '');
}

/* The minister's letterhead (name line, then a bracketed line) is split off the
   reply, so the clamped preview shows the reply itself. */
export function splitReply(rt: string | undefined): { who: string; body: string } {
  const lines = String(rt || '').split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length >= 2 && /^\([^)]*\)$/.test(lines[1])) return { who: lines[0] + ' ' + lines[1], body: lines.slice(2).join('\n') };
  return { who: '', body: lines.join('\n') };
}

/* An answer is shown only when its body is more than a fragment. */
export function answerOf(rt: string | undefined): { label: string; body: string } | null {
  const r = splitReply(rt);
  if (!r.body || r.body.length <= 40) return null;
  return { label: r.who ? 'Answer · ' + titleCase(r.who) : 'Answer', body: r.body };
}

/* ── assembly seats ───────────────────────────────────────────────────── *
 * null when the state's assembly geometry is not mapped; otherwise the seats
 * whose parliamentary constituency folds to this one, in seat-number order. */
export function assemblySeats(topo: AcTopo | null, constituency: string): AcGeomProps[] | null {
  const acs = topo?.objects?.acs;
  if (!acs) return null;
  return (acs.geometries ?? [])
    .map(g => g.properties)
    .filter((p): p is AcGeomProps => !!p && fold(p.pc) === fold(constituency))
    .sort((a, b) => (a.no || 0) - (b.no || 0));
}
