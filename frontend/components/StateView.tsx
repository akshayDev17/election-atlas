'use client';
/* The state page: one state under two grids, its legislative assembly seats on
   the left and its Lok Sabha seats on the right, each on its own timeline, with
   each constituency's own result on hover, a seat table under each map, and the
   state council of ministers under the assembly. The two panels never share a
   year, a selection or a focus: they are different elections on different
   cycles. */
import { geoMercator, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import {
  memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react';
import {
  countOf, CMO_UP, ECI, acCycles, byelAvailable, fetchOptional, getListed, loadAvailability, lsDetailAvailable,
  lsStateAvailable, membersAvailable, nf, notAvailable, parentsOf, partOfText, pc1, seatFold, shownState, stateRoster, titleCase,
} from '@/lib/atlas';
import { DATA, pageURL } from '@/lib/base';
import { cardModel, type Candidate, type CardFoot, type CardHead, type SeatResolved } from '@/lib/card';
import { memberMatches, regionLeader, seatLabel, sortMinisters, type Sort, type SortKey, type Tense } from '@/lib/national';
import {
  DEFAULT_SORT, MEMBER_YEAR, PAGE_SIZE, acCardRows, aggregateFrom, aggregateStateLevel, beltAsOf, beltVoidText,
  cabinetPublisher, cycleAvailable, firstLsYear, latestCycle, lsVoid, lsYearKind, missingCaption, mpKeysByName,
  pageCountOf, pcCaption, pcCardRows, resolvePcSeats, seatPaint, seatsByParty, standsAvailable,
  tableRows, tenseAfterLoad, unknownSeatsText,
  type AcRow, type AcYearDoc, type Coverage, type Cycle, type DetailDoc, type MembersDoc, type MpladsIndex,
  type StateAgg, type TableRow,
} from '@/lib/state';
import type {
  Availability, ByeDoc, ByeSeat, CabinetDoc, Manifest, Minister, PartiesDoc, Party, PcRow, PcYearDoc, Region,
  RegionsDoc, StateYearDoc, SymbolsDoc,
} from '@/lib/types';
import { HoverCard, type HoverCardHandle } from './HoverCard';
import { Monogram, OfficialPhotoLink, Swatch } from './Member';
import { Pager } from './Pager';
import { SitePath } from './SitePath';

type GeoProps = Record<string, string | number>;
type GeoFeature = Feature<Geometry, GeoProps>;
type GeoFC = FeatureCollection<Geometry, GeoProps>;
type Which = 'ac' | 'pc';
type Shape = { key: string; f: GeoFeature; label: string };

type Core = {
  stateCode: string;
  region: Region;
  regionByCode: Map<string, Region>;
  parents: Map<string, string>;
  avail: Availability;
  manifest: Manifest;
  partyByCode: Map<string, Party>;
  fallback: { name: string; colour: string };
  symbols: SymbolsDoc;
  stateFeature: GeoFeature;
  aspect: number;
  pcShapes: Shape[];
  acShapes: Shape[] | null;   // null: the state's assembly boundaries are not mapped
  uidToSeat: Map<string, string>;
  seatToUid: Map<string, string>;
  acNums: Set<string>;
  mpKeyByName: Map<string, string>;
  lsMembers: NonNullable<MembersDoc['members']>;
  cycles: Cycle[];
};

type Cabinet = { elected: CabinetDoc | null; stands: CabinetDoc | null };
type PcData =
  | { kind: 'pc'; year: number; pcRows: Record<string, PcRow>; agg: StateAgg; byeSeats: ByeSeat[]; byeKnown: boolean;
      cardRows: Map<string, Candidate[]> }
  | { kind: 'state'; year: number; agg: StateAgg; seats: number; partOf: string | null; includes: string[] }
  | { kind: 'missing'; year: number; fileRead: boolean };
type AcData = {
  year: number | null;
  missing: boolean;
  acRows: Record<string, AcRow>;
  noResult: Record<string, string>;
  agg: StateAgg | null;
  cardRows: Map<string, Candidate[]>;
  cabinet: Cabinet;
};
type PerPanel<T> = { ac: T; pc: T };

const EMPTY: ReadonlySet<string> = new Set();
const NO_CABINET: Cabinet = { elected: null, stands: null };
const NO_RESOLVED = { resolved: new Map<string, SeatResolved>(), stands: null };

/* The first four files draw the page at all; if one cannot be read the page says
   so and stops, rather than half-painting. */
async function loadCore(search: string): Promise<{ core: Core } | { fatal: string; region?: Region }> {
  const core = await Promise.all(['manifest.json', 'regions.json', 'parties.json', 'geo/india-states.json']
    .map(p => fetchOptional<unknown>(DATA + p)));
  if (!core.every(r => r.ok)) return { fatal: 'the atlas data could not be loaded' };
  const [manifest, regionsDoc, partiesDoc, statesTopo] = core.map(r => (r as { doc: unknown }).doc) as
    [Manifest, RegionsDoc, PartiesDoc, Topology];
  const [coverageRes, avail, symbolsRes] = await Promise.all([
    fetchOptional<Coverage>(DATA + 'geo/ac/coverage.json'), loadAvailability(DATA),
    fetchOptional<SymbolsDoc>(DATA + 'parties-symbols.json'),
  ]);
  const coverage = coverageRes.ok ? coverageRes.doc : { checked: {} };
  const regionByCode = new Map(regionsDoc.regions.map(r => [r.code, r]));
  const regionBySource = new Map<string, string>();
  for (const r of regionsDoc.regions) for (const s of r.sourceNames) regionBySource.set(s, r.code);

  const stateCode = shownState(regionsDoc.regions, (new URLSearchParams(search).get('s') || '').toUpperCase());
  const region = regionByCode.get(stateCode)!;

  /* No MPLADS directory for the state means no index, and seat clicks just won't navigate. */
  const [mpIndex, pcRes, acRes, membersDoc] = await Promise.all([
    getListed<MpladsIndex>(!!avail.mplads?.[stateCode], `${DATA}mplads/${stateCode}/index.json`),
    fetchOptional<Topology>(`${DATA}geo/ls/${stateCode}.json`),
    coverage.checked[stateCode] ? fetchOptional<Topology>(`${DATA}geo/ac/${stateCode}.json`) : Promise.resolve(null),
    getListed<MembersDoc>(membersAvailable(avail, String(MEMBER_YEAR)), `${DATA}members/ls/${MEMBER_YEAR}.json`),
  ]);
  if (!pcRes.ok) return { fatal: 'the Lok Sabha map could not be loaded', region };

  const pcs = feature(pcRes.doc, pcRes.doc.objects.pcs) as unknown as GeoFC;
  const acs = acRes?.ok ? feature(acRes.doc, acRes.doc.objects.acs) as unknown as GeoFC : null;
  const states = feature(statesTopo, statesTopo.objects.states) as unknown as GeoFC;
  const stateFeature = states.features.find(f => regionBySource.get(String(f.properties.state_ut_name)) === stateCode);
  if (!stateFeature) return { fatal: 'the Lok Sabha map could not be loaded', region };

  const pb = geoPath(geoMercator().fitSize([1000, 1000], stateFeature)).bounds(stateFeature);
  const uidToSeat = new Map(pcs.features.map(f => [String(f.properties.unique_id), String(f.properties.ls_seat_code)]));
  // the member record is keyed by geometry unique_id; the card is keyed by ls_seat_code
  const seatToUid = new Map<string, string>();
  for (const [uid, seat] of uidToSeat) if (!seatToUid.has(seat)) seatToUid.set(seat, uid);

  return {
    core: {
      stateCode, region, regionByCode, parents: parentsOf(regionsDoc.regions), avail, manifest, stateFeature,
      partyByCode: new Map(partiesDoc.parties.map(p => [p.code, p])),
      fallback: partiesDoc.fallback,
      symbols: symbolsRes.ok ? symbolsRes.doc : { symbols: {} },
      aspect: (pb[1][0] - pb[0][0]) / Math.max(1e-6, pb[1][1] - pb[0][1]),
      pcShapes: pcs.features.map(f => ({
        key: String(f.properties.ls_seat_code), f, label: `${f.properties.ls_seat_name}, Lok Sabha constituency`,
      })),
      acShapes: acs ? acs.features.map(f => ({ key: String(f.properties.no), f, label: `${f.properties.ac}, assembly constituency` })) : null,
      uidToSeat, seatToUid,
      acNums: new Set(acs ? acs.features.map(f => String(f.properties.no)) : []),
      mpKeyByName: mpKeysByName(mpIndex, stateCode),
      lsMembers: membersDoc?.members ?? {},
      cycles: acCycles(avail, stateCode),
    },
  };
}

/* A Lok Sabha year is drawn from its constituency file when there is one,
   otherwise from its state-level file (what that file holds, never a
   per-constituency figure; a state formed after that election reads the entry
   of the state it was part of; a file with neither entry has no result for the
   state); with no file it says "not available yet". */
async function loadLS(c: Core, y: number): Promise<PcData> {
  const kind = lsYearKind(c.avail, y);
  if (kind === 'pc') {
    const res = await fetchOptional<PcYearDoc>(`${DATA}results/ls/pc/${y}.json`);
    if (res.ok) {
      const pcRows = Object.fromEntries(Object.entries(res.doc.constituencies).filter(([, r]) => r.st === c.stateCode));
      const byeListed = byelAvailable(c.avail, y);
      const [detail, bye] = await Promise.all([
        getListed<DetailDoc>(lsDetailAvailable(c.avail, y), `${DATA}results/ls/detail/${y}.json`),
        getListed<ByeDoc>(byeListed, `${DATA}results/ls/byel/${y}.json`),
      ]);
      return {
        kind: 'pc', year: y, pcRows, agg: aggregateFrom(pcRows),
        byeSeats: (bye?.seats ?? []).filter(s => s.st === c.stateCode),
        byeKnown: byeListed && !!bye,
        cardRows: pcCardRows(detail, c.uidToSeat),
      };
    }
  } else if (kind === 'state') {
    const doc = await getListed<StateYearDoc>(lsStateAvailable(c.avail, y), `${DATA}results/ls/${y}.json`);
    const s = doc ? aggregateStateLevel(doc, c.stateCode, c.parents) : null;
    if (s) return { kind: 'state', year: y, ...s };
    if (doc) return { kind: 'missing', year: y, fileRead: true };
  }
  return { kind: 'missing', year: y, fileRead: false };
}

/* One assembly cycle. A cycle that has not been added, or whose files cannot be
   read, comes back `missing`: the panel then draws the boundaries with no fills
   and says the result is not available yet. Its councils load either way. */
async function loadLA(c: Core, y: number): Promise<AcData> {
  const roster = stateRoster(c.avail, c.stateCode, y);
  const [elected, stands] = await Promise.all([
    getListed<CabinetDoc>(roster.sworn_in, `${DATA}cabinet/state/${c.stateCode}/${y}-sworn-in.json`),
    getListed<CabinetDoc>(roster.as_it_stands, `${DATA}cabinet/state/${c.stateCode}/${y}.json`),
  ]);
  const cabinet = { elected, stands };
  const missing: AcData = { year: y, missing: true, acRows: {}, noResult: {}, agg: null, cardRows: new Map(), cabinet };
  if (!cycleAvailable(c.cycles, y)) return missing;
  const [res, det] = await Promise.all([
    fetchOptional<AcYearDoc>(`${DATA}results/ac/${c.stateCode}/${y}.json`),
    fetchOptional<DetailDoc>(`${DATA}results/ac/${c.stateCode}/${y}-detail.json`),
  ]);
  if (!res.ok) return missing;
  return {
    year: y, missing: false, acRows: res.doc.constituencies, noResult: res.doc.no_result || {},
    agg: aggregateFrom(res.doc.constituencies), cardRows: acCardRows(det.ok ? det.doc : null, c.acNums), cabinet,
  };
}

export default function StateView() {
  const [core, setCore] = useState<Core | null>(null);
  const [fatal, setFatal] = useState('');
  const [regionName, setRegionName] = useState('');
  const [lsYear, setLsYear] = useState<number | null>(null);
  const [acYear, setAcYear] = useState<number | null>(null);
  const [lsLoading, setLsLoading] = useState(false);
  const [acLoading, setAcLoading] = useState(false);
  const [pcData, setPcData] = useState<PcData | null>(null);
  const [acData, setAcData] = useState<AcData | null>(null);
  const [tense, setTense] = useState<Tense>('elected');
  const [sel, setSel] = useState<PerPanel<ReadonlySet<string>>>({ ac: EMPTY, pc: EMPTY });
  const [sort, setSort] = useState<PerPanel<Sort>>({ ac: DEFAULT_SORT, pc: DEFAULT_SORT });
  const [page, setPage] = useState<PerPanel<number>>({ ac: 0, pc: 0 });
  const [focus, setFocus] = useState<PerPanel<ReadonlySet<string>>>({ ac: EMPTY, pc: EMPTY });
  const [ready, setReady] = useState(false);

  const card = useRef<HoverCardHandle>(null);
  const lsReq = useRef(0);
  const acReq = useRef(0);

  const colour = useCallback((c: string | null | undefined) =>
    ((c ? core?.partyByCode.get(c) : undefined) ?? core?.fallback)?.colour ?? 'var(--muted)', [core]);

  const focusPanel = useCallback((which: Which, keys: ReadonlySet<string>) =>
    setFocus(f => (f[which] === keys ? f : { ...f, [which]: keys })), []);

  /* ── the two timelines, independent by construction ── */
  const selectLS = useCallback(async (c: Core, y: number) => {
    const id = ++lsReq.current;
    setLsYear(y);
    setLsLoading(true);
    focusPanel('pc', EMPTY);
    card.current?.hide();
    const data = await loadLS(c, y);
    if (id !== lsReq.current) return;
    setPcData(data);
    setPage(p => ({ ...p, pc: 0 }));
    setLsLoading(false);
  }, [focusPanel]);

  const selectLA = useCallback(async (c: Core, y: number) => {
    if (!c.acShapes) return;
    const id = ++acReq.current;
    setAcYear(y);
    setAcLoading(true);
    focusPanel('ac', EMPTY);
    card.current?.hide();
    const data = await loadLA(c, y).catch((): AcData =>
      ({ year: y, missing: true, acRows: {}, noResult: {}, agg: null, cardRows: new Map(), cabinet: NO_CABINET }));
    if (id !== acReq.current) return;
    setAcData(data);
    setSel(s => ({ ...s, ac: EMPTY }));
    setPage(p => ({ ...p, ac: 0 }));
    setAcLoading(false);
  }, [focusPanel]);

  /* ── boot ── */
  useEffect(() => {
    let live = true;
    const search = location.search;
    loadCore(search).then(res => {
      if (!live) return;
      if ('fatal' in res) {
        setFatal(res.fatal);
        if (res.region) setRegionName(res.region.name);
        return;
      }
      const c = res.core;
      setCore(c);
      setRegionName(c.region.name);
      const qp = new URLSearchParams(search);
      if (qp.get('t') === 'stands') setTense('stands');
      selectLS(c, firstLsYear(c.manifest.elections.ls.years, Number(qp.get('y')) || 0));
      const latest = latestCycle(c.cycles);
      if (c.acShapes && latest !== undefined) selectLA(c, latest);
      /* A mapped state with no assembly cycle listed: the boundaries unfilled, and
         the results not available. */
      else if (c.acShapes) setAcData({ year: null, missing: true, acRows: {}, noResult: {}, agg: null, cardRows: new Map(), cabinet: NO_CABINET });
    });
    return () => { live = false; };
  }, [selectLS, selectLA]);

  /* the page is about one state, and says so */
  useEffect(() => { if (regionName) document.title = `Election Atlas of ${regionName}`; }, [regionName]);

  /* Transitions only after the first paint, so the maps do not fade in from blank. */
  useEffect(() => {
    if (ready || !(pcData || acData)) return;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setReady(true)); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [ready, pcData, acData]);

  /* ── the tense ──
     "As it stands" has something to show when the Lok Sabha year's by-election
     record, or the shown assembly cycle's current council, has been added. Both
     panels decide, so a tense asked for in the URL is withdrawn only once both
     have loaded. */
  const hasCycles = !!core && core.cycles.length > 0;
  const lsShownYear = pcData && pcData.kind !== 'missing' ? pcData.year : null;
  const standsOk = !!core && standsAvailable(core.avail, core.stateCode, lsShownYear, acData?.year ?? null);
  const loaded = lsShownYear != null && (!!acData || !(core?.acShapes && hasCycles));
  const effTense = tenseAfterLoad(tense, loaded, standsOk);
  useEffect(() => { if (effTense !== tense) setTense(effTense); }, [effTense, tense]);

  /* ── derived: what each seat holds, and the tables ── */
  const pcResolved = useMemo(() => (core && pcData?.kind === 'pc'
    ? resolvePcSeats(pcData.pcRows, core.uidToSeat, pcData.byeSeats, effTense) : NO_RESOLVED), [core, pcData, effTense]);

  const pcPaint = useMemo(() => new Map((core?.pcShapes ?? []).map(s => {
    const r = pcResolved.resolved.get(s.key);
    return [s.key, seatPaint(r?.p, r, effTense, sel.pc, colour)];
  })), [core, pcResolved, effTense, sel.pc, colour]);
  const acPaint = useMemo(() => new Map((core?.acShapes ?? []).map(s =>
    [s.key, seatPaint(acData?.acRows[s.key]?.p, null, effTense, sel.ac, colour)])), [core, acData, effTense, sel.ac, colour]);

  const partySeats: PerPanel<Map<string, string[]>> = useMemo(() => ({
    pc: seatsByParty(new Map([...pcResolved.resolved].map(([k, r]) => [k, r.p]))),
    ac: seatsByParty(new Map(Object.entries(acData?.acRows ?? {}).map(([k, r]) => [k, r.p]))),
  }), [pcResolved, acData]);

  /* A state-level year has no constituency to fill: the whole state takes the
     colour of the party that won most of its seats. */
  const wholeFill = useMemo(() => {
    if (pcData?.kind !== 'state') return null;
    const lead = regionLeader(pcData.agg.m);
    return !lead || (sel.pc.size > 0 && !sel.pc.has(lead)) ? 'var(--paper-2)' : colour(lead);
  }, [pcData, sel.pc, colour]);

  const pcAgg = pcData && pcData.kind !== 'missing' ? pcData.agg : null;
  const pcRows = useMemo(() => (pcAgg && pcAgg.m.size
    ? tableRows(pcAgg, sort.pc, pcData?.kind === 'pc' ? pcResolved.stands : null) : null), [pcAgg, sort.pc, pcData, pcResolved]);
  const acRows = useMemo(() => (acData?.agg && acData.agg.m.size ? tableRows(acData.agg, sort.ac, null) : null),
    [acData, sort.ac]);

  /* ── the hover card: one constituency's own result ── */
  const faceFor = useCallback((which: Which, key: string, winner: { n: string; p: string }): ReactNode => {
    if (!core || which !== 'pc' || pcData?.year !== MEMBER_YEAR) return null;
    const uid = core.seatToUid.get(key);
    if (!uid) return null;
    return (
      <div className="portrait">
        <div className="face"><Monogram name={winner.n} colour={colour(winner.p)} /></div>
        <OfficialPhotoLink house="ls" mpsno={core.lsMembers[uid]?.mpsno} />
      </div>
    );
  }, [core, pcData, colour]);

  const showCard = useCallback((which: Which, key: string, x: number, y: number) => {
    if (!core) return;
    const shapes = which === 'ac' ? core.acShapes ?? [] : core.pcShapes;
    const shape = shapes.find(s => s.key === key);
    const model = cardModel({
      which, key,
      name: shape ? String(which === 'ac' ? shape.f.properties.ac : shape.f.properties.ls_seat_name) : '',
      cands: which === 'ac' ? acData?.cardRows.get(key) : pcData?.kind === 'pc' ? pcData.cardRows.get(key) : undefined,
      r: which === 'pc' ? pcResolved.resolved.get(key) : null,
      tense: effTense,
      acMissing: which === 'ac' && !!acData?.missing,
      noResult: which === 'ac' && !!acData && key in acData.noResult,
    });
    if (!model.show) { card.current?.hide(); return; }
    card.current?.show(
      <SeatCardBody head={model.head} foot={model.foot} colour={colour}
        face={model.head.kind === 'result' ? faceFor(which, key, model.head.winner) : null} />, x, y);
  }, [core, acData, pcData, pcResolved, effTense, colour, faceFor]);

  const onShapeOver = useCallback((which: Which, key: string, x: number, y: number) => {
    focusPanel(which, new Set([key]));
    showCard(which, key, x, y);
  }, [focusPanel, showCard]);
  const onShapeMove = useCallback((x: number, y: number) => { if (card.current?.isOn()) card.current.move(x, y); }, []);
  const onShapeLeave = useCallback((which: Which) => { card.current?.hide(); focusPanel(which, EMPTY); }, [focusPanel]);
  const openSeat = useCallback((which: Which, key: string) => {
    if (!core || which !== 'pc') return;
    const shape = core.pcShapes.find(s => s.key === key);
    const mp = core.mpKeyByName.get(seatFold(shape ? String(shape.f.properties.ls_seat_name) : '', core.stateCode));
    if (mp) location.href = pageURL('mp', { s: core.stateCode, c: mp });
  }, [core]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Escape in the minister search clears that field, not the map focus.
      if (e.key !== 'Escape' || (e.target instanceof Element && e.target.closest('.find'))) return;
      card.current?.hide();
      setFocus({ ac: EMPTY, pc: EMPTY });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* ── table controls, one set per panel ── */
  const tableProps = (which: Which) => ({
    which,
    sort: sort[which],
    page: page[which],
    sel: sel[which],
    colour,
    onSort: (key: SortKey) => {
      setSort(s => ({ ...s, [which]: s[which].key === key ? { key, dir: s[which].dir === -1 ? 1 : -1 } : { key, dir: -1 } }));
      setPage(p => ({ ...p, [which]: 0 }));
    },
    onReset: () => { setSort(s => ({ ...s, [which]: DEFAULT_SORT })); setPage(p => ({ ...p, [which]: 0 })); },
    onPage: (n: number) => setPage(p => ({ ...p, [which]: n })),
    onToggle: (code: string) => setSel(s => {
      const n = new Set(s[which]);
      if (n.has(code)) n.delete(code); else n.add(code);
      return { ...s, [which]: n };
    }),
    onClear: () => setSel(s => ({ ...s, [which]: EMPTY })),
    /* A row is a control too: hovering it focuses that party's seats with the same
       scrim and lift hovering a shape gets. */
    onRowOver: (code: string) => {
      card.current?.hide();
      const seats = partySeats[which].get(code);
      if (seats) focusPanel(which, new Set(seats));
    },
    onLeave: () => focusPanel(which, EMPTY),
  });

  const region = core?.region;
  const name = region?.name ?? regionName;

  /* ── captions and "not available yet" ── */
  let capPc = '—', pcVoid: string | null = null, partOf: ReactNode = null;
  if (fatal) capPc = fatal;
  else if (core && pcData) {
    if (pcData.kind === 'missing') {
      const v = lsVoid({ regionName: name, year: pcData.year, seatCount: core.pcShapes.length, fileRead: pcData.fileRead });
      capPc = v.caption;
      pcVoid = v.text;
    } else {
      const regionNameOf = (code: string) => core.regionByCode.get(code)?.name ?? code;
      const parent = pcData.kind === 'state' && pcData.partOf ? pcData.partOf : null;
      capPc = pcCaption({
        kind: pcData.kind, seats: pcData.kind === 'pc' ? Object.keys(pcData.pcRows).length : pcData.seats,
        tense: effTense, byeKnown: pcData.kind === 'pc' && pcData.byeKnown,
        byeSeats: pcData.kind === 'pc' ? pcData.byeSeats : [], regionName: name,
        partOf: parent && regionNameOf(parent),
        includes: pcData.kind === 'state' ? pcData.includes.map(regionNameOf) : [],
      });
      if (parent) {
        partOf = <><a id="part-of" href={pageURL('state', { s: parent, y: pcData.year })}>
          {partOfText(regionNameOf(parent), pcData.year)}</a> · </>;
      }
    }
  }
  let capAc = '—', acVoid: string | null = null;
  if (core && !core.acShapes) capAc = 'not mapped';
  else if (core?.acShapes && acData) {
    if (acData.missing) {
      capAc = missingCaption(core.acShapes.length);
      acVoid = notAvailable(acData.year != null ? `${name} ${acData.year} assembly results` : `${name} assembly results`, ECI, 'have');
    } else capAc = countOf(Object.keys(acData.acRows).length, 'seat');
  }

  const focusOn = (which: Which) => {
    const shapes = which === 'ac' ? core?.acShapes : core?.pcShapes;
    return !!shapes && focus[which].size > 0 && shapes.some(s => focus[which].has(s.key));
  };

  const lsYears = core?.manifest.elections.ls.years ?? [];
  const symbolFor = (code: string | undefined) => {
    const s = code ? core?.symbols.symbols?.[code] : undefined;
    return s?.file ? DATA + s.file : null;
  };

  return (
    <>
      <main>
        <header className="masthead">
          <SitePath
            tail={[{ label: 'India', href: pageURL('') }, { label: 'State' }]}
            fallback={`<a class="back" href="${pageURL('')}">← India</a>`}
          />
          <div className="mh-top">
            <h1 className="lbl" id="eyebrow">{name ? `Election Atlas of ${name}` : 'Election Atlas of India'}</h1>
            <div className="mh-tools">
              <div className="tense" id="tense" role="group" aria-label="Result as elected or as it stands" hidden={!core}>
                {([['elected', 'As elected'], ['stands', 'As it stands']] as const).map(([val, label]) => {
                  const off = val === 'stands' && !standsOk;
                  return (
                    <button
                      key={val} type="button" className="tense-opt" data-tense={val}
                      aria-pressed={effTense === val}
                      aria-disabled={off || undefined}
                      title={off ? `By-election record for ${lsYear} not available yet` : undefined}
                      onClick={() => {
                        if (off || tense === val) return;
                        setTense(val);
                        setPage(p => ({ ...p, pc: 0 }));
                      }}
                    >{label}</button>
                  );
                })}
              </div>
              <site-theme-picker hide-label="" />
            </div>
          </div>
          <hr className="hair" style={{ marginTop: 'var(--s4)' }} />
          <p className="caveat">Results: Election Commission of India statistical reports. Where a view says “not available yet”, that data has not been added.</p>
        </header>

        <div className={'panels' + (ready ? ' ready' : '')} id="panels"
          style={core ? ({ '--aspect': core.aspect } as CSSProperties) : undefined}>
          <section className={'panel' + (focusOn('ac') ? ' has-focus' : '')} id="panel-ac">
            <div className="panel-head">
              <div className="years" id="years-ac" role="group" aria-label="Assembly election year">
                {core?.acShapes && core.cycles.map(({ year: y, ok }) => (
                  <button
                    key={y} type="button" className={ok ? 'year' : 'year na'} data-year={y}
                    aria-pressed={y === acYear} disabled={acLoading}
                    aria-disabled={!ok || undefined} title={ok ? undefined : 'not available yet'}
                    onClick={() => selectLA(core, y)}
                  >{y}</button>
                ))}
              </div>
              <p className="tier"><span className="name">State Legislative Assembly</span><span className="sep">·</span><span id="cap-ac">{capAc}</span></p>
            </div>
            {core && !core.acShapes ? (
              <div className="void">
                <p>There is no map of this state’s assembly constituencies here. The only current national boundary set is licensed for viewing and not for reuse, so drawing from it would not be ours to publish. The Lok Sabha map beside this is complete and can be read on its own.</p>
              </div>
            ) : (
              <figure>
                {core?.acShapes ? (
                  <StateMap
                    which="ac" svgId="map-ac" groupClass="acs" label="Legislative assembly constituencies of this state."
                    stateFeature={core.stateFeature} shapes={core.acShapes} paint={acPaint} wholeFill={null}
                    focus={focus.ac} onOver={onShapeOver} onMove={onShapeMove} onLeave={onShapeLeave} onOpen={openSeat}
                  />
                ) : (
                  <svg id="map-ac" role="group" aria-label="Legislative assembly constituencies of this state." />
                )}
              </figure>
            )}
            <SeatTable {...tableProps('ac')} tableId="table-ac" resetId="reset-ac" clearId="clear-ac"
              rows={acRows} voidText={acVoid} unknown={0} showDelta={false} />

            <Belt
              show={hasCycles && !!core?.acShapes && !!acData && acData.year != null}
              regionName={name} cycle={acData?.year ?? null} tense={effTense}
              doc={acData ? acData.cabinet[effTense] : null}
              publisher={core ? cabinetPublisher(core.stateCode, name, CMO_UP) : ''}
              colour={colour} symbolFor={symbolFor}
            />
          </section>

          <div className="split" aria-hidden="true" />

          <section className={'panel' + (focusOn('pc') ? ' has-focus' : '')} id="panel-pc">
            <div className="panel-head">
              <div className="years" id="years-pc" role="group" aria-label="Lok Sabha election year">
                {core && lsYears.map(y => {
                  const na = lsYearKind(core.avail, y) === 'missing';
                  return (
                    <button
                      key={y} type="button" className={na ? 'year na' : 'year'} data-year={y}
                      aria-pressed={y === lsYear} disabled={lsLoading}
                      aria-disabled={na || undefined} title={na ? 'not available yet' : undefined}
                      onClick={() => selectLS(core, y)}
                    >{y}</button>
                  );
                })}
              </div>
              <p className="tier"><span className="name">Lok Sabha</span><span className="sep">·</span><span id="cap-pc">{partOf}{capPc}</span></p>
            </div>
            <figure>
              {core ? (
                <StateMap
                  which="pc" svgId="map-pc" groupClass="pcs" label="Lok Sabha constituencies of this state."
                  stateFeature={core.stateFeature} shapes={core.pcShapes} paint={pcPaint} wholeFill={wholeFill}
                  focus={focus.pc} onOver={onShapeOver} onMove={onShapeMove} onLeave={onShapeLeave} onOpen={openSeat}
                />
              ) : (
                <svg id="map-pc" role="group" aria-label="Lok Sabha constituencies of this state." />
              )}
            </figure>
            <SeatTable {...tableProps('pc')} tableId="table-pc" resetId="reset-pc" clearId="clear-pc"
              rows={pcRows} voidText={pcVoid} unknown={pcResolved.stands?.unknown ?? 0} showDelta={effTense === 'stands'} />
          </section>
        </div>
      </main>
      <footer className="credits"><p>Member photos: linked to sansad.in, not stored here. Party symbols: Wikimedia Commons contributors (<a href={`${DATA}parties-symbols.json`}>licences listed</a>).</p></footer>
      <HoverCard ref={card} />
    </>
  );
}

/* ── one map ──────────────────────────────────────────────────────────── *
 * The svg's CSS fixes its box (the state's own aspect ratio, bound by the map
 * height); the drawing is projected to whatever size that comes to and redrawn
 * on resize. Focus + context: one mask whose hole is the focused shape (or the
 * union of a party's seats) holds a paper wash off it and casts a blurred
 * shadow under it, so moving the focus is two `d` writes. */
const StateMap = memo(function StateMap(props: {
  which: Which;
  svgId: string;
  groupClass: string;
  label: string;
  stateFeature: GeoFeature;
  shapes: Shape[];
  paint: Map<string, { fill: string; bye: boolean; vacant: boolean }>;
  /* A state-level year: the whole state in one fill, and no constituency drawn. */
  wholeFill: string | null;
  focus: ReadonlySet<string>;
  onOver: (which: Which, key: string, x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onLeave: (which: Which) => void;
  onOpen: (which: Which, key: string) => void;
}) {
  const { which, shapes, paint, focus, wholeFill, stateFeature } = props;
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);

  useLayoutEffect(() => {
    const el = svg.current;
    if (!el) return;
    const measure = () => {
      const b = el.getBoundingClientRect();
      const W = Math.max(160, Math.round(b.width)), H = Math.max(120, Math.round(b.height));
      setSize(s => (s && s.W === W && s.H === H ? s : { W, H }));
    };
    measure();
    let t: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(measure, 60); });
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

  const geom = useMemo(() => {
    if (!size) return null;
    const { W, H } = size;
    const pathGen = geoPath(geoMercator().fitExtent([[2, 2], [W - 2, H - 2]], stateFeature));
    return {
      W, H,
      edge: pathGen(stateFeature) || '',
      d: new Map(shapes.map(s => [s.key, pathGen(s.f) || ''])),
    };
  }, [size, shapes, stateFeature]);

  const focusD = useMemo(() => {
    if (!geom || wholeFill !== null) return '';
    return [...focus].map(k => geom.d.get(k)).filter(Boolean).join(' ');
  }, [geom, focus, wholeFill]);

  const keyOf = (t: EventTarget | null) => {
    const p = t instanceof Element ? t.closest('path[data-key]') : null;
    return p ? (p as SVGPathElement).dataset.key ?? null : null;
  };
  const mask = `m-${which}`;
  const blur = geom ? Math.max(3.5, geom.W / 145) : 3.5;
  const drop = geom ? Math.max(4, geom.W / 105) : 4;

  return (
    <svg
      id={props.svgId} ref={svg} role="group" aria-label={props.label}
      viewBox={geom ? `0 0 ${geom.W} ${geom.H}` : undefined}
      onPointerOver={e => { const k = keyOf(e.target); if (k) props.onOver(which, k, e.clientX, e.clientY); }}
      onPointerMove={e => { if (keyOf(e.target)) props.onMove(e.clientX, e.clientY); }}
      onPointerLeave={() => props.onLeave(which)}
      onFocus={e => {
        const k = keyOf(e.target);
        if (!k) return;
        const r = (e.target as Element).getBoundingClientRect();
        props.onOver(which, k, r.left + r.width / 2, r.top + r.height / 2);
      }}
      onBlur={() => props.onLeave(which)}
      onClick={e => { const k = keyOf(e.target); if (k) props.onOpen(which, k); }}
      onKeyDown={e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const k = keyOf(e.target);
        if (!k) return;
        e.preventDefault();
        props.onOpen(which, k);
      }}
    >
      {geom && (
        <>
          <defs>
            <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width={geom.W} height={geom.H}>
              <rect x="0" y="0" width={geom.W} height={geom.H} fill="#fff" />
              <path className="hole" fill="#000" d={focusD} />
            </mask>
            <filter id={`f${mask}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={blur.toFixed(2)} />
            </filter>
          </defs>
          <g className={props.groupClass}>
            {wholeFill !== null
              ? <path className="stf" d={geom.edge} style={{ '--c': wholeFill } as CSSProperties} />
              : shapes.map(s => {
                  const p = paint.get(s.key);
                  const cls = (which === 'ac' ? 'ac' : 'pc') + (p?.bye ? ' bye' : '') + (p?.vacant ? ' vacant' : '')
                    + (focus.has(s.key) ? ' marked' : '');
                  return (
                    <path
                      key={s.key} d={geom.d.get(s.key)} className={cls} data-key={s.key}
                      tabIndex={0} role="button" aria-label={s.label}
                      style={{ '--c': p?.fill ?? 'var(--paper-2)' } as CSSProperties}
                    />
                  );
                })}
          </g>
          <rect className="scrim" x="0" y="0" width={geom.W} height={geom.H} mask={`url(#${mask})`} />
          <path className="lift" d={focusD} mask={`url(#${mask})`} filter={`url(#f${mask})`}
            transform={`translate(0,${drop.toFixed(1)})`} />
          <path className="edge" d={geom.edge} />
        </>
      )}
    </svg>
  );
});

/* ── the hover card's body ───────────────────────────────────────────── */
function SeatCardBody({ head, foot, face, colour }: {
  head: CardHead; foot: CardFoot; face: ReactNode; colour: (c: string) => string;
}) {
  return (
    <>
      <div className="top">
        <div className="who">
          <p className="sub">{head.sub}</p>
          <h3>{head.name}</h3>
          {head.kind === 'result' && (
            <p className="meta"><span>{countOf(head.candidates, 'candidate')}</span><span>{nf(head.polled)} votes polled</span></p>
          )}
          {(head.kind === 'noResult' || head.kind === 'noDetail') && <p className="meta"><span>{head.note}</span></p>}
        </div>
        {face}
      </div>
      {head.kind === 'result' && (
        <table>
          <thead><tr><th>Party</th><th>Candidate</th><th>Votes</th><th>Share</th></tr></thead>
          <tbody>
            {head.rows.map((c, i) => (
              <tr key={i}>
                <td><span className="cell"><Swatch colour={colour(c.p)} />{c.p}</span></td>
                <td className="name" title={c.n}>{c.n}</td>
                <td>{nf(c.v)}</td><td>{pc1(c.share)}</td>
              </tr>
            ))}
            {head.more && (
              <tr className="more">
                <td>+{head.more.count} more</td><td /><td>{nf(head.more.v)}</td><td>{pc1(head.more.share)}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {foot.kind === 'vacant' && <p className="vacant-note">{foot.note}</p>}
      {foot.kind === 'byes' && (
        <div className="bye">
          <p className="bye-title">By-elections</p>
          <table>
            <tbody>
              {foot.rows.map((ev, i) => {
                if (ev.kind === 'vacated') return <tr key={i} className="vac"><td>{ev.date}</td><td className="name">Vacated — {ev.reason}</td></tr>;
                if (ev.kind === 'unknown') return <tr key={i}><td>{ev.date}</td><td className="name">Result not available yet</td></tr>;
                return (
                  <tr key={i}>
                    <td>{ev.date}</td>
                    <td className="name"><span className="cell"><Swatch colour={colour(ev.p)} />{ev.n} <span className="pcode">{ev.p}</span></span></td>
                    <td>{nf(ev.v)}</td><td>{ev.turnout}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ── a seat table ─────────────────────────────────────────────────────── *
 * The rows are controls: picking a party is a filter on this panel's map, so the
 * parties left out drop to the ground. Hover is a fill, selection a leading
 * edge. Page numbers sit under the table. */
function SeatTable(props: {
  which: Which;
  tableId: string;
  resetId: string;
  clearId: string;
  rows: TableRow[] | null;
  voidText: string | null;
  unknown: number;
  showDelta: boolean;
  sort: Sort;
  page: number;
  sel: ReadonlySet<string>;
  colour: (c: string) => string;
  onSort: (key: SortKey) => void;
  onReset: () => void;
  onPage: (n: number) => void;
  onToggle: (code: string) => void;
  onClear: () => void;
  onRowOver: (code: string) => void;
  onLeave: () => void;
}) {
  const { rows, sort, sel, colour } = props;
  const isDefault = sort.key === DEFAULT_SORT.key && sort.dir === DEFAULT_SORT.dir;
  const pageCount = pageCountOf(rows?.length ?? 0);
  const cur = Math.min(props.page, pageCount - 1);
  const arrow = (k: SortKey) => (sort.key === k ? (sort.dir === -1 ? ' ↓' : ' ↑') : '');
  return (
    <div className="table">
      <div className="table-head">
        <p className="lbl">Seats won</p>
        <span className="table-actions">
          <button className="reset" id={props.resetId} type="button" hidden={!rows || isDefault} onClick={props.onReset}>
            <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" fill="none"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M2 6a4 4 0 1 0 1.2-2.8" /><path d="M2 1.6V4h2.4" />
            </svg>default order</button>
          <button className="reset loud" id={props.clearId} type="button" hidden={!rows || sel.size === 0}
            onClick={props.onClear}>clear selection</button>
        </span>
      </div>
      <div id={props.tableId} onPointerLeave={props.onLeave}>
        {props.voidText ? (
          <div className="void"><p>{props.voidText}</p></div>
        ) : rows && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Party</th>
                  {([['seats', 'Seats won'], ['votes', 'Votes'], ['share', 'Share']] as const).map(([k, label]) => (
                    <th key={k} aria-sort={sort.key === k ? (sort.dir === -1 ? 'descending' : 'ascending') : 'none'}>
                      <button type="button" data-sort={k} onClick={() => props.onSort(k)}>{label}{arrow(k)}</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={sel.size ? 'has-sel' : undefined}>
                {rows.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE).map(r => {
                  const picked = sel.has(r.code);
                  const d = r.delta;
                  return (
                    <tr key={r.code} data-party={r.code} className={picked ? 'sel' : undefined}
                      onPointerOver={() => props.onRowOver(r.code)} onClick={() => props.onToggle(r.code)}>
                      <td><button type="button" className="pick" aria-pressed={picked}>
                        <Swatch colour={colour(r.code)} /><span>{r.code}</span></button></td>
                      <td>{r.seats}{props.showDelta && d !== 0 && <span className="d">{d > 0 ? ' +' + d : ' −' + (-d)}</span>}</td>
                      <td>{nf(r.votes)}</td><td>{pc1(r.share)}</td>
                    </tr>
                  );
                })}
                {props.unknown > 0 && cur === pageCount - 1 && (
                  <tr><td colSpan={4} style={{ textAlign: 'left', color: 'var(--muted)' }}>{unknownSeatsText(props.unknown)}</td></tr>
                )}
              </tbody>
            </table>
            {pageCount > 1 && <Pager label="Table pages" page={cur} count={pageCount} onPage={props.onPage} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ── the council of ministers ─────────────────────────────────────────── *
 * It follows the assembly cycle shown on the left; each tense reads its own
 * roster. A state without declared assembly cycles has no cycle to key a
 * council by, so the belt stays out of the page there. The minister search
 * recedes non-matches and scrolls to the first match. */
function Belt(props: {
  show: boolean;
  regionName: string;
  cycle: number | null;
  tense: Tense;
  doc: CabinetDoc | null;
  publisher: string;
  colour: (c: string | undefined) => string;
  symbolFor: (code: string | undefined) => string | null;
}) {
  const { show, regionName, cycle, tense, doc, colour } = props;
  const scroll = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [fade, setFade] = useState({ l: false, r: false });
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const query = value.trim();
  const members = useMemo(() => sortMinisters(doc?.members ?? []), [doc]);
  const hits = members.filter(m => memberMatches(query, m)).length;
  const empty = !members.length;

  const updateFades = useCallback(() => {
    const s = scroll.current;
    if (!s) return;
    const max = s.scrollWidth - s.clientWidth, more = max > 2;
    setFade(f => {
      const n = { l: more && s.scrollLeft > 2, r: more && s.scrollLeft < max - 2 };
      return n.l === f.l && n.r === f.r ? f : n;
    });
  }, []);
  useLayoutEffect(updateFades, [members, show, updateFades]);

  /* A reported match that sits off the edge of a scrollbar-less strip is only half
     a search, so a query takes the reader to the first one. */
  useEffect(() => {
    updateFades();
    const s = scroll.current;
    if (!query || !s) return;
    const first = s.querySelector('.belt-card:not(.dim)');
    if (!first) return;
    const sc = s.getBoundingClientRect(), c = first.getBoundingClientRect();
    if (c.left < sc.left + 4) s.scrollBy({ left: c.left - sc.left - 8, behavior: 'auto' });
    else if (c.right > sc.right - 4) s.scrollBy({ left: c.right - sc.right + 8, behavior: 'auto' });
  }, [query, updateFades]);

  const partyMark = (code: string | undefined) => {
    const sym = props.symbolFor(code);
    // eslint-disable-next-line @next/next/no-img-element
    if (sym && code && !failed.has(code)) return <img className="belt-sym" src={sym} alt="" loading="lazy"
      onError={() => setFailed(s => new Set(s).add(code))} />;
    return <Swatch colour={colour(code)} />;
  };

  return (
    <section className="belt" id="belt" aria-label="Council of ministers" hidden={!show}>
      <div className="belt-head">
        <h2 className="belt-title" id="belt-title">
          {show && cycle != null ? `Council of ministers · ${regionName} · ${cycle}` : 'Council of ministers'}
        </h2>
        <span className="belt-asof" id="belt-asof">{show && !empty && doc ? beltAsOf(tense, doc) : ''}</span>
      </div>
      <div className="find" role="search" aria-label="Find a minister" hidden={empty}>
        <label className="find-label" htmlFor="search-min">Find minister</label>
        <div className="find-line">
          <input
            id="search-min" ref={input} type="text" placeholder="e.g. name or ministry" autoComplete="off"
            spellCheck={false} enterKeyHint="search" value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setValue(''); }}
          />
          <span className="search-count" id="min-count" aria-live="polite">{query ? `${hits} of ${members.length}` : ''}</span>
          <button className="search-clear" id="clear-min" type="button" hidden={!query}
            onClick={() => { setValue(''); input.current?.focus(); }}>Clear</button>
        </div>
      </div>
      <div className={'belt-view' + (fade.l ? ' more-l' : '') + (fade.r ? ' more-r' : '')} hidden={empty}>
        <div className="belt-scroll" id="belt-scroll" ref={scroll} tabIndex={0} role="region"
          aria-label="Council of ministers. Use the arrow keys to scroll." onScroll={updateFades}>
          {members.map((m: Minister, i) => {
            const seat = seatLabel(m);
            return (
              <div key={`${m.name}-${i}`} className={'belt-card' + (query && !memberMatches(query, m) ? ' dim' : '')}>
                <div className="belt-face"><Monogram name={m.name} colour={colour(m.party)} /></div>
                <OfficialPhotoLink house={m.house} mpsno={m.mpsno} />
                <p className="belt-name">{titleCase(m.name)}</p>
                <p className="belt-role">{m.portfolio || m.role || ''}</p>
                {seat && <span className="belt-seat">{partyMark(m.party)}{seat}</span>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="void" id="belt-void" hidden={!empty}>
        <p>{empty && show && cycle != null ? beltVoidText(regionName, tense, cycle, props.publisher) : ''}</p>
      </div>
    </section>
  );
}
