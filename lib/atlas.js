/* Shared by the four atlas pages: optional data, the "not available yet" state,
   and member monograms. */

/* A data file that may legitimately be missing. Never throws:
     { ok: true, doc }            the file, parsed
     { ok: false, reason: 'absent' } the server answered 404
     { ok: false, reason: 'error' }  a network failure, another status, or bad JSON */
export async function fetchOptional(url) {
  let r;
  try { r = await fetch(url); } catch { return { ok: false, reason: 'error' }; }
  if (r.status === 404) return { ok: false, reason: 'absent' };
  if (!r.ok) return { ok: false, reason: 'error' };
  try { return { ok: true, doc: await r.json() }; } catch { return { ok: false, reason: 'error' }; }
}

/* data/availability.json says which optional files exist, so a page never has to
   probe for one. If the index itself cannot be read, every optional file reads
   as not available: the page shows "not available yet" rather than guessing. */
export async function loadAvailability(dataRoot) {
  const res = await fetchOptional(dataRoot + 'availability.json');
  return res.ok ? res.doc : {};
}
export const byelAvailable = (av, year) => !!(av.ls && av.ls.byel && av.ls.byel[year]);
export const lsDetailAvailable = (av, year) => !!(av.ls && av.ls.detail && av.ls.detail[year]);
export const unionRoster = (av, year) =>
  (av.cabinet && av.cabinet.union && av.cabinet.union[year]) || { sworn_in: false, as_it_stands: false };
export const stateRoster = (av, state, cycle) =>
  (av.cabinet && av.cabinet.state && av.cabinet.state[state] && av.cabinet.state[state][cycle]) ||
  { sworn_in: false, as_it_stands: false };
/* The state's real assembly cycles, oldest first, each with whether it is present. */
export const acCycles = (av, state) =>
  Object.entries((av.ac && av.ac[state] && av.ac[state].cycles) || {})
    .map(([y, ok]) => ({ year: Number(y), ok: !!ok }))
    .sort((a, b) => a.year - b.year);
export const listed = (av, kind, state, key) =>
  !!(av[kind] && av[kind][state] && av[kind][state].includes(key));
export const membersAvailable = (av, year) => !!(av.members && av.members.ls && av.members.ls[year]);

/* The one sentence a view shows when its data has not been added. It names what
   is missing and who publishes it; it never shows a number, a name or a zero. */
export const notAvailable = (what, publisher, verb = 'has') =>
  `Not available yet — ${what} ${verb} not been added from ${publisher}.`;
export const voidHTML = (what, publisher, verb = 'has') =>
  `<div class="void"><p>${notAvailable(what, publisher, verb)}</p></div>`;

export const ECI = 'the Election Commission of India';
export const PRESIDENT = 'the President’s Secretariat';
export const CMO_UP = 'the Chief Minister’s Office, Uttar Pradesh';

/* A year button with no data stays in its row, marked rather than removed, so an
   old link carrying that year still lands on a working page. */
export function markUnavailable(btn, title) {
  btn.setAttribute('aria-disabled', 'true');
  btn.title = title;
  btn.classList.add('na');
}

/* ── members: initials, never a stored portrait ────────────────────────
   The atlas keeps no member photographs. A member is shown as their initials on
   their party's colour, with a link to their official page on sansad.in, where
   the photograph is published. */
export const initials = name =>
  String(name || '').replace(/^(shri|smt|dr|prof)\.?\s+/i, '').split(/[\s,]+/)
    .filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

/* Dark or light lettering, whichever reads on the party colour (#rgb or #rrggbb). */
export function inkOn(colour) {
  let h = String(colour || '').replace('#', '');
  if (h.length === 3) h = h.replace(/./g, c => c + c);
  if (!/^[0-9a-f]{6}$/i.test(h)) return '';
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#1a1a1a' : '#ffffff';
}

export const monogramHTML = (name, colour) => {
  const ink = inkOn(colour);
  const style = ink ? ` style="--mono-bg:${colour};--mono-ink:${ink}"` : '';
  return `<span class="monogram" aria-hidden="true"${style}>${initials(name)}</span>`;
};

export const SANSAD_RS_MINISTERS = 'https://sansad.in/rs/members/in-council-of-ministers';

/* The member's official page on sansad.in: a Lok Sabha member's biography by their
   Sansad member number (mpsno); a Rajya Sabha minister, whose per-member page the
   atlas holds no id for, the Rajya Sabha list of ministers. '' when neither is
   known: the link is left out rather than pointed at a guess. */
export function sansadMemberURL(house, mpsno) {
  if (house === 'rs') return SANSAD_RS_MINISTERS;
  return /^\d+$/.test(String(mpsno || ''))
    ? `https://sansad.in/ls/members/biography/${mpsno}?locale=en` : '';
}

export function officialPhotoHTML(house, mpsno) {
  const href = sansadMemberURL(house, mpsno);
  return href
    ? `<span class="photo-link"><a href="${href}" target="_blank" rel="noopener">View official photo on sansad.in ↗</a></span>`
    : '';
}
