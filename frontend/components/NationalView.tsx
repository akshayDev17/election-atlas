'use client';
/* The national page: every Lok Sabha constituency shaded by the party holding it,
   state outlines over them, the national table beside the map and the Union
   council of ministers in the third track. Hovering a state reads its result;
   clicking it opens the state page. */
import { geoMercator, geoPath, type GeoPath, type GeoPermissibleObjects } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import {
  memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react';
import {
  ECI, PRESIDENT, byelAvailable, coverNote, fetchOptional, formedLater, loadAvailability, lsResultsAvailable,
  lsStateAvailable, nf, notAvailable, parentsOf, partOfText, pc1, resultRegion, titleCase, unionRoster,
} from '@/lib/atlas';
import { DATA, pageURL } from '@/lib/base';
import {
  NAT_DEFAULT, PAGE_SIZE, RANK_LABEL, aggregate, aggregateStates, belowCutMessage, byeNote, compactPortfolio,
  memberMatches, nationalRows, pageList, partyMatches, portfolioList, regionLeader, resolveSeats, seatLabel,
  seatMaps, sortMinisters, type Aggregate, type Sort, type Tense,
} from '@/lib/national';
import type {
  Availability, ByeDoc, CabinetDoc, Level, Manifest, Minister, PartiesDoc, Party, PcYearDoc, Region, RegionsDoc,
  StateYearDoc, SymbolsDoc,
} from '@/lib/types';
import { HoverCard, type HoverCardHandle } from './HoverCard';
import { Monogram, OfficialPhotoLink, Swatch } from './Member';

type GeoProps = Record<string, string>;
type GeoFC = FeatureCollection<Geometry, GeoProps>;

type Core = {
  manifest: Manifest;
  avail: Availability;
  regionByCode: Map<string, Region>;
  parents: Map<string, string>;
  regionBySource: Map<string, string>;
  partyByCode: Map<string, Party>;
  fallback: { name: string; colour: string };
  symbols: SymbolsDoc;
  states: GeoFC;
  pcs: GeoFC;
  stateLevel: Level;
};

type Cabinet = { elected: CabinetDoc | null; stands: CabinetDoc | null };
type YearData = {
  year: number;
  kind: 'pc' | 'states' | 'missing';
  pc: PcYearDoc | null;
  states: StateYearDoc | null;
  bye: ByeDoc | null;
  cabinet: Cabinet;
};
type Focus = { kind: 'state' | 'party'; value: string };

const NO_CABINET: Cabinet = { elected: null, stands: null };
const resultsMissing = (y: number) => notAvailable(`the ${y} Lok Sabha results`, ECI, 'have');

/* These five draw the map at all; if one cannot be read the page says so and
   stops, rather than half-painting. */
async function loadCore(): Promise<Core | null> {
  const core = await Promise.all([
    'manifest.json', 'regions.json', 'parties.json', 'geo/india-states.json', 'geo/india-pcs.json',
  ].map(p => fetchOptional<unknown>(DATA + p)));
  if (!core.every(r => r.ok)) return null;
  const [manifest, regionsDoc, partiesDoc, statesTopo, pcsTopo] = core.map(r => (r as { doc: unknown }).doc) as
    [Manifest, RegionsDoc, PartiesDoc, Topology, Topology];
  const [avail, symbolsRes] = await Promise.all([
    loadAvailability(DATA), fetchOptional<SymbolsDoc>(DATA + 'parties-symbols.json'),
  ]);
  const stateLevel = manifest.levels.find(l => l.id === 'state')!;
  const pcLevel = manifest.levels.find(l => l.id === 'parliamentary')!;
  const regionBySource = new Map<string, string>();
  for (const r of regionsDoc.regions) for (const s of r.sourceNames) regionBySource.set(s, r.code);
  return {
    manifest, avail, regionBySource, stateLevel,
    regionByCode: new Map(regionsDoc.regions.map(r => [r.code, r])),
    parents: parentsOf(regionsDoc.regions),
    partyByCode: new Map(partiesDoc.parties.map(p => [p.code, p])),
    fallback: partiesDoc.fallback,
    symbols: symbolsRes.ok ? symbolsRes.doc : { symbols: {} },
    states: feature(statesTopo, statesTopo.objects[stateLevel.topologyObject]) as unknown as GeoFC,
    pcs: feature(pcsTopo, pcsTopo.objects[pcLevel.topologyObject]) as unknown as GeoFC,
  };
}

/* Optional files are fetched only when availability.json lists them, so a year
   without them costs no 404; fetchOptional still absorbs one if the index is stale. */
async function getListed<T>(on: boolean, url: string): Promise<T | null> {
  if (!on) return null;
  const res = await fetchOptional<T>(url);
  return res.ok ? res.doc : null;
}

async function loadCabinet(avail: Availability, y: number): Promise<Cabinet> {
  const has = unionRoster(avail, y);
  const [elected, stands] = await Promise.all([
    getListed<CabinetDoc>(has.sworn_in, `${DATA}cabinet/union/${y}-sworn-in.json`),
    getListed<CabinetDoc>(has.as_it_stands, `${DATA}cabinet/union/${y}.json`),
  ]);
  return { elected, stands };
}

/* A year is drawn from its constituency file when there is one, otherwise from
   its state-level file; with neither it says "not available yet". The council of
   ministers is its own record and loads either way. */
async function loadYear(core: Core, y: number, cache: Map<string, Promise<unknown>>): Promise<YearData> {
  const once = <T,>(url: string): Promise<T | null> => {
    if (!cache.has(url)) cache.set(url, fetchOptional<T>(url).then(r => (r.ok ? r.doc : null)));
    return cache.get(url) as Promise<T | null>;
  };
  const { avail, manifest } = core;
  const cabinet = loadCabinet(avail, y).catch(() => NO_CABINET);
  if (lsResultsAvailable(avail, y)) {
    const pcLevel = manifest.levels.find(l => l.id === 'parliamentary')!;
    const pc = await once<PcYearDoc>(DATA + pcLevel.results.replace('{year}', String(y)));
    if (pc) {
      const bye = byelAvailable(avail, y) ? await once<ByeDoc>(`${DATA}results/ls/byel/${y}.json`) : null;
      return { year: y, kind: 'pc', pc, states: null, bye, cabinet: await cabinet };
    }
  } else if (lsStateAvailable(avail, y)) {
    const states = await once<StateYearDoc>(DATA + core.stateLevel.results.replace('{year}', String(y)));
    if (states) return { year: y, kind: 'states', pc: null, states, bye: null, cabinet: await cabinet };
  }
  return { year: y, kind: 'missing', pc: null, states: null, bye: null, cabinet: await cabinet };
}

/* "As it stands" has something to show when the year's by-election record or its
   current council of ministers has been added. */
const standsAvailable = (avail: Availability, y: number) => byelAvailable(avail, y) || unionRoster(avail, y).as_it_stands;

export default function NationalView() {
  const [core, setCore] = useState<Core | null>(null);
  const [fatal, setFatal] = useState('');
  const [year, setYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<YearData | null>(null);
  const [tense, setTense] = useState<Tense>('elected');
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
  const [partyInput, setPartyInput] = useState('');
  const [minInput, setMinInput] = useState('');
  const [sort, setSort] = useState<Sort>(NAT_DEFAULT);
  const [page, setPage] = useState(0);
  const [focused, setFocused] = useState<Focus | null>(null);
  const [failedSymbols, setFailedSymbols] = useState<ReadonlySet<string>>(new Set());

  const card = useRef<HoverCardHandle>(null);
  const cache = useRef(new Map<string, Promise<unknown>>());
  const request = useRef(0);
  const partyQuery = partyInput.trim();
  const minQuery = minInput.trim();

  const colour = useCallback((c: string) => (core?.partyByCode.get(c) ?? core?.fallback)?.colour ?? 'var(--muted)', [core]);
  const partyName = useCallback((c: string) => (core?.partyByCode.get(c) ?? core?.fallback)?.name ?? c, [core]);

  const selectYear = useCallback(async (c: Core, y: number) => {
    const id = ++request.current;
    setYear(y);
    setLoading(true);
    card.current?.hide();
    setFocused(null);
    const next = await loadYear(c, y, cache.current);
    if (id !== request.current) return;
    if (!standsAvailable(c.avail, y)) setTense('elected');
    setData(next);
    setPage(0);
    setLoading(false);
  }, []);

  /* ── boot ── */
  useEffect(() => {
    let live = true;
    loadCore().then(c => {
      if (!live) return;
      if (!c) { setFatal('The atlas data could not be loaded, so the map cannot draw.'); return; }
      setCore(c);
      const qp = new URLSearchParams(location.search);
      if (qp.get('t') === 'stands') setTense('stands');
      const years = c.manifest.elections.ls.years;
      const want = Number(qp.get('y')) || 0;
      selectYear(c, want && years.includes(want) ? want : years[years.length - 1]);
    });
    return () => { live = false; };
  }, [selectYear]);

  /* ── derived arithmetic ── */
  const agg: Aggregate | null = useMemo(() => {
    if (data?.kind === 'pc' && data.pc) return aggregate(data.pc);
    if (data?.kind === 'states' && data.states) return aggregateStates(data.states);
    return null;
  }, [data]);
  const resolved = useMemo(() => resolveSeats(data?.pc ?? null, data?.bye ?? null, tense), [data, tense]);
  const { standsSeats, deltaByParty } = useMemo(() => seatMaps(data?.pc ?? null, resolved), [data, resolved]);
  const matches = useCallback((code: string) => partyMatches(partyQuery, code, core?.partyByCode ?? new Map()),
    [partyQuery, core]);
  /* In a state-level year each present-day outline reads its own entry, or the
     entry of the state it was part of that year. */
  const unitOf = useMemo(() => {
    const m = new Map<string, string>();
    if (!core || data?.kind !== 'states' || !data.states) return m;
    for (const code of core.regionByCode.keys()) {
      const unit = resultRegion(data.states, code, core.parents);
      if (unit) m.set(code, unit);
    }
    return m;
  }, [core, data]);
  const leaders = useMemo(() => {
    const m = new Map<string, string | null>();
    if (agg) for (const [code, unit] of unitOf) m.set(code, regionLeader(agg.byRegion.get(unit)));
    return m;
  }, [unitOf, agg]);

  const rows = useMemo(() => nationalRows({ agg, tense, standsSeats, deltaByParty, sort, matches: partyQuery ? matches : undefined }),
    [agg, tense, standsSeats, deltaByParty, sort, partyQuery, matches]);
  const baseCount = useMemo(() => (partyQuery ? nationalRows({ agg, tense, standsSeats, deltaByParty, sort }).length : 0),
    [agg, tense, standsSeats, deltaByParty, sort, partyQuery]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const curPage = Math.min(page, pageCount - 1);
  const unknownSeats = useMemo(() => [...resolved.values()].filter(r => r.unknown).length, [resolved]);

  /* A seat stays bright only if it passes both filters: the click selection
     (compare parties) and the text query (find one party). */
  const leftOut = useCallback((party: string | null) =>
    !!party && ((selection.size > 0 && !selection.has(party)) || (!!partyQuery && !matches(party))),
  [selection, partyQuery, matches]);

  const note = useMemo(() => {
    if (fatal) return fatal;
    if (!data) return '';
    if (data.kind === 'missing') return resultsMissing(data.year);
    let txt = data.kind === 'states'
      ? `As elected · ${data.year} · state-level result: this election’s constituency boundaries predate the atlas map`
      : byeNote(data.year, tense, data.bye, resolved);
    /* A query that dims every seat must say so. */
    if (partyQuery && agg) {
      const n = [...agg.national.keys()].filter(matches).length;
      txt += n ? ` · ${n} ${n === 1 ? 'party' : 'parties'} showing` : ` · no seat matches “${partyQuery}”`;
    }
    return txt;
  }, [fatal, data, tense, resolved, partyQuery, agg, matches]);

  const toggleParty = (code: string) => setSelection(s => {
    const n = new Set(s);
    if (n.has(code)) n.delete(code); else n.add(code);
    return n;
  });

  /* ── the state card ── */
  const stateCard = useCallback((code: string): { node: ReactNode; title: string } | null => {
    if (!core || !agg || !data) return null;
    const MAX_ROWS = 7;
    const unit = unitOf.get(code) ?? code;
    const list = [...(agg.byRegion.get(unit) || new Map())]
      .map(([p, v]) => ({ code: p, seats: v.seats, votes: v.votes }))
      .filter(r => r.seats > 0 || r.votes > 0)
      .sort((a, b) => b.seats - a.seats || b.votes - a.votes);
    const region = core.regionByCode.get(code);
    if (!list.length || !region) return null;
    const totalVotes = list.reduce((n, r) => n + r.votes, 0);
    const totalSeats = list.reduce((n, r) => n + r.seats, 0);
    const rest = list.slice(MAX_ROWS);
    const restVotes = rest.reduce((n, r) => n + r.votes, 0);
    const nameOf = (c: string) => core.regionByCode.get(c)?.name ?? c;
    const parent = unit === code ? null : nameOf(unit);
    const includes = !parent && data.states ? formedLater(data.states, code, core.parents).map(nameOf) : [];
    return {
      title: parent
        ? `${region.name}: ${partOfText(parent, data.year)}`
        : `${list[0].code} leads ${region.name} — ${partyName(list[0].code)}`,
      node: (
        <>
          <p className="sub">{region.type === 'ut' ? 'Union territory' : 'State'}</p>
          <h2>{region.name}</h2>
          <p className="meta">
            {parent && <>{partOfText(parent, data.year)} · </>}
            {totalSeats} constituencies{coverNote(parent, includes)} · {nf(totalVotes)} votes polled
          </p>
          <p className="open">Open {parent ? `${parent} ${data.year}` : region.name} →</p>
          <table>
            <thead><tr><th>Party</th><th>Seats won</th><th>Votes</th><th>Share</th></tr></thead>
            <tbody>
              {list.slice(0, MAX_ROWS).map(r => (
                <tr key={r.code}>
                  <td className="p"><Swatch colour={colour(r.code)} />{r.code}</td>
                  <td>{r.seats}</td><td>{nf(r.votes)}</td><td>{pc1(totalVotes ? r.votes / totalVotes : 0)}</td>
                </tr>
              ))}
              {rest.length > 0 && (
                <tr className="more">
                  <td className="p">+{rest.length} more</td>
                  <td>{rest.reduce((n, r) => n + r.seats, 0)}</td><td>{nf(restVotes)}</td>
                  <td>{pc1(totalVotes ? restVotes / totalVotes : 0)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      ),
    };
  }, [core, agg, data, unitOf, colour, partyName]);

  const showStateCard = useCallback((code: string, x: number, y: number) => {
    const c = stateCard(code);
    if (c) card.current?.show(c.node, x, y, c.title);
  }, [stateCard]);

  const hideCard = useCallback(() => { card.current?.hide(); setFocused(null); }, []);

  const openState = useCallback((code: string) => {
    location.href = pageURL('state', { s: unitOf.get(code) ?? code, y: data?.pc || data?.states ? data.year : '' });
  }, [data, unitOf]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Escape in a search field clears that field, not the map focus.
      if (e.key === 'Escape' && !(e.target instanceof Element && e.target.closest('.find'))) hideCard();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hideCard]);

  const yearsList = core?.manifest.elections.ls.years ?? [];
  const standsOk = core && year != null ? standsAvailable(core.avail, year) : false;
  const effectiveTense: Tense = standsOk ? tense : 'elected';

  return (
    <>
      <main>
        <header className="masthead">
          <div className="mh-top">
            <div className="mh-left">
              <a className="back" href="/">← Akshay Prabhakant</a>
              <p className="lbl">Election Atlas of India</p>
            </div>
            <div className="mh-tools">
              <div className="years" id="years" role="group" aria-label="General election year">
                {core && yearsList.map(y => {
                  const na = !lsResultsAvailable(core.avail, y) && !lsStateAvailable(core.avail, y);
                  return (
                    <button
                      key={y} type="button" className={na ? 'year na' : 'year'} data-year={y}
                      aria-pressed={y === year} disabled={loading}
                      aria-disabled={na || undefined} title={na ? `${y} Lok Sabha results not available yet` : undefined}
                      onClick={() => selectYear(core, y)}
                    >{y}</button>
                  );
                })}
              </div>
              <div className="tense" id="tense" role="group" aria-label="Result as elected or as it stands" hidden={!core}>
                {([['elected', 'As elected'], ['stands', 'As it stands']] as const).map(([val, label]) => {
                  const off = val === 'stands' && !standsOk;
                  return (
                    <button
                      key={val} type="button" className="tense-opt" data-tense={val}
                      aria-pressed={effectiveTense === val}
                      aria-disabled={off || undefined}
                      title={off && year != null ? `By-election record for ${year} not available yet` : undefined}
                      onClick={() => { if (!off && tense !== val) setTense(val); }}
                    >{label}</button>
                  );
                })}
              </div>
            </div>
          </div>
          <hr className="hair" style={{ marginTop: 'var(--s4)' }} />
          <p className="caveat">Results: Election Commission of India statistical reports. Cabinets: the Prime Minister’s Office and the Press Information Bureau. Where a view says “not available yet”, that data has not been added.</p>
        </header>

        <section className="field">
          <figure className="mapfig">
            {core ? (
              <NationalMap
                core={core} data={data} tense={effectiveTense} resolved={resolved} leaders={leaders} unitOf={unitOf} agg={agg}
                leftOut={leftOut} colour={colour} focused={focused}
                onStateFocus={(code, x, y) => { setFocused({ kind: 'state', value: code }); showStateCard(code, x, y); }}
                onStateMove={(x, y) => { if (card.current?.isOn()) card.current.move(x, y); }}
                onLeave={hideCard}
                onOpen={openState}
              />
            ) : (
              <svg id="map" viewBox="0 0 884 1000" preserveAspectRatio="xMidYMid meet" role="group" aria-label={MAP_LABEL} />
            )}
            <p className="lbl mapnote" id="mapnote" role="status">{note}</p>
          </figure>

          <section className="ntable" aria-label="National result">
            <SearchBox
              label="Find party" id="search-party" placeholder="e.g. BJP, Congress" ariaLabel="Find a party"
              value={partyInput} count={partyQuery ? `${rows.length} of ${baseCount}` : ''}
              onChange={v => { setPartyInput(v); setPage(0); }}
            />
            <div className="ntable-head">
              <span className="ntable-actions">
                <button className="reset" id="reset-sort" type="button"
                  hidden={sort.key === NAT_DEFAULT.key && sort.dir === NAT_DEFAULT.dir}
                  onClick={() => { setSort(NAT_DEFAULT); setPage(0); }}>default order</button>
                <button className="reset loud" id="clear-sel" type="button" hidden={selection.size === 0}
                  onClick={() => setSelection(new Set())}>clear selection</button>
              </span>
            </div>
            <ScrollFade>
              <table>
                <thead>
                  <tr id="ntable-head-row">
                    <th>Party</th>
                    {([['seats', 'Seats'], ['votes', 'Votes'], ['share', 'Share']] as const).map(([key, label]) => {
                      const on = sort.key === key;
                      return (
                        <th key={key} aria-sort={on ? (sort.dir === -1 ? 'descending' : 'ascending') : 'none'}>
                          <button type="button" data-sort={key} onClick={() => {
                            setSort(s => (s.key === key ? { key, dir: s.dir === -1 ? 1 : -1 } : { key, dir: -1 }));
                            setPage(0);
                          }}>{label + (on ? (sort.dir === -1 ? ' ↓' : ' ↑') : '')}</button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody
                  id="ntable-body" className={selection.size ? 'has-sel' : undefined}
                  onPointerLeave={() => setFocused(null)}
                >
                  {data && !rows.length && (
                    <tr><td colSpan={4} style={{ textAlign: 'left', color: 'var(--muted)' }}>
                      {!agg ? resultsMissing(data.year) : belowCutMessage(agg, partyQuery, matches)}
                    </td></tr>
                  )}
                  {rows.slice(curPage * PAGE_SIZE, curPage * PAGE_SIZE + PAGE_SIZE).map(r => {
                    const on = selection.has(r.code);
                    const d = r.delta;
                    const dTxt = effectiveTense === 'stands' && d ? (d > 0 ? ' +' + d : ' −' + (-d)) : '';
                    return (
                      <tr key={r.code} data-party={r.code} className={on ? 'sel' : undefined}
                        onPointerOver={() => { card.current?.hide(); setFocused({ kind: 'party', value: r.code }); }}
                        onClick={() => toggleParty(r.code)}>
                        <td><button type="button" className="pick" aria-pressed={on}>
                          <Swatch colour={colour(r.code)} /><span>{r.code}</span></button></td>
                        <td>{r.seats}{dTxt && <span className="d">{dTxt}</span>}</td>
                        <td>{nf(r.votes)}</td><td>{pc1(r.share)}</td>
                      </tr>
                    );
                  })}
                  {rows.length > 0 && unknownSeats > 0 && curPage === pageCount - 1 && (
                    <tr><td colSpan={4} style={{ textAlign: 'left', color: 'var(--muted)' }}>
                      {unknownSeats} seat{unknownSeats === 1 ? '' : 's'}: by-election result not available yet
                    </td></tr>
                  )}
                </tbody>
              </table>
            </ScrollFade>
            <Pager page={curPage} count={pageCount} onPage={setPage} />
          </section>

          <Belt
            year={data?.year ?? year} doc={data ? data.cabinet[effectiveTense] : null} tense={effectiveTense}
            query={minQuery} input={minInput} onInput={setMinInput}
            colour={colour} symbols={core?.symbols ?? null} failedSymbols={failedSymbols}
            onSymbolError={code => setFailedSymbols(s => new Set(s).add(code))}
            card={card}
          />
        </section>
      </main>
      <footer className="credits"><p>Member photos: linked to sansad.in, not stored here. Party symbols: Wikimedia Commons contributors (<a href={`${DATA}parties-symbols.json`}>licences listed</a>).</p></footer>
      <HoverCard ref={card} />
    </>
  );
}

const MAP_LABEL = 'Map of India. Each of the 543 parliamentary constituencies is filled with the colour of the party that won it; the borders drawn over them are state and union territory boundaries.';

/* ── the map ──────────────────────────────────────────────────────────── *
 * Height-bound: the svg's CSS fixes its height and India's ratio gives the
 * width; the drawing is projected to whatever size that comes to and redrawn on
 * resize. Focus + context: one mask whose hole is the focused state (or the
 * union of a party's seats) holds a page-coloured wash off it and casts a
 * blurred shadow around it, so moving the focus is two `d` writes rather than a
 * repaint of 543 constituencies. */
const NationalMap = memo(function NationalMap(props: {
  core: Core;
  data: YearData | null;
  tense: Tense;
  resolved: ReturnType<typeof resolveSeats>;
  leaders: Map<string, string | null>;
  unitOf: Map<string, string>;
  agg: Aggregate | null;
  leftOut: (party: string | null) => boolean;
  colour: (code: string) => string;
  focused: Focus | null;
  onStateFocus: (code: string, x: number, y: number) => void;
  onStateMove: (x: number, y: number) => void;
  onLeave: () => void;
  onOpen: (code: string) => void;
}) {
  const { core, data, tense, resolved, leaders, unitOf, agg, leftOut, colour, focused } = props;
  const unitCode = useCallback((code: string) => unitOf.get(code) ?? code, [unitOf]);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);

  useLayoutEffect(() => {
    const el = svg.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const W = Math.max(320, Math.round(box.width)), H = Math.max(260, Math.round(box.height));
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
    const projection = geoMercator().fitExtent([[2, 2], [W - 2, H - 2]], core.states);
    const pathGen = geoPath(projection);
    return {
      W, H, pathGen,
      pcs: core.pcs.features.map(f => ({ uid: f.properties.unique_id, d: pathGen(f) || '' })),
      states: core.states.features.map((f, i) => ({
        key: i, code: core.regionBySource.get(f.properties[core.stateLevel.geometryKey]) ?? null, d: pathGen(f) || '', f,
      })),
    };
  }, [size, core]);

  const focusD = useMemo(() => {
    if (!focused || !geom) return '';
    if (focused.kind === 'state') {
      const unit = unitCode(focused.value);
      return geom.states.filter(s => s.code && unitCode(s.code) === unit).map(s => s.d).join(' ');
    }
    const features: Feature<Geometry, GeoProps>[] = data?.kind === 'states'
      ? geom.states.filter(s => s.code && leaders.get(s.code) === focused.value).map(s => s.f)
      : core.pcs.features.filter(f => resolved.get(f.properties.unique_id)?.p === focused.value);
    return features.length ? (geom.pathGen as GeoPath<unknown, GeoPermissibleObjects>)({ type: 'FeatureCollection', features } as GeoPermissibleObjects) || '' : '';
  }, [focused, geom, data, leaders, core, resolved, unitCode]);

  const codeOf = (t: EventTarget | null) => {
    const p = t instanceof Element ? t.closest('path.st[data-region]') : null;
    return p ? (p as SVGPathElement).dataset.region ?? null : null;
  };

  const stateLabel = (code: string): string | undefined => {
    if (!data || data.kind === 'missing') return undefined;
    const nameOf = (c: string) => core.regionByCode.get(c)?.name ?? c;
    const unit = unitCode(code);
    const m = agg?.byRegion.get(unit);
    const lead = m ? [...m.entries()].sort((a, b) => b[1].seats - a[1].seats)[0] : null;
    const won = lead ? `${lead[0]} won ${lead[1].seats} constituencies` : '';
    if (unit !== code) return `${nameOf(code)}. ${partOfText(nameOf(unit), data.year)}${won ? `, where ${won}` : ''}.`;
    const includes = data.states ? formedLater(data.states, code, core.parents).map(nameOf) : [];
    return lead ? `${nameOf(code)}${coverNote(null, includes)}. ${won}.` : `${nameOf(code)}. No result for this year.`;
  };

  const blur = geom ? Math.max(3.5, geom.W / 145) : 3.5;
  const drop = geom ? Math.max(4, geom.W / 105) : 4;
  const marks = tense === 'stands';

  return (
    <svg
      id="map" ref={svg} viewBox={geom ? `0 0 ${geom.W} ${geom.H}` : '0 0 884 1000'} preserveAspectRatio="xMidYMid meet"
      role="group" aria-label={MAP_LABEL} className={focusD ? 'has-focus' : undefined}
      onPointerOver={e => { const c = codeOf(e.target); if (c) props.onStateFocus(c, e.clientX, e.clientY); }}
      onPointerMove={e => { if (codeOf(e.target)) props.onStateMove(e.clientX, e.clientY); }}
      onPointerLeave={props.onLeave}
      onFocus={e => {
        const c = codeOf(e.target);
        if (!c) return;
        const r = (e.target as Element).getBoundingClientRect();
        props.onStateFocus(c, r.left + r.width / 2, r.top + r.height / 2);
      }}
      onBlur={props.onLeave}
      onClick={e => { const c = codeOf(e.target); if (c) props.onOpen(c); }}
      onKeyDown={e => {
        const c = codeOf(e.target);
        if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); props.onOpen(c); }
      }}
    >
      {geom && (
        <>
          <defs>
            <mask id="focusMask" maskUnits="userSpaceOnUse" x="0" y="0" width={geom.W} height={geom.H}>
              <rect x="0" y="0" width={geom.W} height={geom.H} fill="#fff" />
              <path id="maskHole" fill="#000" d={focusD} />
            </mask>
            <filter id="liftBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={blur.toFixed(2)} />
            </filter>
          </defs>
          <g>
            {geom.pcs.map(({ uid, d }) => {
              const r = data?.kind === 'pc' ? resolved.get(uid) : undefined;
              const party = r ? r.p : null;
              const fill = r?.vacant ? 'var(--vacant)' : (!party || leftOut(party) ? 'var(--paper-2)' : colour(party));
              const cls = 'pc' + (marks && r && r.byeCount > 0 && !r.vacant ? ' bye' : '') + (marks && r?.vacant ? ' vacant' : '');
              return <path key={uid} d={d} className={cls} data-uid={uid} style={{ '--c': fill } as CSSProperties} />;
            })}
          </g>
          {data?.kind === 'states' && (
            <g>
              {geom.states.map(s => {
                const party = s.code ? leaders.get(s.code) ?? null : null;
                const fill = !party || leftOut(party) ? 'var(--paper-2)' : colour(party);
                return <path key={s.key} d={s.d} className="stf" style={{ '--c': fill } as CSSProperties} />;
              })}
            </g>
          )}
          <rect className="scrim" x="0" y="0" width={geom.W} height={geom.H} mask="url(#focusMask)" />
          <path className="lift" d={focusD} mask="url(#focusMask)" filter="url(#liftBlur)" transform={`translate(0,${drop.toFixed(1)})`} />
          <g>
            {geom.states.map(s => (
              <path
                key={s.key} d={s.d}
                className={'st' + (focused?.kind === 'state' && s.code && unitCode(s.code) === unitCode(focused.value) ? ' is-active' : '')}
                {...(s.code ? { 'data-region': s.code, tabIndex: 0, role: 'button', 'aria-label': stateLabel(s.code) } : {})}
              />
            ))}
          </g>
        </>
      )}
    </svg>
  );
});

/* ── search ───────────────────────────────────────────────────────────── *
 * A query is a fill-in line docked to the surface it searches. Escape clears it. */
function SearchBox(props: {
  id: string; label: string; placeholder: string; ariaLabel: string; value: string; count: string;
  onChange: (v: string) => void; hidden?: boolean; boxId?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="find" id={props.boxId} role="search" aria-label={props.ariaLabel} hidden={props.hidden}>
      <label className="find-label" htmlFor={props.id}>{props.label}</label>
      <div className="find-line">
        <input
          id={props.id} ref={input} type="text" placeholder={props.placeholder} autoComplete="off" spellCheck={false}
          enterKeyHint="search" value={props.value}
          onChange={e => props.onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') props.onChange(''); }}
        />
        <span className="search-count" aria-live="polite">{props.count}</span>
        <button className="search-clear" type="button" hidden={!props.value.trim()}
          onClick={() => { props.onChange(''); input.current?.focus(); }}>Clear</button>
      </div>
    </div>
  );
}

/* With no scrollbar, the fade is the only cue that there is more: it appears at
   an edge only while content is actually hidden behind it. */
function ScrollFade({ children }: { children: ReactNode }) {
  const [edges, setEdges] = useState({ up: false, down: false });
  return (
    <div className={'ntable-view' + (edges.up ? ' more-up' : '') + (edges.down ? ' more-down' : '')}>
      <div className="ntable-scroll" onScroll={e => {
        const s = e.currentTarget, max = s.scrollHeight - s.clientHeight;
        setEdges({ up: s.scrollTop > 2, down: s.scrollTop < max - 2 });
      }}>{children}</div>
    </div>
  );
}

/* Page numbers under the table: prev/next at the ends, a window around the
   current page when there are many. */
function Pager({ page, count, onPage }: { page: number; count: number; onPage: (p: number) => void }) {
  return (
    <nav className="pager" id="ntable-pager" aria-label="Table pages">
      {count > 1 && (
        <>
          <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)}>‹</button>
          {pageList(page, count).map((item, i) => item === '…'
            ? <span key={`e${i}`} className="pager-ell" aria-hidden="true">…</span>
            : <button key={item} type="button" className={item === page ? 'cur' : undefined}
                aria-current={item === page ? 'page' : undefined} onClick={() => onPage(item)}>{item + 1}</button>)}
          <button type="button" aria-label="Next page" disabled={page === count - 1} onClick={() => onPage(page + 1)}>›</button>
        </>
      )}
    </nav>
  );
}

/* ── the cabinet belt ─────────────────────────────────────────────────── *
 * Each tense reads its own roster: "as elected" the council as sworn in, "as it
 * stands" the council today; neither stands in for the other. The strip fills
 * downward first, as many rows as fit, then continues right; the minister search
 * dims non-matches and scrolls to the first match. */
function Belt(props: {
  year: number | null;
  doc: CabinetDoc | null;
  tense: Tense;
  query: string;
  input: string;
  onInput: (v: string) => void;
  colour: (code: string) => string;
  symbols: SymbolsDoc | null;
  failedSymbols: ReadonlySet<string>;
  onSymbolError: (code: string) => void;
  card: React.RefObject<HoverCardHandle | null>;
}) {
  const { year, doc, tense, query, colour, card } = props;
  const scroll = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ l: false, r: false });
  const members = useMemo(() => sortMinisters(doc?.members ?? []), [doc]);
  const hits = members.filter(m => memberMatches(query, m)).length;

  const updateFades = useCallback(() => {
    const s = scroll.current;
    if (!s) return;
    const max = s.scrollWidth - s.clientWidth, more = max > 2;
    setFade(f => {
      const n = { l: more && s.scrollLeft > 2, r: more && s.scrollLeft < max - 2 };
      return n.l === f.l && n.r === f.r ? f : n;
    });
  }, []);

  /* The row count is whatever fits: the tallest card against the belt's live
     height, so a short window re-flows the cards instead of clipping a row. */
  const fitRows = useCallback(() => {
    const s = scroll.current;
    if (!s) return;
    const cards = s.querySelectorAll('.belt-card');
    if (!cards.length || !s.clientHeight) return;
    let maxH = 0;
    for (const c of cards) maxH = Math.max(maxH, c.getBoundingClientRect().height);
    const gap = parseFloat(getComputedStyle(s).rowGap) || 0;
    s.style.setProperty('--belt-rows', String(Math.max(1, Math.floor((s.clientHeight + gap) / (maxH + gap)))));
  }, []);

  useLayoutEffect(() => { fitRows(); updateFades(); }, [members, fitRows, updateFades]);
  useEffect(() => {
    const s = scroll.current;
    if (!s) return;
    let t: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(fitRows, 60); });
    ro.observe(s);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [fitRows, members.length]);

  /* A match can sit off the right edge of the strip, so a query takes the reader
     to the first one. Horizontal only, and instant. */
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

  if (year == null) return <section className="belt" id="belt" aria-label="Union council of ministers" hidden />;

  const empty = !members.length;
  const symbolFor = (code: string | undefined) => {
    const s = code ? props.symbols?.symbols?.[code] : undefined;
    return s?.file && code && !props.failedSymbols.has(code) ? DATA + s.file : null;
  };

  const showCab = (m: Minister, x: number, y: number) => {
    const list = portfolioList(m.portfolio || m.role || '');
    const seat = seatLabel(m);
    card.current?.show(
      <>
        {m.rank && RANK_LABEL[m.rank] && <p className="sub">{RANK_LABEL[m.rank]}</p>}
        <h2>{titleCase(m.name)}</h2>
        {seat && <p className="meta">{seat}{m.party ? ' · ' + m.party : ''}</p>}
        {list.length > 0 && <ul className="min-list">{list.map((min, i) => <li key={i}>{min}</li>)}</ul>}
      </>, x, y);
  };

  return (
    <section className="belt" id="belt" aria-label="Union council of ministers">
      <div className="belt-head">
        <h2 className="belt-title" id="belt-title">Union council of ministers · {year}</h2>
        <span className="belt-asof" id="belt-asof">
          {empty || !doc ? '' : tense === 'elected'
            ? `as sworn in · ${doc.swornIn}`
            : `as it stands · ${doc.asOf ? `as of ${doc.asOf}` : `fetched ${doc.fetchedAt}`}`}
        </span>
      </div>
      <SearchBox
        boxId="find-min" id="search-min" label="Find minister" placeholder="e.g. Amit Shah, Railways"
        ariaLabel="Find a minister" value={props.input} hidden={empty}
        count={query ? `${hits} of ${members.length}` : ''} onChange={props.onInput}
      />
      <div className={'belt-view' + (fade.l ? ' more-l' : '') + (fade.r ? ' more-r' : '')} hidden={empty}>
        <div
          className="belt-scroll" id="belt-scroll" ref={scroll} tabIndex={0} role="region"
          aria-label="Council of ministers. Use the arrow keys to scroll."
          onScroll={updateFades}
          onPointerOver={e => {
            const c = e.target instanceof Element ? e.target.closest<HTMLElement>('.belt-card') : null;
            if (!c) return;
            /* The float card reads the text (name, ministry, seat), not the face. */
            if ((e.target as Element).closest('.belt-face')) { card.current?.hide(); return; }
            const m = members[Number(c.dataset.idx)];
            if (m) showCab(m, e.clientX, e.clientY);
          }}
          onPointerLeave={() => card.current?.hide()}
        >
          {members.map((m, i) => {
            const cp = compactPortfolio(m.portfolio || m.role || '');
            const seat = seatLabel(m);
            const sym = symbolFor(m.party);
            const name = titleCase(m.name);
            return (
              <div key={`${m.name}-${i}`} className={'belt-card' + (query && !memberMatches(query, m) ? ' dim' : '')} data-idx={i}>
                <div className="belt-face"><Monogram name={m.name} colour={colour(m.party ?? "")} /></div>
                <OfficialPhotoLink house={m.house} mpsno={m.mpsno} />
                <p className="belt-name" title={name}>{name}</p>
                {cp.main && (
                  <p className="belt-role"><span className="belt-role-main">{cp.main}</span>
                    {cp.plus > 0 && <span className="belt-plus" aria-hidden="true">+{cp.plus}</span>}</p>
                )}
                {seat && (
                  <span className="belt-seat">
                    {sym
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img className="belt-sym" src={sym} alt="" loading="lazy" onError={() => props.onSymbolError(m.party!)} />
                      : <Swatch colour={colour(m.party ?? '')} />}
                    {seat}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="void" id="belt-void" hidden={!empty}>
        <p>{empty ? notAvailable(`the ${year} council of ministers ${tense === 'elected' ? 'as sworn in' : 'as it stands'}`, PRESIDENT) : ''}</p>
      </div>
    </section>
  );
}
