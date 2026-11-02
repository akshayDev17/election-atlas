# `data/photos/` — party symbols

The atlas keeps **no member portraits**. Every MP, minister and MLA is shown as
their initials on their party's colour (`monogramHTML` in `lib/atlas.js`, one
helper shared by every page). Each MP and Lok Sabha minister carries a link,
"View official photo on sansad.in", to their own official page on sansad.in,
built from their Sansad member number (`mpsno`):

```
https://sansad.in/ls/members/biography/<mpsno>?locale=en
```

A Rajya Sabha minister, for whom the atlas holds no per-member id, links to the
Rajya Sabha list of ministers (`https://sansad.in/rs/members/in-council-of-ministers`).
A member with neither gets no link rather than a guessed one. The member numbers
live in `data/members/ls/2024.json` (seat → member) and on each minister in
`data/cabinet/union/*.json`.

## Party symbols

`parties/` holds the party images `data/parties-symbols.json` lists, each with its
source article, licence and credit. Images Wikipedia carries only under a
fair-use rationale (DMK, RJD, LJSP) are not kept, because that rationale does not
extend to this site; those parties show their colour swatch instead.
