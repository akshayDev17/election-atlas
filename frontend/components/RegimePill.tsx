/* The V-Dem regime pill in a nation page's masthead: "V-Dem · Electoral
   autocracy" in the tier's colour. The pill is two controls in one shape: the
   text is a button that opens a dialog explaining V-Dem's Regimes of the World
   and its four tiers, with this nation's tier marked, and the slanted arrow
   after it is a link to the nation's own page on the data source, in a new tab.
   (A link cannot sit inside a button, so they are siblings sharing the pill.)

   The dialog is the native <dialog>, opened modally: Escape closes it (the
   browser's cancel), so does a click on the backdrop or the close button, and
   focus returns to the pill's button when it closes. */
import { useCallback, useId, useRef, type MouseEvent, type PointerEvent } from 'react';
import { REGIME_TIERS, VDEM, regimePillText, regimeTier, type NationRegime } from '@/lib/regime';

function outsideBox(e: { clientX: number; clientY: number }, el: HTMLElement | null): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

export function RegimePill({ nation }: { nation: NationRegime }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const id = useId();
  const tier = regimeTier(nation.tier);

  const open = useCallback(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);
  const close = useCallback(() => dialog.current?.close(), []);
  /* Pointer events on the backdrop are dispatched to the <dialog> itself, as
     are those on its own scrollbar and a click whose press and release straddle
     the body and the backdrop (the click goes to their common ancestor). So the
     backdrop closes only when the press and the click both fall outside the
     dialog's box; a keyboard click, at (0,0), never follows an outside press. */
  const pressedOutside = useRef(false);
  const onPointerDown = useCallback((e: PointerEvent<HTMLDialogElement>) => {
    pressedOutside.current = outsideBox(e, dialog.current);
  }, []);
  const onBackdrop = useCallback((e: MouseEvent<HTMLDialogElement>) => {
    const pressed = pressedOutside.current;
    pressedOutside.current = false;
    if (pressed && outsideBox(e, dialog.current)) close();
  }, [close]);
  const onClose = useCallback(() => { opener.current?.focus(); }, []);

  return (
    <>
      <span className="regime" data-tier={tier.id}>
        <button
          ref={opener} type="button" className="regime-btn"
          aria-haspopup="dialog" aria-controls={`${id}-dialog`}
          title="What this rating means"
          onClick={open}
        >{regimePillText(nation)}</button>
        <a
          className="regime-link" href={nation.externalURL} target="_blank" rel="noopener"
          aria-label={nation.externalLabel} title={nation.externalLabel}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
            <path d="M4 12 12 4M5.5 4H12v6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </span>

      <dialog
        ref={dialog} id={`${id}-dialog`} className="regime-dlg" data-tier={tier.id}
        aria-labelledby={`${id}-title`}
        onPointerDown={onPointerDown} onClick={onBackdrop} onClose={onClose}
      >
        <div className="regime-dlg-body">
          <header className="regime-dlg-head">
            <div>
              <p className="lbl">V-Dem · Regimes of the World</p>
              <h2 id={`${id}-title`}>{nation.name} is rated {/^[aeiou]/i.test(tier.label) ? 'an' : 'a'} <span className="regime-own">{tier.label.toLowerCase()}</span></h2>
              <p className="regime-asof">V-Dem {VDEM.version} ({VDEM.released}), data year {VDEM.dataYear}</p>
            </div>
            <button type="button" className="regime-close" aria-label="Close" onClick={close}>×</button>
          </header>

          <p className="regime-intro">
            Regimes of the World (RoW) is the V-Dem Institute’s classification of every country into
            four regime types, year by year since 1900. It follows Lührmann, Tannenberg and Lindberg
            (2018) and is coded from V-Dem’s expert-based indices: first whether a country holds
            de-facto multi-party, free and fair elections and meets a minimum of Dahl’s requisites
            of polyarchy (the democracy line), then whether its liberal guarantees (access to justice,
            the rule of law, courts and legislature that constrain the executive) are met.
          </p>

          <ol className="regime-tiers">
            {REGIME_TIERS.map(t => (
              <li key={t.id} data-tier={t.id} aria-current={t.id === tier.id ? 'true' : undefined}>
                <h3>
                  <span className="regime-dot" aria-hidden="true" />
                  {t.label}
                  {t.id === tier.id && <span className="regime-tag">{nation.name}, {VDEM.dataYear}</span>}
                </h3>
                <p>{t.criteria}</p>
                <p className="regime-cut"><span className="lbl">Cut-offs</span> {t.cutoffs}</p>
              </li>
            ))}
          </ol>

          <footer className="regime-dlg-foot">
            <p className="lbl">Sources</p>
            <ul>
              <li><a href={VDEM.codebookURL} target="_blank" rel="noopener">V-Dem Codebook {VDEM.version}</a>, section 5.1.1, <i>v2x_regime</i> (the tier definitions and cut-offs above are paraphrased from it).</li>
              <li><a href={VDEM.articleURL} target="_blank" rel="noopener">{VDEM.articleCitation}</a>.</li>
              <li><a href={VDEM.reportURL} target="_blank" rel="noopener">{VDEM.reportCitation}</a> (the tier colours are its map legend).</li>
              <li>{nation.name}’s tier as read from <a href={VDEM.dataURL} target="_blank" rel="noopener">Our World in Data’s chart of V-Dem {VDEM.version}</a>; V-Dem’s own <a href={VDEM.countryGraphURL} target="_blank" rel="noopener">Country Graph</a> plots the underlying indices.</li>
            </ul>
          </footer>
        </div>
      </dialog>
    </>
  );
}
