# `data/members/` — who sits for each seat, by Sansad member number

`ls/2024.json` maps each 2024 Lok Sabha seat, by the geometry `unique_id` of
`data/geo/india-pcs.json` (e.g. `S24_39`; **not** `ls_seat_code`), to its member and
their Sansad member number (`mpsno`). The pages use `mpsno` for one thing: the
"View official photo on sansad.in" link to the member's official page,
`https://sansad.in/ls/members/biography/<mpsno>?locale=en`. No photograph is stored.

## How the join works

The source is the Lok Sabha Secretariat member directory:

```
https://sansad.in/api_ls/member?loksabha=18&size=6000&page=1     (544 records)
```

Seats are matched on **state + constituency name**, folded by lowercasing, dropping
`(SC)` / `(ST)`, folding `&` to `and`, and a short alias table (`Gauhati`→`Guwahati`,
`Pondicherry`→`Puducherry`, `Andaman & Nicobar`→`Andaman and Nicobar Islands`,
`NCT of Delhi`→Delhi). That matches **542 of 542** seats.

## Why this is 2024 only

The directory lists members **currently sitting**, each against the one
constituency they sit for now, so the join is valid for the current term only.
Where a seat has been by-elected since the general election the directory holds
the by-election winner; the build checks every seat against the declared ECI 2024
winner (`data/results/ls/detail/2024.json`) and re-joins such a seat by name. One
seat is affected — **Wayanad** (`S11_4`), won in 2024 by Rahul Gandhi, whose record
sits on Rae Bareli — recorded under `by_election_corrections`.
