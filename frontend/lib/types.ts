/* The shapes of the data files the pages read. Every file is published data;
   these types cover only the fields a page uses. */

export type Level = {
  id: string;
  geometry: string;
  topologyObject: string;
  geometryKey: string;
  results: string;
};

export type Manifest = {
  levels: Level[];
  elections: {
    ls: { years: number[] };
    ac: { cycles: Record<string, number[]> };
  };
};

export type Region = { code: string; name: string; type: 'state' | 'ut'; sourceNames: string[] };
export type RegionsDoc = { regions: Region[] };

export type Party = { code: string; name: string; colour: string; aliases?: string[] };
export type PartiesDoc = { parties: Party[]; fallback: { code?: string; name: string; colour: string } };

export type SymbolsDoc = { symbols?: Record<string, { file?: string }> };

/* results/ls/pc/{year}.json: the winner of each constituency, its votes, and
   every other party's votes there. */
export type PcRow = { st: string; p: string; v: number; o?: Record<string, number> };
export type PcYearDoc = { year: number; constituencies: Record<string, PcRow> };

/* results/ls/{year}.json: the state-level rollup, the only Lok Sabha result for
   the elections whose boundaries predate the atlas geometry (1980-2004). */
export type PartyTally = { code: string; seats: number; votes: number };
export type StateYearDoc = {
  year: number;
  note?: string;
  regions: Record<string, { seats: number; electors: number | null; parties: PartyTally[] }>;
};

/* results/ls/byel/{year}.json: by-elections and vacancies in a term. */
export type Winner = { n: string; p: string; v: number; o?: Record<string, number> };
export type ByeEvent =
  | { type: 'bye'; date: string; poll?: string; reason?: string; winner: Winner | null; turnout?: number }
  | { type: 'vacated'; date: string; reason?: string };
export type ByeSeat = { uid: string; seat?: string; pc?: string; st?: string; events: ByeEvent[] };
export type ByeDoc = { seats?: ByeSeat[] };

/* cabinet/union/{year}.json (as it stands) and {year}-sworn-in.json. */
export type Minister = {
  name: string;
  rank?: string;
  portfolio?: string;
  role?: string;
  party?: string;
  state?: string;
  constituency?: string;
  house?: string;
  mpsno?: number;
};
export type CabinetDoc = { members?: Minister[]; swornIn?: string; asOf?: string; fetchedAt?: string };

export type Roster = { sworn_in: boolean; as_it_stands: boolean };

/* data/availability.json: which optional files exist (tools/build-availability.py). */
export type Availability = {
  ls?: {
    results?: Record<string, boolean>;
    state?: Record<string, boolean>;
    byel?: Record<string, boolean>;
    detail?: Record<string, boolean>;
  };
  cabinet?: {
    union?: Record<string, Roster>;
    state?: Record<string, Record<string, Roster>>;
  };
  ac?: Record<string, { cycles?: Record<string, boolean> }>;
  parliament?: Record<string, string[]>;
  mplads?: Record<string, string[]>;
  members?: { ls?: Record<string, boolean> };
};
