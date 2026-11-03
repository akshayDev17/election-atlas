'use client';
/* One Member of a Legislative Assembly: their seat, the latest added assembly
   result for it (winner, margin, votes, candidates), the Lok Sabha seat it sits
   inside, and the records not yet fetched. A seat with no added result says so
   and shows nothing that would read as one. */
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { acCycles, fetchOptional, loadAvailability, nf, titleCase } from '@/lib/atlas';
import { DATA, pageURL } from '@/lib/base';
import {
  findSeat, formatMargin, heroOf, isMapped, parentSeat, partyLook, readQuery, shownCycle, stateNameOf,
  type AcDetailDoc, type AcTopoDoc, type CoverageDoc, type Hero, type Seat,
} from '@/lib/mla';
import type { PartiesDoc, RegionsDoc, SymbolsDoc } from '@/lib/types';
import { Monogram } from './Member';
import { SitePath } from './SitePath';

type Loaded = {
  state: string;
  stateName: string;
  seat: Seat;
  hero: Hero;
  parties: PartiesDoc | null;
  symbols: SymbolsDoc | null;
};

const docOr = <T,>(res: { ok: true; doc: T } | { ok: false }): T | null => (res.ok ? res.doc : null);

async function loadPage(search: string): Promise<Loaded> {
  const { state, seat: key } = readQuery(search);
  const [avail, coverageRes, partiesRes, symRes, regionsRes] = await Promise.all([
    loadAvailability(DATA),
    fetchOptional<CoverageDoc>(DATA + 'geo/ac/coverage.json'),
    fetchOptional<PartiesDoc>(DATA + 'parties.json'),
    fetchOptional<SymbolsDoc>(DATA + 'parties-symbols.json'),
    fetchOptional<RegionsDoc>(DATA + 'regions.json'),
  ]);
  const stateName = stateNameOf(docOr(regionsRes), state);
  const cycles = acCycles(avail, state);
  const shownYear = shownCycle(cycles);
  /* Only what availability and coverage list is fetched. */
  const [topoRes, detailRes] = await Promise.all([
    isMapped(docOr(coverageRes), state) ? fetchOptional<AcTopoDoc>(`${DATA}geo/ac/${state}.json`) : null,
    shownYear != null ? fetchOptional<AcDetailDoc>(`${DATA}results/ac/${state}/${shownYear}-detail.json`) : null,
  ]);
  const seat = findSeat(topoRes ? docOr(topoRes) : null, key);
  const hero = heroOf({ detail: detailRes ? docOr(detailRes) : null, seatNo: seat.no, shownYear, cycles, stateName });
  return { state, stateName, seat, hero, parties: docOr(partiesRes), symbols: docOr(symRes) };
}

export default function MlaView() {
  const [page, setPage] = useState<Loaded | null>(null);

  useEffect(() => {
    let live = true;
    loadPage(location.search).then(p => { if (live) setPage(p); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (page) document.title = `${page.seat.name} — Election Atlas of India`;
  }, [page]);

  // Without site-shell the site path keeps its fallback, the way back to this
  // seat's state; its link is set here, once the page is read. A composed path
  // has no such link, so this leaves it alone.
  const path = useRef<HTMLElement>(null);
  useEffect(() => {
    if (page) path.current?.querySelector('a.back')?.setAttribute('href', pageURL('state', { s: page.state }));
  }, [page]);

  const hero = page?.hero ?? null;
  const result = hero?.kind === 'result' ? hero : null;
  const look = result ? partyLook(result.winner.p, page!.parties, page!.symbols, DATA) : null;
  const parent = page ? parentSeat(page.seat.pc) : null;

  return (
    <>
      <div className="page">
        <header className="mh">
          <SitePath
            ref={path}
            tail={[{ label: 'India', href: pageURL('') }, { label: 'State' }, { label: 'Assembly seat' }]}
            fallback={`<a class="back" id="back" href="${pageURL('state')}">← State</a>`}
          />
          <div className="mh-tools">
            <p className="lbl">Election Atlas of India</p>
            <site-theme-picker hide-label="" />
          </div>
        </header>
        <hr className="hair" />

        <div>
          <h1 className="title" id="p-const">{page ? page.seat.name : '—'}</h1>
          <p className="sub" id="p-sub">
            {page ? `Assembly constituency · ${page.stateName} Legislative Assembly` : 'Assembly constituency'}
          </p>
        </div>

        <div className="hero">
          <div className="face" id="p-face" hidden={!result}>
            {result && look && <Monogram name={result.winner.n} colour={look.colour} />}
          </div>
          <div className="ident">
            <div className="who" id="p-who" hidden={!result}>
              <span id="p-sym">
                {result && look && (look.symbol
                  ? <img className="psym" src={look.symbol} alt={`${result.winner.p} symbol`} />
                  : <span className="psym" style={swatchStyle(look.colour)} />)}
              </span>
              <span className="lbl" id="p-party">{look?.name ?? ''}</span>
            </div>
            <p className="name" id="p-name">
              {result ? titleCase(result.winner.n) : hero ? 'Result not available yet' : '—'}
            </p>
            <p className="role" id="p-role">
              {result ? `MLA · ${result.year} assembly election` : hero ? 'Member of the Legislative Assembly' : '—'}
            </p>
            <div className="facts" id="p-facts">
              {result && (
                <>
                  <div className="fact"><div className="k">Margin</div><div className="v">{formatMargin(result.marginPct)}</div></div>
                  <div className="fact"><div className="k">Votes</div><div className="v">{nf(result.winner.v)}</div></div>
                  <div className="fact"><div className="k">Candidates</div><div className="v">{result.candidates}</div></div>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="caveat">Results: Election Commission of India statistical reports. Where a view says “not available yet”, that data has not been added. The development fund and Vidhan Sabha record are not yet fetched.</p>

        <div id="result-void" hidden={hero?.kind !== 'missing'}>
          {hero?.kind === 'missing' && <div className="void"><p>{hero.message}</p></div>}
        </div>

        <div className="cross" id="pc-cross">
          {page && (parent ? (
            <>
              <span>↑ this seat sits inside <b>PC — {parent.title}</b></span>
              <span>MP: <a href={pageURL('mp', { s: page.state, c: parent.key })}>{parent.title} →</a></span>
            </>
          ) : 'Parent Lok Sabha seat unknown.')}
        </div>

        <section className="block">
          <h3>Development fund · Vidhayak Nidhi</h3>
          <div className="void"><p>Not yet fetched — the MLA local-area development fund (MLALAD) fetcher doesn&apos;t exist yet.</p></div>
        </section>

        <section className="block">
          <h3>In the Vidhan Sabha</h3>
          <div className="void"><p>Not yet fetched — attendance, questions and bills from the state assembly don&apos;t exist yet.</p></div>
        </section>

        <section className="block">
          <h3>In the news</h3>
          <div className="void"><p>No news yet — the news fetcher isn&apos;t built.</p></div>
        </section>
      </div>
      <footer className="credits"><p>Members are shown by initials. Party symbols: Wikimedia Commons contributors (<a href={`${DATA}parties-symbols.json`}>licences listed</a>).</p></footer>
    </>
  );
}

/* The party-colour square shown where no symbol file is listed. */
const swatchStyle = (colour: string): CSSProperties =>
  ({ width: 11, height: 11, borderRadius: 2, background: colour, display: 'inline-block' });
