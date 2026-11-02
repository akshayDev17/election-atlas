/* "As it stands" for Lok Sabha seats: who holds a seat now, from its
   general-election winner and its by-election events in date order. A
   by-election whose result is not available (winner null) leaves the holder
   unknown rather than falling back to the general-election winner. */
export function resolveSeat(generalP, events) {
  const last = events[events.length - 1];
  if (last && last.type === 'vacated') return { p: null, vacant: true, unknown: false };
  const byes = events.filter(e => e.type === 'bye');
  if (!byes.length) return { p: generalP, vacant: false, unknown: false };
  const w = byes[byes.length - 1].winner;
  return { p: w ? w.p : null, vacant: false, unknown: !w };
}

/* Seats per party as it stands, the real change per party against the general
   election, and how many seats have no known holder. Unknown seats count for no
   party and change no party's figure; together with the party seats and any
   vacancies they add up to the number of seats. */
export function tallyStands(pcRows, byeSeats) {
  const eventsOf = new Map(byeSeats.map(s => [s.uid, s.events]));
  const seats = new Map(), delta = new Map();
  let unknown = 0;
  for (const [uid, c] of Object.entries(pcRows)) {
    const r = resolveSeat(c.p, eventsOf.get(uid) || []);
    if (r.unknown) { unknown++; continue; }
    if (r.p) seats.set(r.p, (seats.get(r.p) || 0) + 1);
    if (r.p === c.p) continue;
    delta.set(c.p, (delta.get(c.p) || 0) - 1);
    if (r.p) delta.set(r.p, (delta.get(r.p) || 0) + 1);
  }
  for (const [p, d] of delta) if (!d) delta.delete(p);
  return { seats, delta, unknown };
}
