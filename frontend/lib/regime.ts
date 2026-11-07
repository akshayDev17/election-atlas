/* A nation's political regime as V-Dem's Regimes of the World (RoW) rates it,
   for the pill on the nation's card on the /elections country list and the
   dialog behind it (frontend/landing/render.mjs reads this module by the card's
   ISO code; node strips the types). Nothing on the nation's own page shows it.

   The tier is data, not markup. Each nation's tier below is the V-Dem RoW 2025
   value (V-Dem v16, released 2026; data year 2025), read as Our World in Data
   publishes it: https://ourworldindata.org/grapher/political-regime
   ("V-Dem (2026) – processed by Our World in Data", last updated 2026-03-17).
   The classification itself is Lührmann, Tannenberg & Lindberg (2018),
   https://doi.org/10.17645/pag.v6i1.1214, coded by V-Dem as v2x_regime
   (V-Dem Codebook v16, March 2026, section 5.1.1).

   The tier texts paraphrase the codebook's v2x_regime responses and aggregation
   rules and the 2018 article's Table 1 and Figure 1. Nothing here is a criterion
   V-Dem does not use. */

export type RegimeTierId = 'closed-autocracy' | 'electoral-autocracy' | 'electoral-democracy' | 'liberal-democracy';

export type RegimeTier = {
  id: RegimeTierId;
  /* As V-Dem writes it: "Electoral autocracy". */
  label: string;
  /* V-Dem's own colour for the tier, exactly: the legend swatch fill of Figure 4,
     "Regimes of the World, 2025", in the V-Dem Democracy Report 2026 (p. 10),
     read from the fill operators of the legend rectangles in the PDF's vector
     content (the page's own raster image, sampled at the swatch centres, agrees
     to within one unit). The report's convention: autocracies in reds (closed
     darkest), democracies in blues (liberal darkest). The pill's fill, border
     and the dialog's tier markers are this value, flat, in a light theme
     (landing/render.mjs writes the CSS from this list); regime.test.ts pins
     the four. */
  colour: string;
  /* The same tier on the dark theme's card, from `colour` by one rule: the same
     OKLCH hue and chroma, with the lightness set above the dark card (Classic
     Dark --card #1B2032, L 0.248) by 0.8 of the distance V-Dem's hex sits below
     the white card, L' = 0.248 + 0.8 × (1 − L), and the chroma reduced only as
     far as sRGB needs. Each tier keeps its distance from its ground, so the two
     extremes stay the most emphatic, as on white; 0.8 is the smallest scale at
     which every fill reads against the dark card at 3:1 or better and every
     `inkDark` reaches AA. */
  colourDark: string;
  /* The pill's text on `colour`: white or the site's darkest ink (#0F1220),
     whichever contrasts more; every pair is WCAG AA (4.5:1) or better, which
     regime.test.ts measures. */
  ink: string;
  /* The pill's text on `colourDark`, chosen the same way. */
  inkDark: string;
  /* What a regime in this tier has, in V-Dem's terms (codebook v16, v2x_regime). */
  criteria: string;
  /* The measured cut-offs V-Dem applies (codebook v16, v2x_regime, "Aggregation"). */
  cutoffs: string;
};

