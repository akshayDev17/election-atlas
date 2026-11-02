'use client';
/* One member of Parliament: their seat and who holds it, their MPLADS fund and
   works, their Lok Sabha record, and the assembly seats under the constituency.
   Each section stands on its own: the Sansad record and the MPLADS file exist for
   some constituencies only, and availability.json says which, so a missing one
   shows "not available yet" and never stops the rest of the page. */
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { countOf, fold, getListed, listed, loadAvailability, lsDetailAvailable, membersAvailable, nf, titleCase } from '@/lib/atlas';
import { DATA, pageURL } from '@/lib/base';
import {
  MPLADS_MISSING, QUESTIONS_PAGE, QUESTION_FILTERS, RECORD_MISSING, WORKS_PAGE, WORK_FILTERS,
  answerOf, assemblySeats, caveatText, cr, filterQuestions, filterWorks, findSeat, fmtDate, fundModel,
  pageOf, parseQuery, recordModel, resolveMember, stageKey, stageLabel, winnerOf,
  type AcTopo, type DetailDoc, type Gauge, type MembersDoc, type MpladsDoc, type ParliamentDoc, type PcTopo,
  type QuestionFilter, type WorkFilter,
} from '@/lib/mp';
import type { PartiesDoc, RegionsDoc, SymbolsDoc } from '@/lib/types';
import { Monogram, OfficialPhotoLink } from './Member';
import { Pager } from './Pager';
import { ThemePicker } from 'site-themes/react';

type Query = { S: string; C: string };
type Loaded = {
  par: ParliamentDoc | null;
  mplads: MpladsDoc | null;
  parties: PartiesDoc;
  symbols: SymbolsDoc;
  results: DetailDoc | null;
  regionName: string;
  pcTopo: PcTopo | null;
  acTopo: AcTopo | null;
  members: MembersDoc | null;
};

async function loadMp({ S, C }: Query): Promise<Loaded> {
  const avail = await loadAvailability(DATA);
  const s = encodeURIComponent(S), c = encodeURIComponent(C);
  const [par, mplads, parties, symbols, coverage, results, pcTopo, regions, members] = await Promise.all([
    getListed<ParliamentDoc>(listed(avail, 'parliament', S, C), `${DATA}parliament/${s}/${c}.json`),
    getListed<MpladsDoc>(listed(avail, 'mplads', S, C), `${DATA}mplads/${s}/${c}.json`),
    getListed<PartiesDoc>(true, `${DATA}parties.json`),
    getListed<SymbolsDoc>(true, `${DATA}parties-symbols.json`),
    getListed<{ checked?: Record<string, unknown> }>(true, `${DATA}geo/ac/coverage.json`),
    getListed<DetailDoc>(lsDetailAvailable(avail, 2024), `${DATA}results/ls/detail/2024.json`),
    getListed<PcTopo>(true, `${DATA}geo/ls/${s}.json`),
    getListed<RegionsDoc>(true, `${DATA}regions.json`),
    getListed<MembersDoc>(membersAvailable(avail, '2024'), `${DATA}members/ls/2024.json`),
  ]);
  const acTopo = await getListed<AcTopo>(!!coverage?.checked?.[S], `${DATA}geo/ac/${s}.json`);
  return {
    par, mplads, results, pcTopo, acTopo, members,
    parties: parties ?? { parties: [], fallback: { name: '', colour: '#888' } },
    symbols: symbols ?? { symbols: {} },
    regionName: regions?.regions.find(r => r.code === S)?.name ?? '',
  };
}

