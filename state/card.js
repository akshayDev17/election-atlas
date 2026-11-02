/* The hover card's body for one seat, built only from that seat's own data.
   Returns '' when the seat has nothing to show; the caller then hides the card,
   so a seat never shows another seat's card.

   seat: { which: 'ac' | 'pc', key, name, cands, r (resolved Lok Sabha seat),
           tense, acMissing (cycle not added), noResult (AC listed in the
           file's no_result) }
   fmt:  { colour, nf, pc1, faceFor } */
export function cardBody(seat, fmt) {
  const { which, key, name: nm, cands, r, tense, acMissing, noResult } = seat;
  const { colour, nf, pc1, faceFor } = fmt;
  const byes = (r && r.events) || [];
  if ((!cands || !cands.length) && !byes.length && !(r && r.vacant) && !acMissing && !noResult) return '';
  let body = '';
  if (cands && cands.length) {
    const total = cands.reduce((n, c) => n + c.v, 0);
    const rest = cands.slice(6);
    const restV = rest.reduce((n, c) => n + c.v, 0);
    body =
      `<div class="top"><div class="who">
         <p class="sub">${which === 'ac' ? 'Assembly constituency' : 'Lok Sabha constituency'}</p>
         <h3>${nm}</h3>
         <p class="meta"><span>${cands.length} candidates</span><span>${nf(total)} votes polled</span></p>
       </div>${faceFor(which, key, cands[0] && cands[0].n, cands[0] && cands[0].p)}</div>
       <table><thead><tr><th>Party</th><th>Candidate</th><th>Votes</th><th>Share</th></tr></thead><tbody>` +
      cands.slice(0, 6).map(c =>
        `<tr><td><span class="cell"><i class="sw" style="--c:${colour(c.p)}"></i>${c.p}</span></td>` +
        `<td class="name" title="${c.n}">${c.n}</td>` +
        `<td>${nf(c.v)}</td><td>${pc1(total ? c.v / total : 0)}</td></tr>`).join('') +
      (rest.length ? `<tr class="more"><td>+${rest.length} more</td><td></td><td>${nf(restV)}</td>` +
        `<td>${pc1(total ? restV / total : 0)}</td></tr>` : '') +
      `</tbody></table>`;
  } else if (noResult) {
    /* The report carries no result for this AC (a countermanded poll): its own
       name and number, and that the result is not available yet. */
    body = `<div class="top"><div class="who">
       <p class="sub">Assembly constituency ${key}</p>
       <h3>${nm}</h3>
       <p class="meta"><span>Result not available yet (countermanded or not in this report)</span></p>
     </div></div>`;
  } else if (acMissing) {
    /* The cycle has not been added: the seat's name, and nothing that would read
       as a result. */
    body = `<div class="top"><div class="who">
       <p class="sub">Assembly constituency</p>
       <h3>${nm}</h3>
     </div></div>`;
  } else {
    body = `<div class="top"><div class="who">
       <p class="sub">${which === 'ac' ? 'Assembly constituency' : 'Lok Sabha constituency'}</p>
       <h3>${nm}</h3>
       <p class="meta"><span>Candidate detail not available yet for this year</span></p>
     </div></div>`;
  }
  if (r && r.vacant && tense === 'stands') {
    body += `<p class="vacant-note">Seat vacant — no by-election has been held.</p>`;
  } else if (byes.length && tense === 'stands') {
    body += `<div class="bye"><p class="bye-title">By-elections</p><table><tbody>` +
      byes.map(ev => {
        if (ev.type === 'vacated') return `<tr class="vac"><td>${ev.date}</td><td class="name">Vacated — ${ev.reason}</td></tr>`;
        const w = ev.winner;
        if (!w) return `<tr><td>${ev.date}</td><td class="name">Result not available yet</td></tr>`;
        return `<tr><td>${ev.date}</td><td class="name"><span class="cell"><i class="sw" style="--c:${colour(w.p)}"></i>${w.n} <span class="pcode">${w.p}</span></span></td><td>${nf(w.v)}</td><td>${ev.turnout}%</td></tr>`;
      }).join('') +
      `</tbody></table></div>`;
  }
  return body;
}