export const REGIME_TIERS: readonly RegimeTier[] = [
  {
    id: 'closed-autocracy', label: 'Closed autocracy', colour: '#78130d', colourDark: '#f88b7b', ink: '#ffffff', inkDark: '#0f1220',
    criteria: 'No multi-party elections for the chief executive or the legislature: either the legislature is not chosen in multi-party elections, or the chief executive is not elected, directly or indirectly, through them.',
    cutoffs: 'No basic multi-party competition in elections (1 of 4 or lower on V-Dem’s multi-party elections indicator), or no legislative or executive elections at all.',
  },
  {
    id: 'electoral-autocracy', label: 'Electoral autocracy', colour: '#b27570', colourDark: '#995f5a', ink: '#0f1220', inkDark: '#ffffff',
    criteria: 'Multi-party elections for the chief executive and the legislature exist in law, but the country fails at least one democratic test: the elections are not free and fair, competition between parties is not real in practice, or the country falls short of V-Dem’s minimum for Dahl’s requisites of polyarchy on its Electoral Democracy Index (suffrage, clean elections, an elected executive, freedom of expression and alternative sources of information, and freedom of association).',
    cutoffs: 'Above 1 of 4 on multi-party elections, but not above 2 of 4 on both multi-party and free-and-fair elections, or not above 0.5 on the Electoral Democracy Index.',
  },
  {
    id: 'electoral-democracy', label: 'Electoral democracy', colour: '#766f95', colourDark: '#8079a0', ink: '#ffffff', inkDark: '#0f1220',
    criteria: 'Multi-party elections that are free and fair in practice, and at least V-Dem’s minimum for Dahl’s requisites of polyarchy on the Electoral Democracy Index, but at least one liberal requirement is not met: equal access to justice for men and women, transparent and predictable enforcement of the law, or the liberal principles V-Dem measures on its Liberal Component Index (respect for personal liberties, the rule of law, and judicial and legislative constraints on the executive).',
    cutoffs: 'Above 2 of 4 on multi-party elections and on free-and-fair elections, and above 0.5 on the Electoral Democracy Index, without meeting every liberal cut-off below.',
  },
  {
    id: 'liberal-democracy', label: 'Liberal democracy', colour: '#1f0561', colourDark: '#c5c7ff', ink: '#ffffff', inkDark: '#0f1220',
    criteria: 'Everything an electoral democracy has, and the liberal requirements too: access to justice for men and women, transparent enforcement of the law, and the liberal principles of respect for personal liberties, the rule of law, and judicial and legislative constraints on the executive.',
    cutoffs: 'The electoral democracy cut-offs, plus above 0.8 on the Liberal Component Index and above 3 of 4 on transparent law enforcement and on access to justice for men and for women.',
  },
];

/* The V-Dem release the tiers are read from. */
export const VDEM = {
  version: 'v16',
  released: 2026,
  dataYear: 2025,
  /* Where the tier values were read (OWID's chart of V-Dem v16). */
  dataURL: 'https://ourworldindata.org/grapher/political-regime',
  /* The classification's sources, for the dialog's reading list. */
  codebookURL: 'https://www.v-dem.net/documents/70/codebook_v16.pdf',
  articleURL: 'https://doi.org/10.17645/pag.v6i1.1214',
  articleCitation: 'Lührmann, Tannenberg & Lindberg (2018), “Regimes of the World (RoW): Opening New Avenues for the Comparative Study of Political Regimes”, Politics and Governance 6(1), 60–77',
  reportURL: 'https://www.v-dem.net/documents/75/V-Dem_Institute_Democracy_Report_2026_lowres.pdf',
  reportCitation: 'V-Dem Institute, Democracy Report 2026, “Unraveling the Democratic Era?”, Table 1 and Figure 4',
  /* V-Dem's own country graphing tool. It selects a country only on the page
     (a form field posted to its API), so it has no per-nation address. */
  countryGraphURL: 'https://www.v-dem.net/data_analysis/CountryGraph/',
} as const;

export type NationRegime = {
  name: string;
  tier: RegimeTierId;
  /* The nation's own page on the data source, for the pill's external link.
     v-dem.net has no stable per-nation URL (see VDEM.countryGraphURL), so this
     is Our World in Data's per-country view of the same V-Dem series. */
  externalURL: string;
  externalLabel: string;
};

/* The nations the atlas has a page for, by ISO alpha-2 code (the country list's
   `c.code`). V-Dem RoW 2025 tier as read from VDEM.dataURL. */
export const NATION_REGIMES: Readonly<Record<string, NationRegime>> = {
  IN: {
    name: 'India', tier: 'electoral-autocracy',
    externalURL: 'https://ourworldindata.org/grapher/political-regime?country=~IND',
    externalLabel: 'India’s V-Dem rating on Our World in Data (opens in a new tab)',
  },
};

export function regimeTier(id: RegimeTierId): RegimeTier {
  const tier = REGIME_TIERS.find(t => t.id === id);
  if (!tier) throw new Error(`unknown regime tier ${id}`);
  return tier;
}

/* The pill's text: "V-Dem · Electoral autocracy". */
export function regimePillText(nation: NationRegime): string {
  return `V-Dem · ${regimeTier(nation.tier).label}`;
}