export default function MpView() {
  const [query, setQuery] = useState<Query | null>(null);
  const [data, setData] = useState<Loaded | null>(null);
  const [worksFilter, setWorksFilter] = useState<WorkFilter>('All');
  const [worksPage, setWorksPage] = useState(0);
  const [qFilter, setQFilter] = useState<QuestionFilter>('All');
  const [qPage, setQPage] = useState(0);

  useEffect(() => {
    let live = true;
    const q = parseQuery(location.search);
    setQuery(q);
    loadMp(q).then(d => { if (live) setData(d); });
    return () => { live = false; };
  }, []);

  const member = useMemo(() => {
    if (!query || !data) return null;
    const seat = findSeat(data.pcTopo, query.S, query.C);
    const seatKey = seat?.unique_id ?? '';
    return resolveMember({
      key: query.C, par: data.par, seat,
      winner: winnerOf(data.results, seatKey),
      lsMember: (seatKey && data.members?.members?.[seatKey]) || null,
      regionName: data.regionName, now: new Date(),
    });
  }, [query, data]);

  useEffect(() => {
    if (member) document.title = `${member.constituency} — Election Atlas of India`;
  }, [member]);

  const colour = (code: string): string =>
    data?.parties.parties.find(p => p.code === code)?.colour || data?.parties.fallback?.colour || '#888';
  const symbolSrc = (code: string): string | null => {
    const f = data?.symbols.symbols?.[code]?.file;
    return f ? DATA + f : null;
  };

  const fund = useMemo(() => (data?.mplads ? fundModel(data.mplads) : null), [data]);
  const works = useMemo(() => data?.mplads?.works ?? [], [data]);
  const worksView = pageOf(filterWorks(works, worksFilter), worksPage, WORKS_PAGE);
  const record = useMemo(() => (data?.par ? recordModel(data.par) : null), [data]);
  const qView = record ? pageOf(filterQuestions(record.questions, qFilter), qPage, QUESTIONS_PAGE) : null;
  const acs = useMemo(() => (data && member ? assemblySeats(data.acTopo, member.constituency) : null), [data, member]);

  const loaded = !!data && !!member;
  const party = member?.party ?? '';
  const sym = party ? symbolSrc(party) : null;

  return (
    <>
      <div className="page">
        <header className="mh">
          <a className="back" id="back" href={pageURL('state', { s: query?.S })}>← State</a>
          <div className="mh-tools">
            <p className="lbl">Election Atlas of India</p>
            <ThemePicker hideLabel />
          </div>
        </header>
        <hr className="hair" />

        <div>
          <h1 className="title" id="p-const">{member?.constituency ?? '—'}</h1>
          <p className="sub" id="p-sub">
            {member ? `Parliamentary constituency · ${member.stateName} · 18th Lok Sabha` : 'Parliamentary constituency'}
          </p>
        </div>

        <div className="hero">
          <div className="portrait">
            <div className="face" id="p-face">{member?.name && <Monogram name={member.name} colour={colour(party)} />}</div>
            <span id="p-credit">{member?.name && <OfficialPhotoLink house="ls" mpsno={member.mpsno} />}</span>
          </div>
          <div className="ident">
            <div className="who" id="p-who" hidden={loaded && !party}>
              <span id="p-sym">
                {party && (sym
                  ? <img className="psym" src={sym} alt={`${party} symbol`} />
                  : <span className="psym" style={{ width: 11, height: 11, borderRadius: 2, background: colour(party), display: 'inline-block' }} />)}
              </span>
              <span className="lbl" id="p-party">
                {party ? (data?.parties.parties.find(p => p.code === party)?.name || party) : ''}
              </span>
            </div>
            <p className="name" id="p-name">{member?.nameLine ?? '—'}</p>
            <p className="role" id="p-role">{member?.roleLine ?? '—'}</p>
            <p className="srcrow" id="p-src">
              {member && <>Profile: <a className="src" href={member.profileURL} target="_blank" rel="noopener">sansad.in ↗</a></>}
            </p>
          </div>
        </div>

        <p className="caveat" id="caveat">{data && member ? caveatText(!!data.par, !!data.mplads) : ''}</p>

        <section className="block">
          <h3>Development fund · MPLADS · 18th Lok Sabha</h3>
          <div id="mplads-body">
            {loaded && !fund ? (
              <div className="void"><p>{MPLADS_MISSING}</p></div>
            ) : (
              <>
                <p className="srcrow" id="mplads-src">
                  {fund && <>Source: <a className="src" href="https://mplads.mospi.gov.in/digigov/dashboard.html" target="_blank" rel="noopener">eSAKSHI MPLADS portal ↗</a></>}
                </p>
                <div className="fund" id="fund">
                  {fund?.steps.map(f => (
                    <div className="fstep" key={f.k}>
                      <span className="k">{f.k}</span>
                      <span className="v">{f.v}{f.s && <span className="s">{f.s}</span>}</span>
                    </div>
                  ))}
                </div>
                <div className="gauges" id="gauges">
                  {fund?.gauges.map(g => <GaugeDial key={g.id} gauge={g} />)}
                </div>
                <p className="srcrow" id="where-label" style={{ marginTop: 'var(--s4)' }}>{fund ? 'Where it goes' : ''}</p>
                <div className="bd" id="bd">
                  {fund?.panels.map(p => (
                    <div className="panel" key={p.k}>
                      <span className="pk">{p.k}</span>
                      {p.rows.map(r => (
                        <div key={r.label}>
                          <div className="brow"><span className="bl">{r.label}</span><span className="bv">{cr(r.value)}</span></div>
                          <div className="bar"><i className={r.cls} style={{ width: `${r.pct}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="block" id="works-block" hidden={loaded && !fund}>
          <h3 id="works-heading">{fund ? `Works · ${works.length} recommended` : 'Works'}</h3>
          <div className="whead">
            <div className="wfilters" id="works-filters">
              {fund && WORK_FILTERS.map(f => (
                <button key={f} type="button" className={f === worksFilter ? 'wf on' : 'wf'} data-wf={f}
                  onClick={() => { setWorksFilter(f); setWorksPage(0); }}>{f}</button>
              ))}
            </div>
          </div>
          <table id="works-table">
            {fund && (
              <>
                <thead><tr><th>Work</th><th>Recommended</th><th>Stage</th><th>Date</th></tr></thead>
                <tbody>
                  {worksView.rows.map((w, i) => (
                    <tr key={`${worksFilter}-${worksView.page}-${i}`}>
                      <td>
                        <div className="wdesc">{titleCase(w.description)}</div>
                        <div className="wmeta">{titleCase(w.category)} · {titleCase(w.agency)}</div>
                      </td>
                      <td className="amt">₹{nf(w.recommended_amount || 0)}</td>
                      <td><span className={`stage ${stageKey(w.stage)}`}>{stageLabel(w.stage)}</span></td>
                      <td className="wdate">{w.recommended_date || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
          <Pager id="works-pager" label="Works pages" page={worksView.page} count={fund ? worksView.count : 1} onPage={setWorksPage} />
        </section>

        <section className="block">
          <h3>In the Lok Sabha · 18th Lok Sabha</h3>
          <div id="ls-body">
            {loaded && !record ? (
              <div className="void"><p>{RECORD_MISSING}</p></div>
            ) : (
              <>
                <div className="ls-stats" id="ls-stats">
                  {record && (
                    <>
                      <div className="ls-stat">
                        <span className="ls-num" style={{ color: record.attGood ? 'var(--good)' : 'var(--bad)' }}>{record.attPct.toFixed(1)}%</span>
                        <span className="ls-cap">Attendance · {record.signedDays} of {record.totalDays} {record.totalDays === 1 ? 'day' : 'days'}</span>
                        <div className="att-bar">
                          <span className={record.attGood ? 'att-fill good' : 'att-fill'} style={{ width: `${record.attPct}%` }} />
                          <span className="att-tick" style={{ left: '85%' }}><span>good ≥85%</span></span>
                        </div>
                      </div>
                      <div className="ls-stat">
                        <span className="ls-num">{record.questions.length}</span>
                        <span className="ls-cap">Questions · {record.unstarred} unstarred · {record.starred} starred</span>
                      </div>
                      <div className="ls-stat">
                        <span className="ls-num">{record.bills.length}</span>
                        <span className="ls-cap">Private member bills · all pending</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="qhead">
                  <span className="qhead-label" id="bills-label">{record ? `Bills · ${record.bills.length}` : 'Bills'}</span>
                  <a className="src" href="https://sansad.in/ls/legislation/bills" target="_blank" rel="noopener">bills on sansad.in ↗</a>
                </div>
                <div className="bills" id="bills">
                  {record && (record.bills.length ? record.bills.map((b, i) => (
                    <div className="bill" key={i}>
                      <span className="bill-no">No. {b.billNumber ?? ''}</span>
                      <div className="bill-body">
                        <span className="bill-title">{b.billName || ''}</span>
                        <span className="bill-meta">
                          {b.introducedOn || ''} · {b.status || 'Pending'} ·{' '}
                          <a className="src" href={b.sourceUrl || 'https://sansad.in/ls/legislation/bills'} target="_blank" rel="noopener">official text ↗</a>
                        </span>
                      </div>
                    </div>
                  )) : <p className="srcrow">No private member bills on record.</p>)}
                </div>
                <div className="qhead">
                  <span className="qhead-label" id="q-label">{record ? `Questions · ${record.questions.length}` : 'Questions'}</span>
                  <a className="src" href="https://sansad.in/ls/questions/questions-and-answers" target="_blank" rel="noopener">questions on sansad.in ↗</a>
                </div>
                <div className="wfilters" id="q-filters">
                  {record && QUESTION_FILTERS.map(f => (
                    <button key={f} type="button" className={f === qFilter ? 'wf on' : 'wf'} data-qf={f}
                      onClick={() => { setQFilter(f); setQPage(0); }}>{f}</button>
                  ))}
                </div>
                <div className="qs" id="questions">
                  {qView?.rows.map((q, i) => {
                    const ans = answerOf(q.replyText);
                    return (
                      <div className="q" key={`${qFilter}-${qView.page}-${i}`}>
                        <span className="q-type">{titleCase(q.type)}</span>
                        <div className="q-body">
                          <span className="q-title">{q.subject}</span>
                          <span className="q-meta">
                            {titleCase(q.ministry)} · {fmtDate(q.date)} ·{' '}
                            <a className="src" href={q.pdfUrl || q.sourceUrl || ''} target="_blank" rel="noopener">official Q&amp;A ↗</a>
                          </span>
                          {ans && <Answer label={ans.label} body={ans.body} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Pager id="q-pager" label="Questions pages" page={qView?.page ?? 0} count={qView?.count ?? 1} onPage={setQPage} />
              </>
            )}
          </div>
        </section>

        <section className="block">
          <h3 id="ac-heading">{acs && acs.length ? `Made of ${countOf(acs.length, 'assembly seat')}` : 'Assembly seats'}</h3>
          <div className="cross ac-list" id="ac-cross">
            {loaded && (acs === null ? 'Assembly seats unavailable for this state.'
              : !acs.length ? 'No assembly seats matched this constituency.'
              : acs.map((s, i) => (
                <Fragment key={`${s.no}-${s.ac}`}>
                  {i > 0 && <span style={{ color: 'var(--muted)' }}> · </span>}
                  <a href={pageURL('mla', { s: query?.S, c: fold(s.ac) })}>{s.ac}</a>
                </Fragment>
              )))}
          </div>
        </section>

        <section className="block">
          <h3>In the news</h3>
          <div className="void"><p>No news yet — the news fetcher isn't built. This section will hold a bounded, sourced list per MP once it is.</p></div>
        </section>
      </div>
      <footer className="credits"><p>Member photos: linked to sansad.in, not stored here. Party symbols: Wikimedia Commons contributors (<a href={`${DATA}parties-symbols.json`}>licences listed</a>).</p></footer>
    </>
  );
}

/* ── gauge ────────────────────────────────────────────────────────────── *
 * The needle sweeps from zero to the figure once the gauge is mostly on screen
 * (or after 600 ms regardless); with reduced motion it is set at once. */
const G_CX = 110, G_CY = 112, G_R = 74;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const GRADIENTS = {
  fun: ['var(--good)', 'var(--caution)', 'var(--bad)'],
  work: ['var(--bad)', 'var(--caution)', 'var(--good)'],
} as const;

function GaugeDial({ gauge }: { gauge: Gauge }) {
  const el = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(0);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const target = gauge.pct / 100;
    let started = false, raf = 0;
    const start = () => {
      if (started) return;
      started = true;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return; }
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / 1200);
        setV(target * ease(t));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { start(); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(node);
    const timer = setTimeout(start, 600);
    return () => { io.disconnect(); clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [gauge.pct]);

  const angle = Math.PI * (1 - v);
  const [g0, g1, g2] = GRADIENTS[gauge.id];
  return (
    <div className="gauge" ref={el} data-target={gauge.pct}>
      <svg className="g-svg" viewBox="0 0 220 124" aria-hidden="true">
        <defs>
          <linearGradient id={`gg-${gauge.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={g0} /><stop offset=".5" stopColor={g1} /><stop offset="1" stopColor={g2} />
          </linearGradient>
        </defs>
        <path className="g-arc" d="M 30 112 A 80 80 0 0 1 190 112" stroke={`url(#gg-${gauge.id})`} />
        <line className="g-needle" x1={G_CX} y1={G_CY} x2={G_CX + G_R * Math.cos(angle)} y2={G_CY - G_R * Math.sin(angle)} />
        <circle className="g-hub" cx={G_CX} cy={G_CY} r="4.5" />
      </svg>
      <div className="g-num"><span className="g-val">{(v * 100).toFixed(1)}</span><span className="g-unit">%</span></div>
      <div className="g-cap">{gauge.cap} · {gauge.sub}</div>
    </div>
  );
}

/* ── an answer, clamped to four lines ─────────────────────────────────── *
 * "See full answer" appears only when the clamp actually hides text (measured
 * after layout and again once the web fonts are in). Open, the answer scrolls
 * inside a fixed height with a fade at the bottom until its end is reached. */
function Answer({ label, body }: { label: string; body: string }) {
  const text = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(true);
  const [open, setOpen] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  useLayoutEffect(() => {
    let live = true;
    const measure = () => {
      const t = text.current;
      if (live && t && !t.closest('.q-ans.open')) setOverflows(t.scrollHeight > t.clientHeight + 1);
    };
    measure();
    document.fonts?.ready.then(measure);
    return () => { live = false; };
  }, [body]);

  const updateFade = () => {
    const t = text.current;
    if (t) setAtEnd(t.scrollHeight - t.scrollTop - t.clientHeight < 4);
  };
  useLayoutEffect(() => { if (open) updateFade(); }, [open]);

  return (
    <div className={'q-ans' + (open ? ' open' : '') + (atEnd ? ' at-end' : '')}>
      <span className="q-answered">{label}</span>
      <div className="q-ans-scroll">
        <div className="q-ans-text" ref={text} onScroll={updateFade}>{body}</div>
        <div className="q-ans-fade" aria-hidden="true" />
      </div>
      <button className="q-toggle" type="button" aria-expanded={open} hidden={!overflows && !open} onClick={() => setOpen(o => !o)}>
        <span className="tg" aria-hidden="true">{open ? '−' : '+'}</span>
        <span className="tl">{open ? 'Show less' : 'See full answer'}</span>
      </button>
    </div>
  );
}
