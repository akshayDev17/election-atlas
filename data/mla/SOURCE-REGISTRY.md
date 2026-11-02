# Source registry — the conclusion

One working source per section, per state/UT. Hand-maintained as states are reviewed.

This is the **conclusion** the Harvester fetches from. `SOURCES.md` is the **investigation
report** — every URL, evidence, and verification level. When in doubt, read that; but
this file is the single, lean answer, and it is what gets consumed.

## What goes where — the recording rule

Three files, three contracts. A finding lands in exactly one of them, decided by **who reads it
and what they do with it**:

| File | Contract | Holds |
|---|---|---|
| `SOURCE-REGISTRY.md` (this file) | the conclusion the **Harvester** consumes | the working source per section **+ its operational envelope**: method, required params, session/token/lock needs, paging, encoding/**reading mode**, and any trap that changes *how you fetch or read this state* |
| `~/.dsh/skills/verify-state-sources/SKILL.md` | the **method**, for the next verification run | the **generalized** trap — the one that would recur in another state |
| `SOURCES.md` | the **frozen evidence record** | nothing new. **Never edit it.** It captures what the recon found *at the time*; writing later conclusions into it destroys the "recon said X, I verified Y" distinction that every correction in this file depends on |

**The test for a trap:** *would this recur in another state?*
- **Yes** → record the generalized form in `SKILL.md`, and here only what's state-specific.
- **No** → keep it here, on the state's entry, as part of that state's operational envelope.

**Why operational traps belong here and not only in the skill:** the Harvester reads *this* file. A
fetcher that doesn't know "`DistrictId` must come from the dropdown or you get an empty array" or
"break on 0 rows, not on no-Next-button" silently yields nothing and reads as *"this state publishes
no data"* — a false finding, which is the exact failure mode this project keeps getting bitten by.

**What does *not* belong here:** the narrative of how a trap was discovered, the verification
evidence, and failed probe attempts. That is `SOURCES.md`'s job and is already there. Keep each
state's block to *what a fetcher must do differently*.

## Bills

| State/UT | Working source | Kind | Status |
|---|---|---|---|
| Assam | https://assambidhansabha.org/legislation/bills/introduced | official assembly | ✅ **271 bills (267 list-visible + 4 reachable only by id probe)**; ⚠️ **the recorded URL `/home` is a landing page (0 tables, 2 footer PDFs)**; **no bill number and no date exist**; **5 private-members' bills DO exist** (ids 185–189, introducer in the title); the House/Year/Session filters are **dead HTML** |
| Andhra Pradesh | https://aplegislature.org/web/aplegislature/bills | official assembly | ✅ **414 rows across the 3 terms the selector offers — XVI 86 · XV 195 · XIV 133**; ⚠️ **the recorded URL was the profile landing page** (1 table / 2 `<tr>`); **bills are PUBLIC** — only the questions tier is gated; **1 bill → 1–2 documents** (PassedBills + ActBills) |
| Arunachal Pradesh | https://prsindia.org/bills/states?title=&state=Arunachal+Pradesh&year=All | PRS (unofficial) | ⚠️ official text = Gazette |
| Bihar | https://prsindia.org/bills/states?state=Bihar | PRS (unofficial) | ⚠️ convenience only — see tiers below |
| Maharashtra | https://mls.org.in/Vidheyake_Assembly-2026.aspx | official assembly | ✅ per-bill PDFs — English (clean text) + Marathi |
| Gujarat | https://gujarat.neva.gov.in/Bill/GetBillDashBoardData?UnitCode=GJ | official assembly (NeVA) | ⚠️ metadata table; Document links 404 — text via e-Gazette + PRS |
| Rajasthan | https://assembly.rajasthan.gov.in/Containers/Legislation/GovernmentBills.aspx | official assembly | ✅ metadata register (727 bills, Assemblies 10–16); ⚠️ **CORRECTION: the GridView carries per-bill `linkPdfAct` postback links — not "zero bill PDFs"**; bill text + introducer still via PRS |
| Punjab | https://punjabassembly.gov.in/Legislations/IntroducedBills | official assembly | ✅ **best self-sufficient case** — index + bill text + introducer, all on the official host |
| Goa | https://www.goavidhansabha.gov.in/_bills.php?assembly_id={1..14}&member_id=0&session_id=0&billtype_id=0&display_id= | official assembly | ✅ **1,443 cards → 1,357 distinct bills** across 14 assemblies; ⚠️ **`bills.php` is an EMPTY SHELL (0 tables, 0 cards)** — rows are an AJAX fragment at 5/page; **introducer + `mem_id` are in the index**; **1 bill → As Introduced + As Passed is the NORMAL case** (997 rows carry 2); private-member bills stop at the 6th Assembly |
| Uttar Pradesh | https://upvidhansabhaproceedings.gov.in/en/web/guest/bills-search | official (Liferay 7) | ⚠️ search UI exists but is **portlet-stateful, not curl-queryable** (0 rows on replay); no per-member tally, no gov/private split — PRS (258 bills, 2019–) is the usable tier |
| Madhya Pradesh | https://mpvidhansabha.nic.in/bill.htm | official assembly | ✅ **336 entries 2014–2026 on 13 per-year pages** (`bill_YYYY.htm`; `bill.htm` itself is a year index with 1 table / 1 `<tr>`); **introducer in the table** (भारसाधक = name + portfolio, 324/336); ❌ **NOT "government bills only"** — 2017 sr 18 is a **private member's bill**; **1 bill → up to 3 documents** (bill + Act + ordinance); PDFs are **Hindi scans** |
| Tamil Nadu | https://prsindia.org/bills/states?state=Tamil+Nadu | PRS (unofficial) | ❌ no official bills module (`bills.php` 404); PRS = 576 bills 2010–2026 — **official gazette reproductions, English, introducer named** |
| Kerala | https://prsindia.org/bills/states?state=Kerala | PRS (unofficial) | ❌ **none official** — `bills/getdetails` returns **0-byte for every combination**; all `billview/1..11` say "No details". PRS = 652 bills 2010–2026 |
| Karnataka | https://kla.kar.nic.in/assembly/bills/allbills.htm | official assembly | ⚠️ session-wise `bills_list*.pdf` — **scanned**, no sponsor column, no gov/private split. Text fallback: PRS 583 (2010–2026) |
| Telangana | https://prsindia.org/bills/states?state=Telangana | PRS (unofficial) | ⚠️ `billsActs` (needs session seed) = **63 bills, metadata only — no sponsor, no bill text/PDFs**. PRS = 207 (2014–2026), gazette reproductions, introducer named |
| Odisha | https://prsindia.org/bills/states?state=Odisha | PRS (unofficial) | ❌ no bill list/private-member category officially; PRS = 131 (2010–2026). **e-Gazette is live but its `/bills_acts` is empty** |
| Haryana | https://prsindia.org/bills/states?state=Haryana | PRS (unofficial) | ❌ `/bills/` is **explanatory prose, 0 PDFs**; bills appear only in the `newspress-releases/` feed. PRS = 493 (2010–2026) |
| Manipur | https://assembly.mn.gov.in/bills | official assembly | ⚠️ **610-row register (1972→) on one page — but only 12 rows link a PDF** (1972 bills #1–7,9,10,12,13,15; the other 597 rows have an empty Download cell); **private-member bills named in the Remarks column**; bill text via PRS (62) |
| Tripura | https://prsindia.org/bills/states?state=Tripura | PRS (unofficial) | ⚠️ `/Bill` exists but no private-member category; homepage counts "Government Bills: 131". PRS = 102 (2015–2026). **e-Gazette is live but CAPTCHA-gated** |
| Meghalaya | https://prsindia.org/bills/states?state=Meghalaya | PRS (unofficial) | ⚠️ NeVA `/Bill/FetchDataListBillsBySearch` **500s on every param combo**; no bill data. PRS = 156 (2010–2026). **Gazette archive is LIVE** (megpns.gov.in) |
| Sikkim | https://prsindia.org/bills/states?state=Sikkim | PRS (unofficial) | ⚠️ NeVA `/Bill` filter exists but `FetchDataListBillsBySearch` **500s**; no bill data. PRS = 85 (2014–2026) |
| Mizoram | https://www.mizoramassembly.in/government-bill | official assembly | ✅ **39 pages × 15 = 575 gov rows + 2 private = 577**; ❌ **CORRECTION — "per-bill text PDFs" does NOT hold**: only **58/575** rows link a real PDF, **492 share ONE 859-byte blank placeholder**, 25 have none (**59 unique document URLs**); no introducer on the gov register, but the **private register DOES carry `Submitted by`** — see below |
| West Bengal | https://prsindia.org/bills/states?state=West+Bengal | PRS (unofficial) | ⚠️ **393 Kolkata-Gazette Part-IV reproductions, 2010–2026** — the only working source; NeVA `/Bill/FetchDataListBillsBySearch` = **HTTP 500**; the assembly site is off-network |
| Jharkhand | https://prsindia.org/bills/states?state=Jharkhand | PRS (unofficial) | ⚠️ **234 gazette/ordinance PDFs, 2010–2026** — the only retrievable text; assembly `/विधेयक` has **24 links, all to an NXDOMAIN host**; NeVA dashboard **lists 4 bills of 2026 but every PDF is 404** |
| Himachal Pradesh | https://hpvs.neva.gov.in/Bill/GetBillDashBoardData?UnitCode=HP | official (NeVA) | ⚠️ **201 bills, 2011–2026** — metadata only: **titles blank on 198 of 201** and **0 document links**; the `Ministry` column gives the **introducing portfolio** |
| Jammu and Kashmir | https://jkla.neva.gov.in/Bill?IsStateDashBoard=True | official (NeVA) | ❌ **filter exists, zero records** — `FetchDataListBillsBySearch` empty across 18 session×bill-type combos; dashboards 580 B “No Records Founds”; only **one** Assembly with **4** sessions |
| Ladakh | **not applicable — no legislature** | — | **UT without a Legislative Assembly** (MHA, verbatim); absent from the ECI assembly-election API in every year; no NeVA tenancy; 3 assembly hosts NXDOMAIN |
| Andaman & Nicobar Islands | **not applicable — no legislature** | — | **UT without a Legislative Assembly**; the President legislates under **Art. 240(1)** (verified in the A&N (Panchayats) Regulation, 1994); 9 assembly hosts NXDOMAIN; absent from the ECI assembly API |
| Lakshadweep | **not applicable — no legislature** | — | **UT without a Legislative Assembly**; the **Administrator** legislates (verified in its live Gazette); 7 assembly hosts NXDOMAIN; absent from the ECI assembly API |
| Uttarakhand | https://prsindia.org/bills/states?state=Uttarakhand | PRS (unofficial) | ❌ NeVA `/Bill` **empty in 36 combinations**; the assembly's Governor-assent register (2001–2020) is **alive but legacy-font and has no introducer** — text via the Gazette/PRS |
| Nagaland | https://nagaland.neva.gov.in/Bill/GetBillDashBoardData?UnitCode=NL | official (NeVA) | ⚠️ **52 rows, 2021–2025 — but seeded with `test bill` / `Bill Demo` / "This is a sample Bill", and all 34 document links are 404**; `FetchDataListBillsBySearch` returns 200-but-empty |
| Chandigarh | **not applicable — no legislature** | — | **UT without a Legislative Assembly**; the **Government of Union Territories Act, 1963** names Pondicherry/Goa/Delhi/Himachal/Manipur/Tripura and **Chandigarh 0 times**; 5 assembly hosts NXDOMAIN |
| Puducherry | https://puddu.neva.gov.in/Bill/GetBillDashBoardData?UnitCode=PY | official (NeVA) | ⚠️ **5 rows (2026 only), row 1 is `Sample`**; `Ministry` gives the **portfolio**; **all 5 "As Introduced" PDFs 404**; error body is **1,208 B not 3,531 B** |
| Delhi | https://delhiassembly.delhi.gov.in/dlas-govt-bills | official assembly (Delhi Gazette) | ✅ **38 born-digital Delhi Gazette Part IV PDFs** carrying **"as introduced in the Assembly on <date>"**; ❌ **no introducer name**; NeVA dashboard 4 rows, 3 with blank titles, 0 document links |
| Chhattisgarh | https://cgvidhansabha.gov.in/evidhan/ | official assembly (e-Vidhan) | ✅ **97 bills 2020–2026** by POST replay (`ddlCategory=70`); ⚠️ **2020 is the floor**; document URL is session-bound (`OpenFile.aspx`); ❌ no introducer named |
| Chhattisgarh — passed lists | https://www.cgvidhansabha.gov.in/hindi_new/vidheyak.htm | official assembly | ✅ **25 of 26 year files 2001–2026** (`vidheyak/<year>.pdf`, 2016 → 404) with **date of introduction** + department; ⚠️ **passed** bills, scan in 2026 / legacy text in 2001 |
| Dadra and Nagar Haveli and Daman and Diu | **not applicable — no legislature** | — | **UT without a Legislative Assembly**; **Art. 239A(1) names only Puducherry** (Daman and Diu was removed by the **Goa, Daman and Diu Reorganisation Act, 1987**) and **Art. 240(1)(c)–(d)** puts it under **Presidential Regulation**; the substitute record is **MHA's List of Regulations** (50 × "Regulation", 15 Dadra / 22 Daman); ⚠️ **the UT's "Online Gazette Search" link is dead (404 on every path)** |
| _all other states/UTs_ | — | — | pending review |

**Andhra Pradesh — CORRECTION: the recorded URL is the profile landing page. The bill register is real,
public and 414 rows deep, and it is a fourth state where one bill maps to two documents.**
- ❌ **The row pointed at the wrong page.** `https://aplegislature.org/web/aplegislature` is the **profile
  landing page**: 200, 116,200 B, **1 `<table>` with 2 `<tr>`**, whose only text is *"Sri Koyye Moshenu Raju
  Hon'ble Chairman Legislative Council / Sri Chintakayala Ayyannapatrudu Hon'ble Speaker Legislative Assembly"*
  (recon recorded 118,268 B — page drift, same page). A "biggest table by `<tr>`" picker yields **1 row**.
- ✅ **The register is `https://aplegislature.org/web/aplegislature/bills`** — the site's own nav item — 200,
  129,774 B, defaulting to Term **XVI**. ⚠️ **`SOURCES.md:217` already recorded `/bills` = 86 XVI bills**; the
  registry row had been pointing at the landing page. **Always take a source URL from the recon, not from a
  summary row.**
- ✅ **Measured across the three terms the selector offers: XVI (16) = 86 rows · XV (15) = 195 · XIV (14) = 133
  → 414 rows, 410 unique `(number, year)`.** Terms 5–13 exist only as **9 consolidated PDFs**
  (`/web/aplegislature/old-bills`; 5th = 20,516,448 B). **No pagination — each term is one response.**
- ✅ **Bills are PUBLIC.** Only the *questions* tier is behind login+CAPTCHA. ⚠️ **But one host is both gated and
  public**: `legislation.aplegislature.org` returns the **identical 12,014-byte login page** for `/`, `/Home.do`,
  `/Questions.do`, `/QuestionList.do`, `/MemberList.do`, `/login.do`, `/Bills.do`, `/BillList.do` and
  `/BillReport.do` — while **`PreviewPage.do` on that same host serves the bill PDFs with HTTP 200.** **Do not
  blacklist the whole host.**
- **Term scoping is stateless.** Discover the portlet namespace from `<select name="_<ns>_term_id">`, then
  `GET ?p_p_id=<ns>&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_<ns>_term_id=<v>` reproduces any term, and a
  **cookie-less** request returns identical rows — no session, no `p_auth`, no `__VIEWSTATE`. ⚠️ **An invalid or
  empty term returns HTTP 200 with 0 rows on a *smaller* page** (99 → 52,922 B; empty → 50,675 B): **break on 0
  rows, never on HTTP status.**
- ⚠️ **Parse traps.** The report table carries a **two-`<tr>` rowspan/colspan header producing 7 labels for 6
  columns**, so header-keyword mapping misaligns — **map by index**; body rows have exactly 6 `<td>`. The
  `Session X` label is emitted as an orphan `<td colspan="6">` **between `</tr>` and `<tr>`, outside any row**,
  so splitting on `<tr` yields 81 and on `</tr>` yields 80 instead of **86** — only
  `re.findall(r'<tr.*?</tr>')` + a strict 6-cell filter reads it correctly. **`Sl No` restarts per session** and
  is not a bill number.
- **Field mapping:** `title` = cell[1] (keeps the `(L.A. Bill No.N of YYYY)` suffix); `number`/`year` from a
  case-insensitive `L\.?\s*A\.?\s*BIll\s*,?\s*No\.?\s*(\d+)\s*of\s*(20\d\d)` — the source contains
  `L.A BIll`, `L.A. Bill, No. 47` (stray comma) and one title with **no number at all** — with a
  `Eng_passbill_(\d+)_` filename fallback; `date` = *Introduced On* else *Passed On* (`DD/MM/YYYY`);
  **1 bill → 1–2 documents** (PassedBills + ActBills; **65/86 rows in XVI**). **Absent: introducer,
  ministry/portfolio, govt-vs-private.** The page is pure ASCII, so encoding is a non-issue.

**Assam — CORRECTION: the recorded URL is a landing page. The real register is two stage lists holding 271
bills — four of which appear in NO list — and the "no private-member category" claim is wrong.**
- ❌ **`/home` is a landing page, not an index**: 200, 34,139 B, **0 `<table>`, 0 `<tr>`, exactly 2 `.pdf`
  anchors** — the footer `RULES OF PROCEDURE - L.pdf` and `ALA_SALARY_ALLOWANCES.pdf`. That is precisely the
  2-row yield the generic parser produced.
- ✅ **The register is `/legislation/bills/introduced` (200, 42,099 B) and `/legislation/bills/passed` (200,
  41,955 B)**; `/legislation/bills` is an alias of *introduced*. Pagination is server-side `?page=N` at **20
  rows/page**: introduced 1–11, passed 1–3. ⚠️ **Out-of-range page returns HTTP 200 with 0 rows** (`?page=12` →
  24,085 B) and **out-of-range detail ids return HTTP 200 + 1 redirect serving the listing page** — **a 200 is
  not proof of existence.**
- ✅ **TRUE total: 271 bills, ids 1–271 fully dense** (each verified to carry a real title and a live PDF; years
  2021–2026). **The lists expose only 267** — **ids 12, 14, 101 and 175 exist only as detail pages and appear in
  no list**, so **a list-driven crawler silently loses 4 bills.** Densify by probing ids (stop after 3
  consecutive list-page fallbacks), or this gap is invisible.
- ❌ **CORRECTION to `SOURCES.md`: a private-member category DOES exist.** **5 private-members' bills (ids
  185–189) name the introducer in the title** — e.g. *Private Members Bill "The Assam Teachers (Equitable
  Transfer and Posting Policy) Bill 2025", by Shri Ashraful Hussain, MLA*.
- ❌ **The House/Year/Session filter block is DEAD HTML** — `<div class="container-fluid p-5 d-none">`, **no
  enclosing `<form>`**, and it still carries member-era control names (`birth` / `gender` / `party`);
  `?year=2022` and `/legislation/bills/2022` both return the **byte-identical default page**. `SOURCES.md`'s
  "filters for House/Year/Session" are non-functional.
- **Field mapping:** `title` ✅ 271/271; `year` = the last 4-digit year in the title ✅ 271/271; `doc_link` ✅
  271/271 HTTP 200 (**one document per bill**, `object data` on the detail page); **`number` ABSENT** (the td[0]
  serial is a per-stage ordinal 1..211 / 1..56, **not a bill number**); **`date` ABSENT**. The list table has
  **no `<th>`/`<thead>` at all**, so header-keyword mapping returns empty for every row — **map positionally**
  (td[0] serial, td[1] title + detail link, td[2] a duplicate icon link to the same URL).
- ⚠️ **Extension case is significant** — 25 bills use uppercase `.PDF` and the lowercase spelling **404s**; take
  the href verbatim. The detail route is **stage-agnostic** (`passed/33`, `pending/250` all resolve), so status
  cannot be inferred from the URL slug. `pending` / `assented` / `lapsed` / `withdrawn` / `negatived` are all
  **empty** (`totalPageCount: "0"`), so status is knowable only as *introduced* or *passed* for 267 of 271, and
  **no historical assembly is published at all**. No sitemap (404), no JSON/AJAX, no session. PDFs total
  **1.12 GB** (avg 4.2 MB, max 36 MB) → metadata-only by default.

**Dadra and Nagar Haveli and Daman and Diu — no legislature, verified from the Constitution's own text this
run. The bill tier does not exist; the substitute is the Presidential Regulation, and the UT's own gazette
search is a dead link.**
- **Article 239A(1), read verbatim from the MEA's text of the Constitution** (`mea.gov.in/images/pdf1/Part8.pdf`,
  200, 50,871 B, 8 pp, text-extractable): *"Parliament may by law create **[for the Union territory of
  Puducherry]**— (a) a body, whether elected or partly nominated and partly elected, to function as a
  Legislature for the Union territory, or (b) a Council of Ministers, or both…"* — and **footnote 4** on those
  bracketed words reads: *"Subs. by the **Goa, Daman and Diu Reorganisation Act, 1987 (18 of 1987), s. 63**,
  for 'for any of the Union territories of Goa, Daman and Diu and Pondicherry' (w.e.f. 30-5-1987)."*
  **Daman and Diu was removed from Article 239A in 1987; Dadra and Nagar Haveli was never in it.**
- **Article 240(1), same document, verbatim**: *"The President may make regulations for the peace, progress
  and good government of the Union territory of— (a) the Andaman and Nicobar Islands; (b) Lakshadweep;
  **(c) Dadra and Nagar Haveli; (d) Daman and Diu;** (e) Puducherry"*, with the proviso stopping presidential
  regulation only for a UT that has been given a 239A legislature (i.e. Puducherry). **This UT is legislated
  for by the President, not by a House.**
- ✅ **The substitute legislative record is published and readable.** MHA's **"List of Regulations"**
  (`mha.gov.in/sites/default/files/2026-03/List_Regulation_17032026.pdf`, 200, 87,056 B, 3 pp, born-digital
  text, 8,776 chars) is a 33-item table of **Presidential Regulations under Article 240** — **"Regulation" ×50,
  "Daman" ×22, "Dadra" ×15, "Diu" ×14**, e.g. item 1 *"The Dadra and Nagar Haveli Value Added Tax (Amendment)
  Regulation, 2015"*, item 8 *"…Dadra and Nagar Haveli and Daman and Diu…"*, and item 11 recording the
  **"DNH&DD (Adaptation of Central Law, State Laws and Presidential Regulations) … in Gazette of India
  (Extraordinary) vide No. 230 dated 18.01.2022"**. **Not one item is assembly legislation.**
- ❌ **No assembly, so no bills, no private members' bills, and no introducer** — and with no House there is
  no question of an Introduced-vs-Passed variant to choose between.
- ⚠️ **The UT's own "Online Gazette Search" is a DEAD LINK.** The nav entry on `ddd.gov.in` points to
  **`https://164.100.238.200/ddpress/`** (a bare IP, the Daman & Diu Government Press). **The host is alive but
  every path returns the same 315-byte IIS 404** — `/ddpress/`, `/ddpress` (no slash), `/`, the bare IP, and
  `Default.aspx` / `index.aspx` / `Home.aspx` / `Login.aspx` under it, over both http and https, and with
  `Host:` set to `ddpress.gov.in`, `www.ddpress.gov.in`, `ddpress.nic.in` or `ddd.gov.in`. **The application
  is gone; the link was left behind.** `ddpress.gov.in` itself does not resolve.
- ⚠️ **Two more nav entries on the same site are 404s**: `/publications/` and `/awards-appreciations/`.
  **Treat the nav as aspirational — crawl it, don't trust it.**
- ❌ **No UT-specific e-Gazette portal was found.** The national **`egazette.gov.in` is live** (200, 68,717 B,
  Directorate of Printing / Department of Publication, M/o Housing and Urban Affairs) but it publishes the
  **Gazette of India**, and its `StateGazette.aspx` directory page (200, 20,806 B) contains **0 occurrences of
  "Dadra" or "Daman"**. UT notifications for this territory appear **inside the Gazette of India** — which is
  exactly what the MHA list above records. **Internet Archive does not substitute:** there is no
  `in.gov.dh.gazette*`-style identifier set, and a free-text query for "daman diu gazette" returns 492
  *full-text* hits, which is not a collection and must not be cited as one.

**Chhattisgarh — the bill tier is split in two and this is the first state where BOTH halves are official and
neither is complete: e-Vidhan carries the documents but only from 2020, and the assembly's own per-year
"passed bills" list carries the introduction date but is a scan in the current year.**
- **Tier 1 — the e-Vidhan document repository, `https://cgvidhansabha.gov.in/evidhan/`** (ASP.NET WebForms +
  a `gvReport` GridView; **24,178 B → the page renders a default 50-row listing with no filter applied**).
  **POST replay works** — GET the page, echo back `__VIEWSTATE` / `__VIEWSTATEGENERATOR` /
  `__EVENTVALIDATION` and send `__EVENTTARGET=btnSearch`, `ddlCategory=70`, `ddlDept=`, `ddlYear=<year>`.
  ⚠️ **POST to the trailing-slash URL `/evidhan/`.** `/evidhan` answers **301 → `/evidhan/`**; curl follows
  the redirect as a GET, the body is dropped, and the server answers **405 "HTTP verb used to access this
  page is not allowed"** — which reads exactly like "the search is broken".
- ✅ **Category `ddlCategory=70` = विधेयक (Bills). Measured, all years: 2026 = 15 · 2025 = 27 · 2024 = 11 ·
  2023 = 15 · 2022 = 17 · 2021 = 5 · 2020 = 7 → 97 bills, 2020–2026.** `ddlYear` offers **2016–2026 only**,
  and **2016–2019 return an empty grid** (the table is not rendered at all — that is the empty result, not an
  error). **Category 76 (संविधान संशोधन विधेयक) and 73/88 (अध्यादेश, Ordinances) return 0 rows for
  2025/2026** — the categories exist in the dropdown with nothing behind them.
- **Grid columns: क्रं. | श्रेणी | विषय | विभाग | सभा में प्रस्तुत/जारी दिनांक | फाइल**, and the bill titles
  themselves carry the number — e.g. *"छत्तीसगढ़ ईज़ ऑफ डूइंग बिज़नेस विधेयक, 2026 (क्रमांक 15 सन् 2026)"*.
  **Attribution is by विभाग (department), never by Minister's name.**
- ⚠️ **The document is not a permalink.** The फाइल cell is a `lnkOpenPdf` postback that returns HTML
  containing `window.open('OpenFile.aspx','_blank')`, so the actual PDF comes from a second, **session-bound**
  `GET /evidhan/OpenFile.aspx` — **the URL always resolves to whatever that session last selected.** It works
  (Bill 15 of 2026 → **200, 9,890,314 B, 24 pages**) but it must be fetched immediately after its own postback
  with the same cookie jar; it is **not** a citable per-bill URL.
- **Tier 2 — the per-year PASSED-bill lists, `https://www.cgvidhansabha.gov.in/hindi_new/vidheyak.htm`** →
  `vidheyak/<year>.pdf`. **25 of the 26 year files 2001–2026 are present; only 2016 is a 404.**
  Columns: **क्र. | विधेयक का नाम | विभाग का नाम | पुरःस्थापन का दिनांक | विचार एवं पारण का दिनांक** — so this
  tier carries the **date of introduction**, which the e-Vidhan grid does not.
  ⚠️ **These are *passed* bills** (पारित), i.e. the as-passed publication — attribution is by department.
  ⚠️ **Encoding flips per year inside one index:** `vidheyak/2001.pdf` (75,007 B) is a **legacy-font text
  layer** in a **THIRD** encoding (`”û¢ÖßÃÖÝÖœÍü` = छत्तीसगढ़), while `vidheyak/2026.pdf` (409,573 B, 2 pp) is
  a **pure scan with 0 extractable characters**.
- ✅ **A statewide numerical summary is published**: `vidheyak/Vidheyak_Number.pdf` (2 pp, scan) —
  *विधेयकों की संख्यात्मक सूची (वर्ष **2001 से 2024** तक) (31 दिसम्बर, 2024 की स्थिति में)*:
  **passed original bills 172** (विनियोग सहित) · **passed amendment bills 407** · **total passed 580** ·
  **withdrawn 11**. ⚠️ **Visually verified** — the OCR of this page read *172* as *472* and the range as
  *2004*. **The document's own 172 + 407 = 579 does not equal its printed 580**; record the four printed
  figures and do not "fix" the sum.
- **PRS is the broadest index and the one to use for history**: `prsindia.org/bills/states?state=chhattisgarh`
  → **299 distinct bill PDFs, 2010–2026** (pages 1–7; **page 8 repeats page 7**, the documented pager bug).
  Year spread 2010:23 · 2011:22 · 2012:12 · 2013:9 · 2014:11 · 2015:14 · 2016:24 · 2017:21 · 2018:13 ·
  2019:24 · 2020:32 · 2021:9 · 2022:19 · 2023:11 · 2024:11 · 2025:30 · 2026:14.
  Reaching 2010 where the state's own e-Vidhan stops at 2020.
- ❌ **No private members' bills** anywhere — `prastav.htm` is the text of Rules 130–132, not a list; recon's
  finding stands.
- ⚠️ **The introducer is NOT named in the bill document.** Bill 15 of 2026 (Ease of Doing Business) is a
  **24-page pure scan** (0 extractable chars, 48 images); OCR of its cover and closing pages yields the number
  and title, a Statement of Objects and Reasons, a **Governor's-recommendation line under Article 207**, and
  the concluding signature **"दिनेश शर्मा, सचिव, छत्तीसगढ़ विधान सभा" — the Secretary, not a Minister.**
  So no tier of Chhattisgarh's bill record names the introducing Minister.
- ❌ **No official e-Gazette exists.** `egazette.cgstate.gov.in` answers **200** but its own title bar reads
  **"eGazette Demo Site – For testing and evaluation purposes only."** — it is a **demo host**, not the
  gazette, and must not be recorded as a source. `egazette.cg.gov.in`, `gazette.cg.gov.in`, `cgazette.gov.in`
  and `www.cgazette.gov.in` are all **NXDOMAIN**. Internet Archive holds **0 items** for `in.gov.cg.gazette`.

**Himachal Pradesh — CORRECTION: the Bill module is populated (recon's NeVA pages "render empty"), the
register is the deepest historical one seen, and the metadata is thinner than it looks.**
- ✅ **`/Bill/GetBillDashBoardData?UnitCode=HP` → HTTP 200, 128,395 B, 201 data rows, 2011 → 2026.**
  Served with a **seeded session** (see the Profile section — the recon's "empty" readings are the
  unseeded-session artifact). `/Bill/GetBillStateDashBoardData?UnitCode=HP` returns the **identical
  128,395 B**. Year spread: **2016:25, 2025:25, 2015:22, 2019:19, 2018:15, 2014:14, 2024:14, 2017:13,
  2023:13, 2022:12, 2021:11, 2020:10, 2026:7, 2011:1.**
  Declared columns: `क्रमांक | बिल संख्या | शीर्षक | विवरण | Ministry | विभाग | परिचय सदन की तिथि | दस्तावेज़`.
- ⚠️ **The register is far thinner than its column list suggests — three separate gaps:**
  1. **`शीर्षक` (Title) and `विवरण` (Description) are BLANK on 198 of the 201 rows.** Only **3** carry one:
     `24 of 2025` *The Himachal Pradesh Shops and Commercial Establishments (Amendment) Bill*,
     `1 of 2026` (*"Bill No. 01 of 2026"* — a placeholder, not a title), and
     `5 of 2026` *Himachal Pradesh Lifts (Amendment) Bill, 2026.*
  2. **`दस्तावेज़` (Document) is EMPTY on all 201 rows** — **0 document links**, so **no bill text** from this tier.
  3. **`विभाग` (Department) is empty on every row.**
- ✅ **But the `Ministry` column carries the INTRODUCING PORTFOLIO — closer to an introducer than most
  states give.** Verbatim values: **`मुख्य मंत्री`** (Chief Minister), **`बहुउद्देश्यीय परियोजनाएं एवं ऊर्जा
  मन्त्री`** (Multi-purpose Projects & Energy), **`शहरी विकास मंत्री`** (Urban Development),
  **`स्वास्थ्य एवं परिवार कल्याण मंत्री`** (Health & Family Welfare), **`आबकारी एवं कराधान मंत्री`**
  (Excise & Taxation), **`उद्योग मंत्री`** (Industries), **`लोक निर्माण मंत्री`** (PWD).
  So: **portfolio ✅, personal name ❌.** Record it as a portfolio-level introducer, not a named one.
- ⚠️ **The `/Bill` filters are far deeper than the data returned** — `FromAssemblyList` offers
  **`1952` (एच.पी. राज्य विधान सभा)** and **`1957` (प्रादेशिक परिषद् क्षेत्र, the Territorial Council)**
  alongside Assemblies 1–14; `BillStatusList` has **7** values including **`7 = Introduced`**; and
  **`BillTypeList` has `2 = Private Members Bills`**. So the *taxonomy* covers private members and
  70+ years — but the dashboard returns 201 rows from 2011 onward only, and
  **`/Bill/FetchDataListBillsBySearch` → HTTP 500 (3,727 B)**, the shared NeVA error page, for both
  `BillTypeId=0` and `BillTypeId=2`. **The filterable deep history is not retrievable.**
- `/Bill/SessionList?AssemblyId=14&UnitCode=HP` → 200, 14,969 B (a JSON session list).
- **No introducer name, no bill text and no private-member register is reachable from any HP official
  host** — a documented gap, but note the portfolio column is a real partial.

**Delhi — the bill tier is the official DELHI GAZETTE, PART IV, and it publishes the *introduction date* but
never the introducer's name.**
- ⚠️ **BILLS vs DOCUMENTS — the "38" is a DOCUMENT count, not a bill count.** `dlas-govt-bills` renders **one
  table, 21 `<tr>` = 1 header + 20 bill rows**, and that table holds **38 `.pdf` links**
  (`links-per-row = {2 links: 18 rows, 1 link: 2 rows}`; **none outside the table**). The registry previously
  said "38 bill PDFs", which invites reading 38 bills. **20 bills / 38 documents.**
- ✅ **Assembly `dlas-govt-bills` → 20 bills carrying 38 bill PDFs** under `/sites/default/files/dlas/govt-bills/`.
  **All 8 sampled are born-digital text** and extract cleanly (3,600–59,966 chars).
  They are the **Delhi Gazette, Extraordinary, Part IV**, published by the **Delhi Vidhan Sabha Secretariat**
  (*"राष्ट्रीय राजधानी राज्य क्षेत्र दिल्ली सरकार / GOVERNMENT OF THE NATIONAL CAPITAL TERRITORY OF DELHI /
  दिल्ली विधान सभा सचिवालय"*), masthead `REGD. No. D. L.-33002/99`.
- ✅ **The as-introduced marker IS present.** Sample — **`bill10.pdf` = Delhi Gazette No. 231, 10 August 2026**,
  *"**. 21/15DUSIB(A)/2026/LAS-VIII/Legn./5908** — जनिम्नलिखित को सर्वसाधारण की जानकारी के लिए प्रकाशित किया
  जाता है"*: **दिल्ली शहरी आश्रय सुधार बोर्ड (संशोधन) विधेयक, 2026 — 2026 की विधेयक संख्या 10**, annotated
  **"(जैसा कि राष्ट्रीय राजधानी क्षेत्र दिल्ली की विधान सभा में दिनांक 10 अगस्त, 2026 को पुरःस्थापित किया गया)"**
  = *(as introduced in the Legislative Assembly of the NCT of Delhi on 10 August 2026)*.
- ✅ **Delhi publishes both variants — and they are distinguishable.** `275835.pdf` (Delhi Gazette No. 247,
  25 August 2026) is the **enacted** copy: *"राष्ट्रीय राजधानी क्षेत्र दिल्ली की विधानसभा के निम्नलिखित अधिनियम
  ने **उप-राज्यपाल की सहमति दिनांक 25th August, 2026 को प्राप्त कर ली है**"* — the **Delhi Minimum Wages
  (Amendment) Regulation, 2026 (Delhi Regulation 09 of 2026)**, itself annotated *"as introduced … on
  11 August 2026"*. So the **Introduced-vs-Passed rule has a clean test case here**.
- ❌ **BUT the introducer is NOT named — in either variant.** `introduced by` / `Introduced by` do not appear in
  any of the 8 sampled bills; the only `Minister` occurrences are the bill's own text. **The `Introduced` copy
  gives the DATE and the House, not the member.** Recorded as a documented gap.
- ⚠️ **Encoding varies per document within the same tier.** `bill10.pdf` extracts clean Unicode
  (`विधान सभा`, `अधिनियम`, `संशोधन`); `275835.pdf` shows degraded mappings (`वििानसभा`, `अविवनयम`, `संिोिन`).
  **Classify each file — do not characterise Delhi's gazette from one sample** (this exercise's own rule,
  and it bites here).
- ❌ **NeVA's bill module is thin and partly blank.** `/Bill/GetBillDashBoardData?UnitCode=DL` → **200, 4,086 B,
  4 rows** (columns `क्रमांक | बिल संख्या | शीर्षक | विवरण | Ministry | विभाग | परिचय सदन की तिथि | दस्तावेज़`).
  **Titles and descriptions are blank on 3 of the 4**; the only titled row is
  `5 of 2026 | समिति पंजीकरण (दिल्ली संशोधन) विधेयक, 2026`. **The `Ministry` column carries the introducing
  portfolio** (`विधायी कार्य`, `श्रम`, `राजस्व`) — **portfolio ✅, name ❌** — and there are **0 document links**.
  `FetchDataListBillsBySearch`: **`BillTypeId=0` and `1` → HTTP 500 (1,208 B)**; **`2` (Private Members) →
  200 but empty (620 B)**.
- ❌ **Private members' bills are not published** — recon confirmed.
- ⚠️ `GetAllAssembliesList?UnitCode=DL` → **80 B: only the Eighth Assembly is registered**
  (`[{"AssemblyID":1,"AssemblyCode":8,"AssemblyName":"Eighth Legislative Assembly"}]`) — and note the
  **`AssemblyID 1` ↔ `AssemblyCode 8`** split: the member and question routes take a parameter *named*
  `AssemblyID` but expect the **`AssemblyCode`** value (`8`). Same trap as Uttarakhand.

**Chandigarh — NOT A GAP: like Ladakh, A&N and Lakshadweep, this Union Territory has no legislature, so there
is no MLA page to source. Proven live from four independent official sources, one of them the governing Act.**
- **§1 — The statute that creates UT legislatures excludes Chandigarh by name-absence, and I read it.**
  **The Government of Union Territories Act, 1963 (Act No. 20 of 1963)**, MHA-hosted
  (`https://www.mha.gov.in/sites/default/files/GovernmentUnionterritoriesAct1963.pdf`) → **200, 161,981 B,
  42 pages, 103,828 extractable characters.** Its long title is *"An Act to provide for **Legislative Assemblies
  and Councils of Ministers for certain Union territories** and for certain other matters."*
  **`Chandigarh` occurs 0 times in the whole Act.** The UTs it does name: **Pondicherry 17, Goa 17, Delhi 4,
  Himachal 4, Manipur 3, Tripura 3.**
  ⚠️ **NAMING TRAP — the Act spells it `Pondicherry` (17 occurrences); `Puducherry` returns 0.** The 2006
  renaming means a search on the modern name **silently reports "the Act never covered Puducherry"**, which is
  the exact opposite of the truth. **Search both spellings on any pre-2006 instrument.**
- **§2 — No assembly host resolves.** NXDOMAIN on `chandigarhvidhansabha.gov.in`, `chandigarhassembly.gov.in`,
  `assembly.chandigarh.gov.in`, and the NeVA patterns **`chla.neva.gov.in`** and **`ceil.neva.gov.in`**.
- **§3 — No NeVA tenancy.** `https://neva.gov.in/Home/NeVA` (200, 192,420 B, **39 subdomains**) contains
  **`chandigarh` 0 and `Chandigarh` 0**, against **`Puducherry` 10 / `puddu` 2** on the same page.
- **§4 — The Administration's own sitemap contains no assembly anywhere.**
  `https://chandigarh.gov.in/sitemap` → **200, 47,692 B, 118 links**, of which **0** hrefs match
  `assembly|vidhan|legislat|sabha|mla` (case-insensitive), and the page contains **0 occurrences** of
  `Assembly`, `Vidhan`, `Legislature`, `MLA`, `Sabha` or `attendance`.
  ⚠️ Recon records **155 links**; the page now carries **118** — a live count, not a fixed one.
- **§5 — Constitutional position (recon, confirmed by the statute above).** Article 239A(1) empowers Parliament
  to create a legislature only *"for the Union territory of Puducherry"*; Article 239AA covers Delhi; Article 240
  lists A&N, Lakshadweep, DNH, Daman & Diu and Puducherry — **Chandigarh is in none of them.**
- **§6 — Represented in Parliament only.** One Lok Sabha seat; no Rajya Sabha seat of its own.
  **MPLADS for that MP** — eSAKSHI `STATE_ID 7` → `python3 tools/fetch-mplads.py IN-CH 7` →
  `data/mplads/IN-CH/chandigarh.json`, **MP MANISH TEWARI** (constituency CHANDIGARH), **113 works**.
  **18th Lok Sabha:** Allocated Limit **₹17,83,51,443.75 (₹17.84 Cr)** · Works Recommended **113 (₹7,83,83,199 /
  ₹7.84 Cr)** · Works Sanctioned **95 (₹6,63,83,199 / ₹6.64 Cr)** · Works Completed **32 (₹1,61,40,977 /
  ₹1.61 Cr)** · Expenditure **₹3,26,99,031 (₹3.27 Cr)** · Calamity **0**.
  **Label it MP-LADS for one MP — never an MLA fund.**

**Puducherry — HAS a legislature, and its fund tier is the strongest per-MLA publication found anywhere in this
exercise: an official Government Order annexure listing **every constituency by name with its annual
entitlement**.**
- **Profile — NeVA roster, session-gated, complete.** ⚠️ Cold `/ContactDirectory/MenuContactDirec` →
  **302 (127 B) → /Home/NeVA**; seeded (one `GET https://puddu.neva.gov.in/`, carry the jar, send `Referer`)
  → **200, 46,928 B**. Then:
  **`FetchMembersList?MLT=0&MSLT=0&Assemblyid=16` → 200, 272,104 B, 29 members, 29 unique ids,
  29 unique constituencies, 29/29 photos.**
  Party census: **All India N.R. Congress 11 · DMK 5 · BJP 4 · Independent 3 · Tamilaga Vettri Kazhagam 2 ·
  AIADMK 1 · Neyam Makkal Kazhagam 1 · Latchiya Jananayaka Katchi 1 · INC 1 = 29.** Names in **English**
  (`Thiru. A. Anbalagan`, `15 - OUPALAM -Puducherry`). `GetMembersDashbardData` → 200, 266,974 B.
  ⚠️ **NEW — the shared CMS host differs for this state.** Every other NeVA state verified here serves assets
  from `cms.neva.gov.in/NeVA/<UNIT>/…`; **Puducherry serves its 29 member photos and its bill links from
  `neva.gov.in/NeVA/PY/FileStructures//Member/thumb/…`** — confirmed live
  (`04_10_2025_12_25_22.jpg` → 200, 1,941 B, `image/jpeg`). **Do not hard-code `cms.neva.gov.in`.**
- ✅ **`https://py.gov.in/mlas` is the second, independent official roster — and the count difference is
  explained.** → **200, 94,931 B, exactly 30 MLA blocks**, each giving **constituency name, member name, photo,
  address, mobile and an official email** (`mlaariankuppam[at]py[dot]gov[dot]in`) — **but NO party**.
  **30 blocks vs 29 NeVA members is not an error: `Shri. N. RANGASAMY` appears twice, under `Thattanchavady`
  and `Mangalam`** — he holds both seats. Recon's reconciliation is exactly right.
  - ⚠️ **Parse note: 21 of the 30 photos are named `<name>mla.jpg`, but the rest are not** — e.g.
    **`nrangasamy.jpg`** has no `mla` suffix. **A filename-pattern rule loses 9 of 30 photos**; count from the
    `<h2>Member of Legislative Assembly, …</h2>` blocks instead. Photo coverage is **30/30**; mobiles **29/30**
    (one blank).
- **Questions — per-member, thin, and the text is TAMIL.** Swept **all 29 member ids** on
  `/Member/Member_Question?MemberId={id}&AssemblyID=16`: **5 members have rows, 24 return the empty
  1,311-byte page, TOTAL 55 rows — all `Starred`, ZERO `Unstarred`.**
  Columns `Sr No | Question Number | Question Type | Date | Minister | Subject | Document`; verbatim:
  `1 | 2847 | Starred | 27/03/25 | N. RANGASAMY | **நவீன வசதிகளுடன் கூடிய சமுதாய நலவழி மையம் அமைத்தல்**`.
  ⚠️ **This is the first Tamil-script jurisdiction in this exercise** — the reading mode needs a Tamil model,
  and the **Minister names are Latin-script while the subjects are Tamil**, so a single-locale assumption fails.
  The `Document` column is empty.
- **Bills — a 5-row 2026 register, partially seeded, with a PORTFOLIO but no introducer.**
  `/Bill/GetBillDashBoardData?UnitCode=PY` → **200, 6,059 B, 5 rows** (columns `Sr No | Bill Number | Title |
  Description | Ministry | Department(s) | Date of Introduction House | Document`). **Row 1 is
  `2 of 2026 | Sample | Sample`** — seeded test data; the rest are real (*THE PUDUCHERRY BUSINESS REFORMS BILL,
  2026*, *THE PUDUCHERRY PREVENTION OF ANTI-SOCIAL ACTIV…*, *THE PUDUCHERRY GOODS AND SERVICES TAX
  (AMENDME…*). The `Ministry` column carries the **introducing portfolio** — **`CHIEF MINISTER`,
  `AGRICULTURE MINISTER`, `HOME MINISTER`** — **portfolio ✅, personal name ❌**.
  - ❌ **All five `Document` links are dead.** They point at
    `https://neva.gov.in/NeVA/PY/FileStructures///IntroductionPdf/<No> of2026_Introduction.pdf` and **all
    return HTTP 404 (1,245 B)** — so the **"As Introduced"** copy that would name the introducer is **not
    retrievable**. ⚠️ Compare the *same host*: it serves member **photos** fine (200) while the **bill PDFs 404**
    — the loss is the documents, not the host.
  - `FetchDataListBillsBySearch`: **`BillTypeId=1` → 200 but empty (580 B)**; **`BillTypeId=0` and `2`
    (Private Members) → HTTP 500 (1,208 B).**
    ⚠️ **Puducherry's NeVA error page is `1,208 B`, not the `3,531 B` seen on every other tenant** — so a
    size-based "is this the shared error page?" check **must not be hard-coded to 3,531**.
- **Attendance — none.** **16 routes swept, 0 occurrences of `attendance`**; `/Attendance`,
  `/MemberAttendance`, `/Members` **and `/Member/Attendance`** → **404 (1,245 B)**;
  `/AssemblyDocs/DigitalLibrary` → **500 (1,208 B)**.
- ✅✅ **FUND — the strongest per-MLA allocation publication found in this exercise.** The scheme is the
  **MLA-LAD Scheme**, administered by the **Local Administration Department since 1997**, covering
  **30 assembly constituencies and 3 nominated MLAs**.
  - **`https://lad.py.gov.in/sites/default/files/g.o.ms.no.24-dt-22.11.2024.pdf`** → **200, 1,302,347 B,
    4 pages, 7,319 chars** — **G.O.Ms.No.24/LAS/A1/2024, Puducherry, dated 22.11.2024**, *"Release of
    Grant-in-aid to all Local Bodies to the tune of **Rs.66.00 Crores** for implementing MLA-LAD Scheme
    (2nd Phase 2023-24 and 1st Phase 2024-2025) in respect of **30 constituencies and 3 nominated MLAs**"*.
    Its **ANNEXURE — "Statement showing release of funds under MLA-LAD Scheme"** is **per constituency, by
    name**, with columns **`Sl. No | Name of the Constituency | Local Body | Eligible Fund per year |
    Proposed to be Released Now (2023-24 II & Final Phase / 2024-25 I Phase) | GIA released to the LBs`**:
    **every constituency reads `Eligible Fund per year = 200.00` lakh, released `123.00 + 77.00 = 200.00`.**
    Rows include **Raj Bhavan, Muthialpet, Uppalam, Mudaliarpet, Orleanpet, Nellithope, Ariyankuppam,
    Villianur, Kadirkamam, Indira Nagar, Thattanchavady, Kamaraj Nagar, Lawspet, Kalapet, Oulgaret,
    Karaikal (North), Karaikal (South), T.R.Pattinam & Neravy, Mahe, Yanam, Manavely, Bahour,
    Embalam(R), Nettapakkam(R)…**
    **Statement B** lists the three nominated MLAs — **K. Venkatesan, V.P. Ramalingam, R.B. Ashok Babu —
    at 200.00 each, TOTAL B 600.00**; **GRAND TOTAL (A+B) = 6600.00 lakh = ₹66.00 crore**
    (4059.00 + 2541.00). Signed **(R. RATHNA), UNDER SECRETARY TO GOVT.(LA)**, with Finance concurrence
    I.D. No. P-10056/FC/FD/F4/A1/2024-25 dated 22.11.2024, and a copy to *"The Programmer, EDP Section, LAD
    … with a request to **upload the notification in the website of LAD**"*.
    **Per-MLA entitlement: ₹200.00 lakh = ₹2 crore per constituency per year — published, by name, officially.**
    ⚠️ It is an **OCR'd scan** — noisy (`c.O. Ms. No.24llASlA1l2024`, `2a?4D/1O,t/?O?4`) but readable.
  - ✅ **The scheme document is text-extractable and gives the historical rate and aggregate spend.**
    `https://lad.py.gov.in/mla-scheme` → 200, 114,752 B (*"MLA Scheme"*), linking
    **`…/sites/default/files/mlaschemelad1.pdf`** → **200, 414,896 B, 6 pages, 3,507 chars**: *"MLA-LAD Scheme
    is being implemented by the Local Administration Department since 1997. They had 30 assembly
    constituencies and 3 nominated MLAs… Works of capital nature · Suggested by the MLAs **including nominated
    MLAs** · **Rs.1.00 crore is allotted to each constituency / MLA**."*
    Plus a **release-vs-expenditure table**: 2010-11 **3220.21 / 3214.35**; 2011-12 **3750.00 / 3749.60**
    (*"Rs.1.25 crore was allotted"*); **2012-13 "No Budget Provision"**; 2013-14 **1624.19 / 1624.19**
    (partial allotment); 2014-15 **1899.82 / 1899.82**. And a **Corpus Fund** in PUDA from 2014 with a
    **₹3 Cr** limit and **₹60.00 crore** allotted in FY 2015-16.
  - ✅ **`g.o.ms-no-03-las-a1-2024.pdf`** → 200, 1,324,749 B, 3 pages, 6,123 chars — same annexure shape,
    **₹25.41 crore, 1st Phase 2023-24**.
  - ❌ **`gia-mla-lad-scheme2021-22.pdf`** → 200, 3,482,048 B, 3 pages, **0 extractable chars — a pure scan.**
    **I did not OCR it and am not claiming to have read it.**
  - ⚠️ **`https://lad.py.gov.in/enhancement-mla-lad-fund-rs-2-crores` → 404** ("Page Not Found"). The
    enhancement is **cited** in G.O.Ms.No.24 as *"Read: … G.O.Ms.No.44/LAD(SW)/2019-20 dated 24.12.2019"*, but
    **the page URL recon records is dead** — the figure survives through the 2024 order's read-list, not there.
  - ❌ **What is still NOT published per MLA: works recommended, works sanctioned, works completed and
    expenditure.** Allocation and release are per-constituency; utilisation is not.
  - No dedicated fund portal exists: `mlalad.py.gov.in`, `mla.py.gov.in`, `ladfund.py.gov.in`,
    `vidhayaknidhi.py.gov.in` **all NXDOMAIN** — the GOs are the source.
- **MPLADS (the MP tier, not the MLA tier).** eSAKSHI `STATE_ID 26` →
  `python3 tools/fetch-mplads.py IN-PY 26` → `data/mplads/IN-PY/puducherry.json`,
  **MP Vaithilingam Ve**, 76 works. **18th Lok Sabha:** Allocated **₹20,93,68,972.11 (₹20.94 Cr)** ·
  Recommended **76 (₹15,54,91,559 / ₹15.55 Cr)** · Sanctioned **33 (₹5,78,35,559 / ₹5.78 Cr)** ·
  Completed **13 (₹2,27,17,559 / ₹2.27 Cr)** · Expenditure **₹3,35,57,935 (₹3.36 Cr)**.

**Nagaland — the bill register is real (52 rows, 2021–2025) but SEEDED WITH TEST DATA, and every one of its 34
document links is dead.**
- ✅ **`/Bill/GetBillDashBoardData?UnitCode=NL` → 200, 48,234 B, 53 `<tr>` = 52 data rows**, columns
  **`Sr No | Bill Number | Title | Description | Ministry | Department(s) | Date of Introduction House | Document`**.
  Year spread: **2021: 11, 2022: 15, 2023: 12, 2024: 13, 2025: 1.** (`GetBillStateDashBoardData` returns the
  identical table.) Real entries exist — e.g. `401 of 2021 | Nagaland Goods and Services Tax (Fifth Amendment)
  Bill, 2021 | Finance | 25/11/2021` and `777 of 2021 | The Nagaland Lokayukta (Second Amendment) Bill, 2021`.
- ⚠️⚠️ **The register is contaminated with seeded placeholder bills — read before you report a count.**
  The **first two rows** are literally **`01 of 2021 | test bill | test bill`** and
  **`02 of 2021 | Bill Demo | Bill Demo`** (both Home Department, 09/12/2021), and row `888 of 2021` is titled
  **"This is a sample Bill"**. `401 of 2021` and `403 of 2021` are **near-duplicates** of the same GST
  (Fifth Amendment) title under different numbers. **"52 bills" is a raw row count, not 52 real bills.**
- ❌ **Every document link is dead.** 34 of the 52 rows carry a `Document` link of the form
  `https://cms.neva.gov.in/NeVA/NL/FileStructures///IntroductionPdf/<BillNo>of<Year>_Introduction.pdf`
  (note the **triple slash** and, in several, **spaces inside the filename**). Tested four across four years —
  `401%20of2021_…`, `159of2022_…`, `160%20of2023_…`, `3 of2024_…` — **all HTTP 404 (1,245 B)**, the shared NeVA
  404 page. **Index ✅ / documents ❌**, and the "Document" column value is **"As Introduced"** — the variant
  that would carry the introducer — so **the introducer is published nowhere retrievable**.
- ❌ **`/Bill/FetchDataListBillsBySearch` → 200 but empty (580 B, 0 `<tr>`)** for `AssemblyID ∈ {13,14}` ×
  `BillTypeId ∈ {0,1,2}` — 6 combinations. ⚠️ Recon recorded this endpoint as *"500 on GET / 0 bytes on POST"*;
  it now returns **200 with an empty result**, which is a different (and more dangerous) failure mode —
  a caller checking only for HTTP 200 will read "no bills" as a clean answer.
- ✅ **The `/Bill` taxonomy does offer Private Members Bills** (`BillTypeList`: 1 = Government Bill,
  2 = Private Members Bills) — the filter exists; the data does not.

**Uttarakhand — corrections on three fronts: the member/profile AJAX that recon read as "BLANK" is populated
once a session is seeded, the per-member question register the recon scored as empty holds **641** questions,
and the fund's only official document is now a **dead link**.
- ❌ **Bill module: empty, and now driven across 36 combinations.** `/Bill/GetBillDashBoardData?UnitCode=UK`
  and `/Bill/GetBillStateDashBoardData?UnitCode=UK` → **200, 620 B, "कोई रिकॉर्ड नहीं मिला"**.
  `/Bill/FetchDataListBillsBySearch` → **zero `<tr>` for `AssemblyID ∈ {4,5,6}` × `SessionID ∈ {0,1,11,12}` ×
  `BillTypeId ∈ {0 (all), 1 (Government), 2 (Private Members)}`** — 36 combinations, `HouseCode=UK`,
  `FromYear=2000&ToYear=2026`. Recon tested a subset; this is the full grid.
- ✅ **BUT a real bill register does exist on the 401'd assembly site — and it is alive and readable.**
  `https://cdnbbsr.s3waas.gov.in/s353c3348f1fa3f4342107da7afbb8e3e0/uploads/2025/07/202507312038340874.pdf`
  → **200, 402,370 B, 36 pages, 47,174 extractable characters** — *"List of Bills Signed by Hon'ble Governor
  2001–2020"*. ⚠️ **Legacy-font Hindi (Chanakya/Kruti-Dev), not Unicode**: the header extracts as
  `Ekkuuh; jkT;ky }kjk gLrk{kfjr fo/ks;dksa dh lwph o"kZ] 2019` = **माननीय राज्यपाल द्वारा हस्ताक्षरित विधेयकों
  की सूची वर्ष, 2019**, and rows as `mŸkjk[k.M fofu;ksx ¼2018&2019½ fo/ks;d]2019` = **उत्तराखंड विनियोग
  (2018–2019) विधेयक, 2019**; `fgekyh; fo'ofo|ky; fo/ks;d] 2019` = **हिमालयी विश्वविद्यालय विधेयक, 2019**.
  Columns: **विधेयक संख्या | वर्ष | राज्यपाल द्वारा हस्ताक्षरित मूल विधेयक का नाम | पुनःस्थापित तिथि |
  पारण तिथि | राज्यपाल द्वारा हस्ताक्षर दिनांक | अधिनियम संख्या** — i.e. **bill number and dates only**.
  ❌ **No introducer, no member name, no bill text.** A **transcoder** (not OCR) is the reading mode.
- ⚠️ **Two S3WaaS buckets, two different fates — test at file level, not at the bucket root.**
  The **assembly's** bucket `s353c3348f1fa3f4342107da7afbb8e3e0` **serves its file (200)**;
  the **Rural Development Department's** bucket `s3e9412ee564384b987d086df32d6ce6b7` returns
  **`404 NoSuchBucket`** for both of its fund documents. ⚠️ A bucket **root** 404s for *both* — S3WaaS buckets
  do not allow listing — so **a root 404 proves nothing; only the file-level `NoSuchBucket` body does.**
- **The assembly site is still HTTP 401 Basic Auth** — re-tested: **`WWW-Authenticate: Basic realm=""`,
  401 on `/`, on `/dpages/present-members`, and over both `http://` and `https://`**. Recon confirmed.
  ⚠️ **New nuance for recovering it:** Wayback's **2026-09 captures are *also* 401** (the auth predates them),
  but its **2025-10 captures are 200** — so content is recoverable only from the **pre-auth** snapshots
  (e.g. `web.archive.org/web/20251027130224id_/…/about-department/introduction/` → 95,151 B).
  Those snapshots enumerate **131 internal links**, whose top-level sections are `document-category` (46 URLs:
  `bill-2001…2023`, `proceeding-2001…2014`, `minutes-of-session-2014…2022`, `agenda-*`), plus
  `/vidhan-sabha-library/`, `/budget-speech/`, `/contacts/` — and **no attendance, fund or question-data route**.

**Andaman & Nicobar Islands and Lakshadweep — NOT GAPS: like Ladakh, both are Union Territories with no
legislature, so neither has an MLA page to source. Verified live, jointly and separately.**
- **§1 — Neither UT has ever had a legislature, and each is legislated for by the President/Administrator.**
  I read the instrument that settles it for A&N: the **Andaman and Nicobar Islands (Panchayats) Regulation,
  1994 (No. 1 of 1994)**, published in the **Gazette of India, Extraordinary, Part II, Section 1, No. 35,
  dated 23 April 1994**, and reproduced by the A&N Administration in the **Andaman and Nicobar Gazette,
  Extraordinary, No. 151, Port Blair, Thursday, December 9, 1994** (Administration Secretariat Notification
  No. 138/94/F.No.6-9/94-Legal III, signed *Abdul Waseem, Assistant Secretary (Law)*):
  > *"ANDAMAN AND NICOBAR ISLANDS (PANCHAYATS) REGULATION, **No. 1 OF 1994** — Promulgated by the President in
  > the Forty-fifth year of the Republic of India. **A Regulation to provide for Panchayats in the Andaman and
  > Nicobar Islands** and for matters connected therewith. **In exercise of the powers conferred by clause (1)
  > of article 240 of the Constitution, the President is pleased to promulgate the following Regulation made by
  > him:**"*
  **Article 240(1) is the constitutional marker of a UT with no legislature — and the instrument's whole
  purpose is to create *Panchayats*, the local tier, not a House.**
  ⚠️ **Provenance caveat, flagged:** the copy hosted on `andamannicobar.gov.in` (6,144,572 B, 242 pp) opens with
  an **International Environmental Law Research Centre (IELRC, Geneva)** cover page stating *"This document is
  **not an official version of the text** … IELRC makes no claim as to the accuracy of the text reproduced
  which should under no circumstances be deemed to constitute the official version."* **The official text is
  the Gazette of India cited above** — cite that, not the IELRC reproduction, even though the UT hosts it.
  For **Lakshadweep** the same pattern is visible in its live gazette: *"The **Administration** of the Union
  Territory of Lakshadweep hereby orders…"* (Vol. LXII No. 35, 12 Aug 2026) and rules made by *"the
  **Administrator**, Union Territory of Lakshadweep"* under **the proviso to Article 309** (Vol. LXII No. 39,
  17 Aug 2026). The executive legislates; no House does.
- **§2 — The Election Commission's own JSON API puts neither UT in any assembly-election year.**
  `GET https://www.eci.gov.in/eci-backend/public/api/get-ac-election-state` → **200, 461 B**, and the
  **only Union Territory codes present are `U05` (NCT of Delhi), `U07` (Puducherry) and `U08` (Jammu &
  Kashmir)** — the three UTs that *do* have legislatures. **`Andaman` 0, `Nicobar` 0, `Lakshadweep` 0.**
  The `U01` (A&N) and `U09`-slot codes that would carry them appear in **no year**. Same API, same evidence
  shape as Ladakh.
- **§3 — No NeVA tenancy for either.** `https://neva.gov.in/Home/NeVA` (200, 191,858 B, **39 subdomains**)
  contains **0 occurrences** of `andaman`, `nicobar`, `lakshadweep` (as it does for `ladakh`, `dadra`,
  `chandigarh`). NeVA is a legislature platform.
- **§4 — No assembly host resolves, for either UT.** NXDOMAIN on every candidate:
  A&N — `assembly.andamannicobar.gov.in`, `vidhansabha.andamannicobar.gov.in`, `andamanassembly.gov.in`,
  `assembly.andaman.gov.in`, `vidhansabha.andaman.gov.in`, `assembly.and.nic.in`, and the NeVA patterns
  **`anla.neva.gov.in` / `andla.neva.gov.in`**;
  Lakshadweep — `assembly.lakshadweep.gov.in`, `vidhansabha.lakshadweep.gov.in`, `lakshadweepassembly.gov.in`,
  `assembly.lak.nic.in`, `vidhansabha.lak.nic.in`, and **`ldla.neva.gov.in` / `lakla.neva.gov.in`**.
  ⚠️ **A&N's legacy domain is dead: `andaman.gov.in` returns NXDOMAIN.** Anything still pointing at it
  (bookmarks, citations, scrapers) is broken — the live portal is **`andamannicobar.gov.in`** (200,
  145,452 B, footer *"Contents Owned by Andaman & Nicobar Administration. Designed & Developed By : SOVTECH,
  A & N Administration."*), not an NIC template.
- **§5 — Neither UT's portal mentions an MLA anywhere.** A&N homepage: **0** hits for `MLA`, `Vidhan Sabha`,
  `Vidhayak`, `Legislative Assembly`, `MPLADS`, `attendance` — and **5** for `Member of Parliament`.
  Lakshadweep homepage (200, **180,983 B**, *"Official Website of Administration of Lakshadweep"*): **0** for
  the same set. Page sweeps: **A&N 83 pages fetched → 0 real-text hits** for `MLA` / `Vidhan Sabha` /
  `Vidhayak` / `attendance`; **Lakshadweep 120 of 121 pages → 0** for `MLA` / `Vidhan Sabha` / `Vidhayak`.
  ⚠️ **One A&N "MLA" hit was a false positive** — `answeep/021` matched inside a **PDF** (19 pp, v1.4) that
  had been saved as `.html`; `grep --binary-files=without-match` clears it. **Check the file type before
  believing a hit.**
- **⚠️ TRAP — A&N's "Legislative" nav tab is NOT an assembly.** `https://andamannicobar.gov.in/latestupdate_all.php`
  (200, 497,091 B) is titled *"Legislative Documents, Circulars, Orders and Newsletter"* and its main section is
  *"**Legislative Documents (Acts/ Regulation/ Rules/ Notification)**"*, filtered by department (Agriculture,
  APWD, Animal Husbandry, Health, RD/PRIs, Shipping, Education, Fisheries, Forest, Industries, Labour, Law,
  Police, Pollution Control, Port Management Board, Prison, Registrar of…). It hosts **679 PDF links** and
  contains **0 occurrences** of `MLA`, `Vidhan Sabha`, `Legislative Assembly`, `Vidhayak`, `MPLADS` or
  `attendance`. **It is a delegated-legislation library, not a member roster** — the single most likely
  false-positive route in this UT.
- **✅ NEW FINDING — Lakshadweep publishes a live, text-extractable e-Gazette, and recon does not record it.**
  `https://lakshadweep.gov.in/documents/` → **200, 143,321 B**, publishing **THE LAKSHADWEEP GAZETTE
  (EXTRAORDINARY)** and **THE LAKSHADWEEP TIMES**, both **born-digital and fully text-extractable**:
  - *Vol. LXII No. 37, FRIDAY 14th AUGUST, 2026 / 23rd SRAVANA, 1948 (SAKA)* — 27 pp, **91,419 chars**;
    No. 38 (8 pp / 15,483), No. 39 (5 pp / 9,051), No. 40 (13 pp), No. 35 (1 p / 1,901), No. 34 (2 pp / 954),
    No. 33 (29 pp / 64,106), No. 36 (20 pp).
  - *THE LAKSHADWEEP TIMES*, Vol. XXXXI No. 13, KAVARATTI, TUESDAY 25 AUGUST 2026, **Price Rs. 2** —
    20 pp, **99,621 chars**; and Vol. XXXXI No. 12, 12 August 2026 (16 pp / 121,370).
  - Colophon: *"Published by the **Directorate of Printing & Stationery, Kavaratti**, on behalf of the
    Administration of Union Territory of Lakshadweep"* (LGP,Kvt/N-313/08-26/10).
  ⚠️ **Two parsing traps in this tier:** (a) the `/documents/` page lists **each PDF twice** — the files come in
  byte-identical pairs, so a naive crawler double-counts; (b) several files are **compilations of separate
  one-page notifications**, each re-printing the full masthead *"THE LAKSHADWEEP GAZETTE EXTRAORDINARY … Sd/-
  (AVINASH SINGH, DANICS) Collector (LA), UTLA"* — **do not assume one file = one notification.**
  ⚠️ Also note `/panchayat/`'s single PDF (`2021091212.pdf`, 7,560,156 B, 42 pp) is a **pure scan, 0
  extractable chars** — I did **not** OCR it and am **not** claiming to have read it.
- **Administering authority (both):** Ministry of Home Affairs. ECI's own officer directory (200, 12,275 B)
  lists a CEO for each — **A&N: Sh. L. Kumar, IAS (AGMUT:2012)**, `ceo_andaman@eci.gov.in`, website
  `http://www.ceoandaman.nic.in`, appointed 2025-03-03 (**live: 200, 70,397 B**); **Lakshadweep:
  Sh. Awanish Kumar, IAS**, `ceo_lakshadweep@eci.gov.in`, website `https://ceolakshadweep.gov.in`, appointed
  2026-01-07. Election administration exists; a legislature does not.
- **✅ THE ONE PER-MEMBER DATASET THAT EXISTS FOR EACH IS PARLIAMENTARY — and both were fetched.**
  Each UT elects **one Lok Sabha MP** and has **no Rajya Sabha seat of its own**:
  - **A&N — eSAKSHI `STATE_ID 35`** → `python3 tools/fetch-mplads.py IN-AN 35` →
    `data/mplads/IN-AN/andamanandnicobarislands.json`, **MP BISHNU PADA RAY**, 29 works.
    **18th Lok Sabha:** Allocated Limit **₹14,70,00,000 (₹14.70 Cr)** · Works Recommended **29 (₹7,96,15,803 /
    ₹7.96 Cr)** · Works Sanctioned **13 (₹3,62,32,528 / ₹3.62 Cr)** · Works Completed **0** ·
    Expenditure **₹1,55,21,947 (₹1.55 Cr)**.
  - **Lakshadweep — eSAKSHI `STATE_ID 19`** → `python3 tools/fetch-mplads.py IN-LD 19` →
    `data/mplads/IN-LD/lakshadweep.json`, **MP MUHAMMED HAMDULLAH SAYEED**, 30 works.
    **18th Lok Sabha:** Allocated Limit **₹15,39,42,460.41 (₹15.39 Cr)** · Works Recommended **30
    (₹9,51,71,350 / ₹9.52 Cr)** · Works Sanctioned **26 (₹5,94,47,173 / ₹5.94 Cr)** · Works Completed
    **2 (₹27,13,606)** · Expenditure **₹3,97,37,225 (₹3.97 Cr)**.
  - The A&N portal's own MP page corroborates the identity: `…/and_mp` (200, 29,486 B) — **Shri Bishnu Pada
    Ray, BJP**, described as his **4th term**, elected to the **13th, 15th, 16th and 18th Lok Sabha**,
    **102,436 votes (50.58%)**, runners-up **Shri Kuldeep Rai Sharma (INC) 78,040 (38.54%)** and
    **Shri Manoj Paul (A.N.D.C) 8,254 (4.08%)**, with portfolios and the **Committee on Estimates**,
    **Standing Committee on Defence** and the **Consultative Committee for Ministry of Shipping, Ports and
    Highways**.
  - ⚠️ **Cross-attribution warning:** A&N's live allocated limit is **₹14.70 crore — the same figure the recon
    attributes to Ladakh's MP** (whose live values are ₹11.04 Cr for the 17th LS and ₹16.11 Cr for the 18th).
    Recon's Ladakh/M-Plads numbers do not reproduce on either tenure; **treat that as a possible
    cross-jurisdiction mix-up and never carry a stale MPLADS figure forward.**
  - **Label both as MP-LADS for one MP each — never as MLA funds.**

**Ladakh — NOT A GAP: this Union Territory has no legislature at all, so there is no MLA page to source.
The negative is established from five independent official sources, three of them machine-readable.**
- **§1 — The governing citation (primary, official).** The Ministry of Home Affairs' own division page for
  Jammu & Kashmir and Ladakh Affairs states, verbatim, in its "Overview of UT of Ladakh" block:
  > *"Formation: The Union Territory of Ladakh came into existence on **31.10.2019**. **Legislature: It is a
  > Union Territory without Legislature.** Districts: It comprises of 2 districts i.e. **Leh and Kargil**."*
  The **same page draws the contrast explicitly** for the sibling UT created by the same Act: *"Overview of the
  UT of Jammu & Kashmir … **Legislature - It is a UT with Legislature.** Districts – There are 20 districts in
  J&K"*. The page also records the MHA's own statutory remit for Ladakh as *"the delegation of powers to the
  Administrator/Lieutenant Governor under **Article 239** of the Constitution"* and *"Formulation of
  regulations under **Article 240** of the Constitution for the peace, progress, and good governance of the
  Union Territory of Ladakh."* (200, 92,543 B.)
- **§2 — Article 240 is the structural marker, and I read a live document that uses it.** The
  **Ladakh Autonomous Hill Development Councils (Amendment) Regulation, 2025 — No. 2 OF 2025**, published in
  the **Gazette of India, Extraordinary, Part II — Section 1, No. 191**, Ministry of Law and Justice
  (Legislative Department), New Delhi, **2nd June 2025**:
  > *"**Promulgated by the President in the Seventy-sixth Year of the Republic of India.** A Regulation further
  > to amend the Ladakh Autonomous Hill Development Councils Act, 1997. **In exercise of the powers conferred
  > by article 240 of the Constitution read with sub-section (2) of section 58 of the Jammu and Kashmir
  > Reorganisation Act, 2019, the President is pleased to promulgate the following Regulation made by her:**"*
  **The President legislates for Ladakh because Ladakh has no legislature.** The operative change: in
  **section 4** of the LAHDC Act, 1997, after sub-section (1) insert — *"(1A) **Not less than one-third of the
  total number of seats in the Council shall be reserved for women** and such seats may be allotted by
  rotation to different…"*. ⚠️ The PDF is an **OCR'd scan**: the Devanagari masthead garbles to
  `rfi s + ril. q+ (cr)o4/oooi/z@3-2s`, `ffie`, `THE LADAKH AUTONOMOUS HILL DEVELOPMENT COUNCI LS (AMENDMENT)
  REGULATION, 2025`, but **the English body is clean and fully readable** — read the English, not the masthead.
- **§3 — The Election Commission's own JSON API confirms Ladakh holds no assembly elections.**
  `GET https://www.eci.gov.in/eci-backend/public/api/get-ac-election-state` → **200, 461 B, `application/json`**.
  The complete response body is:
  `{"code":200,"status":1,"success":true,"message":{"2026":{"S25":"West Bengal","S22":"Tamil Nadu","U07":"Puducherry","S11":"Kerala","S03":"Assam"},"2025":{"S04":"Bihar","U05":"NCT OF Delhi"},"2024":{"S27":"Jharkhand","S13":"Maharashtra","S07":"Haryana","U08":"Jammu & Kashmir","S18":"Odisha","S21":"Sikkim","S02":"Arunachal Pradesh","S01":"Andhra Pradesh"},"2023":{"S29":"Telangana","S20":"Rajasthan","S12":"Madhya Pradesh","S16":"Mizoram","S26":"Chhattisgarh"}}}`
  **`"Ladakh"` occurs 0 times, and so does the lower-case string.** Note the shape of the evidence — this is
  not merely an absence: the UT codes run **`U05` Delhi, `U07` Puducherry, `U08` Jammu & Kashmir**, and the
  **`U09` slot that would be Ladakh is simply not in any year's list.** The *sibling UT from the same 2019
  Act* is present (`U08`, 2024); Ladakh is not.
- **§4 — No NeVA tenancy.** `https://neva.gov.in/Home/NeVA` → **200, 191,858 B**, listing **39
  `<state>.neva.gov.in` subdomains**. The strings **`ladakh` / `Ladakh` / `LADAKH` occur 0 times** — as do
  `lakshadweep`, `andaman`, `dadra` and `chandigarh`. NeVA is a *legislature* platform; a UT without a House
  has nothing to host. (Cross-check: the same page lists `Jkla` for the UT that *does* have one.)
- **§5 — No assembly host exists, and the CEO host is not serving.** DNS: **`assembly.ladakh.gov.in`,
  `vidhansabha.ladakh.gov.in`, `ladakhassembly.gov.in` → NXDOMAIN** (also `lahdcleh.nic.in` and
  `lahdckargil.nic.in` are NXDOMAIN — the Hill Councils live on `leh.nic.in` / `kargil.nic.in` instead).
  **`ceo.ladakh.gov.in` resolves (164.100.85.52) but both :80 and :443 time out** — `000`, 0 bytes after 25 s,
  re-tested twice. Recon's "not serving" is confirmed.
- **§6 — Corroboration from the UT's own site.** `https://ladakh.gov.in/` → **200, 237,285 B**, and its
  homepage contains **0** occurrences of `MLA`, `Vidhayak`, `Vidhan Sabha`, `Legislative Assembly` or
  `assembly constituency`. Across **121 of 123 linked pages fetched, `MLA` occurs 0 times.** A UT portal with
  no MLA anywhere on it is consistent with there being none.
- **§7 — PRS carries no Ladakh legislature data either.** `https://prsindia.org/bills/states?state=Ladakh`
  returns **0 bill PDFs and no `bills_states/ladakh/` folder**, while the sibling
  `state=Jammu+and+Kashmir` returns the `jammu-and-kashmir/` folder. There is no Ladakh corpus to mirror.
- **⚠️ The closest elected tier is NOT MLAs — it is Hill Council COUNCILLORS, and the registry must never
  present them as MLAs.** Ladakh's only elected legislative-tier bodies are the **Ladakh Autonomous Hill
  Development Councils** (LAHDC Leh, 1995; LAHDC Kargil, 2003) under the **Ladakh Autonomous Hill Development
  Councils Act, 1997**. They are *district-level autonomous councils with development and planning powers* —
  they cannot pass laws, and their members are **councillors**. What they do publish is genuinely per-member
  and curl-fetchable:
  - **LAHDC Leh, General Election-2020 to the 6th LAHDC Leh** —
    `https://leh.nic.in/election-trends-results/` → **200, 144,278 B**, a plain HTML table
    `Constituency No.-Name | Leading Party | Trialing Party | Result` for **all 26 constituencies**, with the
    **winner, the runner-up and the margin**: `1-TURTUK — Ghulam Mehdi (BJP) vs Ghulam Hussain (IND) — BJP won
    by 367 votes.`; `2-HUNDAR — Kunzang Lotus (BJP) vs Stanzin Chotar (INC) — BJP won by 420 votes.`
    Party summary: **BJP 15, INC 9, AAP 0, Independent 2 = 26.**
    ⚠️ The column headers still read **"Leading Party" / "Trialing Party"** (sic — a typo for *Trailing*) even
    though the Result column says "won": this is a leftover from the night-of-counting live-results template.
    **Read the `Result` column, not the header names.**
  - **The Hill Council fund is the CCDA — Councillor Constituency Development Allocation — and it is for
    COUNCILLORS, not MLAs.** On the UT administration's own portal:
    `https://ladakh.gov.in/cec-feroz-khan-chairs-executive-council-meeting-at-kargil/` → **200, 102,540 B**,
    Kargil, **2 February 2023**, verbatim: *"the CEC proposed the enhancement of **Councilor Constituency
    Development Allocation (CCDA)** in LAHDC Kargil from **Rs 01 cr to Rs 1.50 cr for each Councilor** from the
    next financial year **2023-2024**, which was approved by the Executive Council. Further, it was decided
    that **85 percent from the CCDA shall be proposed for major works while as 15 percent for machinery and
    equipment** … Moreover, it was decided that the **Councilors shall identify the 80 percent of works having
    estimated cost above Rs 5 lakhs** while as the rest of 20 percent shall be within the estimated cost of
    **Rs 1 lakh to 5 lakhs**."* — **an official per-member allocation figure with works-splitting rules, for
    the wrong tier. It must not be rendered as an "MLA fund".**
  - ❌ **There is no per-councillor data portal.** No official source publishes, per councillor, the allocation
    limit, works recommended, works sanctioned, works completed or expenditure. CCDA appears only as aggregate
    district-plan totals and in individual press releases, never as a queryable dataset.
- ✅ **THE ONE GENUINELY PER-MEMBER DATASET THAT DOES EXIST IS THE PARLIAMENTARY TIER — and it works.**
  Ladakh elects exactly **one Lok Sabha MP** (1-Ladakh PC) and, being a UT without a legislature, has **no
  Rajya Sabha seat of its own**. eSAKSHI (`mplads.mospi.gov.in`) carries Ladakh as **`STATE_ID 130`**
  (confirmed live from `/getStateData`: `{'STATE_NAME': 'Ladakh', 'STATE_ID': 130}`), and
  `python3 tools/fetch-mplads.py IN-LA 130` **succeeds**:
  - **Wrote `data/mplads/IN-LA/ladakh.json` + `index.json`** — constituency `LADAKH` (const_id 214),
    **MP `Mohamed Haneefa`** (mp_id 3043914).
  - **18th Lok Sabha (tenure 7) tiles, fetched 2026-09-18:** Allocated Limit **₹16,11,14,542 (₹16.11 Cr)** ·
    Works Recommended **55 (₹5,45,18,000 / ₹5.45 Cr)** · Works Sanctioned **21 (₹1,71,28,000 / ₹1.71 Cr)** ·
    Works Completed **0** · Expenditure on Completed and On-going Works **₹60,09,392 (₹0.60 Cr)** ·
    Amount consented for Calamity **0**.
  - ⚠️ **CORRECTION — the recon's Ladakh MPLADS figures do not reproduce on either tenure.** Recon quotes
    *Allocated ₹14.70 Cr, Works Recommended **450**, Sanctioned 341, Completed 101, Expenditure ₹4.14 Cr*.
    Pulled live, the **17th Lok Sabha (tenure 5)** row is *₹11.04 Cr allocated, **171** recommended,
    130 sanctioned, 4 completed, ₹3.13 Cr expenditure*, and the **18th (tenure 7)** row is the set above.
    **Neither matches the recon's numbers**, and the recon does not state which tenure it read. **The eSAKSHI
    API is live and its tiles move** — record the tenure **and** the fetch date, and never carry a stale
    MPLADS figure forward.
  - **Label this MP-LADS for one MP — never an MLA fund.** Because Ladakh has a single PC, the state-level row
    *is* the per-MP figure; district splits (Leh/Kargil) return zeroes from the same API, so state level is the
    only granularity available.

**Jammu and Kashmir — the Bill module is a live shell over a single, four-session Assembly, and recon is
right that the data is absent — now driven across the whole id space rather than one HouseCode.**
- **There is only ONE Assembly to query.** `/Bill/GetAllAssembliesList?UnitCode=JK` → **89 B**:
  `[{"AssemblyID":1,"AssemblyCode":1,"AssemblyName":"Ist J&K Legislative Assembly UT"}]` — the first Assembly
  of the Union Territory, constituted after the Sept–Oct 2024 election. `/Bill/SessionList?AssemblyId=1&UnitCode=JK`
  → 4,924 B listing **four** sessions: `4` = Fourth Session, `5` = Fifth Session, `6` = Sixth Session,
  `100` = Demonstration Session.
- ❌ **`/Bill/FetchDataListBillsBySearch` returns nothing for every combination swept — 18 of them**
  (`SessionID ∈ {0,1,2,3,4,100}` × `BillTypeId ∈ {0 (all), 1 (Government Bill), 2 (Private Members Bills)}`,
  `HouseCode=JK`, `AssemblyID=1`, `FromYear=2024&ToYear=2026`). **Zero `<tr>` in all 18.** This extends the
  recon's finding (which tested HouseCode variants `JK/JKA/JKLA/empty/1`) with the **real session ids** and
  the **private-members type**, so "the filter exists and the data does not" is now measured, not sampled.
- ❌ **The dashboards are empty too.** `/Bill/GetBillDashBoardData?UnitCode=JK` and
  `/Bill/GetBillStateDashBoardData?UnitCode=JK` → **200, 580 B each, "No Records Founds"**.
- ⚠️ **Context that makes this a real gap rather than an empty jurisdiction:** the `/Bill` page still offers
  the full shared taxonomy — Bill Category (Money / Financial / Ordinary / Constitution Amendment /
  Ordinance Replacing), Year 2010–2026, Status (Assented / Passed / Pending / Withdrawn / Negatived / Lapsed /
  **Introduced**) and **`BillTypeId` 2 = Private Members Bills** — and the per-member BILLS tab renders
  "No Records Founds" on every member page. J&K MLAs have demonstrably introduced private members' bills, so
  this is **data absence, not an empty legislature**.
- ❌ **No introduction/passage document of any kind is retrievable**, so **no introducer question can even be
  asked** — there is no Introduced-vs-Passed choice to make here. The only J&K bill documents found in this
  sweep were **PRS's gazette reproductions**, reached under the `jammu-and-kashmir` folder — and note that
  **that folder also contains a misfiled *Jharkhand* bill** (`/bills_states/jammu-and-kashmir/2018/Bill28of2018Jharkhand.pdf`,
  *The Indian Stamp (Jharkhand Amendment) Bill, 2018*, verified by OCR). **A PRS state folder is not a
  reliable state key in either direction** — see the Jharkhand block.

**Jharkhand — CORRECTION: the NeVA Bill module is POPULATED (recon says the deep modules "are not
populated or reachable"). The index is real; the documents are not served.**
- ✅ **`/Bill/GetBillDashBoardData?UnitCode=JH` → HTTP 200, 7,398 B, a 4-row real table.** Columns:
  **`Sr No | Bill Number | Title | Description | Ministry | Department(s) | Date of Introduction House | Document`**.
  Rows (all 2026, Sixth Assembly):
  | # | Bill | Title | Department | Introduced | Doc |
  |---|---|---|---|---|---|
  | 1 | **2 of 2026** | Tourism Bill | Tourism, Art, Culture, Sports & Youth | 11/06/2026 | As Introduced |
  | 2 | **5 of 2026** | खनन विभाग विधेयक, 2026 | Health, Medical Education & Family Welfare *(sic — as published)* | 10/06/2026 | As Introduced |
  | 3 | **6 of 2026** | श्री मनोज कुमार यादव, मा०स०वि०स० द्वारा दिनांक-13.03… | Women, Child Development & Social Security | 08/06/2026 | As Introduced |
  | 4 | **8 of 2026** | पेयजल उपलब्ध कराना | Panchayati Raj | 02/06/2026 | As Introduced |
  ⚠️ **The `Document` column reads "As Introduced"** — the Punjab/Goa variant that carries the introducer.
  ⚠️ **Rows 3 and 4 are not bill-shaped** (row 3 is a private member's matter "by Shri Manoj Kumar Yadav,
  MLA"; row 4 asks *"(1) क्या यह बात सही है कि…"*). **This dashboard appears to mix bills and
  question-submissions** — do not assume every row is a bill without reading it.
- ❌ **Every bill PDF is 404.** The links point at
  `https://cms.neva.gov.in/NeVA/JH/FileStructures///IntroductionPdf/<BillNo> of2026_Introduction.pdf`
  (note the **triple slash** and **spaces in the filename**). Tested **5 filename variants** —
  `2%20of2026_…`, `2of2026_…`, `2%20of%202026_…`, `2%20of2026%20_…`, `….PDF` — **all HTTP 404 (1,245 B)**.
  `cms.neva.gov.in` itself is up (root → 200, 22,126 B); `/NeVA/JH/` and `/NeVA/JH/FileStructures/` → **403**.
  So the NeVA bill tier is **metadata ✅ / documents ❌**.
- ❌ **The assembly's own bills page is 100% dead links — recon is exactly right.**
  `…/विधेयक` → 200, 51,186 B, **24 hrefs of which every single one is on the dead NXDOMAIN domain
  `jharkhandvidhansabha.nic.in`** (`/sites/default/files/Videyak2002.pdf`, `VD2004.pdf`, `VD2011.pdf`,
  `Videyak2009.pdf` … covering 2002–2026), and **0 working local PDFs**. The same dead domain also kills the
  party-position page (`DalgatSthiti.pdf`). Re-verified independently: **`jharkhandvidhansabha.nic.in` still
  returns empty DNS.**
- ✅ **WORKING SOURCE = PRS — and the recon never recorded PRS as a Jharkhand bills source at all.**
  `https://prsindia.org/bills/states?state=Jharkhand` → walked to page 6 (page 5→6 repeats at 39 = end) →
  **UNION = 234 results, 2010 → 2026** (2010:4, 2011:33, 2012:9, 2013:3, 2014:6, 2015:32, 2016:22, 2017:17,
  2018:20, 2019:11, 2020:11, 2021:19, 2022:18, 2023:10, 2024:9, 2025:8, 2026:1).
  - ⚠️ **PRS MISFILES A BILL ACROSS STATES — verified.** Of the 234 results, **233 sit under
    `/bills_states/jharkhand/`** and **1 does not**:
    `/files/bills_acts/bills_states/**jammu-and-kashmir**/2018/Bill28of2018Jharkhand.pdf`, titled
    *"The Indian Stamp (Jharkhand Amendment) Bill, 2018"*. I downloaded and OCR'd it: it reads
    **"भारतीय मुद्रांक (झारखण्ड संशोधन) विधेयक, 2018 [सभा द्वारा यथापारित]"** — *as passed by the Assembly*,
    printed by the Superintendent, Jharkhand Government Press, Ranchi. **It is a Jharkhand bill filed in
    the Jammu & Kashmir folder.** So: filtering these results by URL path **drops a real bill**, and
    treating the URL path as authoritative **imports another state's folder**. Take the *result list*, and
    cross-check the file itself.
  - ⚠️ **Filenames are not constructible and frequently contain spaces** — `/jharkhand/2022/BillNo8of 2022JHK.pdf`,
    `Bill No. 6 of 2022 JHK.pdf`, `Ordinance No. 4 of 2016 JHK.pdf`, and mixed conventions
    (`SN.3of2010JH`, `Bill4of2017Jharkhand`, `ORD3of2019JH`). An unquoted `curl -o` silently wrote **three
    0-byte files** in this run. **Quote and URL-encode; always take the URL from the index.**
- **LANGUAGE + ENCODING — the sharpest finding on this state: 76 % of the set is a pure scan, and the
  remaining "text" is legacy-font Hindi *inside the same document as clean English*.**
  Downloaded **46** bill/ordinance PDFs (2 per year, 2010–2026, plus every space-containing name and the
  cross-state file) and classified each:
  - **35 of 46 are SCANS** — 0–4 extractable characters (`2010-SN.3of2010JH.pdf`, 29 pages, 2 chars;
    `2025-Bill8of2025JH.pdf`, 34 pages; `2025-Bill5of2025JH.pdf`, 72 pages).
  - **11 of 46 yield text — and it is legacy-font Devanagari, not clean Unicode.** The tell is systematic
    glyph substitution on top of readable Hindi: `झारखÖड` for झारखंड (19×), `अिधिनयम` for अधिनियम (27×),
    `Ĥकाͧशत` for प्रकाशित (9×), `ɮवारा` for द्वारा (6×), `संÉया` for संख्या, and literal `/glyph` strings
    leaking the PDF's glyph names. **The document's fonts confirm it**: the 2026 Ordinance carries
    `/F8 KrutiDev010,Bold` plus `Calibri / Mangal / NirmalaUI / ArialUnicodeMS` with **no `/ToUnicode`**
    (legacy path) *alongside* `/F3 FNTSBS+Mangal`, `/F9 FNTSBS+ArialUnicodeMS` **Type0 with `/ToUnicode`**
    (clean path). **The same page extracts correctly through one font subset and corrupts through another.**
  - ⚠️ **This produces *silently wrong* Hindi, which is worse than a scan** — `अिधिनयम` and `अधिनियम` are
    different strings, `᭛` (U+1B5B) stands in for `ं` (U+0902) 25 times. **Do not feed that text to a
    downstream consumer as if it were clean.**
  - ✅ **BUT — check for the English text first (the bilingual rule). The gazette PDFs are bilingual and the
    English half is clean ASCII.** In `2026-Ord1of2026JH.pdf`, **pages 0–5 are Hindi (≈1,000 Devanagari
    chars/page, ~0 Latin words) and pages 6–10 are English (160–312 Latin words/page)** — 1,232 Latin words
    total, including *Act, Amendment, Article, Assembly, Chapter, Clause, Constitution, Gazette, Goods,
    Government, Governor, India, Jharkhand*. The English text is published **under Article 348(3)** as the
    ordinance's authorised English text. **Read pages 6+; do not build a transcoder.**
- **DOCUMENT READ — what Jharkhand's 2026 ordinance actually enacts** (English half, verbatim):
  **The Jharkhand Goods and Services Tax (Amendment) Ordinance, 2026 (Jharkhand Ordinance No. 01, 2026)**,
  *"An Ordinance to amend Jharkhand Goods and Services Tax Act, 2017 (Jharkhand Act 12, 2017), in regard to
  its applicability and enforcement within the State of Jharkhand."* Preamble: *"Whereas the legislative
  Assembly of State of Jharkhand is not in session and whereas the Governor of Jharkhand is satisfied that
  circumstances exist which render it necessary to take immediate action…"* — promulgated in exercise of
  **Article 213(1)**. **s.2(i):** in clause (61), after the words "section 9", insert *"of this Act or under
  sub-section (3) or sub-section (4) of section 5 of the Integrated Goods and Services Tax Act, 2017"*,
  **with effect from 1 April 2025** (retrospective). **s.2(ii):** in clause (69)(c) insert the word
  **"fund"** after "management of a municipal", and add an Explanation defining **"local fund"** and
  **"municipal fund"**. Gazette header: *Jharkhand Gazette (Extraordinary), No. 431, Ranchi, Monday,
  3 August 2026*; Law (Legislative) Department Notification No. **LG-24/2010-23/Leg**, Governor's assent
  **30/07/2026**.
- **READING RECIPE for the scan majority — established and working:** `qlmanage -t -s 3000 -o <dir> <pdf>`
  then `tesseract <png> - -l hin --tessdata-dir work/election-atlas/tools/tessdata` (the repo vendors
  `hin.traineddata`). Verified on `2025-Bill8of2025JH.pdf`: the OCR returns
  *"झारखण्ड सरकार / विधि विभाग / झारखण्ड कोचिंग सेंटर (नियंत्रण एवं विनियमन) विधेयक, 2025 /
  अधीक्षक, झारखण्ड राजकीय मुद्रणालय, राँची द्वारा मुद्रित।"* — **Jharkhand Government, Law Department,
  The Jharkhand Coaching Centre (Control and Regulation) Bill, 2025**, printed by the Superintendent,
  Jharkhand Government Press, Ranchi — clean, correctly-formed Devanagari, **unlike** the legacy-font
  extraction path above.
  ⚠️ **Some scans store each page as horizontal strips** — `XSTATE-Bill28of2018Jharkhand.pdf` has
  **9 `/DCTDecode` images of 2480×390 px per page, 0 fonts**. `qlmanage -s 3000` **composed the page
  correctly anyway** (2,119×3,000 PNG) and OCR succeeded — but a raw image-extraction approach must
  **stitch the strips**, or it will OCR one-ninth of a page and report gibberish.
- ❌ **The introducer is NOT published by any reachable tier.** The NeVA index has no member column and its
  "As Introduced" PDFs are 404; the assembly's registers are dead links; the PRS documents are
  **as-passed / as-promulgated** gazette publications signed by the Governor and the Law Department
  (Ordinance No. 01 of 2026, LG-24/2010-23/Leg) — **no Minister or member name**. Same shape as WB.
  **Documented gap.** (The one member-named item in the whole state is the NeVA dashboard row 3,
  *"श्री मनोज कुमार यादव … द्वारा"* — and that row is question-shaped, not a bill.)


- **The assembly's own site is off-network, and this was re-tested.** `assembly.wb.gov.in` resolves to
  **103.60.135.52**, but **TCP connect to :80 and :443 times out** (`nc` "Operation timed out"), `curl`
  returns **000 / 0 bytes** after 25 s, and an independent fetch path fails too. That is *harder* than the
  recon's finding ("hangs with 0 bytes for 45–150 s **or** 302s to `/Error_ISE.aspx`") — there is now not
  even an application-level response. The legacy host **`www.wbassembly.gov.in`** (164.100.233.152) also
  returns **000 / 0 bytes** (recon saw a "you will be redirected" notice there).
  ⚠️ **Do not record "unreachable" without the Wayback route below** — the site's content is recoverable.
- **NeVA's bill module is a live shell that 500s.** `/Bill` (200, 36,219 B) exposes a *full* filter set —
  `AssemblyCode` (17/18), `SessionCode`, `BillcategoryId` 1–5, `FYearValue`/`TYearValue` **2010–2026**,
  `BillStatusId` (Assented/Passed/Pending/Withdrawn/Negatived/Lapsed/…), and **`BillTypeId`
  1 = "This is a Government Bill (Other)", 2 = "Private Members Bills"** — i.e. **WB does have a
  private-members category in its taxonomy**, unlike Sikkim.
  ✅ `…/Bill/GetBillDashBoardData?UnitCode=WB` and `…/Bill/GetBillStateDashBoardData?UnitCode=WB` → **200,
  632 B, "কোনও রেকর্ড পাওয়া যায়নি"** (No Records Found). `/Bill/SessionList?AssemblyId=18` → 1,231 B
  (one session, `SessionCode 100` = First Session); `?AssemblyId=17` → **0 bytes**.
  ❌ **`/Bill/FetchDataListBillsBySearch` → HTTP 500 (3,531 B)** — the shared NeVA error page — for
  Government Bills, for **`BillTypeId=2` Private Members Bills**, and for the 17th Assembly alike.
  **Same failure signature and identical byte size as Sikkim's.** So the bills module is present, wired,
  and empty.
- ✅ **WORKING SOURCE = PRS, and it is not merely an index — it hosts the gazette documents.**
  `https://prsindia.org/bills/states?state=West+Bengal` → walked to page 9 (page 8→9 repeats at 47 = end)
  → **UNION = 393 bill PDFs, years 2010 → 2026** (2010:35, 2011:18, 2012:34, 2013:28, 2014:24, 2015:38,
  2016:23, 2017:53, 2018:32, 2019:21, 2020:3, 2021:8, 2022:27, 2023:11, 2024:17, 2025:8, 2026:13).
  ⚠️ **The recon never recorded PRS as a WB bills source at all** — it only listed a PRS *profile* page.
  - **These are the official Kolkata Gazette, Part IV — verbatim.** Every readable file opens
    `Registered No. WB/SC-247  No. WB(Part-IV)/<year>/SAR-<n>` … `Kolkata  Extraordinary  Published by
    Authority`, and the Part-IV heading reads *"Bills introduced in the West Bengal Legislative Assembly;
    Reports of Select Committees presented or to be presented to that Assembly; and Bills published before
    introduction in that Assembly."* So the Bills tier and the Gazette tier are **the same document**.
  - ⚠️ **Filenames contain spaces and parentheses and are NOT constructible.**
    `WB Bill No. 33 of 2017.pdf`, `Bill 25 of 2018 WB.pdf`, `Bill_2016_3WB.pdf`, `BillNo.19of2022WB.pdf`,
    `BillNo7of2023WB.pdf`, `Bill9of2026WB.pdf` — **five different naming conventions across the set**.
    A naive unquoted `curl -o` silently produced 0-byte files in this run; **quote and URL-encode, and
    always take the URL from the index page, never build it.**
  - **DOCUMENT READ — what a WB bill actually is.** Downloaded 24 bills (2 per year, 2010–2026) and read
    `2026/Bill13of2026WB.pdf` in full: **The Kolkata Gazette, Extraordinary, Part IV, ASADHA 3, WEDNESDAY,
    JUNE 24, 2026 [SAKA 1948]**, `No. WB(Part-IV)/2026/SAR-13`, a **GOVERNMENT OF WEST BENGAL / LAW
    DEPARTMENT / Legislative NOTIFICATION No. 564-L, 24th June 2026** — *"The Governor having been pleased
    to order, under rule 66 of the Rules of Procedure and Conduct of Business in the West Bengal
    Legislative Assembly, the publication of the following Bill, together with the Statement of Objects and
    Reasons and the Financial Memorandum which accompany it, in the Kolkata Gazette…"*. The bill is
    **THE WEST BENGAL MAINTENANCE OF PUBLIC ORDER (AMENDMENT) BILL, 2026 — Bill No. 13 of 2026**,
    *"to amend the West Bengal Maintenance of Public Order Act, 1972"*; it renumbers s.2(a) as (a3) and
    inserts definitions of **"Claims Commissioner"** (an officer not below Additional District Magistrate),
    **"Claims Commission"** and **"Damage"**. Language: **English**, born-digital.
  - ❌ **The introducer is NOT published.** Searched **5 bills spanning 2012–2026** for
    `introduced by` / `Introduced by` / `by Shri…` → **zero hits**. Every bill is issued by the **Law
    Department** under rule 66, which is *publication*, not sponsorship. The `Minister` strings that appear
    are the bill's own text (e.g. a 2012 Higher-Education bill defining *"'Minister' means the
    Minister-in-charge of Higher Education"*). **Documented gap** — and note this is the **opposite** of the
    Punjab/Goa Introduced-vs-Passed pattern: WB publishes only the *pre-introduction* gazette text and it
    still carries no name.
  - **Encoding is per-document and the "text" is often OCR.** 22 of 24 sampled files extract; **1
    (`2023-BillNo7of2023WB.pdf`, 6 pages) is a pure scan (0 chars)**. The extractable older ones are
    **OCR layers, not born-digital** — headers read `tl(nlkata` / `ifutlkata` / `'91 'it Extraordinary`
    for *Kolkata*, and `Ebe Rotiota coette` for the masthead. **Do not parse a date or a city name out of
    those headers.**
  - Two files (`2024/Bill15of2024WB.pdf`, `2026/Bill4of2026WB.pdf`) begin *"of Procedure and Conduct of
    Business in the West Bengal Legislative Assembly"* — the PRS PDF's first page does **not** start at the
    bill. Read the whole file before quoting a title.
- **The WB e-Gazette portal is Part-II only and does NOT carry legislation.** `https://www.wbgazettepart2.in/`
  → **200, 6,364,763 B**, `<title>Kolkata Gazette Part-II</title>`, run by **Saraswaty Press Limited**
  (a Government Enterprise under the PE & IR Department — it took over Part II from the WBG Press, Alipore).
  Its own banner states its scope: *"Application relating to change of Name (including correction of
  spelling), Surname, Gender and publication of Public Notices/Advertisement."* Every row in its listing
  and in `/BGPressGazette`, `/MonthlyGazette`, `/BGPressMonthlyGazette` is **Change of Name / Change of
  Surname** — and the routes contain **zero** occurrences of "bill", "act" or "Part IV". It is a
  **civil-notice gazette**, exactly like Odisha's. `wbgazette.gov.in`, `gazette.wb.gov.in`,
  `egazette.wb.gov.in`, `dpl.wb.gov.in`, `wbprint.gov.in`, `wbppp.gov.in` are all **NXDOMAIN**.
- ⚠️ **`wbplan.gov.in` is still dead** — re-confirmed **NXDOMAIN** (the old `beupweb/` per-MLA report host).


- **`www.mizoramassembly.in` is BESPOKE, not NeVA.** `nginx` + Laravel (`XSRF-TOKEN`, `assembly-session`
  cookies), a custom Bootstrap theme, `.in` (not `.gov.in`/`.nic.in`) — and it merely *links* to NeVA under
  "Related Links". It is nonetheless official: its footer links the State Portal and NeVA, and
  `mizo.neva.gov.in`'s footer reads *"Content managed by: Mizoram Legislative Assembly"*.
- **Two separate bill registers, both live and both server-rendered (curl-200, no tokens):**
  - **Government Bills** — `/government-bill` → **39 pages × ~10 rows (~390 bills)**, each an HTML
    field table: `Title | Originating Department | Date of Introduction | Passing Date | Date of Sending to
    Law Deptt for obtaining assent | Bill No & Year | Date of Assent by Lt. Governor/Governor/President |
    Mizoram Act No. & Year | Remarks | Download`. Latest: *The Mizoram Regulation of Fireworks Bill, 2026*
    (Bill **44 of 2026**, Home Dept, introduced **and** passed **2026-08-25**, Remarks "Passed").
  - **Private Members' Bills** — `/private-bill` → **exactly 2 bills, no pagination**. It **is**
    member-attributed (`Submitted by: Dr. VANLALTHLANA` for *The Mizoram (Land Revenue) (Amendment) Bill,
    2023*, 17-02-2023, Remarks "Referred to Select Committee"); the 2022 one (*The Private Transport
    Workers (Welfare) Bill*) has an **empty `Submitted by`**. A two-row register is not a per-member record.
- ⚠️ **The register carries NO introducer column** — only `Originating Department` (e.g. "Home", "Finance
  Department"). So who *introduced* a government bill is **not** on the index.
- ⚠️ **Filenames are opaque ULIDs and must never be constructed.** Two eras:
  `/storage/government-bill-attachments/GB-<26-char ULID>.pdf` and the older
  `/storage/government-bills/<Month><Year>/<20-char random>.pdf` (both still linked, mixed freely).
  **Always read the index page; never build the URL.**
- **No "Introduced vs Passed" split** (unlike Punjab/Goa) — one PDF per bill, and `Remarks` says "Passed".
- ❌ **DOCUMENT TEST — the introducer is NOT published, in the register or in the bill PDFs.**
  Read **7 government-bill PDFs** (GST (First Amendment) 2026, Land Revenue, Sialkal Range Development
  Council, Shops & Establishments, (Registration of Tourist Trade), Jan Vishwas, and the 11-page one):
  **zero occurrences of `introduced by` / `Introduced by` / `to be introduced`** in any of them. The
  `Minister` strings that *do* appear are incidental to the bill's own text — e.g. the Fireworks Bill
  names *"The Minister in charge of the Home Department … who shall be the Chairman, ex officio"* as the
  composition of a committee it creates, not as its sponsor. So **Mizoram's bill tier gives you the
  title, the department, the dates, the Bill No and the text — but not who introduced it.** That is a
  **documented gap**, not a not-yet-found field; the 7-bill sample was chosen to avoid the one-bill
  over-generalisation trap.
- ⚠️ **Bills are mixed text/scan per document, and "text" includes OCR layers.** 6 of the 7 extract
  prose; **1 (`GB-01KJ77Z03MS1SFDVE56EP2QRTB.pdf`, 11 pages) yields 10 characters — a pure scan.** And
  two of the extractable ones are **OCR'd, not born-digital** — their headers read
  `"Assembly Bill No..... of.2Aatadaat"` / `"of.2.aAt.aCmalg"` where a year should be. Do not report a
  year parsed from those headers.
- **PRS cross-check:** `https://prsindia.org/bills/states?state=Mizoram` exists as a convenience mirror.
  The official host is self-sufficient for the *list*; PRS is not required.

**Mizoram — CORRECTION: the bill register holds 577 rows, and its "per-bill text PDFs" claim does not survive.**
- ❌ **Root cause of the 9-row read.** `/government-bill` is a Bootstrap **accordion of cards, ONE CARD PER BILL**;
  each card's `<table class="table table-bordered">` is a **vertical key/value list of 10 `<tr>` — one `<tr>` per
  *field*, not per row**. A "biggest table by `<tr>` count" picker therefore selects **one card = 9 data rows**.
  The "15 tables" are 15 bills, not 15 pages.
- ✅ **The real register is 39 pages exactly** (Laravel `?page=N`, plain GET, no postback): 15 cards × 38 pages +
  5 on page 39 = **575 government rows** (558 unique titles) **+ 2 private-member rows = 577**. The registry's
  earlier "~390 bills" came from reading **10 fields as 10 rows**.
- ❌ **"per-bill text PDFs" is FALSE for the list.** Measured: **58 of 575** rows link a real PDF; **492 link the
  SAME 859-byte blank placeholder** `storage/Untitled%20document.pdf` (a Chrome print-to-PDF, producer
  `Skia/PDF m133`); **25 rows have no Download row at all** (bill nos 22–46, 2019–2021). **Unique document URLs
  in the whole government register: 59.** ⚠️ **A `--check-links` pass would false-positive on all 492** (HTTP 200,
  `application/pdf`, blank) — the placeholder must be suppressed **before** any link check.
- ❌ **"no introducer" holds only for the government register.** The **private** register carries **`Submitted by`**
  (e.g. *Dr. VANLALTHLANA*, 2023) plus `Department Concern`. Government vs private is distinguishable **only by
  URL** (`/government-bill` vs `/private-bill`), so both must be fetched and tagged.
- ⚠️ **Harvest UNFILTERED.** All 12 `period_id`×`assembly_id` combinations cover only **573 entries / 556 unique
  titles — a strict subset** (87 titles appear in no assembly filter), and **any filter silently drops the page
  size from 15 to 10**.
- ⚠️ **Other traps:** `?page=40` returns **HTTP 200 with 0 cards and a full nav** (use `max(page=)` from the
  windowed pager as the bound, and stop on 0 cards); card `<tr>` count is **9 or 10** and **68 cards carry a
  `<th>` with no matching `<td>`**, so positional indexing misaligns — pair `<th>`→`<td>` order-independently;
  **5 mixed date formats** (`DD/MM/YY` 467 · `YYYY-MM-DD 00:00:00` 64 · `YYYY-MM-DD` 10 · `D.M.YYYY` 10 · empty
  22) and **the date must never be used to derive the year** (`29/09/96` on a 1995 bill); download hrefs sit on
  the **apex** `mizoramassembly.in` while pages are served from `www.`; and page bytes are **unstable** (5 CSRF
  `_token` values + `style.css?v=<epoch>`) so **hash the card list, not the page**.

**Mizoram — the official e-Gazette is ON the assembly domain, and recon missed it entirely.**
- `https://www.mizoramassembly.in/gazette` is a **full official gazette archive**: columns
  `# | Volume/Issue No/Year | Short Title | Type | Action`, filterable by **Type** (General /
  Extra Ordinary / **Zoram Hriattirna**) and by **Year — 67 options, 1953 → 2026**.
- ⚠️ **The listing is complete back to 1972 but the documents are not.** The pager runs to **page 971**
  (~9,710 entries, oldest *Volume No 1/Issue No 11 of 1972*), yet **only pages 1–60 carry a Download
  link** → **~593 gazette PDFs, 2013 → 2026**. Pages 61–971 render rows whose Action cell is empty.
  This is the **same "list complete / documents partial" shape as the question register** (below).
- ⚠️ **Do not infer a document's date from its storage folder.** `…/gazettes/February2021/4I9qy8…pdf`
  contains a notification dated **8th February 2013**.
- **Encoding is per-document, not per-year** — 6 of 7 sampled gazettes extract cleanly (*"The Mizoram
  Gazette EXTRA ORDINARY Published by Authority RNI No. 27009/1973"*, 1–15 pages, 1.6 k–35 k chars), and
  the **newest (June 2026, `GZT-…`) is a pure scan (0 chars)**.
- `egazette.sikkim…`-style alternatives are absent; there is no separate gazette host to fall back on.


The state runs **four** distinct hosts, and a fetcher needs different techniques for each:
1. `uplegisassembly.gov.in` — **bespoke** AngularJS over ASP.NET with an **ASMX JSON service** (the
   cheapest and best tier — see Profile).
2. `upvidhansabhaproceedings.gov.in` — **Liferay 7** portal (`com_semanticbits_upla_*` portlets,
   theme `upla-ind-theme`); server-renders *reads*, but **queries are portlet-stateful**.
3. `vsopp.up.gov.in/uplaquest/Question_Online/` — classic **ASP.NET WebForms** (see Questions).
4. `upvs.neva.gov.in` — the national NeVA tenant (a thin shell here; see below).

- **Bills — a search exists, but it is not curl-queryable.** `bills-search` (115,563 B), `ordinance-search`,
  `acts-search`, `gazette-search` (214,073 B), `gazette-by-decade` (219,127 B) and `assembly-debates` all
  return **200**, and the bills form is a plain POST carrying a `p_auth` token plus a `p_p_id` portlet
  namespace — but replaying it with a valid token and three different query strings returned
  **0 table rows and 0 PDF links every time**, and none of the search pages exposes document links in its
  HTML. **Confirms the recon: a browser/session is required for Liferay queries.**
- **No per-member bill tally and no government-vs-private-member split** on any page — recon confirmed.
- **Convenience tier: PRS holds 258 UP bills/ordinances, 2019–2026 — nothing earlier.**
  (`bills_states/uttar-pradesh/`, slug is `uttar-pradesh` not `Uttar+Pradesh`.) **Correction to what I
  first wrote here:** I initially recorded "50 PDFs" — that was PRS's **page size**, not the total.
  PRS paginates at `per-page=50` and **silently caps `per-page=1000` back to 50**, so only
  `page=1..6&per-page=50` reveals the real number: **258** (2019: 4 · 2020: 42 · 2021: 41 · 2022: 21 ·
  2023: 35 · 2024: 51 · 2025: 41 · 2026: 23). Still a fraction of what a 403-seat house passes, and
  **nothing before 2019**, but far from "nothing".
- **These PRS PDFs are gazette reproductions** — the *UP Government Gazette, विधायी परिशिष्ट
  (Legislative Supplement) भाग-3 खण्ड (क)*, i.e. the bill as published in the gazette, in **Hindi**.
  **Reading note:** they carry a text layer, but `pypdf`'s `extract_text()` garbles the Devanagari
  (CID fonts; the Unicode is embedded via `/ToUnicode` CMaps that pypdf does not honour) — the reliable
  route is **OCR**: render (`qlmanage -t -s 2600`) then `tesseract -l hin --tessdata-dir
  work/election-atlas/tools/tessdata`. Read: **Bill 57 of 2025 = *The Uttar Pradesh Private Universities
  (Second Amendment) Bill, 2025***, introduced in the 11 Aug 2025 sitting, published under Rule 126 of the
  2023 Rules of Procedure, further amending the UP Private Universities Act 2019. (Ord 4 of 2025 = the UP
  Repealing Ordinance 2025, promulgated under Art. 213(1).)
- **Step 10 is therefore satisfiable via PRS for recent bills**, even though the official Liferay source is
  not queryable. What I read: the two documents above, plus the answer-text of a question (Questions) and
  the 1937–1993 attendance register (Attendance).

**Goa — per-member bills with the introducer in the index, and a live e-Gazette.**
- ⚠️ **`bills.php` IS AN EMPTY SHELL — the rows are not in it.** 200, 31,447 B, **0 `<table>`, 0 `<tr>`, 0 bill cards**, and exactly **2 `.pdf` anchors** (the sidebar `Rules1986.pdf` and `Goa-Legislature-Assembly-Rules-Pdf.pdf`) — which is precisely the 2-row yield a generic "biggest table / all PDF anchors" parser produces. The rows are AJAX-loaded by `js/bills.js` from the fragment **`_bills.php?assembly_id={a}&member_id=0&session_id=0&billtype_id=0&display_id=`**, **5 records/page** via `page=N`, one `.tab-info-bx.bills-info` card per bill.
- **Combos + per-member filter.** `_get_combo_details.php?mode=BILLS&a_id=14` → 4 `<select>` blocks joined by `~~**~~`: **14 assemblies, 40–41 members each, 15–20 sessions, Bill Type `1 Government Bill` / `2 Private Member Bill`**. **No session cookie, no POST, no captcha** — plain GET fragments; `SVRID`/`IX16LB` are set but **not required**, and `display_id` is inert. **Do not loop per member** — `member_id=0` already returns everything, and the introducer is in the index.
- ✅ **Measured: 1,443 cards over 295 listing requests across all 14 assemblies**, matching the sum of each page's own `total_bill_count` — but only **1,357 distinct `(assembly, number, year)`**, because **the source itself repeats 65 cards** (a12/a6 worst), so dedup is mandatory or the yield overstates by ~5%. ⚠️ **Page 1 and pages ≥2 use different framings**: page 1 is `~*~`-delimited into 5 parts where **part[0] is the cards, part[2] the authoritative total, part[4] an executable `<script>` — parse part[0] only**; pages ≥2 are bare HTML. **Page 36 returns 0 bytes = the hard stop.**
- ⚠️ **Old-assembly heads are OCR-noisy** — `Bill No. I of 1993`, `Bill NQ. 20 of 1995`, `Bill N0.29 OF 2000`, `Bill No, 2 of 1995`, `Bill No. 24 of 199` — a strict `(\d+) of (\d{4})` **fails 102/1,443 (7.1 %) and silently drops those bills**; needs a homoglyph fold (I/l→1, O/Q→0) plus a title-year fallback. ⚠️ **The anchor label can lie about the variant**: one row reads *Bill As Introduced 0 bytes* while its href is `…_final_…AP.pdf` — **trust the URL over the label**. ⚠️ One document is a **`.docx`**, and assembly-14 bills sit on `static.goavidhansabha.gov.in` UUID URLs where **As-Introduced-vs-As-Passed is genuinely unrecoverable** (251 of 288 docs) — do not guess by position.
- ✅ **The index carries the introducer** — `Bill No 24 of 2022 (Government Bill) **Introduced by Shri. Subhash Shirodkar**` with `mem_id=94`, present on **1,426/1,443** rows, plus `Passed on` (1,086), `Governor Assent Date` (938), `Portfolio` (267), `Department` (114) and the bill type (1,443). ⚠️ **Dates in the source are unreliable** (Bill 21 of 1989 shows *Introduced on 07 Aug 1979*) — store verbatim, never filter on them.
- **The index itself carries the introducer** — `Bill No 24 of 2022 (Government Bill) **Introduced by Shri. Subhash Shirodkar**`, plus title, Introduced on, Governor Assent Date, Portfolio, Department, and **two PDFs: "Bill As Introduced" (`_AI`) and "Bill As Passed" (`_AP`)**.
- **Introduced vs Passed — third independent confirmation.** Same bill, both variants: the **As Introduced** PDF closes `(SUBHASH SHIRODKAR) … Minister for Co-operation` + `(NAMRATA ULMAN) Secretary`; the **As Passed** PDF carries only `Dated Speaker` and `I assent to this Bill. Dated Governor`. Three states now agree: **the Minister is in the Introduced document, never the Passed one.**
- **Private-member bills: partial, and it is a *recency* gap.** Assemblies 7 (2017) and 8 (2022) return `"Information currently not available!!!"`, but assemblies **5 and 6 do have records** — e.g. *Bill No. 39 of 1988, The Goa Official Language (Amendment) Bill, introduced by Shri. Luizinho Faleiro* and *Bill No. 3 of 1980*. So it is **not "no private-member bills"**; it is *published up to the 6th Assembly, absent after*. (The recon recorded only the two empty assemblies.)
- **Encoding: born-digital text.** The As-Introduced PDF uses **object streams** (`/ObjStm` present), so a raw-byte `/BaseFont` scan reports **"scan"** and is wrong — text extracts cleanly. My own classifier was caught by this; see the failure mode.
- PRS holds **431** Goa bill PDFs, **2006–2026** (unofficial convenience tier). ⚠️ An earlier run of this
  registry recorded "50" — that is PRS's **page size**, not the total; see the PRS pagination note under UP.

**Bihar — three tiers, all real, ordered by authority:**
1. **Index (official)** — Vidhan Sabha bill lists (`bill.html`): `Official bill.pdf` (1980→), `Act List from 1937.pdf` (1937→), `Ordinance.pdf` (1990→), plus non-official lists — title + department + introduced/passed/assent. Legacy-font (Walkman-Chanakya) text layer.
2. **Documents (official)** — `egazette.bihar.gov.in` (`SearchGazette.aspx`, `Notification.aspx`); searchable by year/type. ASP.NET WebForms.
3. **Convenience (unofficial)** — PRS: per-bill titles → Gazette PDFs. Mirror with OCR text: Internet Archive `in.gov.bih.gazette.*` (28,977 items).

**Maharashtra — best bills case, but NeVA is newer than the recon says.**
- Bills are **per-bill PDFs**, each in **English (clean Unicode text)** + Marathi, hosted on the official `mls.org.in` itself — PRS is *not* needed for bills. The list page is a link directory (no table, no titles); the metadata lives in the PDFs.
- **Introducer = parse the PDF's last page.** The cover sheet names `Shri X, Minister for Y` (e.g. "Shri Chandrakant (Dada) Patil, Minister for Higher and Technical Education"). The list page does not carry it.
- **Session mapping is absent.** The PDF has a date ("As passed … on the 9th March, 2026"); the URL carries year + status (introduced/passed). No session name is published — derive it from the date, never invent one.
- Correction to `SOURCES.md`: it recorded NeVA as "not implemented"; **`mhla.neva.gov.in` now exists** (member template only — `/Bill` and `/Questions` still redirect to the national landing).
- No official e-Gazette host (both candidates DNS-fail) and no Internet Archive `in.gov.maharashtra.gazette.*` collection. PRS holds 48 bills as fallback.

**Gujarat — rich NeVA register, but bill *text* links are dead.**
- The register (`Bill/GetBillDashBoardData?UnitCode=GJ`) is a clean HTML table: Sr No, Bill Number, Title, Description, Ministry, Department(s), Date of Introduction, Document. Government bills only (14).
- **Correction:** the "Document" column links to `cms.neva.gov.in/…/IntroductionPdf/…` which now **404** — the bill-text PDFs are gone. **Bill text therefore comes from the official e-Gazette** (`egazette.gujarat.gov.in`, Directorate of Government Printing & Stationery, 200) — the *primary* tier — with PRS (`https://prsindia.org/bills/states?state=Gujarat`) as a convenience mirror only. **No PRS count is recorded here on purpose: Gujarat's working source is the official register + e-Gazette, so the size of PRS's mirror is not load-bearing.**
- **Session-seeding trap still applies:** NeVA serves an empty shell unless the session is seeded on `gujarat.neva.gov.in` first. The recon's "Himachal Pradesh leak" title is now generic, but seeding is still required.
- **Introducer IS published — in the bill text's last page, not the register.** The register's Ministry/Department(s) columns name the *department*, never the person. The person is on the last page of the bill text (Gujarat Gazette, Extraordinary Part V, mirrored by PRS). Read 10 bills across 2025 + 2026:
  - **2026 bills (Gazette Part V)** — born-digital English. Last page recommendation block: *"Dated the [date]. **[MINISTER]**. By order and in the name of the Governor of Gujarat…"* Observed: Kunvarjibhai Bavaliya (Bill 1), Harsh Sanghavi (Bill 2), Praful Pansheriya (Bill 8), **Dr. Pradyuman Vaja (Bill 9)**, Jitubhai Vaghani (Bill 10), Sanjaysinh Mahida (Bill 18).
  - **2025 bills ("As Introduced")** — English body + a Gujarati last-page note: *"[શ્રી <name>, <portfolio> મંત્રીશ્રી] (…ગુજરાત સરકારી રાજપત્રમાં પ્રસિદ્ધ કર્યા મુજબ)"*. The **name garbles under plain extraction** — it is set in a legacy Gujarati font (Krishna/Arishnaweb) while the portfolio + boilerplate are clean Unicode (Shruti), so it needs a Gujarati transcoder, not OCR. Recovered: **Rushikesh Patel, આરોગ્ય મંત્રી (Health)** — Bills 2/18/19; **Balvantsinh Rajput, શ્રમ/કૌશલ્ય વિકાસ/રોજગાર મંત્રી (Labour)** — Bill 20.
- **Correction to my own earlier note:** I had recorded "introducer NOT named" after reading *one* bill (Bill 9) and stopping at the first page's *"consent of the Speaker under rule 127A"* line — that line is about pre-introduction publication, not the introducer; the Minister is named on pages 2–3 (Statement-of-Objects signature + recommendation block). One bill was not enough; the 10-bill sample across 2025/2026 settles it.

**Rajasthan — best official bills *register* of any state so far, but no text on the official host.**
- **Official register (metadata only).** `GovernmentBills.aspx` is a static HTML page holding **7 tables, one per Vidhan Sabha, Assemblies 10–16**, all live-scraped: 16th **42**, 15th **135**, 14th **152**, 13th **161**, 12th **103**, 11th **106**, 10th **28** = **727 bills** (page stamped "Printed on: 9/16/2026"). Columns: `S.No. | Bill No./Year | Short Title (Hindi + English) | Introduced On | Discussed On | Passed On | Ordinance No./Year | Act No./Year | Remarks`. **No introducer column.** ⚠️ **CORRECTION — the page is NOT "zero bill PDFs", and the "text only via PRS" claim is wrong. Both documents are direct GETs, no session/postback:**
- **Bill text** — each row's `linkEng`/`linkHindi` anchor carries `onclick="OpenGovernmentBills(&quot;<url>&quot;)"` → `/BillInformationSystem/BillReport/<file>.pdf` (e.g. `Bill42-2013.pdf` → 200, 477,105 B). **All 727 bills have one; the filename is inconsistent server-side (`Bill42-2013.pdf` / `12024.pdf` / `Bill012020.pdf`), so extract, never construct.**
- **Act** — the `linkPdfAct` link *text* is the Act number `NN/YYYY` → `/BillInformationSystem/ActReport/Act<NN>-<YYYY>.pdf`. **Partial coverage: 2010–2016 near-complete, but 1994–2009 / 2017–2018 / 2021–2026 mostly 404 (227/630 resolved).**
- ❌ **The `linkPdfAct` POSTBACK itself is BROKEN** — every POST (even a no-op) returns **302 → /ErrorPage.aspx** ("We have encountered a problem while processing the page"); `__VIEWSTATE` is 1,104,172 B and *not* `/wEP`-prefixed (encrypted/unusual), `__EVENTVALIDATION` 25,688 B. **Do NOT replay it — use the two URL patterns above.**
- **Introducer is still not on the index** (it lives in the PDF, via PRS / the English translation).
- **Private members' bills: empty.** `PrivateBillsIntroduced.aspx` and `PrivateBillPassed.aspx` each render **0 data rows** (layout row only). Confirms the recon.
- **Text + introducer come from PRS** (`/files/bills_acts/bills_states/rajasthan/…`, **45 PDFs**). Every bill PDF is **bilingual**: a Hindi body, then an **"(Authorised English Translation)"** section. The introducer sits in the English part as a closing block — `MAHAVEER PRASAD SHARMA, Principal Secretary. **(Name, Minister-Incharge)**` — and is repeated above each Statement of Objects / Financial Memorandum as `[Name], Minister Incharge`. Sampled **5 bills, 5 recoverable, all in clean Latin script**: Tika Ram Jully (Bill 4), Rajendra Singh Yadav (Bill 6), **Ashok Gehlot** (Bills 8 and 34), Ramlal Jat (Bill 31).
- **Reading them needs no transcoder and no OCR — read the English translation.** Nothing here is a scan. The Hindi runs do mix Unicode **Mangal** with legacy **DevLys-010** (`/ToUnicode` absent), so Hindi matras garble (`प्रभार� मंत्री`; Bill 34 carries 4,034 U+FFFD) — but the **"(Authorised English Translation)" section is 100% clean ASCII** and carries the introducer in Latin script, so the DevLys path is avoidable entirely. **Retracting my own earlier claim on this line:** I first recorded that these bills "need a DevLys transcoder" and that Bill 8's name was "lost to encoding" — I had read only the Hindi pages. Bill 8's name is `(Ashok Gehlot, Minister-Incharge)`. `SOURCES.md`'s "No OCR is required anywhere in Rajasthan" is **correct**.
- **Read (step 10) — what a bill actually contains.** Bill 4 of 2023 = *The Baba Amte Divyang University, Jaipur Bill*: **91 pp**, Hindi body (pp. 1–48) + **"(Authorised English Translation)"** (pp. 49–91). It establishes and incorporates a university for the disabled at Jaipur and provides for connected matters; numbered sections open `1. Short title, extent and commencement` → `2. Definitions` → the university's objects, powers, officers and Statutes/Ordinances. Then Statement of Objects and Reasons, Financial Memorandum (≈₹5 crore/yr recurring), and the delegation-of-powers note. Language: **Hindi + official English**; the English is readable end to end with no OCR.
- **No e-Gazette, no archive.** Both `egazette.rajasthan.gov.in` and `gazette.rajasthan.gov.in` fail DNS; Internet Archive `in.gov.rajasthan.gazette*` returns **0 items**. PRS is the only bill-text tier.

**Punjab — first state whose *official host alone* is sufficient for bills (index + text + introducer).**
- **Index.** `Legislations/IntroducedBills` (200, 425 KB, **372 data rows / 389 PDF links**) and `Legislations/PassedBills` (200, 411 KB, **349 PDFs**). Columns are `Sr. No | Title | English | Punjabi` — **no introducer, no date, no session column**. Coverage **2009–2026**, Assemblies 13–16.
- **Government bills only.** `Legislations/PrivateBills`, `/PrivateMembersBills`, `/PrivateMemberBills`, `/Bills` all return **302** (no route), and both bill pages contain **zero** occurrences of "private member" / "non-official".
- **CORRECTION — the documents are NOT "scanned images".** The recon generalised that from a **2009** bill. Classified **33 bills** (19 passed + 14 introduced) across 2009–2026: **2019→2026 are born-digital text PDFs** (2026/2025/2024 carry `/ToUnicode` and extract cleanly; 2023–2019 have a text layer without `/ToUnicode`, extracting with minor artefacts); **2014 and 2009 are pure scans** (zero `/BaseFont`, one image XObject, 6.6–10 MB). So the reading mode is **year-dependent**, not scan-everything.
- **CORRECTION — the introducer IS published, but only in the *Introduced* document.** This is the load-bearing nuance: **Introduced bills name the Minister + portfolio** in the closing block; **Passed bills name only the Vidhan Sabha *Secretary***. Measured exactly: **11 readable Introduced bills → 10 named the Minister** (the 11th is an unlabelled multi-document file with no Statement-of-Objects block); **16 readable Passed bills → 0 named a Minister** (only signatures: R. L. Khatana / Ram Lok Khatana / Surinder Pal / Shashi Lakhanpal Mishra — the two regex "hits" are the false positives "approval of the Council of Ministers" and "Advisors to Chief Minister"). **Fetch the Introduced PDF for the introducer, never the Passed one** — reading Passed alone is how "not published" gets recorded wrongly.
  - Recovered: **Tarunpreet Singh Sond** (Rural Development & Panchayats, 2026) · **Lal Chand Kataruchak** (Forests & Wildlife Preservation, 2026) · **Hardip Singh Mundian** (Revenue, Rehabilitation & Disaster Management, 2025 ×2) · **Bhagwant Mann** (Chief Minister, 2024 and 2022) · **Bram Shanker Sharma (Jimpa)** (Revenue, 2023) · **Harpal Singh Cheema** (Excise & Taxation, 2022) · **Amarinder Singh** (Chief Minister, 2020 ×2).
- **No e-Gazette, no archive — and none needed.** `egazette.punjab.gov.in`, `gazette.punjab.gov.in`, `punjabgazette.gov.in` **all DNS-fail**; Internet Archive `in.gov.punjab.gazette*` = **0 items**. PRS holds **137** Punjab bill PDFs, **2015–2026** (an earlier run recorded "50" — the page size), as an unofficial convenience tier; but the official host already carries the text, so **PRS is the fallback here, not the source** — the reverse of Rajasthan.
- **Read (step 10) — what a bill actually contains.** *The Punjab Protection of Trees Bill, 2026* (Bill No. 19-PLA-2026, introduced 10 Aug 2026): **12 pp, born-digital English**. It regulates the felling and replanting of trees and provides an institutional mechanism to compensate the environmental loss from felling; `1.` short title/extent (all urban areas in Schedule III, or as notified)/commencement, `2.` exemptions per Schedules I & II, then the compensation machinery, ending with a Memorandum on Delegated Legislation (**s.16** empowers the State Government to make rules). Signed `CHANDIGARH: THE 10TH AUGUST, 2026 — R. L. KHATANA, SECRETARY`. Also read: *The Societies Registration (Punjab Amendment) Bill, 2026* (7-PLA-2026, passed) — inserts new ss.1/1-A/1-B separating educational and healthcare societies from the rest (Registrar's categorisation final) and adds ss.21–22 (remove difficulties; rules laid before the House for 30 days). Language: **English + Punjabi**; the **English is clean text**, the Punjabi bill PDFs are **legacy-font and garble** — read English.

**Madhya Pradesh — the introducer is in the HTML table itself, the bills are Hindi scans, and the recorded
URL is only a year index: the rows are one click deeper.**
- ⚠️ **`bill.htm` is a YEAR INDEX, not a bill list** — 200, 24,665 B, **exactly 1 `<table>` with 1 `<tr>`**, and
  13 relative links whose anchor text is the year. **The real rows are on 13 per-year pages**
  `bill_2014.htm` … `bill_2026.htm` (all 200; 91,795–245,296 B each). ⚠️ IIS paths are **case-insensitive**
  (`BILL_2014.htm`, `bill_2014.HTM` both 200), so a mistyped URL still looks healthy — **validate on parsed
  row counts, not status codes.**
- ✅ **TRUE count: 336 bill/ordinance entries, 2014–2026** (31·24·32·32·23·42·19·36·30·13·29·22·3). A
  **digits-only serial filter yields 330 and silently loses 6** — 4 ordinance rows put text in the serial cell
  (`9 ORD No 4/2022`, `12 ORD No 3 &5 /2022`, `15 ORD No 1/2022`, `3. ORD`) and 2 rows break the 8-cell grid
  (2017 sr 18 = 4 cells, 2017 sr 22 = 5 cells).
- ⚠️ **Nesting defeats "biggest table wins" twice over.** On the year pages the **outer layout table has MORE
  `<tr>` than the data table** (2025: 32 vs 26; 2014: 44 vs 7/5/25), and 2014 carries **three** data tables,
  2015 **two**. Select the **innermost** table and detect headers by content (`क्र.`), never by index — 2015's
  first table repeats its header at rows 1, 6 and 13. Skip the **36 one-cell session-banner rows** (they carry
  the session) and the **7 all-blank spacer rows**. ⚠️ Decode as **`utf-8-sig`** (every page has a BOM and the
  response header is a bare `text/html`), and keep **ZWJ U+200D** in the output — it sits inside conjuncts
  (`मध्यप्रदेश`, `मंत् री`) — stripping it only for pattern matching.
- ⚠️ **Never construct the document URL** — directories are inconsistent and carry no year meaning
  (`ACT 2014/`, `list pdf/`, `BILL2017/`, `bill2022/`, `Bill 2025/`, `ord 2022/`), with **literal spaces**,
  a **trailing space before `.pdf`**, mixed case, and the site's own `N0.` typo. 25 hrefs on the 2016 page are
  **absolute `http://`** — upgrade to https. Parse the href and `urljoin`. **Dead links exist**: 2 of 45 sampled
  returned IIS 404 in `list pdf/`.
- Year-wise tables `bill_2014.htm` … `bill_2026.htm` (home `bill.htm`, 24,665 B). Columns: bill number · bill
  name · **भारसाधक सदस्य (Minister-in-charge) — name + portfolio** · department · introduced on · discussed /
  passed on · Governor's assent date · Act number/year. Verified 2025: `श्री जगदीश देवड़ा, उप मुख्यमंत्री
  (वित्त)`, `श्री कैलाश विजयवर्गीय, नगरीय विकास एवं आवास मंत्री`, `श्री विश्वास कैलाश सारंग, सहकारिता मंत्री`.
  ❌ **CORRECTION: this is NOT "government bills only".** **2017 sr 18 is a PRIVATE MEMBER'S bill** —
  *मध्यप्रदेश सहूकार (संशोधन) विधेयक, 2017*, introducer *श्री शैलेन्द्र पटेल, मान.सदस्य अशासकीय विधेयक*, and its
  date cell records that the House **refused leave to introduce**; `BILL2017/Bill No. 18.pdf` is live
  (200, 2,231,115 B). 14 further rows are ordinance-related. What still does hold: **no private-members list,
  no defeat/withdrawal register, no per-member index**.
- ✅ **There is NO bill-number column.** `number` must be multi-sourced — (1) `(क्रमांक N सन् YYYY)` inside the
  title cell (complete for 2014/2016/2017/2018, but only **1/19 in 2020**), (2) `Bill No N` in the title's PDF
  filename, (3) the serial in cell 0 — which is **session-scoped** (2014 restarts 1–6 / 1–3 / 1–10 / 1–12).
  `date` = the introduced cell, **321/336 parseable** (`dd/mm/yyyy`, `dd.mm.yyyy`, `d/m/yyyy`, one `07/212/2015`
  typo, 15 cells holding prose). **`year` comes from the page URL `bill_YYYY.htm`, not the title** — 2015 bills
  were assented into 2016.
- Per-row PDFs: a `Bill No N.pdf` and an `ACT No N of YYYY.pdf`. **The bill PDFs are SCANS** — read *Bill No 1
  of 2025* = **मध्यप्रदेश विनियोग विधेयक, 2025 (the MP Appropriation Bill, 2025)**: 3 pages, 0 `/BaseFont`,
  3 image XObjects, no text layer → **OCR required** (Tesseract `-l hin`, vendored model, reads it cleanly).
- **Three-tier:** PRS holds **475** MP bills/ordinances, **2010–2026** (the full pagination walk, page-size
  trap applied — an earlier naive read would have said "50"). e-Gazette hosts (`egazette/gazette/mpgazette`
  `.mp.gov.in`) all **NXDOMAIN**; Internet Archive `in.gov.mp.gazette*` = **0 items**. So PRS is the only
  text/bill tier beyond the official scanned PDFs.

**Tamil Nadu — bills are NOT published on the assembly site, but PRS's copies are the official gazette.**
- `bills.php` and `17thassembly/bills.php` both return **HTTP 404** (16-byte body) — there is no bill list, no
  bill text, no introducer, no private/govt classification on `assembly.tn.gov.in`. The Documents menu
  publishes only handbooks / rules / salary Acts / facility forms — no bill register.
- **Working source = PRS:** `https://prsindia.org/bills/states?state=Tamil+Nadu` → **576** TN bills/ordinances,
  **2010–2026** (full pagination walk; page-size trap applied). e-Gazette hosts (`egazette`/`gazette`/`tngazette`
  `.tn.gov.in`) all **NXDOMAIN**; Internet Archive `in.gov.tn.gazette*` = **0 items**.
- **Read (step 10) — these PRS PDFs ARE the official gazette, and they carry the introducer.**
  **Six bills sampled across the range:**
  - `Bill1of2025TN.pdf` (177 KB, 2 pp, born-digital text) = **Tamil Nadu Government Gazette Extraordinary,
    Part IV—Section 1 "Tamil Nadu Bills"**, "L.A. Bill No. 1 of 2025 — *A Bill to repeal the Tamil Nadu Borstal
    Schools Act, 1925*", introduced 8 Jan 2025 under Rule 130. Statement of Objects closes
    **`S. REGUPATHY, Minister for Law`** (with `K. SRINIVASAN, Principal Secretary`).
  - `Bill1of2010TN.pdf` (7.8 KB, 2 pp) = L.A. Bill 1 of 2010, *further to amend the TN Payment of Salaries Act 1951*.
  - **Middle years sampled too** (to test skill step 4's per-year-encoding rule): **2017, 2018, 2019 and 2020**
    all came back as **born-digital English gazette text** — `BillNo-10of2017TN.pdf` (6 KB, 2 pp) = *L.A. Bill
    No. 10 of 2017, further to amend the TN Shops and Establishments Act 1947*; `Bill 1 of 2018 TN.pdf`
    (114 KB, 6 pp, a multi-bill gazette with a CONTENTS page); `Bill No. 1 of 2019 Tamil Nadu.pdf` (80 KB) =
    *further to amend the TN Payment of Salaries Act 1951*; `Bill 1 of 2020 TN.pdf` (141 KB, 3 pp).
    **Six bills spanning 2010→2025, all the same format — the English/clean-text claim holds across the range.**
  - **Introducer also confirmed in the middle years:** 2017 closes **`Dr. NILOFER KAFEEL, Minister for Labour.`**;
    2020 shows `Minister for Co-operation` + `65,1,9$6$1 Secretary.` (the latter is offset-font mojibake for
    `SRINIVASAN`).
  - ⚠️ **Two quirks a fetcher must handle.** (1) **Filename conventions are inconsistent** — `BillNo-10of2017TN.pdf`
    vs `Bill 1 of 2018 TN.pdf` vs `Bill No. 1 of 2019 Tamil Nadu.pdf` vs `Bill1of2025TN.pdf` — so **read the
    index, never construct filenames**. (2) Some files (2020) carry **pages set in a font whose glyph codes are
    offset by a constant** (`&217(176` = `CONTENTS`, `%,//6` = `BILLS`, `65,1,9$6$1` = `SRINIVASAN`) — a
    per-page encoding artefact on *that* page, **not a scan**; the bill body on other pages still extracts as
    clean English.
  **So: English, clean text, no OCR; the introducer (Minister) is named in the Statement-of-Objects signature.**
  PRS is hosting copies of the *official* gazette, so it is the gazette tier in disguise, not a lossy re-type.
- The assembly's productive document channel is the **Debates** (`debates/debates_menu.php`, per-sitting
  volumes 2011–2026), not a bill register.

**Kerala — no official bills module: the endpoint returns an empty body even when driven correctly.**
- `index.php/bills/billview` builds a full search UI (KLA 1–16, `type` radios incl. **2 = private member**,
  `stat` 1–11, `category` Original/Amendment/Appropriation, and a **1,199-name member select**), and
  `common.js` posts `{kla, type, stat, member, category, csrf_test_name}` to `index.php/bills/getdetails/<id>`,
  writing the reply into a `billsnum` div.
- **Re-tested properly (the recon's 0-byte result holds).** With the page's own CSRF token
  (`22b4409de3de3b6dd3a83313fd28822b`) and its exact default values — including the private-member path with a
  real `member` id, and ids 1/2/5 — **every combination returned `200` with a 0-byte body**. The static
  category pages `billview/1..11` (Published, Introduced, Passed, Assented, …) each render **"No details"**.
  **So the bills module is a populated UI over an unpopulated endpoint.**
- **Working source = PRS:** `https://prsindia.org/bills/states?state=Kerala` → **652** Kerala bills/ordinances,
  **2010–2026** (full pagination walk; page-size trap applied; page 14→15 repeats at 35 = end).
  `egazette.kerala.gov.in` NXDOMAIN; `gazette.kerala.gov.in` resolves (103.119.178.147, with MX) but **serves no
  web content** (HTTP 000); Internet Archive `in.gov.kl.gazette*` = **0 items**.
- **Substitute that does exist:** **Private Member Resolutions** at
  `index.php/business/index/private_member_resolutions` — a real table (**690 rows**) with columns
  `Sl. No. | Date adopted | **Name of Member who moved the resolution** | Text of Resolution`, grouped by
  assembly from the 1st KLA (e.g. `1. | 9.7.1958 | ശ്രീ.ഇ.ഗോപാലകൃഷ്ണമേനോൻ | കൊച്ചിയിൽ കപ്പൽ നിർമ്മാണകേന്ദ്രം`).
  That is a **per-member named record** — of resolutions, not bills, and the text is Malayalam.

**Karnataka — bills are per-session scanned lists with no sponsor attribution.**
- `assembly/bills/allbills.htm` (23,018 B) indexes session-wise PDFs named `bills_list<NNNNN>.pdf`
  ("i) Bills Introduced and Passed List", "ii) Bills") — no government/private split and **no member column**.
- **Read (step 10):** `bills_list15100.pdf` (200, 74,587 B, 4 pp) = *"List of Bills Introduced and Passed during
  the Period of Tenth Session held from dated :13.09.2021 to 24.09.2021"* (15th Legislative Assembly) —
  columns `SL.No | Name of the Bill | Legislative Assembly | Legislative Council | Remarks | Date of
  Introduction | Date of Passing`. **It is a SCAN** — 4 image XObjects, ~4 text chars, 0 `/ToUnicode`.
  OCR (Tesseract `eng`) reads the English headers cleanly and garbles the Kannada. **No sponsor is published.**
- **Working source = PRS:** `https://prsindia.org/bills/states?state=Karnataka` → **583** bills/ordinances,
  **2010–2026** (full pagination walk; page 13→14 repeats at 16 = end).
- `egazette.karnataka.gov.in` and `gazette.karnataka.gov.in` **NXDOMAIN**; Internet Archive
  `in.gov.ka.gazette*` = **0 items**. So there is no gazette tier — PRS is the only text fallback.

**Telangana — the official bills page is metadata-only; the text and the introducer come from the Gazette, via PRS.**
- `billsActs` **is session-gated** (see the access note below). Seeded, it returns a real table of **63 bills** for
  the Third Assembly: `Sl No | Title of the Bill | Introduced On | Considered and Passed on | Considered and Passed
  in Legislative Council | Assented to by the Governor/President | Date of Publication in Official Gazette`
  (e.g. "THE CORE URBAN REGION (INTEGRATED GOVERNANCE) BILL, 2026", introduced 11/09/2026, passed 12/09/2026).
- ⚠️ **No sponsor column, no private-member category — and no bill text.** The page carries exactly **one**
  PDF link and it is an *external* one (legislative.gov.in's Representation of the People Act, 1951). So the
  official record tells you *what* passed and *when*, never *who* introduced it, and never the text.
- **Working source = PRS:** `https://prsindia.org/bills/states?state=Telangana` → **207** bills/ordinances,
  **2014–2026** (full pagination walk; page 5→6 repeats at 20 = end; the span starts at 2014, when the state
  was formed).
- **Read (step 10):** `Bill10of2026TG.pdf` (595,606 B, 5 pp) = **THE TELANGANA GAZETTE, PART IV-A
  EXTRAORDINARY**, Hyderabad, Saturday, January 3, 2026 — *"L.A. BILL No. 10 OF 2026: A BILL FURTHER TO AMEND
  THE TELANGANA UNIVERSITIES ACT, 1991."* It inserts a **serial 18 into the Schedule under section 3** creating
  **"Dr. Manmohan Singh Earth Sciences University of Telangana"** (area: Bhadradri Kothagudem & Khammam
  districts), by upgrading the University College of Engineering, Kothagudem, per G.O.Ms.No.28, Higher
  Education (UE) Dept, dated 09.07.2025. **The introducer IS named**: the Statement of Objects closes
  **`A. REVANTH REDDY, Chief Minister`** (with `RENDLA THIRUPATHI, Secretary to Legislature`), repeated in the
  Rule 95 Memorandum.
- ⚠️ **Reading note:** the PRS gazette PDFs are **OCR'd scans** (5 pages, 5 images, ~0 embedded fonts) — the
  text layer extracts but carries **OCR noise** (`PrIce`, `Palse`, `Acr`, `!tjl§`). Readable, but do not treat
  the extraction as clean; OCR the page if a figure matters.
- `gazette.telangana.gov.in` **resolves (103.122.128.57) but serves no web service** (000 on http and https);
  `egazette.telangana.gov.in` / `tggazette.gov.in` **NXDOMAIN**; Internet Archive `in.gov.tg.gazette*` = **0 items**.

**Odisha — no official bill list, and the live e-Gazette does not carry bills.**
- The assembly navigation has "Legislative Business" (`ViewListOfBusiness.aspx`) and "Assembly Bulletin"
  (`ViewAssemblyBulletin.aspx`), but both are **dropdown viewers whose option lists are empty placeholders**
  ("Please select a document from the dropdown to view it here"). The phrase "private member" appears on the
  site **only inside the text of `Rules.aspx`** — never as a bill list or document. NeVA Odisha's `/Bill`
  route **302-redirects to the national landing page**.
- **Working source = PRS:** `https://prsindia.org/bills/states?state=Odisha` → **131** bills/ordinances,
  **2010–2026** (full pagination walk; page 3→4 repeats at 36 = end).
- **NEW FINDING — Odisha DOES have a live official e-Gazette, but it is a civil-notice gazette.**
  `https://egazette.odisha.gov.in/` returns **200 (67,759 B)**, `<title>eGazette | Government of Odisha</title>`,
  run by the **Directorate of Printing, Stationery & Publication** under the Commerce & Transport Department
  (the CM's message announces the move to e-publication). It is a real portal with `/archive`,
  `/extraordinary`, `/land_acquisition` and per-notice PDFs under
  `/uploads/<category>/press_signed_pdf/<uuid>.pdf`.
  - **Its PDFs are born-digital text, English, and curl-able** — verified one at 200, 198,945 B: *"EXTRAORDINARY,
    PUBLISHED BY AUTHORITY — No. 4132, KATAKA, MONDAY, SEPTEMBER 07, 2026"*, with a Directorate disclaimer.
  - ⚠️ **But it publishes *public notices*, not legislation.** The `/extraordinary` table's 31 rows are all
    **"Change of Name/Surname"** entries, and — decisively — **`/bills_acts` renders "In this section no
    document available at"**. So the gazette tier **exists and is readable, yet does not serve the bills use
    case**; PRS remains the only bill source.
- `gazette.odisha.gov.in` and `odishagazette.gov.in` **NXDOMAIN**; Internet Archive `in.gov.or.gazette*` = **0 items**.

## Profile — roster + photo

| State/UT | Working source | Kind | Status |
|---|---|---|---|
| Maharashtra | https://mls.org.in/PDF2025/15-Assembly-24-11-2024.pdf | official (ECI gazette) | ✅ text PDF, 288 seats, English names clean; ⚠️ no photos |
| Gujarat | https://gujarat.neva.gov.in/ContactDirectory/FetchMembersList?MLT=16&MSLT=15&Assemblyid=15 | official (NeVA) | ✅ 182 MLAs, all with photos; needs session-seeding |
| Rajasthan | https://assembly.rajasthan.gov.in/Containers/Members/ConstituencyWise.aspx | official assembly | ✅ 200 MLAs + per-member photos (static HTML, no session) |
| Punjab | https://punjabassembly.gov.in/Members | official assembly (NeVA) | ✅ 117 MLAs, all with photos; static HTML, no session needed |
| Goa | https://www.goavidhansabha.gov.in/mlas.php | official assembly | ✅ 40 MLAs, all with photos; Who's Who PDF per member |
| Uttar Pradesh | https://uplegisassembly.gov.in/angular.asmx/show_MemberList | official assembly | ✅ **ASMX JSON** — 397 (18th) / 390 (17th) / 404 (16th) MLAs, Hindi+English names, party, constituency; photos on the Liferay portal |
| Andhra Pradesh | https://aplegislature.org/web/legislative-assembly/legislative-assembly/legislative-assembly/member-s-information | official (Liferay DXP) | ✅ 175 MLAs, 175 photos, name/constituency/district/party; 384-pp Who's Who PDF; drill-down 403 (session token) |
| Arunachal Pradesh | https://arla.neva.gov.in/ContactDirectory/FetchMembersList?MLT=4&MSLT=0&Assemblyid=0 | official (NeVA) | ✅ 59 members + 59 photos (⚠️ 59 vs 60 seats — duplicate/stale entries); per-member detail page |
| Assam | https://assambidhansabha.org/members | official assembly | ✅ 126 MLAs over 7 pages, 126 photos (ext varies per member); per-member `?id=` detail |
| Madhya Pradesh | https://mpvidhansabha.nic.in/16mlaprofile.htm | official assembly | ✅ 230 MLAs via **bulk PDFs** (roster + 1,433-photo biography PDF); ⚠️ no per-member page/search/JSON |
| Tamil Nadu | https://assembly.tn.gov.in/17thassembly/members.php | official assembly | ✅ 234 MLAs in one HTML table, party+constituency in the name cell, predictable `members/NNN.jpg` photos; ⚠️ no per-member detail page |
| Kerala | https://www.niyamasabha.nic.in/index.php/content/sitting_member | official assembly | ✅ 140 MLAs in one HTML table, **140/140 photos**; full historical roster (1088) + per-member profile pages |
| Karnataka | https://kla.kar.nic.in/assembly/member/16assemblymemberslist.htm | official assembly | ✅ 224 constituencies (1–224, no gaps) in one HTML table, EN+KN; ⚠️ **no photo, no profile page** (photos only in the Who's Who PDF) |
| Telangana | https://legislature.telangana.gov.in/assemblymemprofile | official assembly | ✅ 119 MLAs, **119/119 hi-res photos**; ⚠️ **roster class names are swapped** (`.ce-mip-mp-constituency` = party, `.ce-mip-mp-province` = constituency) |
| Odisha | https://assembly.odisha.gov.in/MemberofAssembly.aspx | official assembly | ✅ 147 MLAs, **147/147 photos**, name/party/constituency/DOB/address/phone; ⚠️ **POST-only paging 16/page** |
| Haryana | https://haryanaassembly.gov.in/assembly-members/ | official assembly | ✅ 90 MLAs (pages 1–5), name/sex/constituency/party + name-slugged photos; ⚠️ **`/sitting-members/` holds Houses 1–14 only** |
| Manipur | https://assembly.mn.gov.in/members | official assembly | ✅ 60 MLAs, static HTML + WebP photos; **`sitemap.xml` lists all 60 slugs** (cleanest discovery route) |
| Tripura | https://tripura.neva.gov.in/ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid=13 | official (NeVA) | ✅ 60 MLAs, 60 photos, Bengali+English; ⚠️ **needs a seeded cookie + Referer or it 500s** |
| Meghalaya | http://megassembly.gov.in/storage/members/members.json | official assembly | ✅ **JSON, 60 records, 60/60 with photo**; ⚠️ **HTTP-only** (https TLS fails) and `party_name` is a nested dict |
| Sikkim | https://sikkim.neva.gov.in/ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid=11 | official (NeVA) | ✅ 32 MLAs, 32 photos, needs a session cookie; **no bespoke site exists**; ⚠️ per-member profile carries **unobfuscated** email/mobile |
| Mizoram | https://www.mizoramassembly.in/members/details/79 | official assembly | ✅ **40/40 MLAs, 40/40 photos**, rich per-MLA profile; roster carries name+constituency only (party is on the detail page) |
| West Bengal | https://wbla.neva.gov.in/ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid=18 | official (NeVA) | ✅ **292 MLAs, 292 unique ids, 292/292 photos — CORRECTION: this now works** (recon: HTTP 500); all-Bengali; secondary = archived `LMLA.pdf` (17th Asm, text) |
| Jharkhand | https://vidhansabha.jharkhand.gov.in/sites/default/files/षष्ठम-झारखण्ड-विधान-सभा-के-निर्वाचित-सदस्यों-की-सूची-अभियुक्ति-सहित.pdf | official assembly | ⚠️ **81 MLAs, text-only, NO photographs (0 images in 6 pages)**; legacy-font Hindi; NeVA roster `/FetchMembersList` is **HTTP 500** |
| Himachal Pradesh | https://hpvs.neva.gov.in/ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid=14 | official (NeVA) | ✅ **68 MLAs, 68 ids, 68 constituencies — CORRECTION: this is NOT empty** (recon: "empty template to anonymous clients"); needs a **seeded session** |
| Jammu and Kashmir | https://jkla.neva.gov.in/ContactDirectory/FetchMembersList?MLT=16&MSLT=1&Assemblyid=1 | official (NeVA) | ✅ **90 MLAs, 90 ids, 90 constituencies, 90/90 photos** (689,075 B byte-exact); names in **English**; + PDF/HTML bulk exports |
| Ladakh | **not applicable — no MLAs** | — | no MLA exists, so no roster; the elected tier is **LAHDC councillors** (Leh 2020 results on `leh.nic.in`, 26 seats) — **never render as MLAs** |
| Andaman & Nicobar Islands | **not applicable — no MLAs** | — | no MLA exists; the UT's lone representative is its **MP** (`/and_mp`, Shri Bishnu Pada Ray) — **never render as an MLA** |
| Lakshadweep | **not applicable — no MLAs** | — | no MLA exists; the elected tier is the **District/Village (Dweep) Panchayats** under the Lakshadweep Panchayats Regulation — **councillors/members, not MLAs** |
| Uttarakhand | https://utkh.neva.gov.in/ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid=5 | official (NeVA) | ✅ **70 MLAs, 70 ids, 70 constituencies, 70/70 photos**; BJP 47 / INC 20 / Ind 2 / BSP 1; **exports are empty** — use this endpoint |
| Nagaland | https://nagaland.neva.gov.in/ContactDirectory/FetchMembersList | official (NeVA) | ⚠️ **60 MLAs, 60 ids, 60/60 photos — but the PARTY FIELD IS UNUSABLE** (`NDPP` 0×, 33/60 mislabelled NPF incl. the CM, 1 member = `"."`); **needs a seeded session** (cold = 500) |
| Chandigarh | **not applicable — no MLAs** | — | no MLA exists; the UT elects **one MP** only (`/pages/page/statistics` on the CEO site lists them since 1967) — **never render as MLAs** |
| Puducherry | https://puddu.neva.gov.in/ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid=16 | official (NeVA) | ✅ **29 MLAs, 29 ids, 29/29 photos**; second source `py.gov.in/mlas` gives **30 blocks** (N. Rangasamy holds 2 seats); **photos served from `neva.gov.in`, not `cms.neva.gov.in`** |
| Delhi | https://dla.neva.gov.in/ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid=8 | official (NeVA) | ✅ **70 MLAs, 70 ids, 70 constituencies, 70/70 photos**; BJP 48 / AAP 22; Hindi labels; **needs a seeded session**; 68 mobiles + 67 obfuscated emails |
| Chhattisgarh | https://www.cgvidhansabha.gov.in/hindi_new/mla_current.htm | official assembly | ✅ **90 MLAs, 90/90 photos, AC 01–90**; BJP 54 / INC 35 / GGP 1; Hindi-only frameset, no per-member page or API |
| Dadra and Nagar Haveli and Daman and Diu | **not applicable — no MLAs** | — | no MLA exists and none can; the UT elects **2 MPs** (Dadra & Nagar Haveli (ST); Daman and Diu) but **publishes no MP profile page** (97/105 portal pages swept: `Member of Parliament` ×1, and it is the IAS-officer list); the CEO site (`http://ceodaman.nic.in/`, **HTTP only**) has **`MLA` 0 / `Assembly` 0** |
| Bihar | https://vidhansabha.bihar.gov.in/Knowyourmla.html | official assembly | ✅ **243 MLAs, AC 01–243, 243/243 photos**, 18th Assembly; ⚠️ AC numbers zero-padded `01`–`09`; `Male_` gender artifact; 241/243 e-mails; **NeVA is a strict superset once seeded (`Assemblyid=18`)** — DOB, father's name, clear e-mail |
| _all_ | — | — | pending review |

**Bihar — MAJOR CORRECTION: NeVA Bihar IS populated. Recon's "no member profile data is retrievable from
NeVA Bihar" is the session-seeding trap, not an empty module. The seeded NeVA roster is 243 cards with photos,
dates of birth, fathers' names and clear e-mail — a strict superset of the assembly's own roster.**
- **Assembly site (canonical numbering).** `https://vidhansabha.bihar.gov.in/Knowyourmla.html` → **200, 114,686 B**,
  one server-rendered HTML table: columns **Cons. No. | Photo | Cons. Name | Name | Gender | Party | Mobile |
  Email ID**. **243 MLAs, ACs 01–243, all distinct. 243 `<img>` tags, 243 unique photo files**
  (`image/final%20mla%20photo%202025/<n>.jpg`) — spot-verified `1.jpg` → 200, 14,312 B, `image/jpeg` and
  `243.jpg` → 200, 20,765 B. Hindi twin at `KnowyourMLA%20in%20Hindi.html` (200, 129,679 B).
  Former members: `former_mla.html` lists **First → Seventeenth** (17 entries), each a PDF `pdf/ex%20mla/<n>.pdf`.
- **The House is the 18th Assembly, and the site says so itself**: the home page's own notice reads
  *"On **18th Assembly** And Dissolution Of 17th Bihar Legislative Assembly"* (notices dated 29.11.2025 /
  01.12.2025), the roster's photo folder is `…photo 2025`, and NeVA's own masthead reads **"अष्टादश बिहार
  विधान सभा"**. ⚠️ **The roster table itself carries no Assembly number** — do not infer it from the table.
- **Party split, from two independent official sources that agree exactly:** the assembly roster's Latin party
  codes and NeVA's Hindi party names both give **BJP 88 · JD(U) 85 · RJD 25 · LJPRV 19 · INC 6 · AIMIM 5 ·
  HAM(S) 5 · RLMo 4 · CPI(ML)(L) 2 · IIP 1 · CPI(M) 1 · JSP 1 · BSP 1 = 243.**
- ⚠️ **Trap — AC numbers are zero-padded for the first nine and not after: `01`…`09`, then `10`…`243`.**
  A check of the form `str(n) in set(ac_values)` reports **1–9 spuriously missing**; parse to `int` first.
- ⚠️ **Trap — the gender cell carries a trailing underscore: `Male_` ×214, `Female` ×29** (214 + 29 = 243).
  An exact `== "Male"` filter matches **zero rows**; strip the field before comparing.
- ⚠️ **Contact completeness, measured properly.** **241 of 243 have an e-mail** (every one `@nic.in`, format
  `mla-<constituency>-bih@nic.in`) — blank at **AC 78 (ATIREK KUMAR)** and **AC 164 (SAMRAT CHOUDHARY)**.
  **242 of 243 have a usable mobile**; the exception is **AC 98 (RAJU KUMAR SINGH)**, whose cell reads
  `6204737/08` — **malformed (two numbers run together across a slash), not absent.** ⚠️ **A `\d{6,}` regex
  reports "2 rows missing a mobile" (AC 36 `99995 19820`, AC 99 `94310 357 35`) because those cells contain
  spaces** — count digits, do not pattern-match the raw string.
- ✅ **Seeded NeVA Bihar roster (the correction).** `SOURCES.md` reports `bla.neva.gov.in/Member/Details/<id>`
  returning an identical 22,426-byte template ending *"Assurances **No Records Founds** / Debates **No Records
  Founds** / BILLS **No Records Founds**"* and concludes no profile data is retrievable. **After one
  `GET https://bla.neva.gov.in/` into a cookie jar, carried with `Referer: https://bla.neva.gov.in/`, all of
  those pages change:**
  - **`ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid=18` → 200, 584,572 B — 243 member cards,
    243 photos, and ZERO occurrences of "No Records".** ⚠️ **Bihar's NeVA Assembly id is `18`**;
    `Assemblyid=4` and `Assemblyid=1` return a **5,858-byte** empty response that reads as "Bihar is empty".
  - Each card carries **name + constituency number, party (Hindi), constituency, district, DATE OF BIRTH,
    address, mobile, and e-mail obfuscated as `[at]` / `[dot]`**, with the portrait at
    `https://cms.neva.gov.in/NeVA/BR/FileStructures//Member/thumb/<dd_mm_yyyy_hh_mm_ss>.jpg`
    (verified live: **200, 2,207 B, `image/jpeg`**). 243 constituency markers and 243 DOB markers.
  - **`Member/Member_ProfileDetail?MemberId=<id>` → 200, 6,898–7,066 B of genuinely rich data**: name,
    **father's name**, **date of birth**, **e-mail in clear**, mobile, party, constituency, state,
    **children (No. of sons / daughters)** and local address. A non-member id returns **2,343 B**.
  - **`Member/Details/<id>?AssemblyID=18` → 200, 23,978 B** per-member page with the office label
    (`मुख्यमंत्री`), the constituency as **`तारापुर -[164]- मुंगेर`** (AC number embedded), address, mobile and
    e-mail — **but its आश्वासनों / वाद-विवाद / विधेयक tabs all read "कोई रिकॉर्ड नहीं मिला".** A populated
    shell with an empty record tier, which is exactly why an unseeded fetch reads as a dead module.
  - ⚠️ **The member-id namespace is non-contiguous — 243 ids spanning 5 … 748 — and is NOT the AC number.**
    Take them from the roster's own `/Member/Details/<id>` links, never from a range.
  - ⚠️ **Shared-template artifact:** the member page's `<title>` reads *"Bihar Vidhan Sabha Member Details |
    NeVA | **ई-विधान -हिमाचल प्रदेश**"* — the Himachal Pradesh template leak, the same class recorded for Goa.
- **Use both, for different jobs:** NeVA for the payload (DOB, father's name, clear e-mail), the assembly
  roster for the canonical **AC 01–243** numbering and the `@nic.in` official address.
- ⚠️ **Three more official roster PDFs exist, and two of them are STALE — check the heading inside each file,
  not just that it is linked from the live sitemap:**
  - **`pdf/member%20list%20party%20wise.pdf`** (7 pp, 9,087 chars) is headed **षोडश (16th) Assembly** → **stale**.
  - **`pdf/SC_AND_ST_Members.pdf`** (2 pp, 2,397 chars) is likewise headed **षोडश (16th) Assembly** → **stale**.
  - **`pdf/party%20in%20position.pdf`** (1 p, 806 chars) is headed **सप्तदश (17th) Assembly** and dated
    **17 August 2026**, **but its figures (BJP 88 / JD(U) 85 / RJD 25 / LJPRV 19 … = 243) are the 18th
    Assembly's and match the live roster exactly.** **The heading is stale, the data is current** — the mirror
    image of the sitting statement's stale title (see Attendance). ⚠️ **All four PDFs are legacy-font**
    (`lIrn'k` = सप्तदश, `"kksM'k` = षोडश): readable only through a transcoder, though the digits are exact.
- ❌ **No per-member page on the assembly site** — the roster is one flat DataTable with no individual MLA URL.
  `blaqrms.bih.nic.in` (linked from the sitemap) remains unusable.

**Dadra and Nagar Haveli and Daman and Diu — no MLAs exist. The MLA-profile tier is not a gap, it is a
category error; and unlike the Andaman & Nicobar Islands, this UT publishes no official MP profile either.**
- **There is no MLA, no roster and no constituency list for an assembly, because no assembly election has ever
  been held in this territory.** The UT's elected tier is **panchayats and municipal councils**, and its
  parliamentary tier is **two Lok Sabha seats** (Dadra & Nagar Haveli (ST); Daman and Diu).
- ❌ **The UT portal publishes no MP profile.** A full crawl of `ddd.gov.in` (105 internal links collected,
  **97 pages fetched**; the 8 misses are, exactly: `/publications/` **404**, `/awards-appreciations/` **404**,
  `wp-content/themes/sdo-theme/css/print.css/` **404**, `xmlrpc.php` and `xmlrpc.php?rsd` **404**, and
  **`wp-json`, `wp-json/oembed/1.0/embed` and `wp-json/wp/v2/pages/4637` all returning 401** — ⚠️ **a
  CORRECTION to `SOURCES.md`, which lists the WordPress REST API as available; every REST route is 401 to an
  anonymous client, so the UT portal offers no JSON API.) returns **`Member of Parliament` ×1, `Lok Sabha` ×0,
  `MP` ×0, `MPLADS` ×0, `Panchayat` ×0**, and the site search for *"member of parliament"* returns **1 result,
  which is the list of IAS officers**. This is a **difference from A&N**, whose portal carries a rich
  `/and_mp` profile page. **For IN-DH there is no official profile page to point at — state that, don't
  substitute an unofficial one.**
- **The closest official profile-tier material is electoral, on the CEO's site** — and the CEO site *is*
  reachable: `http://ceodaman.nic.in/` → **200, 99,621 B**. ⚠️ **CORRECTION to `SOURCES.md`, which
  records both CEO sites as unreachable: `ceodaman.nic.in` is unreachable over HTTPS (TLS handshake fails,
  curl exit 000) but serves normally over plain HTTP.** `ceodnh.nic.in` (the other half of the UT) still
  times out on both (25 s, 0 bytes) — so exactly half of the recon's claim holds. Keyword scan of its home page: **`MLA` 0, `Assembly` 0, `Parliament` 7, `Lok Sabha` 17** — the
  absence of the first two and the presence of the last two is the finding stated by the government's own
  election office. It carries Form 20, contesting-candidate lists and the election gazette
  (`Document-2019/Election-2019/GAZ-28-03-2019.pdf`).
  ⚠️ **Its links are relative AND some use Windows backslashes** (`Document-2023\Candidate_Pol_Parties_Brochure1.pdf`)
  — resolve against the page base and normalise `\` to `/`, or those documents are silently lost.
- ✅ **MHA's Election Commission for UTs page for this UT confirms the same scope**: 33 × `Panchayat`,
  20 × `Municipal`, and **0 × `MLA`, `Legislative Assembly`, `Vidhan`, `Lok Sabha`, `Member of Parliament`**.
- **The constitutional reason is in the Constitution, not in a circular** — Article 239A(1) as amended in 1987
  and Article 240(1)(c)–(d): see the Bills block above for the verbatim text.

**Chhattisgarh — a complete 90-member roster with 90 photographs, on a Hindi-only legacy frameset site;
there is no per-member page and no API, so the tier stops at one static table.**
- ✅ **`https://www.cgvidhansabha.gov.in/hindi_new/mla_current.htm` → 200, 253,158 B, a single static HTML
  table of 91 `<tr>` (1 header + 90 MLAs), 7 cells per row.**
  **90 MLAs · 90 ACs numbered 01–90 (all distinct, sequential, matching constituency numbers) · 90/90
  photographs** (`satra/sixth_assembly/mla23-28/6-01.jpg` … `6-90.jpg`, a sample verified live:
  `6-01.jpg` → 200 / 97,601 B / `image/jpeg`). Title: *षष्ठम् विधानसभा के माननीय सदस्य* → **6th Assembly**.
  Columns: AC no. | AC name | MLA name | party | permanent address + phone | local (Raipur) address + phone.
  **81 of 90 rows carry a मोबाइल number; 71 of 90 carry an e-mail address.**
- **Party split from the roster: BJP 54 · INC 35 · Gondwana Ganatantra Party 1** — and it reproduces exactly
  on the separate page **`party_position.htm`** (200, 37,851 B), which prints *षष्टम विधानसभा* BJP 54 /
  INC 35 / GGP 1 = **90**, plus the 5th Assembly (INC 71, BJP 13, JCC(J) 3, BSP 2, 1 vacant) and the 4th and
  earlier. **Two independent official documents, same numbers.**
- ⚠️ **The site is a legacy frameset, Hindi-only.** `/` returns **3,311 B of `<frameset>`** and nothing else;
  the real navigation is `/hindi_new/links.htm` and the news frame `/hindi_new/main.htm` (79,870 B).
  `default_english.htm` is an **empty stub**, so **there is no English roster**.
- ❌ **No per-member page, no search, no filter, no JSON/API** — the whole House is one table keyed by AC
  number. The publications page lists *सदस्य परिचय* (member introduction) and *सदस्य संदर्भ* (member
  reference) but carries **no download links**, so those are not reachable. Recon is confirmed on both points.
- ⚠️ **The 6th-Assembly photos are `.jpg` files at ~100×124 px** — usable as avatars, **not** as portraits.

**Delhi — a complete 70-MLA roster with photos, contact details and Hindi labels; the old domain is dead and
NeVA remains session-gated.**
- ⚠️ **Cold `/ContactDirectory/MenuContactDirec` → 302 (127 B) → `/Home/NeVA`.** Seeded (one
  `GET https://dla.neva.gov.in/`, carry the jar, send `Referer`) → **200, 46,850 B**.
- ✅ **`FetchMembersList?MLT=0&MSLT=0&Assemblyid=8` → 200, 651,479 B, 70 members, 70 unique ids,
  70 unique constituencies, 70/70 photos.** (Recon records "70 members + 70 photos" at ~651 KB — confirmed.)
  Photos from **`cms.neva.gov.in/NeVA/DL/FileStructures//Member/thumb/…`** (70 distinct URLs).
- **Party census: भारतीय जनता पार्टी (BJP) 48, आम आदमी पार्टी (AAP) 22 = 70.**
- **Field completeness measured: 0 blank DOBs, all 70 constituencies carry a district
  (`बादली -उत्तरी दिल्ली (दिल्ली)`), 68 of 70 have a mobile, 67 of 70 an email.**
  ⚠️ **Emails are obfuscated in the roster** (`aa[dot]deepakchaudhary[at]yahoo[dot]com`) — unlike Uttarakhand
  and J&K, which publish plain addresses. **Mobiles are NOT obfuscated** (`9811195222`).
  **All labels are Hindi** (`निर्वाचन क्षेत्र का नाम`, `जन्म की तारीख`), so key on the Hindi labels or on
  position — an English-label parser returns 70 rows with **empty** constituency and DOB fields
  (I hit exactly that on the first pass).
- **The assembly's own site is live and byte-stable**: `https://delhiassembly.delhi.gov.in/` → **200, 44,243 B**
  (byte-exact against recon), Drupal, `theme=dit_dlas`.
  ❌ **The old domain `delhiassembly.nic.in` is dead — NXDOMAIN confirmed.**
  ⚠️ **`delhiassembly.delhi.gov.in`, `udd.delhi.gov.in` and `delhi.gov.in` all resolve to the SAME IP,
  `182.74.205.45`** — one host serving the Assembly, the Urban Development Department and the UT portal.

**Chandigarh — no MLA roster exists.** See the **"Chandigarh — NOT A GAP"** block under **Bills**.
Chandigarh elects **one MP** and no MLA; the CEO's statistics page lists its MPs since 1967.

**Puducherry — two official rosters that disagree by one, and the disagreement is explained.** NeVA
`FetchMembersList?Assemblyid=16` → **29 members, 29/29 photos**; `py.gov.in/mlas` → **exactly 30 blocks** with
constituency, name, photo, address, mobile and official email but **no party** — because **N. Rangasamy holds
both Thattanchavady and Mangalam**. ⚠️ NeVA photos here come from **`neva.gov.in`**, not `cms.neva.gov.in`.

**Nagaland — the roster is complete (60 MLAs, 60 photos) but its PARTY FIELD IS UNUSABLE, and the endpoint
is NOT cookie-free: recon's "no cookie" claim fails on a cold request.**
- ❌ **CORRECTION — the roster needs a seeded session.** Recon: *"`/ContactDirectory/FetchMembersList` returns
  ~390 KB of HTML **with no parameters, no token and no cookie**"*. **Cold → HTTP 500 (3,531 B)**, the shared
  NeVA error page. **Warm (seed one `GET https://nagaland.neva.gov.in/`, carry the jar, send `Referer`) →
  200, 390,255 B.** The byte count in recon is right; the "no cookie" claim is not — **seventh state in this
  exercise where the unseeded session masquerades as a broken endpoint.**
- ✅ **60 members, 60 unique ids, 60 unique constituencies, 60/60 photos**, all `AssemblyID=14`
  (Fourteenth Assembly). Photos from `cms.neva.gov.in/NeVA/NL/FileStructures//Member/thumb/…`.
- ⚠️⚠️ **THE PARTY FIELD IS MATERIALLY WRONG — verified exactly as recon warned.**
  **`NDPP` occurs 0 times in the entire 386,385-byte roster**, and **33 of 60 members are labelled
  `Naga Peoples's Front (NPF)`** — a string with a **double-possessive typo** (`Peoples's`) that a
  corrected-spelling literal match will miss. **Dr. Neiphiu Rio, the Chief Minister, is one of the 33** —
  he leads the NDPP, not the NPF. Full census as published:
  **`Naga Peoples's Front (NPF)` 33 · Bharatiya Janata Party 12 · `National People's Party (NPP)` 5 ·
  Independent 4 · Republican Party of India (Athawale) 2 · Lok Jan Shakti Party 2 · Janata Dal (United) 1 ·
  `.` 1.**
  - ⚠️ **NEW — one member's party value is a bare full stop: `Shri Sharingain Longkumer` (id 70,
    `Aonglenden -Mokokchung`), the SPEAKER, has `party = "."`.** A punctuation-only cell — neither the recon
    nor any naive parser would flag it as missing, and it will render as a stray dot.
  - **Consequence: never publish a Nagaland party from this field. Over half the house would be wrong, and the
    governing party would not appear at all.** Reconcile against the CEO/ECI result sheets instead.
- **The Assembly Secretariat's own site `nla.nagaland.gov.in` is content-only and holds no member data.**
  200, **233,193 B**, **WordPress + `Divi v.4.24.3`** (confirmed by `<meta content="Divi v.4.24.3" name="generator"/>`).
  **42 internal links; 41/41 fetched** (one duplicate) — the nav is *About Assembly Secretariate, Chief Minister,
  Deputy Speaker, Governor, Committees, Notifications, Organization Structure, Profile, RTI, History*, plus
  individual posts for `shri-tr-zeliang` and `shri-y-patton`. **There is no members/roster route at all.**
  Its **WordPress REST API** `…/wp-json/wp/v2/pages?per_page=100` → **200, 185,898 B, 23 pages** (recon's "23"
  confirmed) whose titles are all administrative (Deputy Speaker, Screen Reader Access, RTI, About,
  Organization Structure, Notifications, Hyperlink Policy, …) — **0 member records, 0 attendance**.

**Uttarakhand — CORRECTION: the roster is complete and the profile AJAX is NOT blank once the session is
seeded. Recon's "these partials return a bare BLANK template unless a session context is present" is exactly
right about the cause — and the seeded session is all it takes.**
- ✅ **`FetchMembersList?MLT=0&MSLT=0&Assemblyid=5` → 200, 771,413 B, 140 `<tr>` = 70 members, 70 unique ids,
  70 unique constituencies, 70/70 photos.** Party tally reproduces the recon exactly:
  **भारतीय जनता पार्टी (BJP) 47, इण्डियन नेशनल कांग्रेस (INC) 20, निर्दलीय (Independent) 2,
  बहुजन समाज पार्टी (BSP) 1 = 70**; 0 blank parties, **1 blank DOB**.
  ⚠️ Session seeding is **mandatory**: seed with one `GET https://utkh.neva.gov.in/`, carry the jar, send
  `Referer`. `MLT=16&MSLT=0` returns a **5,858-byte empty page** — the menu-filter combination matters.
- ✅ **`/Member/Member_ProfileDetail?MemberId=28&AssemblyID=5` → 200, 9,513 B, 13 populated rows.** Recon
  recorded this endpoint as returning a **"BLANK" template**; seeded, it returns
  *"व्यक्तिगत जानकारी — नाम : श्री आदेश चौहान, पिता का नाम : स्व0 श्री वैध कलम सिंह, जन्म की तारीख :
  06 Apr 1969…"*. **This is the sixth state in this exercise where the "empty AJAX" verdict was the
  unseeded-session artifact** — after Mizoram, Jharkhand, Himachal, and the A&N/Lakshadweep checks.
- ✅ **`/Member/Details/28?AssemblyID=5` → 200, 34,146 B** with **real PII**: **स्थायी पता** — *ग्राम व पो0
  बहादराबाद, जिला हरिद्वार*; **स्थानीय पता** — *आवास सं0-50, एम0एल0ए0 ट्रांज़िट हॉस्टल, रेसकोर्स, देहरादून*;
  **मोबाइल नंबर `9456590875`**. The `<title>` leaks the localised shared-template artifact
  **"ई-विधान -हिमाचल प्रदेश"**.
- ⚠️⚠️ **CORRECTION — the two bulk exports are published but EMPTY, and the PDF has lost its data since recon.**
  Measured three times with three different `Referer` values (bare host, the directory page, and none) —
  identical every time:
  - **`/ContactDirectory/ExcelforHonbleMember` → 200, 1,474 B**, an HTML table served as `application/excel`
    whose `<th>` header row (`नाम | निर्वाचन क्षेत्र का नाम | …`) is followed by **zero `<tr>` rows**.
  - **`/ContactDirectory/PDFforHonbleMember` → 200, ~28,130 B, 1 page, 88 extractable characters** —
    only the column labels (`माननीय सदस्य / नाम | निर्वाचन क्षेत्र का नाम | स्थानीय पता | स्थायी पता |
    मोबाइल नंबर | कार्यालय टेलीफोन | ईमेल`), **no member rows**.
    ⚠️ **Recon records this file as `3,884,880` bytes** — it is now roughly **1/138th of that** with no data.
    *(The extraction also shows broken Devanagari — `सद य`, `िनव चन`, ` े ` — because the embedded font's
    ToUnicode map is partial; do not read that as a scan.)*
  **Conclusion: for Uttarakhand the two exports exist as endpoints but yield no usable roster — use
  `FetchMembersList`, not the exports.**
- ⚠️ **TWO ID NAMESPACES FOR THE SAME ASSEMBLY — and the parameter name is the trap.**
  `/Bill/GetAllAssembliesList?UnitCode=UK` → **474 B**:
  `[{"AssemblyID":6,"AssemblyCode":5,"AssemblyName":"Fifth Legislative Assembly"},{"AssemblyID":5,"AssemblyCode":4,…},
  … ,{"AssemblyID":1,"AssemblyCode":-1,"AssemblyName":"Interim Legislative Assembly"}]`.
  **The member and question routes take a parameter *named* `AssemblyID` but expect the *`AssemblyCode`* value** —
  `AssemblyID=5` returns the Fifth Assembly (70 members), while the list's `AssemblyID` for that house is **6**.
  The Interim Assembly's code is **-1**. Sessions carry the same split: `SessionList` returns
  **`SessionId` 45–75 against `SessionCode` 1–12**, and the question routes want the **code**
  (`SessId=11` = प्रथम सत्र 2026). **Take both values from the site's own JSON, never from the parameter name.**

**Andaman & Nicobar Islands and Lakshadweep — no MLA roster exists for either.** See the full
**"Andaman & Nicobar Islands and Lakshadweep — NOT GAPS"** block under **Bills**. A&N's closest profile is its
**MP** page (`andamannicobar.gov.in/and_mp`, 200, 29,486 B — name, party, photo, votes, term, committees);
Lakshadweep's elected tier is its **Panchayats**. Neither is an MLA record.

**Ladakh — no MLA roster exists.** See the full **"Ladakh — NOT A GAP"** block under **Bills** for the
five-source proof that the UT has no legislature. The elected tier here is **LAHDC councillors** (26 in Leh,
2020 election results on `leh.nic.in`, per-constituency with party and margin) — **councillors are not MLAs and
must never be rendered as such.**


**Jammu and Kashmir — the one NeVA state where the member tier is genuinely complete: 90 MLAs, 90 ids, 90
photos, real profiles with contact details — and the roster reproduces the recon byte-for-byte.**
- ✅ **`FetchMembersList?MLT=16&MSLT=1&Assemblyid=1` → 200, exactly 689,075 B, 90 member cards,
  90 unique member ids, 90 unique constituencies, 90 photos** — **byte-exact against the recon.**
  ⚠️ `MLT=0&MSLT=0&Assemblyid=1` returns the **identical 689,075 B**, so the `MLT`/`MSLT` menu filters are
  ignored once a session is seeded (same as Sikkim/Meghalaya/Mizoram/HP).
  Warm-up is still required: **cold, the deep routes 302 to `/Home/NeVA` with a 127-byte body**
  (`/ContactDirectory/MenuContactDirec` 302→200/52,483 B; `/Questions` 302→200/19,210 B; `/Bill` 302→200/34,902 B).
  The jar then carries `ASP.NET_SessionId` + `lang`.
- **Party census — reproduces the recon exactly, all 90 accounted for:**
  **Jammu And Kashmir National Conference 41, BHARATIYA JANATA PARTY 29, INDEPENDENT 7,
  INDIAN NATIONAL CONGRESS 6, Peoples Democratic Party 4, Aam Aadmi Party 1,
  Communist Party of India(Marxist) 1, Jammu and Kashmir Peoples Conference 1 = 90.**
  **0 blank parties, 4 blank DOBs.**
- ⚠️ **J&K's roster is in ENGLISH, not a regional script** — the opposite of every other NeVA state verified
  here (Sikkim/Mizoram/HP in Hindi, WB and Meghalaya in Bengali). Party strings are inconsistently cased
  (`BHARATIYA JANATA PARTY` all-caps, `INDEPENDENT` all-caps, the rest title-case) — **do not key on case.**
- ✅ **Per-member profile page:** `/Member/Details/68?AssemblyID=1` → **200, 29,635 B** —
  *Mr. Abdul Majid Bhat (Larmi), Jammu And Kashmir National Conference, `Anantnag West -[43]- Anantnag`*,
  with **Permanent Address** (Larm Bazar, Wanpoh, District Anantnag), **Local Address**, **Mobile Number
  `7006040160`** and **Email `abdulmajeedlarmi@gmail.com`**. ⚠️ **Real PII (personal mobile + personal Gmail)
  on a state page** — republishing is a deliberate choice, not a default.
  The `<title>` leaks the shared-template artifact **"eVidhan- Himachal Pradesh"** — recon confirmed.
- ✅ **Per-member biographical detail:** `/Member/Member_ProfileDetail?MemberId=68&AssemblyID=1` →
  **200, 10,912 B, 17 rows**: *Print Name, Father's Name, Date of Birth, Place of Birth, Email, Mobile,
  Alternate Mobile, Party Name*, constituency and addresses. Structured and clean.
- ✅ **Bulk exports — one real, one mislabelled:**
  - `GET /ContactDirectory/ExcelforHonbleMember` → **200, 65,295 B (byte-exact), 91 `<tr>`** (header + 90)
    served with **`Content-Type: application/excel`** — and it is **HTML, not an XLS binary** (inline
    `p.MsoNormal` style block, `<table>` markup). **Parse it as HTML; an XLS library will reject it.**
  - `GET /ContactDirectory/PDFforHonbleMember` → **200, 4,972,706 B** — a **genuine PDF**, 4 pages
    (the recon recorded 4,972,694 B; the ~12-byte drift is live regeneration, not a different document).
- ⚠️ **`AssemblyID=1` is mandatory and its absence fails silently** — the recon's note holds; without it the
  member page renders an empty shell rather than erroring.
- ⚠️ **Two member-tab endpoints do not exist at all** (beyond the recon's "renders No Records Founds"):
  `/Member/Member_Notice` → 200/1,109 B and `/Member/Member_Committee` → 200/625 B, both "No Records Founds"
  — **but `/Member/Member_Assurance` and `/Member/Member_Debate` → 404 (1,245 B)**, even though the page
  renders **Assurances** and **Debates** tabs. **A rendered tab is not an existing endpoint** — probe it.

**Himachal Pradesh — MAJOR CORRECTION. The recon's entire member-profile verdict ("the member
roster/profile AJAX returns an empty template to anonymous clients", "Contact Directory renders empty, no
roster rows") is the **session-seeding artifact**, and the registration is now complete.**
- ⚠️ **The mechanism, measured both ways.** `GET /ContactDirectory/FetchMembersList?...` with **no session**:
  | Request | COLD | WARM (seeded jar + `Referer`) |
  |---|---|---|
  | `?MLT=0&MSLT=0&Assemblyid=14` | **500 / 3,531 B** | **200 / 660,570 B** |
  | `?MLT=0&MSLT=0&Assemblyid=0` | **500 / 3,531 B** | **200 / 660,570 B** |
  | `?MLT=4&MSLT=0&Assemblyid=0` | **500 / 3,531 B** | **200 / 660,451 B** |
  **`3,531 B` is the shared NeVA error page — exactly the signature the recon itself recorded for Gujarat
  and correctly diagnosed there as "not a broken endpoint, it is an unseeded session". On Himachal the
  same 3,531-byte 500 was read as *empty member data*.** Warm up with one `GET https://hpvs.neva.gov.in/`,
  carry the jar, send `Referer` — and the whole member tier opens.
- ✅ **Roster: `FetchMembersList?MLT=0&MSLT=0&Assemblyid=14` → 200, 660,570 B, exactly 68 member cards,
  68 unique member ids, 68 unique constituencies** — the **14th Vidhan Sabha**. Fields per card: photo
  (`cms.neva.gov.in/NeVA/HPVS/FileStructures//Member/thumb/…`), name, party, constituency, DOB, and an
  obfuscated contact (`solankeyajay20[at]gmail[dot]com`). **All in Hindi.**
  - **Party census: भारतीय राष्ट्रीय कांग्रेस (INC) 40, भारतीय जनता पार्टी (BJP) 28 = 68.**
  - Sample: `श्री अजय सोलंकी` (id 514), INC, `नाहन -सिरमौर ( हिमाचल प्रदेश)`;
    `श्री अनिल शर्मा` (id 38), BJP, `मण्डी -मण्डी`;
    `कुमारी अनुराधा राणा` (id 523), INC, `लाहौल और स्पिति`.
  - ⚠️ `Assemblyid=14` and `Assemblyid=0` return **identical bytes** — the param is ignored and the session
    default is used (same as Sikkim, Meghalaya, Mizoram).
- ✅ **`/Member/Details/{id}` → 200, 33,316 B** for id 256 (recon recorded a 22,426 B empty shell), and
  **`/Member/Member_ProfileDetail?MemberId=256&AssemblyID=14` → 200, 21,105 B with 18 populated rows** —
  real fields: **निर्वाचन क्षेत्र का नाम : भटियात, राज्य का नाम : हिमाचल प्रदेश, वैवाहिक स्थिति : विवाहित,
  Children Details: No Of Son(s) …** and the party. Recon recorded this endpoint as a **2,291 B "empty
  template; empty `Name :`; print block BLANK"** — **it is not empty.**
  ⚠️ **`AssemblyID=0` also works when warm (20,543 B / 17 rows)** — so unlike the roster, this endpoint does
  honour the parameter, and the recon's failure was **purely the missing session**, not a bad id.
- ✅ **`/ContactDirectory/MenuContactDirec` → 200, 62,549 B** (*recon: "redirect to national NeVA home"*);
  **`/ContactDirectory` → 200, 16,797 B** (*recon: "15,089 B, zero rows"*).
- ⚠️ **TWO ID NAMESPACES, AND THE OBVIOUS-LOOKING ONE IS WRONG.** The roster's `/Member/Details/{id}` ids
  (514, 38, 71, 523 …) are **not** the ids in the Questions page's `MemberList` `<select>`
  (477, 10, 11, 483, 434, 470, 26 …). Measured on one MLA, **Ajay Solanki**:
  **roster id `514` → 53 question rows**; **questions-list id `477` → the 1,360-byte empty page.**
  The questions list appears to carry a stale/legacy id set. **Using the questions-list id produces a false
  "no questions" finding** — this is the Punjab/Jharkhand namespace trap recurring a third time.
- **`hpvidhansabha.nic.in` re-tested and still unreachable — recon confirmed.** It resolves
  (`164.100.88.162`, an NIC block; `www` is a CNAME to the apex) but **TCP connect times out on both :443
  and :80** (20 s, `000 / 0 bytes`, twice). The recon's "real-but-currently-unreachable rather than dead"
  reading is correct and is now confirmed a second time.

, and the NeVA roster
endpoint is genuinely broken (HTTP 500, not the redirect the recon inferred).**
- ✅ **Sixth Assembly roster — recon's numbers reproduce byte-exactly.**
  `…/sites/default/files/षष्ठम-झारखण्ड-विधान-सभा-के-निर्वाचित-सदस्यों-की-सूची-अभियुक्ति-सहित.pdf`
  → **200, 224,241 B, 6 pages, `/Font` present on every page and `/Image` = 0 on every page.**
  **There are no member photographs anywhere in it** — the profile tier for Jharkhand has **no photo source
  on any official property.** Parsed structure: **exactly 81 numbered rows, 1→81 with no gaps**
  (झारखंड has 81 assembly constituencies), columns
  **`निर्वाचन क्षेत्र संख्या | विधान सभा क्षेत्र का नाम | वर्ग (SC/ST) | सदस्य का नाम | दल का नाम | अभियुक्ति`**,
  header *"षष्ठम झारखंड विधान सभा के निर्वाचित सदस्यों की सूची - (वर्ष - 2024)"*. Row 1 = **राजमहल / मो० ताजुद्दीन
  / झारखंड मुक्ति मोर्चा**; row 3 = **बरहैट / श्री हेमन्त सोरेन / JMM**; row 10 = **दुमका / श्री बसंत सोरेन / JMM**.
  ⚠️ **Encoding = legacy font.** The text layer yields *`ष"म`* for षष्ठम, *`झारख(ड`* for झारखंड,
  *`िनवा3िचत`* for निर्वाचित, *`Nी`* for श्री, *`मुिG मोचा3`* for मुक्ति मोर्चा, *`काँXेस`* for कांग्रेस,
  *`भारतीय जनता पाट^`* for भारतीय जनता पार्टी, *`dदीप`* for प्रदीप, *`?े@`* for क्षेत्र. **Chanakya/Kruti-Dev
  class, i.e. needs a transcoder or OCR — not clean Unicode.**
  Party census from that garbled text is therefore **approximate**: JMM **35**, BJP **21**, INC **16**,
  RJD **4**, AJSU **1** are solid; the small parties could not be separated cleanly. ⚠️ **JMM reads 35 here
  against the NeVA homepage's 34** — a 1-seat discrepancy I could **not** resolve from the garbled text, so
  both figures are recorded and the difference is flagged rather than silently resolved.
  The index page offers **7 roster PDFs** total (First, 2nd, 3rd, 4th, 5th via `list2019.pdf` and
  `निर्वाचित-सदस्यों-की-सूची-300724.pdf`, and this Sixth-Assembly one) — matching the recon exactly.
- ❌ **The NeVA roster endpoint is genuinely broken — but not for the reason the recon gives.**
  `/ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid={6,5,0}` → **HTTP 500 (3,531 B)**, the shared
  NeVA error page, for **every** parameter combination. Same for
  `/ContactDirectory/GetMembersDashbardData` → **500 (3,531 B)**. **So the recon's *conclusion* ("the roster
  cannot be pulled") holds — but its stated mechanism does not**: the recon attributed this to the routes
  redirecting to the national portal, and the actual response is a 500. See the Questions section for the
  redirect-trap correction that governs the *other* routes.
- ⚠️ **`/Member/Member_ProfileDetail?MemberId=9&AssemblyID=6` → 200, 2,291 B, and it is an UNPOPULATED
  TEMPLATE** — the payload literally reads
  `Personal Information … Name : Member … Personal Information BLANK Name : $(fun…`. The recon never recorded
  this endpoint; **do not mistake it for data.** Compare Sikkim, where the same endpoint returns a full
  ~9.7 KB profile — **this route is per-state, not per-platform.**
- ⚠️ **A parallel per-MLA asset does exist but is not structured data**: `…/विधायको-की-सम्पति-का-विवरण`
  indexes **per-named-MLA ZIPs** of property-declaration scans
  (`…/sites/default/files/mlasampati/1arjunmunda.zip`, `1hemlalmurmu.zip`, `1cpsingh.zip`, 55+ members) —
  recon's finding stands, and the names appear to belong to the **Fifth** Assembly, not the sitting one.

 / "cannot be pulled
today" is now fully populated. WB signed its NeVA MoU on 4 June 2026 and the backend has since been filled.**
- ✅ **`https://wbla.neva.gov.in/ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid=18` → HTTP 200,
  2,655,051 B, exactly 292 member cards, 292 unique member ids (306→597), 292/292 photos**, all
  `AssemblyID=18`. (`?Assemblyid=0` returns the **identical bytes** — the param is ignored and the session
  default is used; `?Assemblyid=17` → 200 but **5,858 B, zero rows**.)
  - Fields per card: **photo, name, party, constituency name, DOB** — *and every label is in Bengali*
    (`নির্বাচনী এলাকার নাম` = constituency name, `জন্মতারিখ` = date of birth), so a fetcher must key on the
    Bengali labels or on position, not on English strings. Photos come from the shared CMS
    `cms.neva.gov.in/NeVA/WB/FileStructures//Member/thumb/…`.
  - **Party census reproduces the recon's exactly**: **ভারতীয় জনতা পার্টি (BJP) 207, সর্বভারতীয় তৃণমূল
    কংগ্রেস (TMC) 80, ভারতীয় জাতীয় কংগ্রেস (INC) 2, আম জনতা উন্নয়ন পার্টি 1, All India Secular Front 1,
    ভারতের কমিউনিস্ট পার্টি (মার্ক্সবাদী) 1 = 292.** Data completeness: **0 blank parties, 0 blank
    constituencies, 13 blank DOBs.**
  ⚠️ **Two of the 292 have an English party string** (*All India Secular Front*) while 290 are Bengali — do
  not assume a single script for the party field.
  ⚠️ **292 members, not 294.** WB has **294 assembly constituencies** and the NeVA Contact-Directory filter
  panel renders the full 294-name list, but the roster returns **292 distinct constituencies and 292
  members** (207+80+2+1+1+1 = 292). Whatever the cause, **292 ≠ 294** — a consumer expecting a complete
  294-seat house from this endpoint will be quietly 2 seats short. Cross-check against ECI before publishing
  a seat total.
- ✅ **`/ContactDirectory/GetMembersDashbardData` → HTTP 200, 2,562,514 B, 584 `<tr>`** — the recon recorded
  this as **404**. It is the unfiltered state-dashboard roster, same 292 members.
- ✅ **`/Member/Details/{id}?AssemblyID=18` is NOW POPULATED** — recon says these pages "currently render
  empty" with "No Records Founds" for everything. Verified live, e.g. **`/Member/Details/367` → 200,
  29,198 B**:
  - **ডাঃ আব্দুল আজিজ** · সর্বভারতীয় তৃণমূল কংগ্রেস · constituency **`লালগোলা -[61]- মুর্শিদাবাদ`** (the
    **constituency number 61 is rendered inline**) · স্থায়ী ঠিকানা (permanent address) *Para - Rahamatpur,
    Jhamra, Raghunathganj, Murshidabad, PIN - 742213* · **মোবাইল নম্বর 7001976197** · **ইমেইল
    dr.abdulazizlgl@gmail.com**.
  - `/Member/Details/583` → **শ্রীমতি অগ্নিমিত্রা পাল**, **"দায়িত্বপ্রাপ্ত মন্ত্রী"** (Minister-in-charge —
    a **ministerial-status field** other NeVA states don't show), BJP, `আসানসোল দক্ষিণ -[280]- পশ্চিম
    বর্ধমান`, mobile 9831137298, `agnimitra.inga@gmail.com`.
  - ⚠️ **Real PII: un-obfuscated personal mobile numbers and personal Gmail addresses** on a state page.
    Republishing these is a decision to take deliberately, not by default.
  - The tabs (সাধারণ / প্রশ্ন / লক্ষ্য করুন / নিশ্চয়তা / কমিটি / বিতর্ক / বিল) still render
    **"কোনও রেকর্ড পাওয়া যায়নি"** for Assurances, Debates and BILLS — see Questions below.
  - ⚠️ The page `<title>` leaks the localised shared-template artifact **"ই বিধান- পশ্চিমবঙ্গ"**
    (*e-Vidhan – West Bengal*) — i.e. WB's copy is **localised**, unlike Sikkim's and Manipur's unmodified
    `eVidhan- Himachal Pradesh`. **Do not use that string as a "wrong state" signal here.**
- ✅ **`/Member/Member_ProfileDetail?MemberId={id}&AssemblyID=18` → 200, 7,626 B, 11 populated rows** — a
  clean per-member profile endpoint the recon never recorded:
  **নাম (name) · পিতার নাম (father's name) · জন্মতারিখ (DOB) · ইমেইল · মোবাইল নম্বর · পার্টির নাম (party) ·
  নির্বাচনী এলাকার নাম (constituency)**, rendered in Bengali. Easiest single record per MLA.
- ⚠️ **TWO DIFFERENT ID NAMESPACES on the same host.** `/Member/Details/{id}` uses **internal ids 306–597**,
  while the question filters' `MemberList` `<select>` uses **constituency numbers** — it reads
  `<option value="62">আব্দুল আজিজ (62)</option>`, `<option value="157">আব্দুল খালেক মোল্লা (157)</option>`,
  `<option value="278">অগ্নিমিত্রা পাল (278)</option>` etc. **Posting a Details id into a Questions route
  (or vice versa) is silently wrong** — this is the Punjab "different id namespaces" trap recurring.
- **Secondary official roster (17th Assembly, via Wayback because the live host is off-network):**
  `http://web.archive.org/web/20260109184412id_/http://www.wbassembly.gov.in/OtherPDF/LMLA.pdf` → **200,
  3,667,985 B, 110 pages.**
  ⚠️ **CORRECTION: the recon calls this "image-heavy, no extractable text". It is a born-digital TEXT PDF —
  221,488 extractable characters.** It is *"SEVENTEENTH LEGISLATIVE ASSEMBLY — FIRST PRINT — Corrected up to
  the 31st December, 2022"*, and it is the richest WB profile document that survives:
  Part I (seats per district, party abbreviations, casual vacancies, bye-elections, party-wise position) ·
  Part II alphabetical list of members (pp. 17–26) · **Part III constituency-wise list of members with
  address, permanent & temporary address, telephone numbers and e-mail, by district (pp. 28–100; Cooch
  Behar AC 1–9 → Birbhum AC 284–294)** · Part IV party-wise list (TMC pp. 105–111, BJP 111–114, RSMP 114,
  Independent 114) · Part V committees, reserved constituencies, lady members.
  Sample record: **`62. Bhagabangola` → Shri Idris Ali, A.I.T.C., 5 Ripon Lane Park Street Kolkata-700016,
  M: 9830227460 / 9874789121 / 9830425573, idrisalimp506@gmail.com**, oath 28th May 2021.
  ⚠️ **It is the 17th Assembly, not the current 18th** — use it for the 2021–2026 term only.
- **The assembly site's own member routes are recoverable as a route table even though the host is down.**
  The archived homepage exposes **64 `__doPostBack` controls**, of which the Members family is
  `btn_MList` (Member List), `btn_WhosWho` (Members Who's Who), `btn_EM` (Elected Members), `btn_nom`
  (Nominated Anglo-Indian), `btn_CV` (Casual Vacancies), `btn_Bye`/`btn_BiBye` (Bye-Elections),
  `btn_Minister`, `btn_PS` (Parliamentary Secretaries), `btn_party` (Party-wise Position), `btn_Gender`,
  `btn_facility`. Member photos are archived per numeric id at
  **`/DisplayIMG.ashx?IMG={n}`** (e.g. `IMG=2504`, `IMG=2604` → 200 image/jpeg) — so the 17th-Assembly
  photo set is partly retrievable from Wayback.


- **Roster (assembly):** `https://www.mizoramassembly.in/members` → **200, 84,731 B (byte-exact across
  three fetches), exactly 40 cards, 40/40 photos**, one card per constituency, numbered **1-Hachhek →
  40-Palak**. Markup is `<h3><a href="/members/details/{id}">{name}</a></h3>` + `<div class="text">
  {no}-{constituency}</div>`; photos at `/storage/members/<Month><Year>/<opaque hash>.jpg`
  (currently `March2024/`, recon recorded `January2024/` — the folder rotates). **No pagination.**
  ⚠️ **The card list carries name, photo and constituency only — NOT party.** Party is on the detail page.
- **Profile page:** `/members/details/{id}` → **200, ~35.6 KB**, a full field table:
  *Father's Name · Date of Birth · Place of Birth · Present Address · Permanent Address · Educational
  Qualification · Marital Status · Name of Spouse · Number of Children · Political Party Affiliation ·
  Hobbies · Special Interests · Social Activities/Experience · Countries Visited · Date of Election ·
  Election Period*. **No email and no mobile published** — the least PII-exposing profile page seen so far.
  Verified six ids live (24, 51, 60, 62, 79, 87), all 200; e.g. id **79 = C. Lalsawivunga, 18-Aizawl
  South I, Zoram People's Movement, BA, elected 2023-12-03**.
- ⚠️ **ROSTER IDs ARE NOT SEQUENTIAL AND ARE NOT 1..40.** Ids in use: `15,16,19,20,24,30,43,51,56…87`.
  They are **reused legacy member ids** for members who sat in earlier Assemblies (e.g. the CM
  **Lalduhoma is id 24**, from an earlier term; **Robert Romawia Royte is id 51**) — so a fetcher that
  assumes the id equals the constituency number will silently pull the wrong person.
- **Second official roster (NeVA, different platform, different ids):**
  `https://mizo.neva.gov.in/ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid=9` → **200,
  79,812 B, 40 cards**, each with photo (`cms.neva.gov.in/NeVA/MZ/FileStructures//Member/thumb/…`),
  `AssemblyID`, constituency and party. ⚠️ **The same MLA has a different id on each platform** —
  Lalduhoma is **assembly id 24 ↔ NeVA id 75**; B. Lalchhanzova (14-Aizawl East II) is
  **assembly id 59 ↔ NeVA id 63**. **Never reuse an id across the two hosts.**
  ⚠️ `Assemblyid=9` and `Assemblyid=0` return **identical bytes** here (the param is ignored and the
  session default is used), unlike Sikkim where `Assemblyid` is load-bearing.
- **NeVA member detail** (`/Member/Details/75?AssemblyID=9`) renders a real profile — *Chief Minister
  Pu Lalduhoma, Zoram Peoples Movement, Constituency `Serchhip -[26]- Serchhip`* — with tabs
  **General | Questions | Notice | Assurances | Committee | Debates | BILLS**, and it again leaks the
  shared-template artifact in its `<title>`: *"Member Details | NeVA | **eVidhan- Himachal Pradesh**"*.
  ⚠️ Its **Mobile Number and Email render as empty `tel:`/`mailto:` links** — the fields exist, the values
  are blank. Do not record them as published.


- Roster `…/member-s-information` (**441,628 bytes**, byte-exact) is **Liferay `div`/`span` markup, not a
  `<table>`** — parse structure, not a grid. **175 distinct `mem_id`s**, constituency numbers 1–175 with
  **zero gaps**, and party text (TDP 135 · YSRCP 11 · BJP 8 sampled).
- **Photos: 175/175** at `admin.aplegislature.org//preview.do?filePath=basePath&fileName=photos/16/{mem_id}.jpg`
  (term id 16). Sample = 200, `image/jpeg`, **24,576 bytes**, 480×720.
- **Who's Who** 16th Assembly: `legislation.aplegislature.org/…/Sixteenth…MLA-WhoisWho.pdf` — **66,723,748
  bytes (byte-exact), 384 pages, born-digital text**, 175 profiles with name/DOB/father/mother/education/
  spouse/children/positions-held/addresses/mobile/email.
- Term-wise lists (1st–16th + Hyderabad LA, 17 PDFs) at `…/termWiseMembersList`.
- ⚠️ **Per-member drill-down is a Liferay portlet action** with a session-bound `p_auth` token → **curl 403**.
  The roster and photos are fetchable; the drill-down needs a browser session.

**Arunachal Pradesh — 59-member NeVA roster against 60 seats (a known caveat).**
- `arla.neva.gov.in` (68,348 bytes, byte-exact) is the shared national NeVA template.
- Roster = AJAX fragment `ContactDirectory/FetchMembersList?MLT=4&MSLT=0&Assemblyid=0` (**395,641 bytes**,
  byte-exact) → **59 members** with name/party/constituency/DOB/mobile/email/photo.
- **⚠️ 59 entries against 60 seats** — the recon's caveat holds: duplicate members against Mechuka, Itanagar
  and Khonsa-East, plus stale 7th-Assembly entries. Do not treat 59 as "60 complete".
- Photos: `cms.neva.gov.in/NeVA/AR/FileStructures//Member/thumb/…` (59 photos; sample 200, `image/jpeg`,
  **21,311 bytes**, 550×706).
- Per-member `Member/Details/{id}` (e.g. id 9 = Pema Khandu, "Mukto -[3]-") → name, party, constituency
  number+name, addresses, contacts.

**Assam — 126 MLAs, paginated 20/page over 7 pages, per-member photos with a filename trap.**
- `assambidhansabha.org/members` (**52,267 bytes**, byte-exact) is server-rendered; `totalPageCount: 7`,
  `?page=1..7` → **126 distinct `members?id=` values** and **126 distinct photo paths** (ids 148–298).
- **Photo filename trap:** `assets/uploads/mla/profilepic/member_<id>.<ext>` — the extension **varies per
  member** (`member_149.jpg` = 200; `member_148.jpeg`, `member_151.png`; `member_26.jpg` = 404). Read the
  URL from the roster HTML, never construct it from the id alone.
- Per-member `members?id=<n>` (e.g. id 148 → "23 - CHENGA") — name, constituency, party, father/mother,
  DOB, addresses, contacts, education, marital status, spouse, children, and term ("elected to the 16th
  Assembly").
- NeVA `asla.neva.gov.in` also lists the 126-member directory, but its member pages carry **no photo** —
  use the bespoke site for photos.

**Madhya Pradesh — 230 MLAs, but only as bulk PDFs (no per-member page, no search, no JSON).**
- `16mlaprofile.htm` (42,411 B) links a set of whole-Assembly **PDFs**: `sadasyasuchi16vs.pdf` (member list +
  photos), `AllMember16vs.pdf`, **`mlaprofilevsxvi030826.pdf`** (जीवन वृत्त biographies — the richest source,
  **1,433 photos**), `member_all.pdf` (text-only roster, no photos), plus party-wise (`BJP16vs` / `INC16vs` /
  `BAP16vs`) and category (`SC16vs` / `ST16vs` / `Women16vs` / `firsttimer16vs`) rosters.
- ⚠️ **No per-MLA page, no search box, no member-detail route, no JSON/XHR API.** Every profile artifact is a
  bulk PDF (or JPG) that must be downloaded and parsed. The biography PDF has **partial `/ToUnicode`** — the
  Devanagari extracts partially and may need OCR for clean names.
- NeVA `mpla.neva.gov.in` is **onboarded but unpopulated**: `/Member/Details/218` (200, 22,426 B) shows
  "No Records Founds" for Assurances / Debates / BILLS, and `Member_ProfileDetail` returns a blank `Name:`.

**Tamil Nadu — one clean HTML table of all 234 MLAs, but no per-member page.**
- `17thassembly/members.php` (**141,080 bytes**, byte-exact) is a single plain `<table>` — **234 data rows**,
  columns `Serial | NAME (party abbrev + constituency in parens) | ADDRESS | TEL | Email | PHOTO`. Party and
  constituency live in one text cell (`1 Aadhav Arjuna Hon. Thiru. (TVK) (Minister) (Villivakkam)`).
  Live party split: **TVK 106, DMK 59, AIADMK 41, INC 5, PMK 4, VCK 2, BJP 1, DMDK 1**.
- **Photos:** fully predictable `17thassembly/members/NNN.jpg` — sample `014.jpg` = 200, `image/jpeg`,
  **1,834 bytes, 91×130** (byte-exact). 224 `<img>` entries this pass (recon counted 228 — a couple of
  members lack a photo).
- **No per-member detail page** — no `member.php?id=` links anywhere in the markup (confirmed). The roster is
  one alphabetical list, hand-maintained PHP with no "last updated" stamp; use the CEO's
  `elections.tn.gov.in` / ECI `S22` results as the temporal cross-check (the recon's caution).
- A PDF edition exists (`17thassembly_members.pdf`, 83,614 B, 8 pp, clean English text). Party position at
  `partyposition.php`.

**Kerala — 140 MLAs, 100% photo coverage, plus a 1,088-row historical roster.**
- `index.php/content/sitting_member` is a single plain `<table>` — **141 `<tr>` = 140 data rows**, columns
  `Sl. No | Name of member | Party Name | Constituency | Photo`, and **140/140 rows carry a photo** (no
  placeholder rows). Party distribution parsed exactly: **INC 63 · CPI(M) 27 · IUML 22 · Kerala Congress 7 ·
  CPI 7 · Independent 4 · BJP 3 · RSP 3**, plus Kerala Congress (Jacob) 1, CMP 1, RMPI 1, RJD 1 = **140**.
  (The assembly's tally differs from ECI by one or two — the recon's caveat; the page appears to lag.)
- Photos are plain JPGs at a predictable path embedding KLA + member id, e.g.
  `images/member/<slug>_member_16_36.jpg` (16th KLA).
- `index.php/content/member_search` = full historical roster (**1,088 rows**). Per-member profiles at
  `index.php/profile/index/<id>` and `index.php/content/member_homepage/<id>` return party, elected date,
  `@niyamasabha.nic.in` email, father/spouse, marital status and addresses. ⚠️ Placeholder dates exist
  (`1111-01-01` on id 1209) — cross-check elected dates against ECI.

**Karnataka — a clean 224-constituency table, but no photos and no per-member page.**
- `assembly/member/16assemblymemberslist.htm` (**149,144 bytes**, byte-exact) is one static `<table>`:
  `Sl No | Constituency | Member Name | Party`, each row carrying **English *and* Kannada**.
  **224 distinct constituency numbers, 1–224, zero gaps** — but **231 numbered rows**, because by-election,
  deceased and remark entries sit alongside the 224 seats (e.g. `SAMARTH SHAMANURU MALLIKARJUNA [By Ele: from
  04/05/2026]`, two INC members marked `[Remarks: Died on …]`). Party split: **INC 136 · BJP 62 (+3
  un-attached) · JD(S) 18 · IND 2**.
- ⚠️ **No photo, no per-member profile page, no search** — a flat list. The **only** official photographic
  source is the **Who's Who Book** `assembly/member/16thWhosWho.pdf` (~30.6 MB, 3,191 `/Image` + 597 `/Font`).
  Address lists exist separately (`16membersaddress_eng.pdf` / `_kan.pdf`); party position at
  `assembly/member/partyposition.htm`.

**Telangana — 119 MLAs with hi-res photos and full profiles, plus a class-name swap that will break a naive
selector.**
- `assemblymemprofile` server-renders **119 member tiles** in plain HTML — **119 detail links** and **119
  distinct `preview.tsl` photos**, name + party + constituency on every tile. The detail link's `?q=` is
  standard base64: `bWVtaWQ9MzU3NiZjb25zdGlkPTEmdGVybWlkPTE2Jm9yZGVyYnk9MQ==` →
  `memid=3576&constid=1&termid=16&orderby=1` (stable member/constituency/term ids).
- ⚠️ **THE TRAP: the vendor's class names are swapped relative to their meaning.** On the first tile,
  **`.ce-mip-mp-constituency` contains `BJP`** (the *party*) and **`.ce-mip-mp-province` contains `SIRPUR`**
  (the *constituency*). A scraper that trusts the class names will publish party in the constituency field and
  vice versa for all 119 members. Party is also encoded as a hex colour in `.party_color` (`#F67800` for BJP).
- **Photos are high-resolution:** `admin-legislature.telangana.gov.in//preview.tsl?filePath=photoPath&fileName=16/<memid>.jpg`
  — the recon measured 2784×3551, ~458 KB each (~54 MB for the set). Note this is a **second host**, not the
  main legislature domain.
- **Per-MLA profile:** `getmemberdetailsnew?q=<base64>` (200, 57,564 B) — "MLA Personal Profile" with Personal
  Details / Legislature Experience / Contact Details: father, mother, place & date of birth, spouse, children,
  education, special interests, positions held, countries visited, permanent address and contacts. Verified for
  memid 3576: *DR. PALVAI HARISH BABU (Bharatiya Janata Party), SIRPUR*, DOB 05/07/1979, M.B.B.S./M.S.(Ortho)/
  D.N.B.(Ortho). ⚠️ **This includes personal mobile, email and home address** — published by the legislature, so
  technically official, but treat as sensitive for republishing.
- **Term selector:** `?termid=16` = III (2023– ), `15` = II (2018–2023), `14` = I (2014–2018) — all published.
- **Cross-check (lower fidelity):** `telangana.gov.in/legislature/members-of-legislative-assembly/` — 119 rows,
  `S.No | Candidate Name | Party Name | Constituency`, **no photo, no term, no member id**.

**Odisha — 147 MLAs, 100% photo coverage, but the roster is POST-paged and its Next button lies.**
- `MemberofAssembly.aspx` (99,375 B) is ASP.NET WebForms with **POST-only paging, 16 members per page**,
  advanced by submitting `ctl00$ContentPlaceHolder1$btnNext` with `__VIEWSTATE` (27,392 chars) carried back.
  Walking all pages yields **147 members, 147 unique, 147/147 with photos** — full coverage.
- Verified party split (17th Assembly): **BJP 79 · BJD 50 · INC 14 · Independent 3 · CPI(M) 1 = 147**.
  (The recon's doughnut reported 78/51/14/3/1 — a one-member difference; use these, and re-check if a
  member changes affiliation.)
- Per-member fields: name (with honorific), party (full name), constituency **with district and state**
  (`Anandapur  -  (  Keonjhar , Odisha )`), **date of birth**, postal address, phone, e-mail (obfuscated as
  `name[at]gov[dot]in`), a photograph, and a party-logo image.
- ⚠️ **Two scraping traps.** (1) **The vendor's class name is misspelled `memeber-item`** (and
  `brand-mark-memeber`) — a selector written against correct spelling matches nothing. (2) **Photo filenames
  embed the member's name**, e.g. `images/MemberofAssembly/Shri Abhimanyu Sethi.jpg` — spaces must be URL-encoded
  and a name change breaks the URL, so read the path from the markup rather than constructing it.
- ⚠️ **The paging termination trap (new):** `btnNext` **stays present after the last page**. A
  "walk until there is no Next button" loop never ends (pages 11+ return **0 members** while Next persists) —
  I hit a 30-page cap. **Break on "0 members returned", not on "no Next button".**
- ⚠️ **TLS quirk:** `assembly.odisha.gov.in` fails Python's trust store
  (`SSL: CERTIFICATE_VERIFY_FAILED: unable to get local issuer certificate`) even via `/etc/ssl/cert.pem`,
  while curl accepts the chain — same class as Rajasthan's `rlaoasys`. Use curl, or an unverified context.

**Haryana — 90 MLAs on pages 1–5, and a page named `sitting-members` that does not contain them.**
- `assembly-members/` (52,825 B) is a plain server-rendered table `Name | Sex | Constituency Name | Party`,
  **20 rows per page**. **Pages 1–5 are exactly the 90 sitting MLAs and nothing else** — verified: row 90 is
  `Smt. Vinesh | Female | Julana | INC` (Vinesh Phogat) and **row 91 flips to the 14th Assembly**
  (`Abhay Singh Chautala, Ch. | Male | Ellenabad | INLD`). Party split of the first 90:
  **INC 37 · BJP 47 · INLD 2 · Independent 3 · Speaker 1 = 90**, which reconciles to the official 2024 result
  (BJP 48 = 47 + Speaker). That reconciliation is the proof pages 1–5 are complete.
- ⚠️ **THE NAMING TRAP — `/sitting-members/` is not the sitting-member list.** It returns **415,412 B /
  1,115 rows spanning Houses 1–14**, and its **first row is a *note*, not a member**: *"15 | Members of 15th
  Legislative Assembly of Haryana as per Notification No. 308/HAR-LA/2024, dated 09th October, 2024 of
  Election Commission of India | - | - | -"*. **The current 15th Assembly is absent from it.** A harvester that
  trusts the page name (`sitting-members`) records the **14th** Assembly as current. Use `assembly-members/`
  for sitting members and `/sitting-members/` for history.
- Roster parsing quirk: the `<tr>`/`<td>` nesting is malformed — a naive row regex captures one "row" holding
  **80 cells** (20 members). Chunk the flat `<td>` list by the **4 columns** instead.
- Per-member: `mla-details/?id=NNNN` (43,867 B) renders the full label set but **most fields are empty (`-`)**;
  the reliable core is **name, party, constituency, house tenure, photo**. An **invalid id returns the same
  shell, not a 404** — so a missing member and an empty profile look identical.
- Photos are **name-slugged** JPEGs (`/wp-content/uploads/2019/11/anil_vij.jpg`) — read from the page, don't
  construct. Term dates at `house-tenures/` (15th Assembly = 25-10-2024 → 24-10-2029).

**Manipur — 60 MLAs, static HTML, and a sitemap that is the best way in.**
- `/members` (89,150 B) yields **60 distinct `/members/profile/{slug}` URLs**; `/members/list-of-members`
  mirrors the same 60, and `/members/former-members` holds history.
- ⚠️ **Use `sitemap.xml` (19,265 B, 106 URLs) to discover the roster** — it enumerates **all 60 member
  slugs** directly, which is cleaner and less brittle than scraping the roster markup. The sitemap contains
  **no attendance or fund URL** (a useful negative in itself).
- Per-member `/members/profile/{slug}` (39,506 B): constituency (`31-Thoubal`), party, date of birth, and an
  "Additional Details" block (father's name, place of birth, permanent/present address, education). Verified
  for `okram-ibobi-singh`.
- **Photos:** `/user/pages/images/members/<constituency-no>_<Name>.webp` — e.g. `31_O Ibobi.webp`
  (200, **45,882 B, `image/webp`**, byte-exact). The filename embeds the constituency number *and* the display
  name, so **read the path from the page; never construct it**. Party logos at
  `/user/pages/images/parties/{inc|bjp|…}.webp`.
- Plain static server-rendered HTML — **no JSON/XHR API and no search endpoint**.

**Tripura — a NeVA tenant whose endpoints 500 until you seed a session.**
- ⚠️ **THE ACCESS GATE (governs every route here):** a **cold** GET to
  `/ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid=13` returns **HTTP 500, 3,531 B** — an error
  page, not a redirect and not the national landing. After a single seeding `GET /` into a cookie jar plus a
  `Referer`, the **same URL returns 200 / 466,993 B (byte-exact)**. **A fetcher that skips the seed records
  this state as having no roster at all.** Same pattern as Telangana — the URL is right, the session is missing.
- Roster = **60 member cards, 60 photos** (HTML partial). Each card carries a photo, name (Bengali by default,
  English after the culture switch), party, constituency with district (`Matarbari -Gomati (Tripura)`), date of
  birth, local postal address, and a link to `/Member/Details/{id}?AssemblyID=13`.
- **Queryable per member and per Assembly:** the filter endpoint takes `MLT` (party family/category), `MSLT`
  (party/sub-category) and **`Assemblyid` (1st → 13th)**, so historical Assemblies use the same call.
  Party split for the 13th Assembly: **BJP 33 · TMP 13 · CPI(M) 10 · INC 3 · IPFT 1 = 60**.
- **Bulk exports both work:** `/ContactDirectory/PDFforHonbleMember` → 200, **3,281,669 B, `application/pdf`,
  a text PDF (`%PDF-1.4`, fonts, `/Image` present but not a scan)**; `/ContactDirectory/ExcelforHonbleMember`
  → 46,457 B, but it is an **Excel-flavoured HTML export** (`MsoNormal` styles), so parse as HTML.
- Per-member detail: `/Member/Details/{id}?AssemblyID=13` plus the AJAX
  `/Member/Member_ProfileDetail?MemberId=78&AssemblyID=13` (father's name, DOB/place, e-mail, mobiles, party,
  constituency, caste category, marital status, spouse, children, address, qualification, hobbies).
- **Legacy host is dead:** `tripuraassembly.nic.in` resolves in DNS (164.100.178.251) but **refuses TCP on both
  80 and 443** → curl `000`. Do not treat the DNS answer as a live source.

**Meghalaya — TWO official member sources, one of them HTTP-only with the whole roster as a JSON file.**
- **Site 1 — `http://megassembly.gov.in/` (the Assembly's own, Laravel + Vue).** ⚠️ **It is reachable over
  HTTP only**: `https://megassembly.gov.in/` fails the TLS handshake outright (curl `000`), while
  `http://…` returns 200. A fetcher that assumes https records this state as dead.
  - **Roster = a single JSON file:** `http://megassembly.gov.in/storage/members/members.json` →
    200, **27,111 B, `application/json`, 60 records** (byte-exact). Keys: `id, party_name_id, name, image,
    district, constituency, email, phone, biodata, party_name`.
  - **60/60 records carry a photo** (`image`, e.g. `/storage/Shniawbhalang Dhar.jpg`); constituency comes with
    its ST tag (`1- Nartiang (ST)`) and the district is separate (`West Jaintia Hills`). `email`, `phone` and
    `biodata` are present but **empty (`-`)**.
  - ⚠️ **PARSING TRAP: `party_name` is a nested object, not a string** — `{'id': 1, 'party': '…'}`. Treating it
    as text yields `{'id': 1, 'party': …}` per member. Extract the inner key. Party ids observed: **1 (33),
    5 (12), 10 (5), 11 (4), 2 (2), 6 (2), 7 (2)** = 60.
  - The site itself is a **7,144-byte Vue SPA shell** with only ~6 links — an href crawl finds nothing, so use
    the JSON endpoints directly.
- **Site 2 — `https://mgla.neva.gov.in/` (NeVA / NIC).** Member directory at `/ContactDirectory/MenuContactDirec`
  with party-filtered views (`?MLT=4&MSLT=53` = NPP) and the `FetchMembersList` fragment; photos come from the
  shared CMS (`cms.neva.gov.in/NeVA/ML/FileStructures/`).
- **Both are official** — the first from the Government of Meghalaya, the second an NIC/MoPA NeVA tenant linked
  from `neva.gov.in`. They are **not the same system** and do not share markup.

**Sikkim — NeVA-only (no bespoke site at all), 32 MLAs, and a profile endpoint the recon wrote off as blank.**
- **There is no separate Sikkim assembly website.** `sikkimassembly.nic.in`, `sikkimassembly.gov.in`,
  `assembly.sikkim.gov.in`, `sikkimvidhansabha.nic.in` and `slasikkim.nic.in` **all fail DNS**, and the recon
  found **zero Wayback captures** for them — so no legacy bespoke site ever existed. The official legislature
  presence *is* `https://sikkim.neva.gov.in/` (NeVA 2.0.2, 72,895 B, masthead "ELEVENTH ASSEMBLY").
- **Roster:** `GET /ContactDirectory/FetchMembersList?MLT=0&MSLT=0&Assemblyid=11` → **200, 401,993 B
  (byte-exact), 32 member cards, 32 photos.** ⚠️ **An ASP.NET session cookie is required** — a warm-up `GET /`
  first. Each card carries photo, name, party, constituency, DOB, address, mobile and an *obfuscated* email
  (`aditya[dot]golay[at]sikkim[dot]gov[dot]in`). Photos come from the shared CMS
  (`cms.neva.gov.in/NeVA/SK/FileStructures//Member/thumb/…`, served as `image/png` but often JPEG bytes).
  `Assemblyid` also accepts **4–11** (Fourth–Eleventh Assemblies).
- **CORRECTION — the per-member profile endpoint is NOT blank.** `SOURCES.md` records
  `/Member/Member_ProfileDetail?MemberId=7&AssemblyID=11` as returning a **"BLANK placeholder"** with
  *"content empty"*. **It returns real data:** MemberId 7 → **9,721 B**, MemberId 60 → **9,647 B**. For
  member 60 the payload is a full profile — **name, father's name, DOB, place of birth, email, mobile,
  alternate mobile, party, constituency, state, marital status, spouse, children, local and permanent address,
  highest qualification (B.A), interests, hobbies and foreign travel**. So Sikkim **does** have a rich
  per-member profile source; the recon's "blank" reading is wrong.
  - ⚠️ **Data-exposure nuance:** the profile AJAX gives the email **unobfuscated**
    (`aditya.golay@sikkim.gov.in`) and both mobile numbers in clear, while the roster card obfuscates the email.
    Treat these as personal data if republishing.
- **Secondary official roster (cookie-free, plain HTML):** `https://www.sikkim.gov.in/mygovernment/whos-who/mlas`
  → **200, 72,107 B (byte-exact)**, columns `Name | Position | Constituency` for all 32
  (`SHRI. SONAM LAMA | Hon'ble MLA | Sangha`). It publishes **no party and no photo**, so it is a freshness
  cross-check only — the NeVA card list is the richer source.

**Uttar Pradesh — the best JSON roster so far, plus photos from a second host.**
- **ASMX JSON is the backbone** — `POST https://uplegisassembly.gov.in/angular.asmx/<method>` with
  `Content-Type: application/json`. No cookies, no tokens, no auth. The **payload for each method is
  documented in the site's own controller** at `https://uplegisassembly.gov.in/Members/Members.js`
  (68,990 B) — read it rather than guessing; two methods returned **HTTP 500** until I used the right shape.

| Method | Payload | Returns |
|---|---|---|
| `show_MemberList` | `{"Id":"MLA_HI","parm":"18"}` | **397** (18th) · **390** (17th) · **404** (16th) members |
| `show_assembly_master` | `{"Id":"show_assembly_master"}` | **18 assemblies** — Hindi + English name, constitution/start/end/dissolution dates, year, **total seats + reserved SC/ST seats** (1st Assembly 1952: 430 seats, 83 SC) |
| `CurrentAssemblyPartyList` | `{"Id":"CurrentAssemblyPartyList","parm":"18"}` | **live party strength** — BJP 256, SP 101, AD(S) 13, RLD 9, SBSP 6, NISHAD 5, Independent 3, JDL 2 |
| `AllAssemblyMembersList` | `{"locale":"AAML"}` | the 18-assembly index |

- Member fields: `mla_name` (Hindi) + **`mla_name_eng`**, `party_name_hindi` + **`party_name_english`**,
  `ac_name` + **`ac_name_eng`**, `mla_code`, `assembly_name`. So names, parties and constituencies arrive in
  **both scripts** — no transliteration needed. **No photo field**, as the recon says.
- **Photos come from the Liferay portal**: `member-s-information` returns **3,512,767 bytes** (byte-exact
  with the recon) with **418 member links** and **836 table rows**; per-member pages are
  `member?memberId=<id>` (91,303 B, also byte-exact). Portraits are plain JPEGs. Note ⚠️ 418 links for a
  403-seat house — the page includes non-sitting/other entries, so **do not treat 418 as the roster size**;
  the ASMX roster (397) is the authoritative count.
- URLs are **relative** in the site's markup (`Members/main_members_hi.aspx`) — my first crawl prefixed only
  leading-`/` paths and fetched **5 of 139** pages. Resolve relative paths against the base.

**Goa — small, fully static roster; bespoke site, not NeVA-derived.**
- `mlas.php` (200, **55,466 bytes** — byte-identical to the recon) is plain HTML, **no JS, no session**:
  **40 roster tiles** (`div.mla-info-box`), **40 distinct `mem_id`s**, and **40 photos** (37 under
  `uploads/members/<slug>_<id><ts>.JPG`, 3 under `static.goavidhansabha.gov.in/goalpub/docs/members/`).
  Headed *"MEMBERs OF Eighth Legislative Assembly 2022"* — **the term is published on the page**.
- Per-member: `member_detail.php?mem_id=94` (200, **58,741 bytes** — byte-identical). Publishes constituency
  number + name (`22 - Shiroda`), personal/contact details, and a genuine **per-term Election Details table**
  (assembly, constituency, party, votes polled/received/margin across the 8th, 7th, 4th, 3rd assemblies).
  A **"VIEW PROFILE"** button links a Who's Who PDF with a **real text layer** (not a scan).
- **Transport quirk worth recording:** the host resolves (`goavidhansabha.gov.in` → 103.119.239.16, same IP
  as the non-`.gov.in` mirror `goavidhansabha.in`) and `host`/`dig` answer, but `curl` intermittently failed
  with *"Could not resolve host"*. Retry, or pin with
  `curl --resolve www.goavidhansabha.gov.in:443:103.119.239.16`. Do not record the site as down on one
  resolver hiccup — it returned 200/41,305 bytes on the pinned retry.

**Punjab — complete roster with photos, no session seeding required.**
- `Members` is **server-rendered static HTML paginated 5 ways** via `?Page_No=1..5` (24+24+24+24+21).
  Union across the five pages = **117 member links / 117 distinct photo paths** — so every sitting
  member has a photo, not a subset. Photo pattern: `/NevaMemberPic/16/<file>.jpg`.
- Per-member profile `Members/MembersProfile?MemberID={id}&AssemblyID=16` (200, 110 KB server-rendered):
  name, party, constituency + number (`Dhuri -[107]- Sangrur`), permanent/local address, mobile, email,
  photo, and a Personal Details block (father's name, DOB, caste category, marital status, spouse,
  children, education, sports, interests, foreign travel, Positions Held).
- Unlike Gujarat, **no session seeding is needed** — a bare `curl` with a UA returns the roster and the
  profiles directly. The NeVA template's redirect trap does not fire on these routes.

## Questions

| State/UT | Working source | Kind | Status |
|---|---|---|---|
| Bihar — starred | https://vidhansabha.bihar.gov.in/starred_question.html | official assembly | ⚠️ scanned Hindi PDFs (444); current (18th Assembly) |
| Bihar — unstarred | https://vidhansabha.bihar.gov.in/Unstared%20Question.html | official assembly | ⚠️ scanned Hindi PDFs (42); stale (stops at 16th Assembly) |
| Maharashtra — starred | https://mls.org.in/Starred_list_Assembly.aspx | official assembly | per-sitting PDFs; Marathi legacy font |
| Maharashtra — unstarred | https://mls.org.in/atarankit-yadi-assembly.aspx | official assembly | per-list PDFs; member names present; Marathi legacy font |
| Gujarat — starred | https://gujarat.neva.gov.in/Member/Member_Question?MemberId={id}&AssemblyID=15 | official (NeVA) | ✅ per-member HTML table (Gujarati) |
| Gujarat — unstarred | same NeVA per-member question endpoint | official (NeVA) | ⚠️ **unverified** — no member with unstarred questions sampled yet |
| Rajasthan — starred | https://rlaoasys.rajasthan.gov.in/QuestionsWeb/MemberWise.aspx | official assembly | ✅ per-member, **verified**: 22/39/37 rows across 3 members (see note) |
| Rajasthan — unstarred | same endpoint — type column `प्रश्न का प्रकार` distinguishes them | official assembly | ✅ per-member, **verified**: 57/60/12 rows across the same 3 members |
| Punjab — starred | https://punjabassembly.gov.in/Questions/StarredQuestion | official assembly | ✅ session PDFs, **current** (13th Session, 10.08.2026); per-MLA via the PDF |
| Punjab — unstarred | https://punjabassembly.gov.in/Questions/UnStarredQuestion | official assembly | ✅ session PDFs, **current**; **not stale** — same sessions as starred |
| Goa — starred | https://www.goavidhansabha.gov.in/questions_list.php | official assembly | ✅ per-sitting **Question Booklet Report**, per-member table; **born-digital text** |
| Goa — unstarred | same page — separate PDF per sitting | official assembly | ✅ same report + per-member table, but **JBIG2 scan** — needs OCR |
| Uttar Pradesh — starred | https://vsopp.up.gov.in/uplaquest/Question_Online/MemberWise.aspx | official assembly | ✅ per-member, **curl-replayable**, **with answer text** — type column distinguishes the two |
| Uttar Pradesh — unstarred | same endpoint — `प्रश्न का प्रकार` column | official assembly | ✅ per-member, same call; sampled 38 starred / 32 unstarred for one MLA |
| Andhra Pradesh — starred | — | — | ❌ **none** — `legislation.aplegislature.org` questions module is behind login + CAPTCHA (5/5 `.do` endpoints = identical 12,014-byte login page) |
| Andhra Pradesh — unstarred | — | — | ❌ **none** — same wall |
| Arunachal Pradesh — starred | https://arla.neva.gov.in/Member/Member_Question?MemberId={id}&AssemblyID=7 | official (NeVA) | ✅ per-member, 2 Starred verified for member 53; ⚠️ **stale** (all data 27/08/2020) |
| Arunachal Pradesh — unstarred | same endpoint — `Question Type` column | official (NeVA) | ✅ per-member, 5 Unstarred verified for member 53; ⚠️ **stale** |
| Assam — starred | http://aladigitallibrary.in/handle/123456789/4109 (DSpace) | official (DSpace 6.3) | ✅ per-sitting-day PDFs (Budget Session 2026); **Assamese scan** — needs `ben` OCR; not per-member |
| Assam — unstarred | http://aladigitallibrary.in/handle/123456789/4110 | official (DSpace 6.3) | ✅ separate collection, same shape |
| Madhya Pradesh — starred | https://mpvidhansabha.nic.in/house%20proceedings/hp.htm (star*.pdf index + ques*.pdf Part 1) | official assembly | ✅ per-sitting PDFs, member name + Q no. in text; born-digital (partial Devanagari garbling) |
| Madhya Pradesh — unstarred | same `ques*.pdf` — Part 2 (Rule 46(2)) | official assembly | ✅ per-sitting; the `ques` book is **combined** starred+unstarred, not unstarred-only |
| Tamil Nadu — starred | https://tnla.neva.gov.in/ (Notice Board → cms.neva.gov.in `17_1_S_*.pdf`) | official (NeVA) | ⚠️ per-day PDFs only; member + Q no. in text; **Tamil legacy-encoded (lossy)** — not per-member indexed |
| Tamil Nadu — unstarred | — | — | ❌ **none** — not separately indexed anywhere (recon + live) |
| Kerala — starred | https://www.niyamasabha.nic.in/index.php/questions/starred | official assembly | ✅ **POST JSON API + CSRF** — per-question (not per-member indexed); full Malayalam text. 16th KLA empty |
| Kerala — unstarred | https://www.niyamasabha.nic.in/index.php/questions/unstarred | official assembly | ✅ same API, separate endpoint; verified 16 unstarred in 15th-KLA session 23 |
| Karnataka — starred | https://klaexplorer.karnataka.gov.in/api/sd/sh?qp={name} | official assembly (JSON) | ✅ **per-member + type field** (`debate_title_subject_eng` = "Starred Questions"); full record 1952→ |
| Karnataka — unstarred | same Explorer API + per-day `lausq*.pdf` | official assembly | ✅ both work — **recon's 404 on `lausq` no longer holds** (now 200, 1.5 MB) |
| Telangana — oral ("starred") | https://legislature.telangana.gov.in/answersList (`ans_type=1`) | official assembly | ⚠️ **Oral/Written, not "starred"/"unstarred"**; search form only — **POST → 403** (browser-gated); **not per-member** |
| Telangana — written ("unstarred") | same form, `ans_type=3` (also `2` = Placed) | official assembly | ⚠️ same limitation — aggregate department × session, no member attribution |
| Odisha — starred | https://assembly.odisha.gov.in/ | official assembly | ⚠️ POST-only question search; PDFs are text (Type0+ToUnicode, not OCR); **not per-member** |
| Odisha — unstarred | same route | official assembly | ⚠️ same; no per-member index |
| Haryana — starred | https://haryanaassembly.gov.in/newspress-releases/ | official assembly | ✅ per-session PDFs, **English + Hindi**, born-digital text; ⚠️ unstarred slugs also read "starred" |
| Haryana — unstarred | same feed (separate posts) | official assembly | ✅ separate posts + PDFs; **https only** — the recon's `http://` URL fails (port 80 closed) |
| Manipur — starred | https://assembly.mn.gov.in/business/questions-and-answers/starred-questions | official assembly | ⚠️ table + PDFs, 4 pages; **the PDF is a scan** |
| Manipur — unstarred | https://assembly.mn.gov.in/business/questions-and-answers/unstarred-questions | official assembly | ⚠️ **its table is a duplicate of Starred** (header still says "Starred Question No."), **but its PDFs are genuinely different** — follow the PDFs, not the table |
| Tripura — starred | https://tripura.neva.gov.in/Member/Member_Question?MemberId={id}&AssemblyID=13 | official (NeVA) | ✅ **per-member**, type column `তারকাচিহ্নিত`; Bengali; needs the seed |
| Tripura — unstarred | same endpoint — type column `তারকাচিহ্নহীন` | official (NeVA) | ✅ same call; both types verified for member 78 |
| Meghalaya — starred | https://mgla.neva.gov.in/Member/Member_Question?MemberId={id}&AssemblyID=11 | official (NeVA) | ✅ **per-member**, type column literally "Starred"; needs a warm-up GET |
| Meghalaya — unstarred | same endpoint — type column "Unstarred" | official (NeVA) | ✅ same call; 285 rows verified for member 50, current to Aug 2026 |
| Sikkim — starred | https://sikkim.neva.gov.in/Questions | official (NeVA) | ⚠️ category exists (Starred/UnStarred/Short Notice/Inter Session) but **no records** — per-member query returns "No Records Founds" |
| Sikkim — unstarred | same module | official (NeVA) | ⚠️ same — module present, **no data** |
| Mizoram — starred | https://www.mizoramassembly.in/question | official assembly | ✅ per-session **Starred** bundles; asker named in the PDF body; **156 bundles, Sep 2020 → Aug 2026**; born-digital text (1 in 33 sampled is a scan) |
| Mizoram — unstarred | https://mizo.neva.gov.in/Questions/FetchUnListQuestions?AssId=9&SessId=7 | official (NeVA) | ✅ explicit **`Asked By`** column with name + constituency; 9th Asm sess 3/4/6/7, 8th Asm sess 10/12/13; **NeVA starred is empty on every session** |
| West Bengal — starred | https://wbla.neva.gov.in/Questions?IsStateDashBoard=True | official (NeVA) | ❌ **empty** — `FetchDataListQuestionBySearch` → "কোনও রেকর্ড পাওয়া যায়নি" for every AssId × SessionDateId combination swept |
| West Bengal — unstarred | https://wbla.neva.gov.in/Questions/FetchUnListQuestions?AssId=18&SessId=100 | official (NeVA) | ❌ **empty** — 587 B "No Records Found" for both Assemblies and every session id |
| Jharkhand — starred | https://jhla.neva.gov.in/Member/Member_Question?MemberId={id}&AssemblyID=6 | official (NeVA) | ✅ **632 rows / 34 of 81 members** — per-member, with Question No, **Minister** and Subject; session browser is empty |
| Jharkhand — unstarred | — | — | **none published** — 0 अतारांकित rows in the per-member register; `FetchUnListQuestions` swept 6 Assemblies × 7 sessions = **0** |
| Himachal Pradesh — starred | https://hpvs.neva.gov.in/Member/Member_Question?MemberId={id}&AssemblyID=14 | official (NeVA) | ✅ **7,987 starred rows** in the per-member register; ❌ the session browser (`FetchDataListQuestionBySearch`) is **empty in all 180 combinations swept** |
| Himachal Pradesh — unstarred | https://hpvs.neva.gov.in/Questions/FetchUnListQuestions?AssId=14&SessId=12 | official (NeVA) | ✅ **both tiers** — 3,604 unstarred rows per-member **and** a session register with an explicit **`द्वारा पूछा गया`** (asked-by) column |
| Jammu and Kashmir — starred | https://jkla.neva.gov.in/Member/Member_Question?MemberId={id}&AssemblyID=1 | official (NeVA) | ⚠️ **21 rows total across 90 members** — 21 members have 1 Starred question each, all dated 03/02/26; session browser empty in 70 combos |
| Jammu and Kashmir — unstarred | https://jkla.neva.gov.in/Questions/FetchUnListQuestions?AssId=1&SessId=1 | official (NeVA) | ❌ **none** — 601 B "No Records Founds" for all 5 sessions; and 0 Unstarred rows in the per-member register |
| Ladakh — starred | **not applicable — no legislature** | — | no House exists in which questions could be asked; nothing is "unpublished" |
| Ladakh — unstarred | **not applicable — no legislature** | — | same |
| A&N Islands — starred | **not applicable — no legislature** | — | no House exists in which questions could be asked |
| A&N Islands — unstarred | **not applicable — no legislature** | — | same |
| Lakshadweep — starred | **not applicable — no legislature** | — | same |
| Lakshadweep — unstarred | **not applicable — no legislature** | — | same |
| Uttarakhand — starred | https://utkh.neva.gov.in/Member/Member_Question?MemberId={id}&AssemblyID=5 | official (NeVA) | ✅ **171 starred rows** per-member; plus the session register with a `द्वारा पूछा गया` column (SessDateId 427–430 → 21/15/20/19 rows) |
| Uttarakhand — unstarred | same endpoint | official (NeVA) | ✅ **463 unstarred rows** per-member — the majority type; ⚠️ but `FetchUnListQuestions` (session level) returns data for **session 8 only** (4 rows) |
| Nagaland — starred | https://nagaland.neva.gov.in/Member/Member_Question?MemberId={id}&AssemblyID=14 | official (NeVA) | ⚠️ **156 starred rows** across 18 of 60 members — **~10 rows are seeded test data** (`Test question 5`, `TESTING4`, `TESTDATA`) |
| Nagaland — unstarred | same endpoint | official (NeVA) | ✅ **30 unstarred rows on 5 members — CORRECTION: recon recorded zero**; the whole-house `FetchDataList` also works (66,249 B) but ignores `LstItem` |
| Chandigarh — starred | **not applicable — no legislature** | — | no House exists |
| Chandigarh — unstarred | **not applicable — no legislature** | — | same |
| Puducherry — starred | https://puddu.neva.gov.in/Member/Member_Question?MemberId={id}&AssemblyID=16 | official (NeVA) | ⚠️ **55 rows across 5 of 29 members — all Starred; text is TAMIL** |
| Puducherry — unstarred | — | — | ❌ **none** — 0 Unstarred rows in the per-member register |
| Delhi — starred | https://dla.neva.gov.in/Member/Member_Question?MemberId={id}&AssemblyID=8 | official (NeVA) | ✅ **60 starred rows** per-member — full sweep of 70 found **323 rows across 41 members** (recon never swept this endpoint) |
| Delhi — unstarred | same endpoint | official (NeVA) | ✅ **263 unstarred rows** — the majority type; assembly-site papers are **scanned** (`s<N>.pdf`/`us<N>.pdf`) |
| Chhattisgarh — starred | https://www.cgvidhansabha.gov.in/hindi_new/satra/sixth_assembly/Tenth/q17072026.pdf | official assembly | ✅ **भाग-1 तारांकित, born-digital text (374 pp, 243,903 chars) — NOT a scan**; **25 starred** on 17 Jul 2026; asker + constituency + Minister + full answer |
| Chhattisgarh — unstarred | same per-day file — **भाग-3** (page 50) plus **भाग-2** (page 15) | official assembly | ✅ **79 unstarred + 63 converted under Rule 46(2) = 142**; ⚠️ **counting भाग-1 alone undercounts by 44 %**; per-member counts for the 6th Assembly in `satra/sixth_assembly/6thAssemblyQtn.pdf` |
| Dadra and Nagar Haveli and Daman and Diu — starred | — | — | ❌ **not applicable — no House**, so no Question Hour; sweep of **97/105 UT pages**: `starred` / `unstarred question` 0, `vidhan` 0, `MLA` 0; NeVA lists **0** mentions of Dadra/Daman/Diu |
| Dadra and Nagar Haveli and Daman and Diu — unstarred | — | — | ❌ **not applicable — no House**; the same sweep and the same two independent site-search negatives (`?s=legislature`, `?s=vidhayak` → *no-results*) |
| _all others_ | — | — | pending review |

**Dadra and Nagar Haveli and Daman and Diu — not applicable: there is no House, so there is no Question Hour,
no starred list and no unstarred list. Recorded as two separate rows because the atlas requires the two
questions tiers to be answered separately, and both answers are the same structural one.**
- **Verified by sweep, not by assertion.** `ddd.gov.in`: **105 internal links collected, 97 pages fetched**,
  and a vocabulary scan of every fetched page returns **`legislature` 0 · `vidhan|vidhayak` 0 · `MLA` 0 ·
  `assembly` 2 · `attendance` 0 · `starred` / `unstarred question` 0 · `speaker` 0.**
  The **two `assembly` hits are both in one page** and both are read: the **Administrator's biography**,
  which records that he *"won the State Assembly elections from Himmatnagar constituency and served as Member
  of Legislative Assembly till 2012"* — **a Gujarat MLA, in a biography of the UT's Administrator.**
  That is the only legislature the UT's own website ever mentions about itself, and it is about another state.
- **Site search as a second, independent negative**: `?s=legislature` → *no-results*; `?s=vidhayak` →
  *no-results*; `?s=assembly` → 6 results, **all of them Gujarat Assembly dry-day notifications**.
- **NeVA does not list this UT**: `neva.gov.in/Home/NeVA` → 200, 192,420 B, with **`Dadra` 0, `Daman` 0,
  `Diu` 0** against **`Puducherry` 12 and `Nagaland` 7**, and also 0 for Chandigarh, Lakshadweep and Ladakh.
  **A UT with no legislature has nothing to onboard to a legislature platform.**
- **No assembly domain exists** — a DNS sweep (see the note on the resolver below) fails to resolve
  `dnhassembly.gov.in`, `damanassembly.gov.in`, `assembly.ddd.gov.in`, `vidhansabha.ddd.gov.in`,
  `ddadla.neva.gov.in`, `dhnla.neva.gov.in`, `ddla.neva.gov.in` and `neva.ddd.gov.in`.
- **What *would* generate such records does not exist**: no Assembly Secretariat, no Speaker, no Question
  Hour. **This is absence of the institution, not absence of a publication** — the same class as Chandigarh,
  Andaman & Nicobar Islands, Lakshadweep and Ladakh.

**Chhattisgarh — MAJOR CORRECTION: the sitting-day question PDFs are NOT scans. They are born-digital text
carrying every question AND its full answer, and the current Assembly's per-member question counts are
published too. Recon is wrong on both counts, and it also missed the link by grep, not by enumeration.**
- ✅ **The day PDFs extract cleanly.** `https://www.cgvidhansabha.gov.in/hindi_new/satra/sixth_assembly/Tenth/q17072026.pdf`
  → **200, 43,296,586 B, 374 pages, 243,903 extractable characters.** A raw-byte scan reports **`/BaseFont` 0
  and `/FontFile` 0 and therefore "image-only"** — but the fonts live inside **6 `/ObjStm` object streams**.
  **Recon's verdict ("0 font resources, 4,374 images, image-only, OCR required") is the object-stream trap,
  not a scan.** Decide by calling `extract_text()`, never by grepping the bytes.
- **One PDF per sitting day, internally split into THREE parts** — and the middle one is the trap for anyone
  counting "starred":
  **भाग-1 तारांकित प्रश्नोत्तर** (page 1) · **भाग-2 नियम 46(2) के अंतर्गत अतारांकित प्रश्नोत्तर के रूप में
  परिवर्तित तारांकित प्रश्नोत्तर** (page 15) · **भाग-3 अतारांकित प्रश्नोत्तर** (page 50).
  **Measured for 17 July 2026: 25 starred + 63 converted-under-Rule-46(2) + 79 unstarred = 167 Q&A entries**
  (166 asker mentions, 167 minister lines, 374 pages). **Read Part 1 alone and you undercount the day's
  unstarred business by 44 %.**
- **Each entry carries: question number, the asker's name and constituency, the subject, the answering
  Minister's name, and the complete answer text** — e.g. *"1. ( *क्र. 961 ) श्रीमती शेषराज हरवंश : …"* answered
  by *"खाद्य मंत्री ( श्री दयालदास बघेल )"*, with the minister answering in prose and tables. So the day
  booklets **are** per-MLA attributable — no OCR and no per-member endpoint needed.
- ⚠️ **The text layer is Unicode with a BROKEN conjunct mapping.** Plain consonants, vowels, **all digits,
  all ₹ figures and all dates come out exactly right**; conjuncts and half-forms become stray glyph codes:
  `Ůʲोȅर-सूची` = प्रश्नोत्तर-सूची, `छȅीसगढ़` = छत्तीसगढ़, `ŵीमती` = श्रीमती, `शु̋ ला` = शुक्ला.
  **Fine for full-text search and for numbers; unreliable for exact member-name matching.** (Distinct from
  the 2023 guidelines' *legacy* encoding and from the bill lists' third encoding — see Bills.)
- **Index:** `https://www.cgvidhansabha.gov.in/hindi_new/satra/question.htm` → **200, 88,959 B, 586 PDF links
  (579 unique)**, organised **per sitting day** across the sessions of six Assemblies, plus per-session
  **"पूर्ण उत्तर" (complete answers)** compilations going back to 2014. **Starred and unstarred share one
  per-day file** — there is no separate starred/unstarred index, which is why the two rows below point at the
  same source.
- ✅ **Per-member question COUNTS for the CURRENT 6th Assembly ARE published** —
  `https://www.cgvidhansabha.gov.in/hindi_new/satra/sixth_assembly/6thAssemblyQtn.pdf` (200, 85,711 B, 5 pp):
  one row per member × **8 session columns (Feb–Mar 2024 → July 2026) + a printed total**. **Recon's "no
  equivalent member-wise question document exists for the current Sixth Assembly" is wrong** — the file is
  linked from `main.htm`. Older equivalents: **4th Assembly** (`4th assembly mem wise qtn recvdNew.pdf`,
  2 pp, 37,166 B) and **5th Assembly** (`5thAssemblyQtn.pdf`, 3 pp, 193,725 B). **All three are legacy-font
  text: the numbers are exact, the names need a transcoder.**
- ⚠️ **Classification is per-year, and the site mixes eras in one index.** The same `question.htm` that serves
  the born-digital 2026 file also serves **`satra/third_assembly/1st/q_130209.pdf` = a genuine scan**
  (1,762,899 B, 20 pp, **0 extractable characters, 60 images, no `/ObjStm`**). **Probe a spread across years
  before recording any state-wide reading mode.**
- ⚠️ **The day files are large — 43 MB to 141 MB each** (2021 files measured at 109–141 MB). Budget for it:
  a full sixth-Assembly sweep is tens of gigabytes.
- ❌ **`vidhansabha.cg.nic.in` (e-Prashna) is login + CAPTCHA gated** — MLA login by constituency number
  (restricted to 1–90) plus a captcha; it publishes no public question data. Recon's finding stands.

**Delhi — MAJOR: the per-member question register IS populated and holds 323 questions, with UNSTARRED in the
majority. Recon records only the session-level search form and the scanned assembly papers; it never swept
the per-member endpoint.**
- ✅ **Swept all 70 member ids on `/Member/Member_Question?MemberId={id}&AssemblyID=8`:
  41 members have rows, 29 return the empty 1,360-byte page, TOTAL 323 rows.**
  Columns: **`क्रमांक | प्रश्न सं | प्रश्न प्रकार | दिनांक | मंत्री | विषय | दस्तावेज़`**
  (Sr No | Question No | Question Type | Date | Minister | Subject | Document).
- ✅ **Type split: `अतारांकित` (Unstarred) 263, `तारांकित` (Starred) 60.**
  **Unstarred is the clear majority** — as in Himachal (3,604/7,987 combined) and Puducherry's per-member
  register; the opposite of the assembly-site habit of publishing starred bundles first.
  Subject text is **Hindi**, Minister names Hindi, e.g. `1 | … | तारांकित | … | <मंत्री> | <विषय>`.
- ⚠️ **The 29 empty members return an identical 1,360-byte page — a per-member spot check has a ~41 % chance
  of a false negative.** This is the same trap recorded for Mizoram, Jharkhand, Himachal, Uttarakhand and
  Nagaland; Delhi is the sixth.
- **Session-level register works but does not distinguish categories.**
  `/Questions/FetchDataList?LstItem={0,1,3}&Type=0` → **byte-identical 64,786-byte responses**;
  `LstItem=2&Type={4,5}` → byte-identical 12,589-byte responses. **`LstItem` is ignored — the seventh state
  with this behaviour.**
- ⚠️ **Session ids come in two namespaces.** `/Questions/SessionList?AssemblyId=8` → **4 sessions**:
  **`SessionId` 55, 54, 52, 1 against `SessionCode` 6, 5, 4, 3.** The question routes want the **code**
  (and note the codes start at **3**, not 1 — there is no "1st/2nd Session" registered). **Take both values
  from the site's own JSON.**
- **The assembly site's own question tier is a SCANNED archive, and it is large.**
  `https://delhiassembly.delhi.gov.in/dlas/assembly-question` → **200, 70,891 B, an HTML table with 364 PDF
  links** (recon's 364 confirmed) — one per sitting, in the `s<N>.pdf` (starred) / `us<N>.pdf` (unstarred)
  family under `/sites/default/files/`. Those papers are **scanned images** with no text layer, so the
  machine-readable question text is the **NeVA HTML**, not the PDFs.
  ⚠️ **Two of the 364 hrefs are malformed in the site's own markup** —
  `chrome-extensihttps://delhiassembly…` and `chromhttps://delhiassembly…` — **strip stray prefixes before
  resolving, or those two documents are silently lost.**
  `/dlas/questions` is a **definitional/FAQ page with no data** (recon's finding holds).
- `/AssemblyDocs/DigitalLibrary` → **500 (1,208 B)**; `/Home/DigitalLibrary` → 200 (20,238 B).
  ⚠️ **Delhi's NeVA error page is 1,208 B**, like Puducherry's — **not the 3,531 B** seen on most tenants.

**Chandigarh — no question records, because there is no House.** See the **"Chandigarh — NOT A GAP"**
block under **Bills**.

**Puducherry — starred only, and the subject text is TAMIL.** Swept **all 29 members**: **5 have rows, 24 are
empty, 55 rows total, all `Starred` — zero `Unstarred`.** Example:
`1 | 2847 | Starred | 27/03/25 | N. RANGASAMY | நவீன வசதிகளுடன் கூடிய சமுதாய நலவழி மையம் அமைத்தல்`.
⚠️ **Minister names are Latin-script while subjects are Tamil** — do not assume a single locale. Full detail
in the Puducherry block under **Bills**.

**Nagaland — MAJOR CORRECTION: UNSTARRED QUESTIONS EXIST. Recon records *"Unstarred questions: NOT observed…
Zero rows classified 'Unstarred' were found for any member queried"* and calls the classification field the
evidence. Swept across all 60 members, **30 Unstarred rows** appear — and the register as a whole is
**contaminated with seeded test data** that inflates every count.**
- ✅ **Swept all 60 member ids on `/Member/Member_Question?MemberId={id}&AssemblyID=14`:
  18 members have rows, 42 return the empty 1,311-byte page, TOTAL 186 rows.**
  Columns: **`Sr No | Question Number | Question Type | Date | Minister | Subject | Document`**.
- ❌ **CORRECTION — `Unstarred` IS present: 30 rows, on 5 members** — id 46 → **25**, 116 → 2, 134 → 1,
  119 → 1, 31 → 1. Verbatim examples:
  `2 | 2 | Unstarred | 09/03/26 | P. Bashangmongba Chang | CONSTRUCTION OF P.W.D GUEST HOUSE AT TSEMINY`;
  `3 | 3 | Unstarred | 09/03/26 | Temjen Imna Along | NEW COLLEGES UNDER PM-USHA SCHEME.`;
  `2 | 6 | Unstarred | 12/09/23 | N. Jacob Zhimomi | STATUS OF ZARŰ WATER PROJECT AT MIMA VILLAGE`;
  `6 | 7 | Unstarred | 29/08/24 | Metsubo Jamir | STATUS OF MGNREGA IN NAGALAND`.
  **Type split: Starred 156, Unstarred 30.** A 60-member sweep is what surfaced them; a handful of members
  is not enough — the same failure the registry already records for Mizoram, Jharkhand, Himachal and Uttarakhand.
- ⚠️⚠️ **The register contains SEEDED TEST ROWS — roughly 10 of the 186 — and they are spread across 7 members.**
  Verbatim: **`Test question 5`** and **`Test Question III`** (both member **30**, Dr. Neiphiu Rio — **the Chief
  Minister's own tab holds two placeholder rows and nothing else**), **`TESTING4`** and **`cvxcvxcvxcv`**
  (member 46), **`Water Quality - Test Ques`**, **`Water Quality - Offline Test Ques`**, **`TEST DATA(09.12.2021)`**
  (member 8), **`Finace testing`** (member 23 — the typo is in the data), **`TESTSUBJECT`**, **`TESTING`**
  (member 26) — all dated 2021–2022.
  **Consequence: `186 questions` is a raw row count. Filter test rows before reporting any Nagaland question
  statistic, and do not report a per-member leaderboard — id 46's apparent "87 rows" opens with two junk rows.**
- ⚠️ **The whole-house questions endpoint now WORKS — a second correction.** Recon: `/Questions/FetchDataList`
  *"answered HTTP 500 on GET and a 0-byte HTTP 200 on POST"*. Live, with a seeded session and a
  `Referer: https://nagaland.neva.gov.in/Questions`: **`?LstItem=0&Type=0` → 200, 66,249 B.**
  ⚠️ **`LstItem` is ignored** — `LstItem` 0 (starred), 1 (unstarred) and 3 (short notice) all return
  **byte-identical 66,249-byte responses**; `LstItem=2&Type={4,5}` return byte-identical 13,310-byte responses;
  only `LstItem=4` (inter-session) differs, at 18,405 B. **The sixth state with this behaviour.**
- ❌ **`/Committee/DataList` → 500 (3,531 B) and `/Debates/FetchDataList` → 500 (3,531 B)** — these two remain
  broken as recon recorded; only Questions has come back.
- `/Member/Member_Notice` → 200 but empty ("No Records Founds"); `/Member/Member_Committee` → 4 rows
  (recon's finding holds — the only working tabs are General, Questions and Committee).
- `/AssemblyDocs/DigitalLibrary` → **500 (3,531 B)**; `/Home/DigitalLibrary` → 200 (19,678 B).

**Uttarakhand — MAJOR CORRECTION. Recon records that *"the per-member (MemberID) filter returned zero rows
for every member code I tested"* and concludes per-member aggregation "did not yield data in testing".
Swept across all 70 members, the per-member register holds **641 questions** — which is exactly the
`641 questions` counter the recon itself read off the dashboard. The dataset was there; the sample missed it.**
- ✅ **`/Member/Member_Question?MemberId={id}&AssemblyID=5`** renders
  **`क्रमांक | प्रश्न सं | प्रश्न प्रकार | दिनांक | मंत्री | विषय | दस्तावेज़`**, e.g.
  `1 | 56 | अतारांकित | 10/03/26 | श्री सतपाल महाराज | …`.
- **Swept all 70 member ids: 39 members have rows, 31 return the empty 1,360-byte page — 641 rows total.**
  Heaviest: id 137 → **118**, 113 → 81, 118 → 54, 124 → 38, 135 → 33.
  ⚠️ **Recon's zero-row result likely came from ids taken out of the *advanced-search* dropdown
  (it cites "श्री आदेश चौहान (26)", "श्रीमती अनुपमा रावत (128)") rather than the roster ids** — member 28 is
  श्री आदेश चौहान here, and **26/128 are not the roster ids at all**. **Another instance of the
  id-namespace trap; use `/ContactDirectory/FetchMembersList` ids for member routes.**
- ✅ **Question types: `अतारांकित` (Unstarred) 463, `तारांकित` (Starred) 171, `अल्प अवधि सूचना` (Short Notice) 7.**
  ⚠️ **Unstarred is the MAJORITY here — the reverse of Jharkhand (0 unstarred) and closer to Himachal.**
- **Answering Ministers**: श्री सतपाल महाराज **173**, श्री सुबोध उनियाल **136**, डा0 धन सिंह रावत **118**,
  श्रीमती रेखा आर्या **81**, श्री गणेश जोशी **80**.
- ✅ **The session-level register also works and IS per-MLA attributable.**
  `/Questions/FetchDataListQuestionBySearch?AssId=5&SessId=11&SessDateId={427,428,429,430}` →
  **21 / 15 / 20 / 19 rows** with columns
  **`क्रमांक | प्रश्न सं | विषय | प्रश्न | विभाग | मंत्रालय | द्वारा पूछा गया | जवाब | उत्तर क्षेत्रीय`** —
  the **`द्वारा पूछा गया`** column carries **name + constituency** (`श्री बृजभूषण गैरोला (डोईवाला )`,
  `श्री उमेश कुमार पत्रकार (खानपुर )`) alongside the **full question text** and the department/ministry.
  ⚠️ Recon recorded **8 rows** for this query (13 March 2026 / `SessDateId=430`); it now returns **19** —
  live data grows, so record the query and the date, not a frozen count.
- ⚠️ **`/Questions/FetchUnListQuestions` is nearly empty** — of `SessId` (SessionCode) 1–12, **only session 8
  returns anything: 7,048 B, 4 rows.** Every other session is a bare "कोई रिकॉर्ड नहीं मिला" (~641 B).
  So the *unstarred session browser* is sparse even though unstarred is 463 of the 641 per-member rows —
  **the two tiers disagree, and both must be recorded.**
- ⚠️ **The signed question PDFs are pure scans** — `cms.neva.gov.in/NeVA/UK/FileStructures//PaperLaid/5/11/Signed/5_11_S_654_V1_signed.pdf`
  → 200, 61,229 B, **1 page, 0 fonts, 0 extractable characters**, a single **620×876 `/DCTDecode`** JPEG.
  **The machine-readable question text is the HTML table, never the PDF.**
- `/AssemblyDocs/DigitalLibrary` → **500 (3,727 B)**; `/Home/DigitalLibrary` → 200 (20,284 B).

**Andaman & Nicobar Islands and Lakshadweep — no question records, because neither UT has a House.** See
the **"NOT GAPS"** block under **Bills**. Starred, unstarred, short-notice and private-members' business all
require a Legislative Assembly; the ECI's assembly-election API places **neither** UT in any year, and NeVA
lists **neither** instance. Nothing here is "unpublished" — the institution does not exist.

**Ladakh — no question records, because there is no House.** See the **"Ladakh — NOT A GAP"** block
under **Bills**. Starred, unstarred, short-notice and private-members' business all require a Legislative
Assembly; the MHA states Ladakh is *"a Union Territory without Legislature"* and the ECI's assembly-election API
places Ladakh in **no year**. Nothing here is "unpublished" — the institution that would generate the data does
not exist.


**Jammu and Kashmir — CORRECTION of emphasis. The recon is RIGHT that a per-member question endpoint
works, but the single sample it took (member 68 → 1 row) makes the register look far richer than it is:
swept across all 90 members it holds exactly 21 questions — one per member, on one sitting day.**
- ✅ **`/Member/Member_Question?MemberId={id}&AssemblyID=1`** renders
  **`Sr No | Question Number | Question Type | Date | Minister | Subject | Document`** — and the recon's
  byte count reproduces exactly (**2,461 B** for member 68). Rows are in **English**, e.g.
  `1 | 21 | Starred | 03/02/26 | Satish Sharma | AQ No. 21 Regarding: Play fields`.
- ⚠️ **The sweep changes the conclusion.** Called for **all 90 member ids**:
  **21 members have rows, 69 return the empty 1,311-byte page — and the TOTAL is 21 rows.**
  **Every row is `Starred`, every row is dated `03/02/26`, and no member has more than one.**
  So this register is **one sitting day's starred questions**, not a body of work —
  **"per-MLA questions exist" is true but should never be recorded without the count.** Compare HP
  (11,592 rows), Mizoram (4,052) and Jharkhand (632).
- ❌ **The session-level browser is empty on both sides:**
  - **Starred** — `/Questions/FetchDataListQuestionBySearch?AssId=1&SessId={1,2,3,4,100}&SessDateId={0,1,2,3,4,5,6,7,8,9,10,20,50,100}`
    → **no data in any of the 70 combinations.**
  - **Unstarred** — `/Questions/FetchUnListQuestions?AssId=1&SessId={1,2,3,4,100}` → **601 B,
    "No Records Founds", all five sessions.** (Compare HP, where unstarred *is* populated at session level
    with a `द्वारा पूछा गया` asked-by column — **do not assume the shared NeVA template behaves the same
    across states.**)
  - ⚠️ `AssId` here is the **assembly** id (`1`), and `/Bill/GetAllAssembliesList` confirms only one exists.
- ⚠️ **`LstItem` is ignored — the fifth state with this behaviour.** `/Questions/FetchDataList?LstItem=0`
  (starred), `1` (unstarred) and `3` (short notice) return **byte-identical 62,537-byte responses**;
  `LstItem=2&Type={4,5,18,19}` return **byte-identical 12,518-byte responses**. The category is chosen
  client-side and the server answers the same shell.
- ⚠️ **The per-member `Notice` / `Committee` / `Assurances` / `Debates` tabs are empty or nonexistent:**
  `/Member/Member_Notice` → 200/1,109 B "No Records Founds"; `/Member/Member_Committee` → 200/625 B
  "No Records Founds"; **`/Member/Member_Assurance` and `/Member/Member_Debate` → 404 (1,245 B)** — the tabs
  render but the endpoints were never implemented. Recon covered the first two; **the 404s are new and mean
  there is no route to probe for assurances or debates at all.**
- `/AssemblyDocs/DigitalLibrary` → **500 (3,531 B)**; `/Home/DigitalLibrary` → 200 (19,476 B).
  Session documents do exist as real PDFs on the shared CMS
  (`cms.neva.gov.in/NeVA/JK/FileStructures//Notices/<guid>.pdf`) — recon's finding holds.

**Himachal Pradesh — MAJOR CORRECTION. The recon's verdict ("no per-member attendance / questions / bills
data is published publicly") is wrong for questions: HP has the LARGEST per-member question register found
in this exercise — 11,592 rows — and it is the first state where the per-member register carries BOTH
starred and unstarred.**
- ✅ **`/Member/Member_Question?MemberId={id}&AssemblyID=14`** renders
  **`क्रमांक | प्रश्न सं | प्रश्न प्रकार | दिनांक | मंत्री | विषय | दस्तावेज़`**
  (**Sr No | Question No | Question Type | Date | Minister | Subject | Document**), e.g.
  `1 | 4571 | तारांकित | 31/08/26 | डॉ0 (कर्नल) धनी राम शांडिल | एस0सी0डी0पी0 योजना`.
- **Swept all 68 roster member ids → 11,592 question rows.**
  **65 of 68 members have data; only 3 return the empty 1,360-byte page.**
  Heaviest: id 77 → **521**, 69 → 502, 88 → 479, 30 → 471, 486 → 463.
- ✅ **Question-type census: `तारांकित` (Starred) = 7,987, `अतारांकित` (Unstarred) = 3,604,
  `अल्प अवधि सूचना` (Short Notice) = 1.** This is the **only** state so far whose per-member register
  contains **unstarred** rows — compare Jharkhand (470 starred + 162 short notice, **0 unstarred**) and
  Mizoram (both types, 4,052 rows).
- **Answering Ministers (per-question `मंत्री` + `विषय`)**: **श्री सुखविन्द्र सिंह सुक्खू (CM) 1,625**,
  श्री जय राम ठाकुर (LoP) 1,321, श्री विक्रमादित्य सिंह 955, मुकेश अग्निहोत्री 854,
  डॉ0 (कर्नल) धनी राम शांडिल 681, श्री रोहित ठाकुर 626.
- ⚠️ **RECORD THE TWO TIERS SEPARATELY — they disagree, and in the opposite direction to Jharkhand:**
  - **STARRED, session browser: EMPTY.** `/Questions/FetchDataListQuestionBySearch?AssId=14&SessId={1..12}&SessDateId={0,1,2,3,100,500,1000,1500,2000,2200,2230,2235,2238,2240,2241}`
    → **"कोई रिकॉर्ड नहीं मिला" in every one of 180 combinations**, and Assembly 13 sessions 1–12 likewise.
    **So HP starred questions exist ONLY as the per-member register.**
  - **UNSTARRED, session browser: POPULATED.** `/Questions/FetchUnListQuestions?AssId={A}&SessId={S}`
    → real tables with columns
    **`क्रमांक | विषय | प्रश्न | विभाग | मंत्रालय | द्वारा पूछा गया | जवाब | उत्तर क्षेत्रीय`**, where
    **`द्वारा पूछा गया` carries name + constituency** — `श्री सुख राम चौधरी (पांवटा साहिब)`,
    `डॉ0 जनक राज (भरमौर)`, `श्री राकेश जम्वाल (सुन्दरनगर)` — plus the full question text, the department
    and the answering **portfolio** (`उप-मुख्य मंत्री`, `स्वास्थ्य एवं परिवार कल्याण मंत्री`, `कृषि मंत्री`).
    Swept Assemblies 1–14 × sessions 1–12:
    **Assembly 14 → sessions 2,3,4,5,6,7,8,9,10,11,12 (116, 27, 12, 55, 37, 9, 53, 51, 20, 23, 49 = 452 rows);
    Assembly 13 → sessions 2,3,4,5,6,7,9,10,11,12 (16, 21, 6, 31, 27, 16, 61, 27, 83, 68 = 356 rows);
    Assembly 12 → sessions 6,7,8,9,10,11,12 (40, 26, 22, 22, 6, 68, 8 = 192 rows).**
    **≈1,000 unstarred rows across three Assemblies**; Assemblies 1–11 return nothing, so the register's
    floor is the **12th Assembly** — describe the gap, do not call it "absent".
  - ⚠️ The session ids are the page's own (`assemblyLst` 1–14; `sessionLst` 1–12; `sessionDateLst`
    **2241 = 03 सितम्बर 2026** … 11 values). **`AssId=14&SessId=0` is empty while `SessId=12` returns
    101,059 B** — a zero session id is a valid, silent "no data" state, not an error.
- ⚠️ **`LstItem` is ignored — the fourth state with this exact behaviour.** `/Questions/FetchDataList?LstItem=0`
  (starred), `1` (unstarred) and `3` (short notice) all return **byte-identical 81,875-byte responses**;
  `LstItem=2&Type={4,5}` return **byte-identical 14,650-byte responses**.
- `/AssemblyDocs/DigitalLibrary` → **500 (3,727 B)**; `/Home/DigitalLibrary` → 200 (20,339 B).

**Jharkhand — MAJOR CORRECTION. The recon says "The public web publishes **no per-member assembly record**
for Jharkhand". There is one, it is populated, and it holds 632 questions — but the recon's *route* to it
was blocked by the redirect trap, and starred/unstarred must be recorded separately.**
- ⚠️ **THE REDIRECT TRAP — the recon's central Jharkhand finding is an artifact, and this recurs.**
  Recon: *"The member directory route `/ContactDirectory/MenuContactDirec` and the `/Questions`, `/Bill`,
  `/Business`, `/Today`, `/Debates` and `/Committee` routes all redirect to the **national** portal at
  `https://neva.gov.in/Home/NeVA` (all return an identical 192,345 bytes), i.e. the Jharkhand instance's deep
  modules are not populated or reachable."*
  **Cold, they do 302 — but to `/Home/Neva` on the *jhla* host, with a 127-byte body, not to the national
  portal and not with 192,345 bytes.** And **with a session cookie jar plus `Referer: https://jhla.neva.gov.in/`
  every one of them returns 200 with the correct Jharkhand page**:
  | Route | cold | warm |
  |---|---|---|
  | `/ContactDirectory/MenuContactDirec` | 302→`/Home/Neva` (127 B) | **200, 65,438 B** — *"Reach out to us - Members Contact Directory \| Jharkhand Vidh…"* |
  | `/Questions` | 302 | **200, 20,074 B** — *"Jharkhand Vidhan Sabha Parliamentary Questions and Discussions"* |
  | `/Bill` | 302 | **200, 36,426 B** — *"Legislative Bills and Processes – Jharkhand Vidhan Sabha As…"* |
  | `/Business` | 302 | **200, 20,865 B** |
  | `/Today` | 302 | **200, 20,053 B** |
  | `/Debates` | 302 | **200, 18,167 B** |
  | `/Committee` | 302 | **200, 19,858 B** |
  ⚠️ **The fix is stateful and the cookie is `HttpOnly`** — `curl` writes it as a `#HttpOnly_`-prefixed line,
  so a naive `grep -v '^#'` on the jar **shows an empty jar and hides the session**. Two of my own runs
  302'd purely because the jar had been clobbered by a parallel `-c` write. **Warm up with `GET /` once, carry
  one jar sequentially, and verify the jar actually contains `ASP.NET_SessionId` before concluding a route
  is dead.**
- ✅ **THE PER-MEMBER QUESTION REGISTER IS POPULATED — 632 rows.** `GET /Member/Member_Question?MemberId={id}&AssemblyID=6`
  renders `क्रमांक | प्रश्न सं | प्रश्न प्रकार | दिनांक | मंत्री | विषय | दस्तावेज़`
  (**Sr No | Question No | Question Type | Date | Minister | Subject | Document**), e.g.
  `1 | 345 | तारांकित | 27/02/26 | दीपक बिरुआ | दोषियों पर कार्रवाई करना।` The `दस्तावेज़` (Document) column is empty.
  - **Swept all 81 member ids** (`MemberList` `<select>` gives the ids: 81 options, values 3→184):
    **34 members have rows, 47 return the identical empty 1,360-byte page.**
    ⚠️ **A one-member spot check has a 58 % chance of a false negative** — the Mizoram pattern again.
  - **Totals: 632 question rows.** Heaviest members: 156 → 38, 166 → 35, 164 → 33, 78 → 32, 84 → 32, 76 → 31.
  - **`प्रश्न प्रकार` (Question Type) census: `तारांकित` (Starred) = 470, `अल्प अवधि सूचना` (Short Notice) = 162.**
    ⚠️ **`अतारांकित` (Unstarred) = 0.** There is no unstarred column value anywhere in the register.
  - **Date range 19/02/26 → 11/08/26** (the Sixth Assembly's recent sessions).
  - **Answering Ministers**: हेमन्त सोरेन **264**, श्री सुदिव्य कुमार **81**, इरफान अंसारी **63**,
    शिल्पी नेहा तिर्की **40**, हफीजुल हसन **39**. (Per-question **Minister + Subject** is the useful payload.)
- ⚠️ **UNSTARRED IS ABSENT — and this is now a driven negative on three independent routes:**
  1. **Per-member register**: 0 `अतारांकित` rows across all 81 members (632 rows inspected).
  2. **NeVA session browser**: `/Questions/FetchUnListQuestions?AssId={1..6}&SessId={1..6,100}` →
     **"कोई रिकॉर्ड नहीं मिला"** in **every** one of the 42 combinations.
  3. **The assembly site**: its own question route points at **`http://172.16.20.14/questions/Default.asp`,
     an RFC1918 private address on the Secretariat intranet** — unreachable from the public internet by
     construction. The same private host serves `172.16.20.14/oasys/Home.aspx`, labelled *"OASYS (FOR
     Jharnet User)"*, with a *"QMS (For Jharnet User)"* beside it. **This is the recon's strongest and most
     durable finding: Jharkhand's pre-NeVA legislative systems are on a private network.**
- **STARRED on the session browser is also empty** — `/Questions/FetchDataListQuestionBySearch?AssId=6&SessId={1..6,100}&SessDateId={0..20,170..176}`
  → "कोई रिकॉर्ड नहीं मिला" in every combination. **So starred questions exist only as the per-member
  register**, not as a browsable session list. Record the two tiers separately: *per-member ✅ (470 rows)*,
  *session-level ❌*.
- ⚠️ **`LstItem` is ignored — the Mizoram/West Bengal behaviour repeating.** `/Questions/FetchDataList?LstItem=0` (starred),
  `1` (unstarred) and `3` (short notice) return **byte-identical 68,417-byte responses**;
  `LstItem=2&Type={4,5,18,19}` return **byte-identical 13,960-byte responses**. Real ids, taken from the
  page's own `<select>`s: `assemblyLst` **1–6**; `sessionLst` **100 = "Demonstration Session"**, 6 = षष्ठम्
  (मानसून) सत्र, 5 = पंचम (बजट) सत्र, 4, 3, 2, 1; `sessionDateLst` **176 = 30 सितंबर 2026** … 170 = 18 सितंबर 2026.
- ⚠️ **`/Questions/FetchDataList` needs `Referer: https://jhla.neva.gov.in/**Questions**`** — the bare
  `/` referer that works for the deep *pages* is **not** enough for this AJAX route (it 302s). Fetch the
  parent page first, then use it as the referer.
- `/AssemblyDocs/DigitalLibrary` → **HTTP 500 (3,727 B)**; `/Home/DigitalLibrary` → 200 (20,291 B).

**West Bengal — both question registers are empty, and this time the negative is *driven on both levels*
(the session browser **and** all 292 members).**
- **The module is fully wired and fully empty.** `/Questions?IsStateDashBoard=True` (200, 20,237 B) advertises
  the shared NeVA taxonomy — **তারকাচিহ্নিত প্রশ্নাবলী** (Starred) / **তারকাবিহীন প্রশ্ন** (Unstarred) /
  **সংক্ষিপ্ত বিজ্ঞপ্তি প্রশ্ন** (Short Notice) / Inter-Session, plus List> and Reply> variants, driven by
  `FetchDataList(LstItem, Type)`.
  ⚠️ **`LstItem` is ignored — the Mizoram behaviour repeating exactly.** `LstItem=0` (starred),
  `1` (unstarred) and `3` (short notice) return **byte-identical 83,779-byte responses**;
  `LstItem=2&Type=4/5/18/19/24/25` return **byte-identical 13,051-byte responses**. The category is chosen
  client-side; the server answers the same shell for all of them.
- **Real ids taken from the page's own `<select>`s** (never guessed): `assemblyLst` **17 | 18**;
  `sessionLst` → **`100` = "First Session"** (the 18th Assembly has exactly **one** session);
  `sessionDateLst` → **18 = 12/Aug/2026**, 17 = 25/Jul/2026, 16 = 24/Jul/2026 … 11 = 17/Jul/2026.
- ❌ **STARRED** (`/Questions/FetchDataListQuestionBySearch?AssId={18,17}&SessId=100&SessDateId={0..20}`)
  → **"কোনও রেকর্ড পাওয়া যায়নি" (591 B) in EVERY combination** — no data line from the whole sweep.
- ❌ **UNSTARRED** (`/Questions/FetchUnListQuestions?AssId=18&SessId={100,1..10}`) → **587 B, "No Records
  Found" every time**; `AssId=17` likewise. And the 17th Assembly's `/Questions/SessionList` returns
  **0 bytes** — it has **no sessions registered in NeVA at all**.
- ❌ **PER-MEMBER SWEEP — the Mizoram lesson applied.** `/Member/Member_Question?MemberId={id}&AssemblyID=18`
  called for **all 292 member ids**: **292/292 returned the identical 1,372-byte page with 0 `<tr>` rows.**
  Unlike Mizoram — where 26 of 40 members held 4,052 rows — here the emptiness is **total**, so "no
  questions" is a *measured* finding, not a spot check.
- ❌ `/Questions/FetchDataListQuestionAdvBySearch` (the MemberID-filtered advanced route) → **HTTP 500
  (3,531 B)**, the shared NeVA error page.
- `/AssemblyDocs/DigitalLibrary` → **HTTP 500 (3,531 B)**; `/Home/DigitalLibrary` → 200 (20,430 B).
- **No legacy fallback exists.** The bespoke site's `btn_question` / `btn_Hquestion` / `btn_HquestionList`
  controls (Question, Question Search, and a home-page Question list) are visible in the archived route
  table, and `OtherPDF/` holds no question files — but the host is off-network, so **the pre-NeVA question
  record is unreachable, not merely unlooked-for**.

**Mizoram — CORRECTION. Starred and unstarred live on *different platforms*, and one of them is
per-MLA. `SOURCES.md` says the assembly register is "questions only as session bundles, not per member"
and that NeVA "exposes PER-MLA Starred and Unstarred question lists". Both are wrong in opposite directions.**
- **(a) Assembly site `/question` — STARRED ONLY, session bundles, asker inside the PDF.**
  The index is an HTML table `# | Date | Period | Assembly | Session | Remarks | Action` with
  **no member column and no member filter**. **Walked all 23 pages → 331 rows** (15/page; page 23 has 1,
  page 24 is empty — the pager terminates cleanly here, unlike ASP.NET `btnNext` sites).
  - ⚠️ **Only 156 of the 331 rows have a document.** Every row dated **18-03-2010 → 04-03-2020**
    (175 rows) has an **empty Action cell**; the PDFs run **01-09-2020 → 27-08-2026**. So the *list* goes
    back to the 6th Assembly and the *documents* only to September 2020. Record the shape, not "absent".
  - ⚠️ **Starred and unstarred are NOT the two rows you see per sitting day.** Two bundles share a date
    (one Remark "With Answers"/"With answer", one blank) and **all sampled bundles are titled
    "*Starred* Question"** — 33 bundles sampled across 2020→2026, **32 extract as text, 1
    (`…/questions/February2023/7dK9u8Ys1kv74vPlmf4p.pdf`, 17-02-2023, 23 pages) is a scan with 0 chars**.
    The row pairing is *"with answers" vs "without answers"*, **not** starred vs unstarred.
  - ⚠️ **There is no unstarred publication on the assembly site.** The only "Unstarred" strings are
    **conversion notes inside the starred bundle** — e.g. `*22 Converted to Unstarred Question.` So
    "unstarred = missing" would be the wrong conclusion; it is *published elsewhere* (below).
  - **The asker IS named, per question, in the PDF body** — this is the per-MLA attribution the index lacks:
    `MIZORAM LEGISLATIVE ASSEMBLY :: :: :: Starred Question for Seventh Session : August, 2026. For answer
    on Thursday, the 27th August, 2026. HOME DEPARTMENT — Human Rights Commission chungchang. **Pu C.
    NGUNLIANCHUNGA to ask** – *21 Will the Hon'ble Minister for Home Department be pleased to state …
    **Pu K. SAPDANGA, Minister, Home Department to reply***. 19–20 questions per bundle, with the
    **answering Minister named too**. Language is **Mizo + English mixed**, plain extractable text.
- **(b) Assembly site `/government-bill`, `/private-bill`** — see the Bills section.
- **(c) NeVA `mizo.neva.gov.in` — the question module is fine, but the *categories do not agree*:**
  `/Questions` (200, 19,175 B) advertises Starred / UnStarred / Short Notice / Inter Session plus
  List>Starred/Unstarred/Short Notice and Reply>Starred/UnStarred/Short Notice, driven by
  `FetchDataList(LstItem, Type)`.
  ⚠️ **`LstItem` is ignored.** `LstItem=0` (starred), `1` (unstarred) and `3` (short notice) return
  **byte-identical 60,227-byte responses**; `LstItem=2&Type=4/5/18/19` return **byte-identical 12,527-byte
  responses**. The category is chosen client-side but the server returns the same shell for all of them.
  - ⚠️ **NeVA STARRED IS EMPTY, and this is the sharpest contradiction with the recon.** Driving the real
    endpoint the page's own JS calls with MZ's own ids →
    `/Questions/FetchDataListQuestionBySearch?AssId={9,8}&SessId={1..7}&SessDateId={123,122,0}` →
    **"No Records Founds" (601 B / 609 B) in all 42 combinations.**
  - ✅ **NeVA UNSTARRED IS POPULATED and is per-MLA.** `/Questions/FetchUnListQuestions?AssId=9&SessId=7`
    → **200, 15,684 B, a real table** with columns
    **`Sr No | Subject | Questions | Department(s) | Ministry | Asked By | Reply | Reply Regional`**,
    where **`Asked By` carries name + constituency** — *"Pu Lalrinsanga Ralte (Serlui)"*,
    *"Pu K. Laldawngliana (Tuirial)"*, *"Pu H. Lalzirliana (Mamit)"* — plus the **full question text**,
    the department, and **empty Reply columns**. Swept both Assemblies × sessions 1–16:
    **9th Asm → sessions 3, 4, 6, 7 (4, 3, 22, 17 rows); 8th Asm → sessions 10, 12, 13
    (9, 11, 216 rows — 222,692 B)**; every other session is "No Records Founds".
    ⚠️ The `SessId` here is **NeVA's own session code** (7 = "Seventh Session", confirmed by
    `/Questions/SessionList?AssemblyId=9`), and `/Questions/SessionDates` returns *date strings*, not ids.
  - ✅ **THE BEST PER-MLA QUESTION SOURCE — NeVA `/Member/Member_Question`.** This is the finding that
    matters most: `https://mizo.neva.gov.in/Member/Member_Question?MemberId={NeVA id}&AssemblyID=9`
    renders a per-member register with columns
    **`Sr No | Question Number | Question Type | Date | Minister | Subject | Document`**, where
    **`Question Type` = Starred *or* Unstarred** — i.e. **both types, per MLA, from one call**, with the
    answering **Minister** and the **Subject**.
  - ⚠️⚠️ **A ONE-MEMBER SPOT CHECK WOULD HAVE PRODUCED A FALSE NEGATIVE.** Members **75 (Lalduhoma, the
    CM!)** and **63** both return the **1,311-byte "No Records Founds"** page — while **88 → 300,867 B /
    344 rows**, **86 → 401,572 B / 457 rows**, **50 → 348,428 B / 401 rows**, **53 → 300,394 B / 349 rows**.
    **Swept all 40 NeVA ids: 26 have data, 14 do not; 4,052 question rows total.** Per-member emptiness is
    *member-specific*, not an endpoint failure. **This is the failure mode the skill warns about, and in
    Mizoram it hides the Chief Minister's own register behind a "No Records" page.**
  - `/Member/Member_Question` also exposes `/Member/Member_QuestionDetail?QuestionID={id}` for the full text.
- ⚠️ **`/Member_Question` and `/Member/Member_Question` are different routes** — `/Member/Member_Question`
  (with the `Member/` prefix) is the one that works; the assembly-site id must **not** be substituted for
  the NeVA id.
- **NeVA `/Questions` needs the usual warm-up + `Referer`**: a cold call returns the national shell; a
  `GET /` first plants `ASP.NET_SessionId`, after which the fragments return normally. No POST, no token,
  no captcha.
- **`/AssemblyDocs/DigitalLibrary` → HTTP 500 (3,531 B)** — the same shared NeVA error page size seen at
  Sikkim and Meghalaya.

 `legislation.aplegislature.org` returns a
**12,014-byte login page** (title-less, "Member Services"/"Questions" module names visible in the nav). All
five probed endpoints — `/Questions.do`, `/QuestionList.do`, `/MemberList.do`, `/login.do`, `/Home.do` —
returned the **identical 12,014 bytes** (5/5 md5-equal), so there is no public question list. The data exists
behind a `username/password/Captcha` gate. Recorded as **absent publicly**, not missing.

**Arunachal Pradesh — per-member, both types, but STALE (2020).** `Member/Member_Question?MemberId={id}&AssemblyID={7|8}`
returns an HTML table `Sr No | Question Number | Question Type | Date | Minister | Subject | Document`.
Verified member 53 → **7 rows: 2 Starred + 5 Unstarred**, all dated **27/08/2020**, with 5 PDF links on
`cms.neva.gov.in/NeVA/AR/FileStructures///PaperLaid/…` (subjects: "33 KV LT LINE FROM DEOMALI",
"DE-ADDICTION CENTER", "TOTAL GOVERNMENT EMPLOYEES…"). Member 9 (CM) → "No Records Founds" (ministers don't
ask questions). ⚠️ **`AssemblyID=8` returns the exact same 2020 rows as `AssemblyID=7`** (both 7,300 bytes),
so the current 8th Assembly (2024–) has **no question records** — the latest published is the 7th Assembly's
Fifth Session, Aug 2020. Both types share one table; the type is a column, not a separate list.

**Assam — per-sitting-day PDFs, starred and unstarred as separate collections, Assamese scans.**
- NeVA `asla.neva.gov.in/Questions` now **redirects to the NeVA home dashboard** (title "National e-Vidhan
  Application - Digital Legislators", 192 KB, zero "Starred"/"Unstarred") — the redirect trap; the list is
  JS-fetched and not curl-queryable.
- The usable source is the **ALA Digital Library (DSpace 6.3)**, community *"06. Questions & Answers"*
  (`aladigitallibrary.in/handle/123456789/3219`) → `2025` / `2026` → sessions → **four separate collections**:
  `01. Starred Question` (4109) · `02. Unstarred Question` (4110) · `03. Starred Questions with Replies`
  (4390) · `04. Unstarred Questions With Replies` (4151). Items are one PDF per sitting day, titled
  *"Starred Question Budget Session 2026 06th July 2026 Monday Q 1 to 20"*, `Q 21 to 40`, `Q 41 to 60`…
  → **indexed by date + Q-range, not by member**.
- **Read (step 10):** downloaded `…/bitstream/123456789/4113/1/Starred Question…06th July 2026…pdf`
  (200, **2,768,330 bytes, 8 pages**) — **0 `/BaseFont`, 8 image XObjects → a pure scan, no text layer**.
  OCR of page 1 with `eng` is garbage because the text is **Assamese (Bengali script)** — needs a
  **Bengali/Assamese model (`tesseract -l ben`)**, which is not vendored here (only `eng` + `hin`).

**Madhya Pradesh — per-sitting PDFs; the `star`/`ques` split is INDEX vs full-book, not starred vs unstarred.**
- Hub `house%20proceedings/hp.htm` (31,399 B) publishes, per sitting day, `starDDMMYY.pdf`,
  `quesDDMMYY.pdf`, `spDDMMYY.pdf` (corrigenda) and `hpDDMMYY.pdf` (proceedings).
- **CORRECTION to `SOURCES.md`:** it maps `star` → starred and `ques` → unstarred. That is imprecise.
  `star220726.pdf` is the **"तारांकित प्रश्नोत्तर की अनुक्रमणिका"** — a 1-page *INDEX* (S.No | Member Name |
  Question Number | Department), not the questions. `ques220726.pdf` is the **combined "प्रश्नोत्तर-सूची"**,
  **293 pages, 818 KB text** — **भाग-1 = तारांकित (starred) Q&A** (full question + ministerial answer) then
  **भाग-2 = अतारांकित (unstarred)** — specifically *starred Q&A converted to unstarred under Rule 46(2)*.
  So **both types are in the one `ques` book**; the `star` file is only the starred index.
- **Both per-member attributable** — each question carries the member name and Q number
  (`( सि. 1122 ) श्री सुनील उईके`, `( सि. 4 ) श्री प्रहलाद लोधी`), plus the replying minister
  (`स्कूल शिक्षा मंत्री (श्री उदय प्रताप सिंह)`). No per-member aggregate — you must download every day's
  PDF and attribute manually (recon's point).
- **Encoding:** born-digital text (`/ToUnicode` present), but **Devanagari conjuncts garble under pypdf**
  (`श्री`→`ी`, `शिक्षा`→`िशा`, `तारांकित`→`ताराांककत`) — a partial-CMap issue, not a scan. Read with a
  Devanagari-aware extractor or OCR; do not call it "clean text" on pypdf's output alone.

**Tamil Nadu — starred questions are per-day PDFs only; unstarred are not published at all.**
- The assembly's own `questions.php` and `17thassembly/questions.php` both **404** — there is no question
  page, no per-member question list, and no starred/unstarred index on `assembly.tn.gov.in`.
- **Starred** reach the public only as **per-day PDFs on the NeVA notice board**:
  `https://cms.neva.gov.in/NeVA/TN/FileStructures//Notices/17_1_S_03-09-2026.pdf` ("Starred Questions,
  Thursday, 03 September 2026"; also `31-08-2026`, `01-09-2026`). **Read (step 10):** that PDF is 200,
  **251,224 bytes, 2 pages** (byte-exact) — header *"தமிழ்நாடு சட்டமன்ற பேரவை … உறியிட வினாக்கள் …
  மொத்த வினாக்கள் 5"* (Total questions 5), each question identified by **member + Q number**
  (`*21 தி. மா. NM.`, `*22 …`). So **per-member attribution is possible from the PDF**, but there is no
  per-member *index*.
- **⚠️ The Tamil is legacy-encoded and lossy.** Extraction yields `தமி நா ச டம ற ேபரைவ` for `தமிழ்நாடு
  சட்டமன்ற பேரவை` and `வியாாழக்கிழமை` for `வியாழக்கிழமை` — vowel signs and conjuncts are silently dropped
  (TSCII/TAB-era pre-Unicode Tamil). English extracts clean; Tamil does not round-trip. Any derived
  per-member count would rest on unreliable Tamil extraction.
- **Unstarred questions are NOT separately indexed** — the recon's finding holds; the notice board carries
  only "Starred" PDFs.

**Kerala — starred AND unstarred both work, via a POST JSON API; and this is the richest per-question text
found so far (full question + full answer, in Malayalam).**
- The landing pages (`index.php/questions/starred` / `…/unstarred`) are shells; the data is a **POST-only JSON
  API** needing a CodeIgniter CSRF token. **The token is embedded in the page's own `onchange` handler** —
  `onchange="get_all_starred_question('8f9ce36d94213a2ab076960d2ca75928')"` — so it is scraped, not guessed.
- **Endpoints:** `index.php/questions/get_all_starred_questions_date` and `…/get_all_unstarred_questions_date`
  with body `{kla, session, department, csrf_test_name, date}`; per-question detail via
  `…/get_all_search_starred_question` with `{id, csrf_test_name}`. A **session map** comes from
  `index.php/bills/selectkla` with `{klaid, csrf_test_name}` (**note `klaid`, not `kla`** — wrong param name
  silently returns `[]`).
- **Verified live:** 15th KLA session 23 → **4 starred + 16 unstarred**; session 38 (the last of the 15th KLA)
  → data through **23-02-2026**. ⚠️ **The 16th KLA (session_id 39, "Session 1") returns `null`** for both
  endpoints — the current House has no question records yet.
- **Detail payload** (id 2044): `{id, kla_id, session_id, depaertment, date, file, html_content, is_stared}` —
  `html_content` is **75,415 chars** of full Malayalam question + answer. Read (step 10): Q.*91 on *"ടൂറിസം
  മേഖലയുടെ പുനരുജ്ജീവനം"* (revival of the tourism sector) post-COVID, asked by **ശ്രീ. ഇ. ടി. ടൈസൺ മാസ്റ്റർ**
  and three co-signatories, answered by the Public Works & Tourism Minister.
- ⚠️ **Per-question, not per-member.** The questioners are **prose inside the Malayalam text, often with
  co-signatories**, and there is **no structured member id/name field and no per-MLA count**. A per-MLA tally
  would require
  name-matching Malayalam honorifics against the roster — a heuristic, not a sourced figure. One other trap:
  passing the literal `Select` as `department` triggers a raw PostgreSQL error; send **empty** or a numeric id.

**Karnataka — best questions source of any state so far: an official Elasticsearch API with per-member
attribution AND a queryable starred/unstarred field; plus a per-day PDF surface (with a correction).**
- **The Explorer JSON API is the headline.** `https://klaexplorer.karnataka.gov.in/api/sd/sh?qp=<query>`
  returns **200, `application/json` (~400 KB)** — an Elasticsearch index over the **entire** legislative record
  (sample hit from 1959). Shape: `{timeTaken, numberResults, debateResults[], analysis{}}`, and each
  `_source` carries: **`questioner_name_eng` / `questioner_name_kan` (per-member)**, `minister_name_eng`,
  `minister_portfolio_eng`, **`debate_title_subject_eng` / `_kan`**, `debate_section_date`, `assemblyNumber`
  (`6[1978-1983]`), `sessionNumber`, `yearBook`, `startPage`/`endPage`, `bookId`, `debate_participants_eng`.
- **Verified the type field is real data, not a label:** a `Siddaramaiah` query returned
  **23 "Starred Questions" + 4 "Unstarred Questions"** among the top 50, and a starred row resolves to
  `questioner_name_eng: V L Shivappa`, `minister_name_eng: A K Abdul Samad`,
  `minister_portfolio_eng: Minister For Health & Family Welfare`, `debate_section_date: 1981-03-24`,
  `startPage: 239`, `assemblyNumber: 6[1978-1983]`. So **this is per-member, per-type, dated, with the answering
  minister** — the strongest questions source recorded so far.
- The companion **`/api/sd/df`** returns `analysis` buckets including `debateParticiapantsEng_bucket` /
  `…Kan_bucket` — per-member activity counts. `/api/sd/whoswho/all` and `/api/sd/ot` also answer.
- **Per-day PDF surface (both types work):** `assembly/questions/previousqns.htm` (**254,964 bytes**,
  byte-exact) links **367 `lasq*.pdf` (Starred) + 367 `lausq*.pdf` (Unstarred) + 432 `lar351*.pdf`** (Rule 351
  answers). **CORRECTION to `SOURCES.md`:** it records `lausq17082026.pdf` as **HTTP 404** ("that particular
  day's file was not retrievable") — it now returns **200, 1,547,936 bytes**. `lasq17082026.pdf` = **200,
  150,860 bytes** (byte-exact). **So unstarred IS retrievable; read the index rather than assuming a gap.**
- **⚠️ Encoding — legacy Nudi font, not a scan.** `lasq` uses **`Nudi01k` / `Nudi02k` / `Nudi02e`** with
  **no `/ToUnicode`**, and `lausq` uses CID subsets; both extract as Latin mojibake
  (`PÀ£ÁðlPÀ «zsÁ£À ¸À¨sÉ` = `ಕರ್ನಾಟಕ ವಿಧಾನ ಸಭೆ`; `MlÄÖ ¥Àæ±ÉßUÀ¼ÀÄ - 15` = `ಒಟ್ಟು ಪ್ರಶ್ನೆಗಳು - 15`).
  **Read via a Nudi→Unicode transcoder, not OCR.** Content: `lasq` = *"ಸದನದಲ್ಲಿ ಉತ್ತರಿಸುವ ಪ್ರಶ್ನೆಗಳ ಪಟ್ಟಿ"*
  (questions for oral answer, Total 15); `lausq` = *"ಲಿಖಿತ ಮೂಲಕ ಉತ್ತರಿಸುವ ಪ್ರಶ್ನೆಗಳ ಪಟ್ಟಿ"* (written answers,
  **Total 230**), each with the asking member and question number.

**NeVA (Karnataka tenant) — POPULATED, unlike most states' shells.** `kla.neva.gov.in` returns 200 (50,110 B)
and its routes serve **real state content** — `/Questions` (20,047 B, Kannada "ಪ್ರಶ್ನೆಗಳು" with Starred),
`/Bill` (36,894 B, "ಶಾಸನ" bills introduced), `/Debates` (17,987 B, "ಚರ್ಚೆಗಳು") — with **zero "No Records
Founds"**. Only `/Members` is 404. Contrast: Kerala's instance refused connections (000), TN/UP/Goa/Bihar
redirect to the national landing, and MP/Arunachal are empty shells. Worth noting as the exception.

**Telangana — questions are department × session only, never per member, and the result set is browser-gated.**
- `answersList` is a **search form** (`<form id="answersList" action="postanswerList" method="post">`), not a
  browsable list. Filters: `termId` (16/15/14), `sessionId`, `sessionDate`, `department`, and
  **`ans_type` = `1` Oral Answers / `3` Written Answers / `2` Placed**.
- ⚠️ **The site never uses the words "starred" or "unstarred".** The **Oral/Written split is the functional
  analogue** (oral answers follow starred questions, written answers follow unstarred). Recorded here as the
  closest equivalent rather than pretending the state publishes the standard pair.
- ⚠️ **Not attributable per member** — the dimension is *department × session*, with no member field anywhere.
- ⚠️ **The result set is not retrievable headlessly:** a seeded POST to `postanswerList` with
  `termId=16&ans_type=1` returns **HTTP 403** — `{"success":false,"message":"You do not have permission to
  access this resoure","statusCode":403}`. `sessionId`, `sessionDate` and `department` are also empty on first
  load (dependent AJAX after `termId`), so this needs a real browser session.

**Access quirk that governs the whole Telangana site (record before writing any fetcher):** several routes
are **session-gated**, not Referer-gated. A cold `curl` to `/answersList` returns **404** (1,073 B) and
`/resolutions` **404** (1,084 B); after seeding a cookie jar with a single `GET /assembly`, the same URLs return
**200** (`/answersList` 57,589 B — byte-exact; `/billsActs` 209,381 B; `/resolutions` 75,956 B). A `Referer`
header alone does nothing — **the session cookie is what unlocks the route**. A fetcher that skips the seed will
record these pages as missing.

**NeVA (Telangana tenant) — empty shell.** `tsla.neva.gov.in` 200 (41,691 B, byte-exact) reads "Third
Legislative Assembly", "House Not In Session", "Questions 0", "Government Bills 1", "Member 2";
`/Member/Details/1` returns a 22,426-byte page with **`No Records Founds` ×3** (General Questions / Debates /
BILLS) and the shared-template label *"eVidhan- Himachal Pradesh"*. `/Questions`, `/Bill`, `/Business`,
`/Debates` and `/Committee` all redirect to the national landing. **Zero Telangana member records — do not use.**

**Haryana — both starred and unstarred are published, but not from the page that advertises them.**
- ⚠️ **`/questions/` and `/bills/` are explanatory prose with ZERO PDFs** (38,458 / 37,970 B, last updated
  2020). Neither carries data — a fetcher that stops at the obvious nav page records "questions not published",
  which is false.
- **The real channel is the Legislative Business feed** `newspress-releases/` (73,828 B): one post per sitting,
  each carrying the day's question list. Both types are published as **separate posts**, in **English *and*
  Hindi**, e.g. `wp-content/uploads/2026/08/Starred-Questions-01.09.2026-english.pdf` (+ `-hindi.pdf`) and
  `Un-Starred-Questions-01.09.2026-english.pdf`.
- **Format: born-digital TEXT**, comfortably extractable — Starred 01.09.2026 English = 10 pp, 14,350 chars;
  the Hindi edition = 9 pp. **No OCR.**
- ⚠️ **Slug/title trap:** the post *"List of **Un-Starred** Questions 31 August, 2026"* links to a URL whose
  slug reads **`list-of-starred-questions-31-a`**. **Classify by the post title or the PDF filename, never by
  the URL slug** — the slug will mislabel unstarred content as starred.
- ⚠️ **Scheme/transport note:** the site is **https-only now** — the recon recorded an `http://` unstarred URL
  which fails outright (port 80 closed). Over https the same file returns 200. Always upgrade to https.
- ⚠️ **WP REST is not a shortcut:** `/wp-json/` exists (79,303 B) but the `news-press-release` post type is
  **not exposed** (`rest_no_route`, 404), and the PDF link is not in the post HTML in a plain `href` — it is
  rendered by JS. Parse the raw HTML for `uploads/<YYYY>/<MM>/...pdf` instead.

**Manipur — the Unstarred page's *listing* is a duplicate of Starred; its *documents* are not. Follow the PDFs.**
- **Starred** `/business/questions-and-answers/starred-questions` (133,008 B): HTML table + PDF links,
  **99 records over 4 pages**, paged via `/page:{n}`. ⚠️ **Page 5 is an empty stub served with HTTP 200, not a
  404** — so a walk must stop on *zero data rows*, not on an error.
- **Unstarred** `/business/questions-and-answers/unstarred-questions` (133,228 B). **CORRECTION to the recon's
  wording:** it says the page is a *"99.99%-text-identical duplicate"*; the measured similarity is
  **99.25%**, and the differences are real. What is actually true:
  - **The table IS a duplicate of Starred.** The **column header still reads `Starred Question No.`**, and the
    rows are the *same questions* (row 1 both pages: `Surjakumar Okram | 35-Khangabok | 26 July, 2022 |
    Yumnam Khemchand, Rural Development…`). Only the heading and a few file-size strings differ. **So the
    listing's question-type is wrong — do not classify by this page.**
  - **But the PDF links are genuinely different:** Starred points at `…/starred/Q10.pdf`, Unstarred at
    `…/unstarred/Q1.pdf` — **zero overlap between the two PDF sets**. The *documents* are distinct and correct.
  - **Net: the unstarred module is usable via its PDFs and unusable via its table.** Parse the
    `/unstarred/Q*.pdf` links; never read the row data as "unstarred questions".
- **Document formats differ by type — check each; a spread is required here:**
  - **Starred `Q2.pdf` = 224 KB, 1 pp, `/BaseFont` 0, 1 image, ~1 char → a SCAN.** OCR required.
  - **Unstarred `Q1.pdf` = 168 KB, 1 pp, `/BaseFont` 1, 974 chars → TEXT**, and it self-identifies:
    *"MANIPUR LEGISLATIVE ASSEMBLY — **Unstarred Question** No — Date of Receipt — Name of member giving
    notice — Minister/Department…"*. So the extracted text confirms the PDF really is the unstarred paper.
- The Questions landing page `/business/questions-and-answers` renders the title **"Starred Questions"** —
  another sign the unstarred route was copy-pasted from the starred one.

**Tripura — questions are genuinely per-member with both types in one table (Bengali).**
- `GET /Member/Member_Question?MemberId={id}&AssemblyID=13` → **200, 13,122 B (byte-exact)**, an HTML table:
  `Sr no | প্রশ্ন নম্বর (Q No) | প্রশ্নের ধরন (Question **Type**) | তারিখ (Date) | মন্ত্রী (Minister) | বিষয় (Subject)`.
- **The type column distinguishes the two publications**, so one call serves both —
  **`তারকাচিহ্নিত` = starred** and **`তারকাচিহ্নহীন` = unstarred**. Verified for member 78: **8 starred rows and
  1 unstarred**, e.g. `1 | 174 | তারকাচিহ্নিত | 27/03/25 | প্রফেসর ডাঃ মানিক সাহা | *25 - মাতাবাড়ি ব্লকে …`.
- **Per-member attribution is structural, not prose** — the member is fixed by the `MemberId` parameter, which
  is a stronger shape than Rajasthan/Kerala (where the name is only prose in the text). The subject field also
  repeats the question number and a constituency reference.
- Site-wide browser at `/Questions` with `LstItem` = `0` starred · `1` unstarred · `3` short-notice (and `2`
  for answer/reply types). Lookup JSON endpoints answer: `/Questions/SessionList?AssemblyId=13`,
  `/Home/AssemblyChange?AssemblyId=13`, `/Business/MemberListForQuestion1`. Homepage counter reports
  **3,547 questions** in total; sessions reach back to the 1st Assembly.
- ⚠️ Every one of these routes needs the **session seed** (see the profile note) — cold, they fail.

**Meghalaya — per-member questions with a literal Starred/Unstarred column, plus a session-keyed PDF index.**
- **Per-member (NeVA, the richer tier):** `GET /Member/Member_Question?MemberId={id}&AssemblyID=11` returns an
  HTML table `Sr No | Question Number | Question **Type** | Date | Minister | Subject | Document`.
  **The type column carries the literal strings `Starred` and `Unstarred`** — one call serves both publications,
  so there is no separate URL to check. Verified for **member 50: 232,954 B, 285 rows**, both types present,
  dated to **28/08/26** (current). ⚠️ **A warm-up is required** — fetch `/` first and carry the cookie
  (`?MemberId=1` with no seed returns a 1,311-byte empty stub).
- **Per-day PDFs (the Assembly's own site):** `http://megassembly.gov.in/storage/eLibrary/question.json`
  (60,259 B) is a **dict keyed by session code** — **63 keys** (`061998RA`, `061999BS`, `112026BS`, …) — each
  mapping to a **list** of `{id, session_date, file_uri, question_type_id}`, e.g.
  `storage/question/112026BS/2026-02-27_question_(Unstarred Question).pdf`.
  - ⚠️ **`file_uri` contains spaces and parentheses** — a raw fetch fails with *"URL rejected: Malformed input"*.
    **URL-encode the path** (or the request dies before it leaves curl).
  - ⚠️ **`question_type_id` is `None` for the older records** (the 1998–2002 sessions), so the type is not
    reliably classifiable from the index alone — the filename sometimes carries it (`(Unstarred Question)`),
    sometimes not (`1998-06-23_question.pdf`).
- **Read (step 10):** downloaded `2026-02-27_question_(Unstarred Question).pdf` (200, **769,698 B, 30 pp**).
  ⚠️ **This corrects a "scanned PDF" reading**: it is a **JBIG2 scan *carrying an OCR text layer*** —
  **30 `/JBIG2Decode` streams, 83 `/BaseFont`, 90 images, 31,594 extractable chars**. It is therefore
  **readable without OCR**, but the text is **OCR-noisy** (`"tiie Deputy ChiefMinister in­ charge Urban A
  Bairs"` for *"the Deputy Chief Minister in-charge Urban Affairs"*). Header: *"MEGHALAYA LEGISLATIVE ASSEMBLY
  BUDGET SESSION — UNSTARRED QUESTIONS & ANSWERS — Friday. February 27, 2026"*. **Do not treat garbled
  extraction as "no text" here** — it is an OCR layer, not a scan without one.

**Sikkim — every record module exists, and every one is empty.**
- **Questions:** `/Questions` (200, **19,394 B**, byte-exact) advertises the full NeVA category set —
  **Starred Question, UnStarred Question, Short Notice Question, Inter Session Questions**, plus `List`
  (Starred/Unstarred/Short Notice) and `Reply` (Reply Starred/Reply UnStarred/Reply Short Notice) groups.
  ⚠️ **But the per-member register returns no data:** `/Member/Member_Question?MemberId={id}&AssemblyID=11`
  is **200 / 1,311 B / "No Records Founds"** for both ids tested (60 and 1). **Module present, dataset empty.**
- **Bills:** `/Bill` (200, **35,377 B**, byte-exact) exposes `Government Bill / Private Members Bills`, the
  category set (Money / Financial / Ordinary / Constitution Amendment / Ordinance Replacing) and the status set
  (Assented / Passed / Pending / Withdrawn / Negatived / Lapsed / Introduced).
  ⚠️ **The search endpoint `/Bill/FetchDataListBillsBySearch` returns HTTP 500 (3,531 B)** — the shared NeVA
  error page (identical size to the same failure at Meghalaya). **No bill records retrievable.**
  **Working source = PRS:** `https://prsindia.org/bills/states?state=Sikkim` → **85** bills, **2014–2026**
  (full pagination walk; page 2→3 repeats at 35 = end).
- `egazette.sikkim.gov.in` and `gazette.sikkim.gov.in` **NXDOMAIN**; Internet Archive `in.gov.sk.gazette*` =
  **0 items**. No gazette tier.
- **Fund — there is no MLA fund in Sikkim at all.** This is a stronger negative than "no portal": the recon
  downloaded and text-extracted **all 51 department Demand-for-Grants PDFs for 2026-27** and found
  **0 matches** for `MLA` / `MLAs` / `MLALAD` / `Vidhayak Nidhi` / `Constituency Development`, with the single
  `Local Area Development` hit belonging to a non-MLA programme. Demand No. 24 "LEGISLATURE" read in full
  contains only Speaker/Deputy Speaker and member salaries/allowances plus **officeholder** discretionary grants
  (Speaker ₹50 lakh, Deputy Speaker ₹45 lakh, Financial Committee Chairman ₹10–20 lakh) — **not a per-MLA fund**.
  `mladf` / `mlalad` / `vidhayaknidhi` `.sikkim.gov.in` all **NXDOMAIN**. ⚠️ Do not substitute the national
  **MPLADS** figures — that covers Sikkim's single **MP**, not MLAs.

**Uttar Pradesh — CORRECTION: the WebForms portal IS curl-replayable, and it is the richest questions
source found in any state so far, because it returns the ANSWERS too.**
- `SOURCES.md` concludes that a **headless browser is required** for `vsopp.up.gov.in/uplaquest/Question_Online/*`
  and that "the questions data itself cannot be reached without replaying that state". **The second half is
  the key: replaying the state is exactly what works via plain curl.** No browser was needed.
- **The replay recipe.** GET `MemberWise.aspx`, then POST `application/x-www-form-urlencoded` back with
  `__VIEWSTATE` (**34,524** chars — byte-exact with the recon), `__EVENTVALIDATION` (**9,212** — byte-exact),
  `__VIEWSTATEGENERATOR`, **`__ncforminfo`** (the WAF field — echo it back), plus
  `DdlHouse` / `DdlSession` / `DdlMemberName` / `BtnSubmit=Submit Query`. Status **200**, real data.
- **Two failure modes I hit, both of which look like a broken portal:**
  1. Posting an **invalid member id** returned **HTTP 200 with a 0-byte body** — which reads as "blocked".
     The id must come from the page's *own* `DdlMemberName` select. My first attempt scraped the *session*
     select by accident and posted a session id as a member id.
  2. **Rapid POSTs get the server to start timing out** (the `__ncforminfo` WAF). After 4 quick POSTs the
     host stopped answering entirely for ~20 s, then recovered. **Space requests ~5 s apart.**
- **What a result actually contains** — columns
  `क्र.सं. | प्रश्न का प्रकार | सूचीबद्ध तिथि | विभाग का नाम | (आइटम नं.) - प्रश्न | उत्तर`
  i.e. S.No · **question type** · listed date · department · question text · **answer text**.
  For member **18346 (श्री अखिलेश, Karhal–346)**, 18th Assembly session 7 (प्रथम सत्र, 2024): **72 table
  rows** — **38 starred (`तारांकित`) and 32 unstarred (`अतारांकित`) mentions**. A row reads
  `अतारांकित | 06/02/2024 | पंचायती राज | प्रश्न (63) … | उत्तर …` closing with the replying minister —
  e.g. **`योगी आदित्यनाथ मुख्यमंत्री, पंचायती राज विभाग`**. Bihar and Rajasthan publish question *lists*;
  **UP publishes the reply.**
- **One endpoint serves BOTH types** — the type is a column (`प्रश्न का प्रकार`), the same shape as Rajasthan.
  Sessions available: **7** (1 = प्रथम सत्र 2022 … 7 = प्रथम सत्र 2024).
- ⚠️ **Coverage is sparse and member-specific.** Sampling 9 members on session 7: **2 had records**
  (18346 → 38/32; 18050 डॉ अजय कुमार → 16/10) and the other 7 returned
  `Information that you might want or need is not be available !!!`. Member 12722 returned that message for
  **all 7 sessions**. I did **not** establish whether "not available" means *the member asked no questions
  that session* or *that member's record was never uploaded* — treat the per-member coverage as unverified.
- Other axes exist (`SessionWise`, `QuestionWise`, `DateWise`, `DepartmentWise`, `AdvanceSearch` —
  133,105 B, the best bulk target). The portal root `/` returns **403**; the `.aspx` pages do not.

**Goa — both types present, per-member attributable, but the two differ in encoding.**
- `questions_list.php` shell + `_questions_list.php?assembly_id=14&session_id=&sitting_id=&display_id=`,
  and combos from `_get_combo_details.php?mode=QUESTIONS_LIST&a_id=14`. Returns **one card per sitting**
  carrying **separate "Starred List" and "UnStarred List" PDFs** — 5 sittings × 2 = **10 PDFs**, so
  **neither type is stale or missing** (both live at the current 14th Session, 2 Sep 2026).
- **Both are the same document type — a "Question Booklet Report"** with a Portfolios Index *and* a
  **per-Member table**: columns `Member Name | Member LAQ No. | Portfolio`, e.g. under starred
  `Shri. Premendra Shet → 001B Social Welfare, 001C Empowerment of persons with disabilities, 001A Power`.
  So questions **are per-MLA attributable** — parse the PDF.
- **The asymmetry that matters: starred is text, unstarred is a scan.**

| Variant (sitting 166, 02.09.2026) | Size | Pages | Questions | Encoding |
|---|---|---|---|---|
| Starred | 227 KB | 35 | **50** | **born-digital text** — 4 `/BaseFont`, 68,924 chars |
| Unstarred | **68 MB** | **110** | **185** | **pure JBIG2 scan** — 0 `/BaseFont`, 0 `/FontFile`, 119 images, no `/ToUnicode` |

- **Reading note:** the unstarred list needs OCR. `pypdf` cannot even extract the images —
  **JBIG2 needs `jbig2dec`, which is not installed here** (`DependencyError`). Working route found:
  render with macOS `qlmanage -t -s 3000` (or `sips`), then **Tesseract 5.5 with `-l eng`** (Goa's
  legislation is English, so no Indic model is needed). Verified: page 1 → *"Question Booklet Report,
  Report Generated On: 28-Aug-2026 12:33 PM … List of UnStarred Questions For Answer on 02 September
  2026, Total Number of Questions: 185"*; page 3 → the per-member table (`Shri. Aleixo Lourenco`,
  `Shri. Antonio Vas`, `Shri. Altone D'Costa`, `Shri. Carlos Ferreira`, `Shri. Chandrakant Shetye`).
  The report also carries deletion notes (`NOTE:-Unstarred LAQ191 is deleted.`).

Bihar also publishes **House questions** (`house_question.html`), **Short Notice**
(`short_notice_ques.html`) and **Answer to questions not put in House**
(`notputinhouse.html`) — same scanned-PDF shape.

**Reading them needs Hindi OCR — use Gemini 2.5 Flash.** Measured on 300 real printed
Devanagari scans, it is the strongest reader (chrF++ **86.3**, median CER 0.0), ahead of
Claude Opus 4.7 (82.2) and the best open option Qwen3-VL-8B (75.2). Do **not** use
specialised OCR-VLMs: DeepSeek-OCR collapses on real scans (89% catastrophic rate).
Every extracted name is validated against the official 243-name roster before storing.
Evidence: *Can OCR-VLMs Read Devanagari?* [arXiv 2606.29213](https://arxiv.org/abs/2606.29213).

**Rajasthan — one endpoint serves BOTH types; the boundary is the session, not the topic.**
- `MemberWise.aspx` is an ASP.NET WebForms POST (`BtnSubmit`): harvest `__VIEWSTATE` /
  `__VIEWSTATEGENERATOR` / `__EVENTVALIDATION`, set `DdlHouse` + `DdlSession` + `DdlMemberName`.
  The **type is a column** (`प्रश्न का प्रकार`), not a separate list — values seen:
  `तारांकित` (starred), `अतारांकित` (unstarred), `अन्तः सत्र` (intra-session).
- Verified live, 16th Assembly **session 2**: member 2023001 **79 rows (57 unstarred / 22 starred)**,
  2023002 **100 (60 / 39 / 1 intra-session)**, 2023003 **49 (12 / 37)**; session 1 gives 4 rows.
- **Coverage stops at session 2.** Session 3+ is delegated to NeVA — the page says so itself
  ("16वीं विधान सभा के तृतीय सत्र एवं आगे के सत्रों के प्रश्नों हेतु यहां Click करें") — and the
  legacy portal returns **0 rows** for session 3. On the NeVA side the route redirects to the
  national landing and `Questions/FetchDataList` returns **HTTP 500**, so **current-session questions are a gap**.
- Transport quirk: Python's default trust store rejects the `rlaoasys` cert chain
  (`self signed certificate in certificate chain`); macOS `curl` succeeds.

**Punjab — both types live and in step; per-MLA from the PDF, not the endpoint.**
- Two endpoints, one per type: `Questions/StarredQuestionSession` and
  `Questions/UnStarredQuestionSession`, both GET JSON taking `?AssemblyCode=16&SessionCode={s}`.
  Payload: `RecordId, Heading, **FilePath** (English), **FilePathLocal** (Punjabi), SessionDate, SessionId`.
- **CORRECTION — the recon says questions are "not attributable per MLA". They are.** The per-member
  *endpoint* is indeed dead (`Members/GetQuestions?MemberCode={id}` → `[]` for all 10 members tested),
  but **each question in the PDF carries the member's name and constituency** with a question number and
  the minister answerable — e.g. `*1877 Smt. Neena Mittal (Rajpura):` and `706 Sardar Manjinder Singh
  Lalpura (Khadoor Sahib):` — under a `Total Questions - 16` / `Total Questions - 5` count. **Per-MLA
  attribution = parse the session PDF**, exactly as with the bills. Do not record "not attributable"
  from the empty endpoint alone.
- **Neither type is stale — a clean ✅✅** (rare: Bihar's unstarred stops at the 16th Assembly). Both
  cover the **same 8 of 14** sessions (185, 184, 177, 176, 175, 174, 173, 171 populated; 183, 181, 179,
  178, 172, 170 empty — the one-day/special sessions). Newest = 13th Session, **10.08.2026**.
- **Two session-ID namespaces — do not cross-post.** Questions numbers sessions **170–185**; the
  Members API numbers the *same* sessions **170–397** (Questions `185` = Members `397` = "Thirteenth
  Session"). A session id valid on one route is silently wrong on the other.
- English PDFs are **born-digital clean text** (`/ToUnicode` present). Punjabi PDFs extract as Gurmukhi
  Unicode but with **matra-reordering artefacts** (`ਿਨਸ਼ਾਨ ਵਾਲੇ` for `ਤਾਰਾਂਕਿਤ ਵਾਲੇ`) — **read English**.

## Development fund

**Verified position — 31 of 36 jurisdictions recorded; 5 not yet swept (listed in the catch-all row).**
`SOURCES.md` §2's summary (*"per-MLA fund data exists in only 4 jurisdictions"*, i.e. the recon's
Mizoram/Odisha/Rajasthan/Puducherry set) **is stale and no longer describes the file.** The live picture:
- **Per-MLA fund *data* — 4:** **Rajasthan** (per-MLA JSON, 200 records) · **Odisha** (per-MLA work-level
  JSON) · **Puducherry** (per-constituency annexure, ₹200.00 lakh each) · **Delhi** (₹5.00 crore/AC order for
  2026-27 + per-AC sanction orders for **35 of 70** ACs).
- **The per-constituency *entitlement* is published, but not the execution — 8:** Tamil Nadu · Kerala ·
  Haryana · Mizoram · West Bengal · Himachal Pradesh · Jammu and Kashmir · Nagaland.
- **Scheme attested, no per-MLA data — 3:** Telangana (GOIR register, browser-gated) · Jharkhand ·
  Uttarakhand.
- **No fund page at all — 9:** Punjab · Goa · Uttar Pradesh · Madhya Pradesh · Karnataka · Manipur ·
  Tripura · Meghalaya · Sikkim (**no scheme exists**).
- **No MLAs, so MLA-LAD cannot apply — 4:** Ladakh · Andaman & Nicobar Islands · Lakshadweep · Chandigarh
  (each records the **MPLADS**/CCDA analogue instead).
**"Entitlement published" and "fund data published" are different claims — do not merge them.**
Also note the schemes are **not all called MLALAD** (VANGY, BEUP, VKVN, CDF, MLACDS, SDF, LADP/LADF…):
the name is a per-state trap, not a lookup key.

| State/UT | Working source | Kind | Status |
|---|---|---|---|
| Rajasthan | https://ework.rajasthan.gov.in/iwmsweb/Pdmn/Dashboard_graph_amchart_new.aspx | official (RDIWMS) | ✅ per-MLA JSON over POST, 200 records, live |
| Punjab | — | — | **none** — no portal, and no per-MLA fund (per-segment scheme only) |
| Goa | — | — | **none** — MLA-LAD runs per-constituency; no portal, only a sparse `MLA/ALD` gazette trace |
| Uttar Pradesh | — | — | **none** — 11 candidate hosts DNS-fail; zero `विधायक निधि`/`Vidhayak` on any assembly property |
| Madhya Pradesh | — | — | **none** — Vidhayak Nidhi exists (name attested) but no portal; 4 candidate hosts NXDOMAIN; only NEGD documents an *internal* MLALAD app (no URL) |
| Tamil Nadu | https://www.tnrd.tn.gov.in/schemes/st_mlacds.html | official (RDPR dept) | ⚠️ **MLACDS** scheme (not MLALAD) — rules + per-constituency entitlement (Rs.2–3 cr/yr) published, but **no per-MLA data portal** |
| Kerala | https://lsgd.kerala.gov.in/wp-content/uploads/lsgd_orders_pdf/go20020118_6941.pdf | official (Finance G.O.) | ⚠️ **SDF** scheme (not MLALAD) — rules + per-MLA ceiling (₹25 lakh in 2002) published; **no per-MLA data portal** |
| Karnataka | — | — | **none** — **KLADS** scheme; `klads`/`mlalad`/`lad` `.karnataka.gov.in` all NXDOMAIN |
| Telangana | https://goir.telangana.gov.in/ | official (GOIR) | ⚠️ **CDF** scheme (not MLALAD); GOIR is the GO register but its WebForms **POST → 302 `/Errors.aspx`** (browser-gated); no per-MLA portal |
| Odisha | https://mlalads.odisha.gov.in/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport | official (MLALADS) | ✅ **per-MLA work-level JSON** — amounts, status, agency, project code; needs session cookie + `RequestVerificationToken` + valid `DistrictId` |
| Haryana | https://www.haryanarural.gov.in/vidhayak-adarsh-nagar-avam-gram-yojana-vangy/ | official (Rural Dev dept) | ⚠️ **VANGY** scheme — ₹2.00 cr/constituency, 100% state-funded; guidelines PDF is a **scan**; **no per-MLA portal** |
| Manipur | — | — | **none** — **MLADF** scheme; `mladf`/`mlalad`.manipur.gov.in NXDOMAIN; zero fund strings on the assembly site |
| Tripura | — | — | **none** — MLA Area Development Fund; `mladf`/`mlalad`/`vidhayaknidhi`.tripura.gov.in all NXDOMAIN |
| Meghalaya | — | — | **none** — MLA-area development scheme; `mladf`/`mlalad`/`vidhayaknidhi`.meghalaya.gov.in all NXDOMAIN |
| Sikkim | — | — | **no scheme exists at all** — proven from the 51 Demand-for-Grants PDFs (0 MLA/MLALAD/Vidhayak matches); 3 hosts NXDOMAIN |
| Mizoram | https://planning.mizoram.gov.in/page/guidelines-on-member-of-legislative-assembly-local-area-development-scheme-mlalads | official (Planning & Programme Implementation Dept) | ⚠️ **MLALADS** — allocated limit **IS published** (₹2.00 cr/constituency/FY w.e.f. 2024-25) + statewide sanction orders; **per-MLA works only on patchy district pages**; no per-MLA expenditure |
| West Bengal | https://planning.wb.gov.in/departmentdetails/5 | official (Dept of Planning & Statistics) | ⚠️ **BEUP** — the full **per-MLA entitlement history IS published** (₹15 L → **₹70 L/FY**); **per-MLA works/expenditure NOT published** (the return is mandated but internal) |
| Jharkhand | https://vidhansabha.jharkhand.gov.in/search/node | official assembly (committee records only) | ❌ **no per-MLA data** — scheme **विधायक निधि** attested only via **विधायक निधि अनुश्रवण समिति** committee lists; **8 candidate hosts NXDOMAIN**; no site page (sitemap: 0 fund routes) |
| Himachal Pradesh | https://planning.hp.gov.in/NewReleases/2026-27_MLAs_Priorities.pdf | official (Finance Dept, via Planning Dept) | ⚠️ **VKVN** — allocation series **IS published** (₹15 L 1999-2000 → **₹220 L/FY 2024-25**) **and per-constituency priority/works lists with budget estimates**; **expenditure monitoring is login-gated** |
| Jammu and Kashmir | https://enigrani.jk.gov.in/ | official (Finance Dept — CDIS) | ⚠️ **CDF** — ceiling **IS published** (₹300 L → **₹400 L/MLA/year from FY 2025-26**) and a **statewide CDIS portal exists** (90 constituencies, launched 19/05/2025) but is **entirely login+OTP gated**; counters are hardcoded |
| Ladakh | https://mplads.mospi.gov.in/ (STATE_ID 130) | official (MoSPI eSAKSHI) | ❌ **no MLA fund — no MLAs.** The per-member fund is **CCDA for councillors** (₹1.50 cr each) and **MPLADS for the single MP** (₹16.11 cr allocated, 18th LS) — **both must be labelled with their tier** |
| Andaman & Nicobar Islands | https://mplads.mospi.gov.in/ (STATE_ID 35) | official (MoSPI eSAKSHI) | ❌ **no MLA fund — no MLAs.** Per-member fund is **MPLADS for the lone MP** (₹14.70 Cr allocated, 18th LS, 29 works) — **label it as MP-LADS** |
| Lakshadweep | https://mplads.mospi.gov.in/ (STATE_ID 19) | official (MoSPI eSAKSHI) | ❌ **no MLA fund — no MLAs.** **MPLADS for the lone MP** (₹15.39 Cr allocated, 18th LS, 30 works) + a **live UT e-Gazette** at `lakshadweep.gov.in/documents/` |
| Uttarakhand | https://ukrd.uk.gov.in/scheme/gramin-bhandaran-yojana/ | official (Rural Dev Dept) | ❌ **no per-MLA data**; scheme page live (MLA Nidhi Yojana, GO **07.06.2002**) but the **only guidelines PDF is a dead link** (`NoSuchBucket`, no Wayback capture); 5 fund hosts NXDOMAIN |
| Nagaland | https://ipr.nagaland.gov.in/sites/default/files/2021-11/Basic%20Facts%20Inside%202019_0.pdf | official (DIPR, p.176) | ❌ **no per-MLA data** — **LADP/LADF**; the **rate IS published** (₹1 crore per AC, 2017-18; ₹60 cr provided / ₹30 cr released); no portal, no per-MLA utilisation |
| Chandigarh | https://mplads.mospi.gov.in/ (STATE_ID 7) | official (MoSPI eSAKSHI) | ❌ **no MLA fund — no MLAs.** Per-member fund is **MPLADS for the lone MP** (₹17.84 Cr allocated, 18th LS, 113 works) — label as MP-LADS |
| Delhi | https://udd.delhi.gov.in/sites/default/files/UD/mlalad/yearly_allocation_budget_2026-27_0.pdf | official (UDD, GNCTD) | ✅ **MLALAD — ₹5.00 crore per constituency for 2026-27 (order), full rate history ₹1→4 cr, per-AC sanction orders for 35 of 70 ACs**; ❌ utilisation dashboard empty |
| Puducherry | https://lad.py.gov.in/sites/default/files/g.o.ms.no.24-dt-22.11.2024.pdf | official (Local Administration Dept) | ✅✅ **MLA-LAD Scheme — per-constituency annexure: ₹200.00 lakh/MLA/year, every constituency named**, + Statement B for the 3 nominated MLAs; **utilisation still not published** |
| Chhattisgarh | https://descg.gov.in/MLALADS.aspx | official (Dir. of Economics & Statistics) | ⚠️ **MLA-LADS — rate IS published: ₹4.00 crore/AC/FY** (₹50 L 2004-05 → ₹1 cr 2011-12 → ₹2 cr 2019-20 → ₹4 cr 2022-23), 74 % = ₹296 L, 25 % = ₹100 L; ✅ guidelines + 16 public orders; ❌ **per-MLA works/expenditure login+CAPTCHA gated** |
| Dadra and Nagar Haveli and Daman and Diu | https://mplads.mospi.gov.in/ (STATE_ID 10) | official (MoSPI eSAKSHI) | ❌ **no MLA fund — no MLAs.** Per-member fund is **MPLADS for the UT's 2 MPs**, now **retrieved**: Daman and Diu (Patel Umeshbhai Babubhai) ₹24.51 Cr / 61 works; Dadra & Nagar Haveli (ST) (Kalaben Mohanbhai Delkar) ₹26.95 Cr / 2 works — ⚠️ **carry-forward limits, not annual** |
| Bihar | — | — | ❌ **no per-MLA Vidhayak Nidhi data**: assembly fund paths 404, `bvm.bihar.gov.in` fund paths 404, 6 candidate hosts unresolvable; ⚠️ **the ₹4 crore entitlement is news-sourced and remains UNVERIFIED**; ✅ **NEW — the Bihar e-Gazette is live** (20,572 gazettes / 46,866 notifications since 2008, documents born-digital, but searchable **by number only**) |
| _all others_ | — | — | pending review — **5 jurisdictions not yet swept:** Andhra Pradesh, Arunachal Pradesh, Assam, Gujarat, Maharashtra |


**Bihar — still no per-MLA Vidhayak Nidhi data portal, but the reason it looked like a dead end has changed:
a live, official, searchable e-Gazette exists and recon never tested for one. The money data remains absent;
the scheme's legal record is now reachable in principle.**
- **Scheme: विधायक निधि (Vidhayak Nidhi)**, distinct from the **मुख्यमंत्री क्षेत्र विकास योजना** that MLAs and
  MLCs also recommend under. ⚠️ **The widely-reported ₹4 crore per-MLA entitlement (with a ₹6 crore rise
  debated in the 2026 budget session) is still NEWS-SOURCED ONLY — I did not verify it against any official
  document this run, and it must not be recorded as verified.**
- ❌ **No official per-MLA fund data anywhere — driven again, live:**
  - Assembly site: **`Vidhayak_Nidhi.html`, `vidhayak_nidhi.html`, `mla_fund.html` and `pdf/Scheme.pdf` all 404
    (1,245 B)**; `Scheme.html` (200, 4,198 B) is the *examination* scheme, not a fund scheme.
  - `https://bvm.bihar.gov.in/` (Bihar Vikas Mission) → **200, 77,783 B**, but `/vidhayak-nidhi/`,
    `/vidhayak_nidhi`, `/mlalad` and `/scheme` all **404 (305 B)**, and its home page has **0 occurrences** of
    `vidhayak`, `nidhi`, `विधायक`, `MLA`.
  - **Six candidate fund hosts still fail to resolve** — `vidhayaknidhi.bihar.gov.in`, `mlalad.bihar.gov.in`,
    `finance.bihar.gov.in`, `planning.bihar.gov.in`, `rd.bihar.gov.in`, `panchayati.bihar.gov.in` — re-tested
    with a real resolver (`socket.gethostbyname`), so this is a **repeatable negative from this environment**,
    which is still **not** proof that no departmental MIS exists (recon's caveat stands, now twice measured).
  - ⚠️ **`state.bihar.gov.in` is split**: the root → **200, 101,653 B, `<title>Government of Bihar`**, but the
    deep link **`/main/CitizenHome.html` → 578 B carrying `Sorry, Unable to process your request. Please
    contact to Administrator and try again later!`** with a `_csrf` meta tag — a session/CSRF-gated app. The
    portal home page contains **0 occurrences** of `vidhayak`, `निधि`, `scheme`, `MLA`. **A 200 from the root
    is not a working portal.**
- ✅ **NEW SOURCE TIER — the Bihar e-Gazette is live, official, and born-digital. Recon never checked for one.**
  `https://egazette.bihar.gov.in/` (NIC Bihar State Centre; the Bihar Secretariat Printing Press, Gulzarbagh,
  under the **Finance Department**) → **200, 25,652 B**. Its own masthead counters:
  **"Published Since 24th of September, 2008 · Total No. of Gazettes: 20,572 · Notifications: 46,866."**
  ⚠️ **HTTP is dead (`http://…` → 000); the site is HTTPS-only.**
- ✅ **The documents extract, and the URL is derivable.** Gazette **1131** of **2026** →
  **`https://egazette.bihar.gov.in/GazettePrinting/GazettePublished/1131_2_2026.pdf`** → **200, 1,045,984 B,
  3 pages, 36 `/BaseFont`, 4,986 extractable characters.** Read: it is **Law Department notification 7670**,
  *"बिहार चीनी उपक्रम (अर्जन) (संशोधन) अधिनियम, 2026"* — the **Bihar Sugar Undertaking (Acquisition)
  (Amendment) Act, 2026** — *"जिस पर माननीय राज्यपाल द्वारा दिनांक **16 सितम्बर 2026** को अनुमति दी जा चुकी है"*,
  published **17 September 2026**, Gazette No. 1131 (Extraordinary), carrying the **Bihar-era date
  `26 भाद्र 1948 (श0)`** beside the Gregorian one and the signature *"बलराम दुबे, सरकार के सचिव"*.
  **Pattern: `GazettePrinting/GazettePublished/<gazetteNo>_<part>_<year>.pdf`.**
- ⚠️ **The gazette's text layer is MIXED and needs a transcoder for clean Hindi** — the Devanagari body
  extracts as legacy glyphs (`ǐबिहार सरकार`, `Ĥकािशत`) while the notification block also carries a Latin
  transliteration (`fof/k foHkkx` = विधि विभाग, `laŒ ,yŒthŒ&01&14@2026&7670@yst`). Prose is recoverable;
  **the digits are exact** — read the numbers from the text layer, not from OCR.
- ⚠️ **THE GAZETTE'S LIMIT — its search is by NUMBER, never by keyword.** `SearchGazette.aspx` takes
  gazette type / number / year; `SearchNotific.aspx` takes a **notification number** (with Like / Exact /
  Starts-with / Ends-with) plus a **149-department** dropdown. **A department-only search returns no result
  grid, and posting a notification number together with a department returns nothing unless the number
  belongs to that department.** So the 46,866 notifications can only be mined by knowing a number or by
  paging `Notification.aspx` (~12 rows/page, pager `DetailView$Page$N`).
  **Consequence, stated plainly: the gazette makes Bihar's fund RULES officially citable *if* the notification
  number is known — but I did NOT locate a Vidhayak Nidhi notification this run, so the ₹4 crore figure stays
  unverified.**
- **MPLADS — the MP tier, retrieved.** eSAKSHI **`STATE_ID 6`** → `python3 tools/fetch-mplads.py IN-BR 6` →
  **41 per-MP rows + index in `data/mplads/IN-BR/`, 5,873 work rows, ₹614.65 crore of allocated limits summed.**
  ⚠️ **41 rows for 40 seats: `ujjarpur` is returned TWICE by the portal** (40 distinct `constituency_key`s) —
  de-duplicate on the key, and do not report 41 Bihar MPs.
  ⚠️ **Three MPs show 0 works** — **PATALIPUTRA (Misha Bharti)**, **UJJARPUR (Nityanand Rai)** and
  **PASCHIM CHAMPARAN (Sanjay Jaiswal)** — **that is the portal's answer, not a failed fetch** (their tiles and
  work tables are present and empty).

**Dadra and Nagar Haveli and Daman and Diu — no MLA fund can exist (there are no MLAs), and the MP analogue
is now RETRIEVED, not merely located: both of the UT's Lok Sabha seats are live on eSAKSHI under a single
state id.**
- **No MLA-LAD scheme exists or can exist here.** An MLA fund is legislature-linked, and Article 239A gives
  this UT no legislature. The UT's own site search returns *no-results* for `vidhayak`, and its Departments
  list contains no such scheme. **Structural absence, not a publication gap.**
- ✅ **MPLADS is the real per-representative fund for this jurisdiction, and it works.**
  eSAKSHI carries the merged UT as **one state entry — `The Dadra And Nagar Haveli And Daman And Diu`,
  `STATE_ID 10`** (from `POST /rest/PreLoginDashboardData/getStateData`), and both seats resolve under it:
  `python3 tools/fetch-mplads.py IN-DH 10` → 2 per-MP files + index in `data/mplads/IN-DH/`, **63 work rows**.
  | Seat | MP | Allocated limit | Recommended | Sanctioned | Completed | Expenditure |
  |---|---|---|---|---|---|---|
  | **Daman and Diu** | **PATEL UMESHBHAI BABUBHAI** | **₹24.51 Cr** | 61 | 2 | 1 | ₹0.24 Cr |
  | **Dadra & Nagar Haveli (ST)** | **Kalaben Mohanbhai Delkar** | **₹26.95 Cr** | 2 | 0 | 0 | ₹0.00 |
  **This closes the recon's open item** — `SOURCES.md` recorded the MPLADS request contract as *"not fully
  derived"*; it is derived, and these are the figures.
  ⚠️ **Both allocated limits (₹24.51 Cr / ₹26.95 Cr) are far above the ~₹14.7 Cr typical of a first-term MP**
  — as with Manoj Tiwari's ₹22.58 Cr in Delhi, this is a multi-term entitlement carry-forward. **Do not
  present it as an annual entitlement, and do not compare these two MPs on it.**
  ⚠️ **The work counts are exceptionally low (61 and 2).** Two recommended works against a ₹26.95 Cr limit is
  a real, reportable feature of this UT's data — **not a scrape failure**; it reproduces across the tiles, the
  pie labels and the work table.
- ⚠️ **The two seats are one row-set, not two states.** A fetcher keyed on "state" must not look for separate
  `Dadra` and `Daman` state ids — eSAKSHI merged them, and a search for either alone returns nothing.
- ❌ **No UT-level fund portal exists** — no `mlalad`/`vidhayaknidhi`/`mla-lad` host under `ddd.gov.in` or any
  `.nic.in` for this UT; the site's own `mplads` search is *no-results* even though the national scheme covers
  it.
- **The MP tier is not a substitute for the MLA tier on the site** — if a figure is shown for IN-DH it must be
  labelled **MPLADS, for the MP**, never as an MLA fund.


**Chhattisgarh — the RATE is published in full (₹4.00 crore per constituency, with the whole history and the
splitting rules), the guidelines and the allocation orders are public documents, and the per-MLA works data
is genuinely login-gated. This is a "rules ✓ / data ✗" state, not an absent one.**
- **Scheme: विधानसभा निर्वाचन क्षेत्र विकास योजना (विधायक निधि), branded in English as MLA-LADS/MLALADS**,
  run by the **आर्थिक एवं सांख्यिकी संचालनालय (Directorate of Economics & Statistics), Raipur** — the same
  directorate that runs MPLADS for the state. **Not called "MLALAD" anywhere in the state's own text.**
- ✅ **THE ENTITLEMENT IS PUBLISHED.** `https://descg.gov.in/MLALADS.aspx` (200, 16,723 B) and
  `https://descg.gov.in/mlaladsonline/` (200, 13,155 B) both state: *"वित्तीय वर्ष 2022-23 में प्रति विधानसभा
  क्षेत्र हेतु प्रावधानित राशि में वृद्धि कर रुपये **2.00 करोड़ से रुपये 4.00 करोड़** किया गया है"* →
  **₹4.00 crore per Assembly Constituency per financial year**, of which an MLA may recommend capital works
  costing **74 % = ₹296.00 lakh**, and **25 % = ₹100.00 lakh** goes to works recommended by public
  representatives with the district minister-in-charge's approval.
- ✅ **THE FULL RATE HISTORY IS PUBLISHED**, in `mlalads_guides_20230508.pdf` (guidelines of **8 May 2023**,
  200, 470,225 B, 24 pp): **2004-05 ₹50.00 lakh → w.e.f. 2011-12 ₹1.00 crore → 2019-20 ₹2.00 crore →
  w.e.f. 2022-23 ₹4.00 crore.** The 74/25 split, the **₹296.00 lakh** per-project ceiling (if an MLA
  recommends only one work in a year its cost must not exceed ₹296.00 lakh), the **₹25.00 lakh** District
  Collector sanction limit, the **₹50,000** minimum, the **1 % = ₹4.00 lakh** emergent reserve, the resulting
  **₹396.00 lakh** "full recommendable entitlement", and **10 % of the allocation usable under विधायक आदर्श
  ग्राम योजना** all come from this document.
  ⚠️ **That PDF's text layer is a LEGACY 8-bit encoding (`;kstuk` = योजना, `NRrhlx<+` = छत्तीसगढ़) — it needs
  a transcoder, not OCR. But its DIGITS ARE EXACT, which makes it the most reliable numeric source here.**
- ✅ **Documents, all public, no login:**
  - **`https://descg.gov.in/pdf/mlalad/MLALADS-2026.pdf`** = the **revised guidelines, 17 November 2025**
    (*मार्गदर्शिका 2023 (संशोधित)*) — **22,383,276 B, 28 pp, PURE SCAN** (byte-identical to
    `/mlaladsonline/administrativeDir/guidelines/mlalads_guides_revised_20251117.pdf`). **Recoverable by
    `tesseract -l hin`** at high per-line resolution; the revision **keeps the rate at ₹4.00 crore**.
  - `mlalads_guides_20230508.pdf` (2023 guidelines, legacy-font text — see above).
  - `mlalads_orderCirculars_20250403.pdf` (70,151 B) and `…_20250327.pdf` (126,622 B) — 1-page scans.
  - **`https://descg.gov.in/mlalads/Pages/Guideline.aspx` and `/Pages/Circular.aspx` — the PUBLIC pages of
    the monitoring system, listing 16 order/guideline PDFs** including the **budget allocation order of
    26-04-2021** (`/mlalads/pdf/MLALADS_26-04-2021.pdf`, 410,646 B) which distributes the year's fund
    district-wise, and the **11-03-2022** order that accompanies the 2→4 crore raise.
- ❌ **NO per-MLA data.** Both the legacy monitoring system (`descg.gov.in/mlalads/`) and the current
  `descg.gov.in/mlaladsonline/` put **everything except orders/guidelines/contacts behind a login**; the new
  portal adds a **CAPTCHA** (`/mlaladsonline/Login.aspx`, username + password + captcha code). **Works
  recommended, works sanctioned, works completed and expenditure per MLA are not publicly queryable.**
  Recon's "central gap" holds, and its probe of `/MLALADS/Report.aspx` &c. (all 404) still holds.
  ⚠️ **Recon's headline aggregate — "in FY 2023-24 up to March 2024, 9,062 works worth ₹34,255.55 lakh were
  sanctioned, of which 1,815 were completed" — is NO LONGER on the live page** (0 hits for `9,062`,
  `34,255`, `1,815` on today's `MLALADS.aspx`). Treat it as a figure that *was* published, not one that is.
- **MPLADS — the MP tier works and is per-MP.** eSAKSHI **`STATE_ID 8`** →
  `python3 tools/fetch-mplads.py IN-CT 8` → 11 per-MP files + index in `data/mplads/IN-CT/`, **2,304 work rows**:
  Raigarh(ST) ₹15.97 Cr (138/136/77) · Durg ₹14.70 Cr (219/182/70) · Korba ₹15.52 Cr (320/304/138) ·
  Kanker(ST) ₹16.47 Cr (87/73/29) · Janjgir Champa(SC) ₹15.04 Cr (344/344/254) · Mahasamund ₹15.30 Cr
  (179/168/75) · Bilaspur ₹14.70 Cr (134/125/41) · Bastar(ST) ₹14.70 Cr (206/173/41) · Raipur ₹15.38 Cr
  (164/133/38) · Rajnandgaon ₹14.70 Cr (182/171/72) · Sarguja(ST) ₹14.70 Cr (331/325/80).
  ⚠️ Take the id from `getStateData` (it is **8**); the endpoint is
  **`/rest/PreLoginDashboardData`**, *not* `/digigov/rest/…` — the latter 302s with a 0-byte body.

**Jharkhand — no per-MLA fund data, and the negative is now driven across the site, the sitemap and 11 hosts.**
- **The scheme exists and is named officially.** The assembly's own search index
  (`https://vidhansabha.jharkhand.gov.in/search/node?keys=विधायक निधि`, 200, 49,049 B) returns the annual
  *"झारखण्ड विधानसभा की समितियाँ"* pages for FY **2011-12, 2013-14, 2014-15, 2015-16, 2016-17** each listing
  **`विधायक निधि अनुश्रवण समिति`** (Vidhayak Nidhi Monitoring Committee) — entries *"14. सदाचार एवं विधायक
  निधि अनुश्रवण समिति"* and *"16. विधायक निधि अनुश्रवण समिति"*. **So the legislature demonstrably oversees
  the fund** — and the records carry **only member names, no allocation, sanction, completion or expenditure
  figure.** Re-verified live.
- ❌ **There is no per-MLA fund portal, and the host sweep is now conclusive.** Re-tested **11 hostnames**:
  `mlalad`, `vidhayaknidhi`, `nidhi`, `mla`, `plan`, `planning`, `rural`, `edistrict` **`.jharkhand.gov.in` →
  all NXDOMAIN**; `ruraldevelopment.jharkhand.gov.in` → **NXDOMAIN**. Of the live ones,
  `finance.jharkhand.gov.in` (200, 92,895 B) has **0** occurrences of `विधायक`, `निधि` or `MLA`;
  `jharsewa.jharkhand.gov.in` (200, 109,845 B) has **0**; `www.jharkhand.gov.in` (200, 276,061 B) has **0**.
- ✅ **`rdd.jharkhand.gov.in` — a host the recon never tested, and it is live but carries nothing.**
  It resolves (103.107.59.32) and answers **over HTTP only: `http://` → 200, 72,404 B; `https://` → 000,
  0 bytes after 15 s** (the Meghalaya HTTP-only pattern). Title *"RDD JHARKHAND | Rural Development
  Department"*. It contains **0** `विधायक` and **0** `MLA`; its only two `निधि` hits are both
  **`लोकनिधि`** — the state's *Lokanidhi* public-fund management system — an unrelated scheme.
- ❌ **The assembly site itself has no fund page at all.** `/sitemap` (200, 49,948 B — note `/sitemap.xml`
  is 404) enumerates **31 internal routes**, and contains **0** occurrences of `निधि` and **0** of
  `attendance`. There is no route to have missed.
- ❌ **The Planning & Development route is empty too** — `planning.jharkhand.gov.in` is NXDOMAIN, and the
  department's directory page on the state portal is a "Who's Who" contact list only.
- ⚠️ **A per-MLA figure DOES circulate in the press and must NOT be promoted to the registry as official.**
  Multiple 2026 reports state **₹405 crore released for Jharkhand's 81 MLAs, i.e. ₹5 crore per constituency**,
  attributed to the **ग्रामीण विकास विभाग (Rural Development Department)**
  ([ETV Bharat](https://www.etvbharat.com/hi/state/jharkhand-government-rural-development-department-released-money-for-mla-fund-jhs26061907066),
  [Jagran](https://org374nextwww.jagran.com/jharkhand/ranchi-jharkhand-mlas-get-405-cr-for-local-development-projects-40278935.html)).
  The arithmetic is self-consistent (₹5 cr × 81 = ₹405 cr) and it is the **right order of magnitude to be
  plausible** — which is exactly why it is dangerous. **I could not find the corresponding official release
  order on any Jharkhand government host**, and the RD department page that would publish it has no fund
  content. **Recorded as UNOFFICIAL / unverified, explicitly not as the working source.**
- The parliamentary tier is unaffected: national **MPLADS** (`mplads.mospi.gov.in`) covers Jharkhand's
  **14 Lok Sabha MPs**, not its 81 MLAs — do not substitute it.

**Delhi — the per-MLA allocation limit IS published (₹5.00 crore per constituency for 2026-27), the full
historical rate table is published, and HALF the constituencies have a per-AC sanction order. What is still
missing is utilisation.**
- **The scheme is MLALAD — MLA Local Area Development Scheme** (MLALADS in file numbers) — **not** "Vidhayak
  Nidhi" (that is UP's name). Administered by the **Department of Urban Development (UDD), GNCTD**;
  landing page `https://udd.delhi.gov.in/ud/mlalad-scheme` → 200, 46,282 B.
- ✅ **THE CURRENT PER-CONSTITUENCY LIMIT IS PUBLISHED.** `yearly_allocation_budget_2026-27_0.pdf` →
  **200, 376,127 B, 2 pages, 3,343 chars, born-digital**, an **ORDER** of the Department of Urban Development
  (`F.No.18A(15)/UD/MLALADS/2022-23/PF`, 10th Level, Delhi Secretariat, I.P. Estate), reading verbatim:
  > *"The **yearly allocation of fund under MLALAD Scheme has been kept to Rs. 05.00 Crore per Assembly
  > Constituency for the financial year 2026-27**. This issues with the prior approval of Hon'ble Minister (UD)."*
  Signed **(Arvind Jain), Deputy Secretary (MLALAD)**, and copied to — decisively — **"All the Hon'ble MLA
  (AC-01 TO 70) of 08th Delhi Legislative Assembly"**, with item 29 requesting the **Assistant Programmer,
  UDD to "upload the same on the department website"**. **The limit is uniform and expressly per-constituency.**
- ✅ **THE FULL HISTORICAL RATE SERIES IS PUBLISHED** in `mlalad_guidelines.pdf` (200, 155,449 B, 6 pages,
  **18,293 chars**) — *"GUIDELINES FOR MEMBER OF LEGISLATIVE ASSEMBLY LOCAL AREA DEVELOPMENT SCHEME (MLALADS)
  DELHI-2012"*:
  | Period | Limit per MLA |
  |---|---|
  | **1994-95** (scheme start) | **₹1.00 crore/year** |
  | **w.e.f. 1999-2000** | **₹1.40 crore** |
  | **2000-01** | **₹1.90 crore** |
  | **2004-05** | **₹2.00 crore** |
  | **w.e.f. 2011-12** | **₹4.00 crore** |
  and: *"each MLA can suggest small works of capital nature to be done in their constituencies **upto the tune
  of Rs.4.00 crores in a year with each individual project not exceeding Rs.2 crore**."*
  **Current (2026-27) = ₹5.00 crore**, per the order above.
- ✅ **PER-CONSTITUENCY SANCTION ORDERS EXIST — and the measured coverage is HALF, not "a quarter".**
  Across the two order pages (`/mlalad-schemes` → 52 PDFs; `/mlalad-schemes-administrative-approval` → 51)
  there are **57 per-AC PDF links resolving to 35 DISTINCT Assembly Constituencies**:
  **2, 4, 5, 8, 9, 11, 13, 15, 16, 17, 19, 20, 23, 25, 28, 30, 33, 35, 36, 39, 40, 41, 42, 43, 45, 47, 48,
  49, 56, 59, 60, 62, 64, 65, 67** — **35 of 70 covered, 35 missing.**
  Filenames encode the AC and the executing agency: `ac_05_100-115_02.06.2022.pdf`,
  `ac_02_1878-1889_27-11-2024_i_fc.pdf`, `ac_04_5154-2165_29-11-2024_mcd.pdf`,
  `ac_08_1974-1985_27-11-2024_djb.pdf` — agency suffixes **`mcd` 18, `djb` 12, `i_fc` 4, `pwd` 2**.
  A sample order (`ac_05_…`, 758,530 B, 3 pages, 8,249 chars) is a born-digital
  *"GOVERNMENT OF NCT OF DELHI, DEPARTMENT OF URBAN DEVELOPMENT, 10th LEVEL C-WING, DELHI SACHIVALAYA"* letter.
  ⚠️ **So this is a genuine, official, per-constituency fund document set — but partial.** Describe the shape
  of the gap (35/70) rather than calling the tier absent.
- ⚠️ **CORRECTION — the work-level execution report is NOT "one scanned document".**
  `https://udd.delhi.gov.in/sites/default/files/mlalad/fundureport251119_1.pdf` → **200, 3,615,118 B,
  145 pages, 225,887 extractable characters.** There **is** a text layer (OCR). But read in context it is an
  **RTI-disclosure compilation of executive-agency sanction letters** (e.g. an ECIL-Rapiscan letter about CCTV
  work, `Ref.ERUS&M/UDD/CCTV/20190205`), with `MLA` 275 times and `Assembly Constituency` 42 times but
  **`AC No` 0 times** — **work- and agency-level, not a structured per-MLA dataset.** Read it, do not parse it.
- ❌ **The intended utilization dashboard is EMPTY — recon confirmed.**
  `https://udd.delhi.gov.in/ud/fund-utilization-report` ("Fund Utilization Reports received from various
  Executive Agencies") → **200, 46,336 B, and its only two PDF links are unrelated**
  (`dsr2021_compressed_1.pdf` and a `delhi.gov.in` handbook). No year-wise utilization data.
- ❌ **What is still NOT published per MLA: works recommended, works sanctioned, works completed and
  expenditure.** Allocation ✅ / sanction orders ⚠️ (35/70) / utilisation ❌.
- **MPLADS (the MP tier, not the MLA tier).** eSAKSHI **`STATE_ID 11`** →
  `python3 tools/fetch-mplads.py IN-DL 11` → 7 per-MP files + index in `data/mplads/IN-DL/`, **593 work rows**:
  **Chandini Chowk / Praveen Khandelwal** ₹14.75 Cr alloc, 69 rec / 61 sanct / 35 comp · **East Delhi /
  Harsh Malhotra** ₹14.71 Cr, 113 / 109 / 53 · **New Delhi / Bansuri Swaraj** ₹15.43 Cr, 113 / 79 / 43 ·
  **North East Delhi / Manoj Tiwari** **₹22.58 Cr**, 24 / 15 / 6 · **North West Delhi (SC) / Yogendra
  Chandoliya** ₹14.79 Cr, 72 / 56 / 11 · **South Delhi / Ramvir Singh Bidhuri** ₹14.76 Cr, 135 / 110 / 41 ·
  **West Delhi / Kamaljeet Sehrawat** ₹14.70 Cr, 67 / 58 / 31.
  ⚠️ **`Manoj Tiwari`'s ₹22.58 Cr is materially above the other six (~₹14.7 Cr each)** — a multi-term
  entitlement carry-forward; do not read it as an error, and do not compare MPs on it without context.
  ⚠️ **TOOL TRAP — I first ran this with `STATE_ID 4` (a guess) and the fetcher silently wrote an EMPTY
  `data/mplads/IN-DL/` reporting `constituencies: 0` with no error and exit 0.** Delhi's real id is **11**,
  from `getStateData`. **A wrong state id looks exactly like "this state has no MPs".** Always take the id
  from `/rest/PreLoginDashboardData/getStateData`, and treat `constituencies: 0` as a failure.

**Chandigarh — no MLA fund, because there are no MLAs.** See the **"Chandigarh — NOT A GAP"** block under
**Bills**. The only per-member money is **MPLADS for its single MP** (eSAKSHI `STATE_ID 7`, Manish Tewari,
18th LS: **₹17.84 Cr allocated, 113 works**). **Label it MP-LADS.**

**Puducherry — the strongest per-MLA fund publication found in this exercise.** The **MLA-LAD Scheme**
(Local Administration Department, since 1997; **30 constituencies + 3 nominated MLAs**) publishes a
**per-constituency annexure inside G.O.Ms.No.24/LAS/A1/2024 dated 22.11.2024** listing **every constituency by
name** with `Eligible Fund per year = 200.00` lakh and the released amounts (`123.00 + 77.00 = 200.00`), plus
**Statement B** for the 3 nominated MLAs at 200.00 each — **GRAND TOTAL ₹66.00 crore**. The scheme document
adds the **historical rate (₹1.00 crore; ₹1.25 crore in 2011-12)** and an **allocation-vs-expenditure table for
2010-11 → 2014-15**. ❌ **Works recommended / sanctioned / completed / expenditure per MLA are still NOT
published.** ⚠️ `gia-mla-lad-scheme2021-22.pdf` is a **pure scan (0 chars)** — not read. Full detail in the
Puducherry block under **Bills**.

**Nagaland — the scheme is LADP/LADF, its official rate IS published (₹1 crore per constituency), and there is
still no per-MLA portal.**
- **The fund is the Local Area Development Programme (LADP)**, also written **LADF** and, in the 2011
  notification, **MP & MLA LADPF**. **Not** Vidhayak Nidhi, **not** MLALAD. Administered through the
  **District Planning and Development Board (DPDB)**, chaired by the local MLA.
- ✅ **The per-constituency rate and the aggregate ARE published officially — a nuance the recon understates.**
  The DIPR publication **"Basic Facts 2019"**
  (`https://ipr.nagaland.gov.in/sites/default/files/2021-11/Basic%20Facts%20Inside%202019_0.pdf` → **200,
  743,631 B, 252 pages**), on **page 176**, states verbatim:
  > *"**LOCAL AREA DEVELOPMENT PROGRAMME (LADP)** — Came into being during the annual Plan **2003-04** by
  > renaming the erstwhile **District Plan**. During **2017-18, Rs. 60 crore provided at Rs. 1 crore per
  > Assembly Constituency** and **50% of the fund amounting to Rs. 30 crore released** for implementation of the
  > schemes as per the Guidelines. It is expected that the fund will be fully utilized by March 2019. Major
  > schemes/projects proposed to be taken up during 2018-2019 includes community halls, approach road…"*
  **So: the rate (₹1 crore/AC), the aggregate (₹60 crore) and the release (₹30 crore, 50%) are official.**
  Recon's *"the fund is published at district/narrative level only and never per MLA"* is right about
  **per-MLA utilisation** — what is missing is the **per-MLA expenditure/works** figure, not the rate.
- ✅ **The 2011 notification is verified, including its unusual encoding.** Government of Nagaland, Finance
  Department (Revenue Branch), *Notification F. No. FIN/REV-3/VAT/2001, dated Kohima, [4] November 2011* —
  `https://nagalandtax.nic.in//docs/Notification/Act/Issued%20by%20Finance%20Department/VAT/2011/Notification%20regarding%20MP%20and%20MLA%20LADPF.pdf`
  → **200, 188,742 B, 4 pages.** ⚠️ **It is a fax-compressed bitmap (`/CCITTFaxDecode`, 2480×3507) that
  nonetheless yields 4,594 characters, because the content stream carries `3 Tr` — PDF *invisible render mode*,
  i.e. a hidden OCR layer sitting on top of the image.** Recon's description is exactly right.
  The extracted English is OCR-noisy but readable — `GOVERNMENR OF NAGATAT{D`, `FINAI{CE DEPARTMENT`,
  `EEVENUE BRANCTI)`, `Datcd Kohima tftu;{tovember' 2011`, `F,No,[IN/REV.3/VAT/2001` — and it concerns
  *"whereas the Deputy commissioner of the Districts **release fund from Member of Parliament and Member
  Legislative Assembly Local Area Development Programme Fund (MP & MLA LADPF)** to individuals, groups or
  bodies etc. for executing various schemes under MP & MLA LADPF…"*. **No money figures.**
  ⚠️ **Do not treat this as a scan: "no fonts + CCITTFaxDecode" would ordinarily mean OCR is required, but the
  text is already there and hidden — check `extract_text()` before reaching for a rasteriser.**
- ❌ **No per-MLA fund portal.** The NeVA instance has no fund module (the strings `ladp`, `ladf`, `mlalad`,
  `local area` and `fund` do not appear in its navigation); the state portal's Act & Rules page and the
  Planning & Transformation Department's downloads carry **zero LADP matches**; and no host publishes an
  allocation-limit / works-recommended / works-sanctioned / works-completed / expenditure figure per MLA.
  **Recorded as a documented gap, not a search failure.**
- The **MPLADS** tier is separate and covers Nagaland's **1 Lok Sabha MP**, not its 60 MLAs — do not substitute.

**Uttarakhand — the scheme is documented but its ONLY official rules document is now a DEAD LINK, and there is
no per-MLA data portal.**
- **The scheme: "MLA Fund" (विधायक निधि / MLA Nidhi Yojana)**, Rural Development Department, Uttarakhand —
  `https://ukrd.uk.gov.in/scheme/gramin-bhandaran-yojana/` → **200, 96,159 B**, page title literally
  **"MLA Fund"**. ⚠️ **The URL slug `gramin-bhandaran-yojana` is a reused CMS slug and does not describe the
  scheme** — do not cite the slug as its name. The page states, verbatim:
  > *"In order to fulfil the objectives of balanced development of local needs in the constituencies of
  > Hon'ble Members of Legislative Assembly, **'MLA Nidhi Yojana' was started in the year 2002** and by
  > constituting the MLA Fund by **Government Order dated 07.06.2002**, guidelines were also framed for the
  > implementation of the scheme. The said guidelines have been amended from time to time… At present… the
  > earlier MLA Fund related guidelines were downgraded and the guidelines were **reorganized in the form of an
  > integrated circular**. **Beneficiary:** Residents of constituencies represented by MLAs.
  > **Benefits:** Funds allocated for local development projects based on constituency needs.
  > **How To Apply:** Projects are proposed by MLAs and approved as per government guidelines."*
- ❌ **CORRECTION — the guidelines PDF recon recorded as a live 9,231,257-byte text document is GONE.**
  `https://ukrd.uk.gov.in/document-category/mla-fund/` → 200, 105,847 B, and it still lists exactly one entry,
  ***"MLA-Guideline — 06/05/2026 — View (9 MB)"*** — but its href,
  `https://cdnbbsr.s3waas.gov.in/s3e9412ee564384b987d086df32d6ce6b7/uploads/2025/02/202605061097580764.pdf`,
  returns **HTTP 404 with the body `NoSuchBucket`**. I retried it, checked the MPLADS sibling
  (`…/uploads/2025/02/202502011142032387.pdf`) — **also `NoSuchBucket`** — and **queried the Wayback CDX for the
  exact URL: no capture exists**. So the rules document is **not recoverable from the official web or from the
  archive**, and I am **not** claiming to have read it.
  ⚠️ **Do not generalise this to "S3WaaS is down":** the *assembly's* bucket
  `cdnbbsr.s3waas.gov.in/s353c3348f1fa3f4342107da7afbb8e3e0/…` **serves its file (200, 402,370 B)** while its
  own root also 404s. **A bucket-root 404 is normal for S3WaaS and proves nothing — only the file-level
  `NoSuchBucket` body does.**
- ❌ **No per-MLA data portal exists, and the host sweep is conclusive.** `vidhayaknidhi.uk.gov.in`,
  `mlalad.uk.gov.in`, `planning.uk.gov.in`, `rural.uk.gov.in` and `mplads.uk.gov.in` are **all NXDOMAIN**.
  The RDD site (`ukrd.uk.gov.in`, S3WaaS) exposes **74 links** of which only **two** are fund-related
  (`document-category/mla-fund/` and its `/feed/`). There is **no report, expenditure, allocation or
  works-progress route** anywhere on it — the nearest is `document-category/annual-progress/`, a **general
  department category** with **0 occurrences of `विधायक`/`निधि`** and no MLA dimension.
  So there is **no allocated-limit, works-recommended, works-sanctioned, works-completed or expenditure figure
  published per MLA, per constituency, per district or in aggregate.**
- ⚠️ **Every per-MLA rupee figure in the public domain comes from RTI petitions reported by the press**
  (NDTV "34 फीसदी फंड खर्च नहीं कर पाए", Jagran minister-wise RTI comparison, Bhaskar's Udham Singh Nagar
  report card, HT on MLA-LAD cut to ₹5 crore/year). **That a journalism-plus-RTI pipeline is the only route is
  itself the evidence that no official portal publishes it** — record it as UNOFFICIAL, never as the source.
- The **MPLADS** tier is separate and covers Uttarakhand's **5 Lok Sabha MPs**, not its 70 MLAs — do not substitute.

**Andaman & Nicobar Islands and Lakshadweep — no MLA fund exists, because there are no MLAs.** See the
**"NOT GAPS"** block under **Bills** for the full proof. The only per-member money in either UT is
**MPLADS for its single MP** — A&N: **₹14.70 Cr** allocated / 29 works recommended / 13 sanctioned / 0
completed / **₹1.55 Cr** spent (18th LS); Lakshadweep: **₹15.39 Cr** / 30 / 26 / 2 / **₹3.97 Cr** (18th LS).
**Both are MP-LADS, never MLA funds.** ⚠️ A&N's ₹14.70 Cr is the same figure the recon attributes to
*Ladakh* — a possible cross-jurisdiction mix-up; never carry a stale MPLADS figure forward. Lakshadweep
additionally publishes a **live, text-extractable e-Gazette** (`lakshadweep.gov.in/documents/`) whose
notifications are issued by the **Administration/Administrator** — the UT's actual legislative channel.

**Ladakh — there is no MLA fund, because there are no MLAs.** See the **"Ladakh — NOT A GAP"** block under
**Bills** for the full proof. Two per-member funds *do* exist in the UT and both must be labelled with their
tier: **CCDA** (Councillor Constituency Development Allocation, **₹1.50 crore per councillor** from FY 2023-24,
per the UT administration's own Kargil press release of 02-02-2023 — **for councillors**) and **MPLADS** for
Ladakh's **single MP** (eSAKSHI `STATE_ID 130`; 18th Lok Sabha: **₹16.11 crore allocated, 55 works recommended,
21 sanctioned, 0 completed, ₹0.60 crore spent** — fetched 2026-09-18 via `tools/fetch-mplads.py IN-LA 130`).
⚠️ Recon's Ladakh MPLADS figures (₹14.70 Cr / 450 recommended / 341 sanctioned / 101 completed) **do not
reproduce on either the 17th or the 18th Lok Sabha** and do not name a tenure — treat them as stale.


**Jammu and Kashmir — CORRECTION: a statewide CDF monitoring portal *does* exist. The recon records only
"District-level monitoring apps … e-Nigrani … launched by the Deputy Commissioners of Srinagar and Budgam in
February 2026". The live portal is a single state-level system covering all 90 constituencies.**
- ✅ **`https://enigrani.jk.gov.in/` → 200, 96,211 B** — `<title>e-Nigrani | CDIS Jammu and Kashmir</title>`:
  *"**e-Nigrani | ای-نگرانی — Constituency Development Information System (CDIS)** … Empowering governance
  through transparency, accountability, and real-time monitoring of all developmental works across Jammu &
  Kashmir."* Its landing counters read **20 Districts · 90 Constituencies · 2920 Works · 639 Completed**, and
  the news ticker says *"**e-Nigrani CDIS Portal officially launched on 19/05/2025 for Constituency
  Development Fund Management & Monitoring**"* (v2.0.1; "Work Timeline & Savings Allocation features now
  live"). Support contact `srinagar@nic.in`; `econet.org.in` is credited as the builder.
  ⚠️ The host `cdmis.jk.gov.in` and `enigrani.nic.in` are **NXDOMAIN** — `enigrani.jk.gov.in` is the one, and
  it is **HTTPS-only** (`http://` → 000 after 40 s).
- ⚠️ **Everything is behind a login, and the public surface is thinner than it looks:**
  - `/login` → 200 (29,001 B, *"Login | CDIS Jammu and Kashmir"*); **`/dashboard` redirects to the same login
    page**; `/public`, `/reports`, `/constituency`, `/works`, `/api`, `/works/list` → **all 404**.
  - ⚠️ **The "2920 Works / 639 Completed" counters are HARDCODED static HTML** —
    `<span class="hstat-num counter">2920</span>` — with **no API call anywhere on the page**. They are a
    marketing figure, **not a live dataset**; do not cite them as data.
  - ⚠️ **The footer's "Public Analytics" link is a self-anchor** — its `href` is literally
    `https://enigrani.jk.gov.in#overview`, i.e. the landing page's own overview section. Seven plausible
    analytics routes all 404. **A label promising public analytics is not a public analytics view.**
  - ✅ **The operational manual IS public** (`/support/operational-manual`, 200, 29,656 B, *"Work Guidelines"*)
    and it proves the system holds exactly the per-MLA data the project wants. Roles and duties, verbatim:
    **MLA** — *"New Work: Create work recommendations with work name, location, estimated cost, and
    constituency … Send Work: Forward completed recommendations to DDC"* (login + **OTP**);
    **DDC** — *"**MLA Allocations:** Create and manage **MLA-wise budget allocations**. **Fund Releases:**
    Process fund release requests … **Reports & Analytics:** Access **constituency-wise gist, financial
    summaries, and analytics**"*;
    **Agency/Sub-Agency** — *"Work Status: Update stages: Tendered → Allotted → Started → Completed"*;
    **Chief Accounts Officer** — *"Update expenditure for each work as funds are utilized."*
    ⚠️ The **downloadable PDF manual is not published** — *"please contact the CDIS administration or email
    cdis@dcsgr.in"*.
  So the honest verdict is **not "no per-MLA portal"** but **"a per-MLA portal exists and is entirely
  role-gated; only staff/MLA accounts can read it."** That distinction matters for the Harvester.
- ✅ **The CDF instruments are published on the official GAD order repository, and recon is right about the
  money and wrong about the file format.**
  - **Guidelines:** `https://jkgad.nic.in/common/showOrder.aspx?actCode=O44256` → **200, 3,028,365 B,
    18 pages** — *"Guidelines on Constituency Development Fund (CDF) Scheme", Government Order No. **76-FD of
    2025**, Dated **10-03-2025**, consequent upon Council of Ministries Decision No. 035/04/2025 dated
    03.03.2025.* ⚠️ **CORRECTION: this is NOT "a pure scan with no text layer".** It carries **fonts on
    page 0 and 29,653 extractable characters across 18 pages** — an **OCR layer over the images**. The recon's
    structural grep ("18 full-page JPEGs … no text layer") is the **object-stream / OCR-layer trap again**;
    the text is noisy (`Government Order No. ;i~ -FD of2025 Dated: - I/J -03 -2025`) but **readable**.
  - **Amendment:** `…?actCode=O44447` → **200, 466,656 B, 1 page**, cleanly text-extractable.
  - **Scheme parameters read from those two documents:**
    - **Per-MLA annual ceiling: ₹300.00 lakh, raised to ₹400.00 lakh (₹4 crore) from FY 2025-26**
      (amendment cl. 1). The order is *"in supersession of all previous orders/circulars/guidelines on the
      subject."*
    - **Nominated members** of the Assembly *"may also select works for implementation in any part of the UT."*
    - **§2.12 — the 90-day recommendation deadline — was OMITTED by the July 2025 amendment** (it read *"The
      MLA shall recommend the works up to the annual ceiling within 90 days of commencement of financial year"*).
    - **§2.13:** *"obligatory for the MLA to utilize at least **80% of funds** in a particular financial year.
      In case, the expenditure is less … **releases of subsequent year shall be withheld** till such time the
      basic limit is achieved."*
    - **§2.14:** small works under ₹1.00 lakh *"shall not exceed Rs 10.00 lakhs in a particular year."*
    - **§1.2:** funds *"will not be used for incurring revenue expenditure or for creating posts of paying
      salaries"*; works should be complete within one year (§1.3).
    - **Power sub-station/distribution works capped at ₹15.00 lakh**, subject to load >80% and complete
      consumer metering.
    - **§3.x:** the District authority *"will for this purpose maintain proper accounts **separately for each
      constituency/District**"*; **§3.5** puts estimation, allotment and completion under **GFR, PAG Audit**
      and the UT audit manual; **§4.1** requires the DDC to run field inspections/physical audit/quality
      checks and to furnish reports to the MLA and Finance.
    - **Successor-MLA rule:** *"Works identified by the predecessor MLA and under execution, should be
      completed"*, and works identified up to the last day of tenure are to be executed *"irrespective of
      accord of AA provided the works are permissible and funds are available."*
  - Signed **GO 185-FD of 2025, dated 04-07-2025**, by **(Santosh D Vaidya), IAS, Principal Secretary to
    Government**; No. `FD-DED1/6/2025`; the copy list includes all **District Development Commissioners**,
    the **Secretary, Legislative Assembly, J&K**, and *"Government Order Stock file **website I/c FD/GAD**"* —
    i.e. publication on the website is the intended distribution channel.
- ❌ **No per-MLA allocation, works-recommended, works-sanctioned, works-completed or expenditure figure is
  publicly readable for any of the 90 constituencies.** The state mandates per-constituency separate accounts
  (§3.x) and now runs a purpose-built portal for exactly that data (e-Nigrani) — **the gap is access control,
  not the absence of a system.**
- The **MPLADS** tier is separate and covers J&K's **5 Lok Sabha MPs**, not its 90 MLAs — do not substitute.

**Himachal Pradesh — MAJOR CORRECTION on two counts. The recon says "No official portal publishing per-MLA
Vidhayak Nidhi data was found" and that the ONLY source of per-MLA rupee amounts is a news article. Both are
wrong: the official **allocation series** and **per-constituency priority/works lists with budget estimates**
are published — the second one on a host and folder the recon never opened.**
- **The scheme is VKVN — Vidhayak Kshetra Vikas Nidhi Yojana** (विधायक क्षेत्र विकास निधि योजना), also written
  Vidhayak Kshetra Vikas Yozna. Nodal: **Planning Department**, Yojna Bhavan, HP Secretariat, Shimla
  (`ppo-plg-hp@nic.in`, 0177-2621698).
- ✅ **THE PER-CONSTITUENCY ALLOCATION SERIES IS PUBLISHED — the full history, not a news figure.**
  `http://planning.hp.gov.in/plg_rdp/vkvny.pdf` → **200, 11,588,828 B, 43 pages**, and its **page 6 carries the
  clean English table**:
  > *"**Vidhayak Kshetra Vikas Nidhi Yojana** — launched in the year **1999-2000**. For the implementation of
  > this scheme a provision of **Rs. 15.00 lakh** was made in the financial year 1999-2000 for each Assembly
  > Constituency which was revised to **Rs. 20.00 lakh** in the financial year 2000-2001. **This scheme was
  > discontinued in the year 2001-02 and restarted in the year 2003-04.** Year-wise revised allocation per
  > constituency is as under:"*
  | Financial Year | Revised Allocation (₹ lakh) |
  |---|---|
  | 2003-04 | 25.00 |
  | 2008-09 | 30.00 |
  | 2012-13 | 50.00 |
  | 2015-16 | 75.00 |
  | 2016-17 | 100.00 |
  | 2017-18 | 110.00 |
  | 2018-19 | 125.00 |
  | 2019-20 | 150.00 |
  | 2020-21 | 175.00 |
  | 2021-22 | 180.00 |
  | 2022-23 | 200.00 |
  | 2023-24 | 210.00 |
  | 2024-25 | 220.00 |
  **₹15 lakh (1999-2000) → ₹220 lakh = ₹2.20 crore per constituency (2024-25).**
  ⚠️ **This also corrects a press error the recon relied on**: a Jagran headline reported *"₹110 cr per MLA
  annually"*; the official table shows **110.00 lakh = ₹1.10 crore for 2017-18** — a unit garble in the news,
  resolved only by reading the official document. **Cite the table, never the headline.**
- ⚠️ **CORRECTION — the guidelines PDF is NOT "a pure scanned-image PDF that needs OCR".** The recon's
  structural grep found *"0 `/Type /Font` objects, 0 `/BaseFont`, 0 `/FontFile`"* and concluded no text layer
  exists. **It has fonts on page 0 (`/R8 /R10 /R12 /R14`) and 17,373 extractable characters** — the font
  dictionaries are inside **compressed object streams**, which is exactly the failure mode the skill names
  ("Object streams defeat scan-detection"; *decide by attempting extraction, not by grepping bytes*).
  - ⚠️ **The extracted text is LEGACY-FONT Hindi (Chanakya/Kruti Dev), not Unicode** — it reads as Latin
    gibberish: `fo/kk;d {kss= fodkl fuf/k ;kstuk` = **विधायक क्षेत्र विकास निधि योजना**; also `ds dk;kZUo;u`
    (के कार्यान्वयन), `fdlh Hkh izdkj` (किसी भी प्रकार), `U;wure lhek` (न्यूनतम सीमा), `fuekZ.k` (निर्माण),
    `flapkbZ` (सिंचाई), `ikB'kkykvksa` (पाठशालाओं), `vkorhZ jktLo O;;` (आवर्ती राजस्व व्यय).
    **So this is a transcoder-or-OCR case, NOT a pure-scan case** — the recon's "needs OCR" conclusion is
    right by accident and wrong in its reasoning.
  - ✅ **The document is ALSO bilingual**: pages 0–5 are legacy-font Hindi, **page 6 is clean English**
    (the allocation table above), and **pages 38–42 are genuine scans** (garbled OCR:
    `z:rza5Tz -a-RI-a`, `RI-aa-r—2`). **Read page 6 for the numbers** — no transcoder needed.
- ✅ **PER-CONSTITUENCY MLA PRIORITY LISTS WITH BUDGET ESTIMATES ARE PUBLISHED** — on the Planning
  Department's **`/NewReleases/`** folder (found by crawling `planning.hp.gov.in`, which the recon never did):
  - **`planning.hp.gov.in/NewReleases/2026-27_MLAs_Priorities.pdf`** → 200, 278,441 B, **33 pages**.
    Title page (OCR-confirmed): *"हिमाचल प्रदेश सरकार — वित्त विभाग / **नव व्यय अनुसूची के परिशिष्ट (योजना)**
    / **माननीय विधायकों द्वारा निर्दिष्ट प्राथमिकतायें** / वर्ष 2026-2027"* —
    **Government of Himachal Pradesh, Finance Department — Appendix (Scheme) to the New Expenditure
    Schedule — Priorities specified by Hon'ble MLAs, 2026-2027.**
    Contents: **वास्तविक नई स्कीमें** (Actually New Schemes) — लघु सिंचाई, सड़कें एवं पुल, पेयजल योजना;
    **मरम्मत एवं रखरखाव** (Repair & Maintenance) — लघु सिंचाई, सड़कें एवं पुल (pp. 12–19),
    पेयजल योजना (pp. 20–25), सरकारी शैक्षणिक संस्थान (pp. 26–29).
    The table columns are **`जिला / निर्वाचन क्षेत्र | स्कीम का नाम | बजट अनुमान 2026-27`** and the rows are
    **per constituency with a rupee amount in lakh** — verbatim OCR: **सुजानपुर … 0.25**,
    **बहाव सिंचाई योजना रिब्बा … 0.25**, **लघु सिंचाई योजना पोह गाँव, पोमरंग मैदान एवं नर्दाँग का निर्माण
    … 0.25**, **गन्नू, स्यांजली, केह के लिए सतलुज से उठाऊ सिंचाई योजना … 0.25**, **सोलन … 0.25**,
    **गगरेट … 0.25**.
  - **`…/NewReleases/2025-26_MLA_Priorities.pdf`** → 200, 699,661 B, **37 pages**, same structure for 2025-26.
  - **`…/NewReleases/Proceedings_of_MLA_meeting_held_on_6_7_Feb_2026.pdf`** → 200, 1,247,931 B, **51 pages**,
    146,236 chars. *"वार्षिक योजना 2026-27 की प्राथमिकताओं के निर्धारण के लिए माननीय विधायकों के साथ
    दिनांक 06 तथा 07 फरवरी, 2026 को श्री सुखविन्द्र सिंह सुक्खू, माननीय मुख्य मन्त्री, की अध्यक्षता में
    आयोजित की गई बैठकों की कार्यवाही।"* — **proceedings of the MLA priority-setting meetings held 6–7 Feb
    2026 under CM Sukhvinder Singh Sukhu**, opened by **Shri Devesh Kumar, Principal Secretary (Planning)**.
    Its index is keyed **`क. सं. | निर्वाचन क्षेत्र का नाम / जिला | पृष्ठ`** — i.e. **one section per
    constituency.**
  - **`…/NewReleases/mla_pri_pro_2026-27.pdf`** → 200, 997,809 B, 3 pages, **a scan** (967 chars of garbled
    OCR: `Qiærr: 1-34/1 2/RIDF-XIX(Main)`) — an office memorandum on Repair & Maintenance / Really New Scheme.
- ⚠️ **State the distinction precisely — this is prioritisation/works data, NOT VKVN expenditure.** These
  documents are the **Finance Department's budget-appendix** of schemes MLAs designated, with **budget
  estimates**. They are not the VKVN monitoring system's per-MLA release/utilisation figures.
  - **The VKVN monitoring itself remains closed.** `https://planning.hp.gov.in/smis/default.aspx` is
    *"SMIS 2.0 – Schemes Monitoring Information System"* whose scheme menu lists, verbatim, *Guidelines /
    Backward Area Sub Plan / Vikas Mein Jan Sahyog / Sectoral Decentralised Planning / **Vidhayak Kshetra
    Vikas Yozna** / MP Local Area Development / Public Utility / Panchayat Wise Schemes* — but every data
    view sits behind **"Authorised Users Login" (Login ID / Password / Captcha)**.
    `https://planning.hp.gov.in/MLA-Priority/` (200, 11,784 B) is a **login-selection page**:
    *"Login For:- 1. Hon'ble MLA 2. Planning Department 3. JSV 4. PWD"*, footer *"Last updation 10/11/2024"*.
    **Neither was fought; both are recorded as login-gated.**
  - **The only public SMIS report has no MLA dimension.** `publicpanchayatreport.aspx` → **200, 20,036 B**,
    *"Himachal Public Panchayat Report"*, with cascading filters **`DistrictList` (12 districts) →
    `SchemeAreaList` (Rural|Urban) → `BlockList` → `PanchayatList` → `FinYearList` → `HeadList`**.
    **Confirmed by its own `<select>`s: keyed District → Block → Panchayat, with no constituency or MLA
    field.** Seven probes for a public MLA-wise sibling (`publicmlareport.aspx`, `publicvkvnyreport.aspx`,
    `publicvkvny.aspx`, `publicmlapriority.aspx`, `publicvidhayakreport.aspx`, `publicmla.aspx`,
    `publicmlareport.aspx?type=mla`) → **all 404**.
- ⚠️ **A SECOND TRAP ON THIS HOST: ASP.NET cookieless-session auto-detection.** `smis/default.aspx` and
  `publicpanchayatreport.aspx` **302-loop to themselves with `?AspxAutoDetectCookieSupport=1` and return
  165/179 bytes** for a client that does not accept cookies — which reads as "the portal is down".
  **With a cookie jar both return 200 and byte-exact recon sizes (17,039 B and 20,036 B).** The jar then
  carries `AspxAutoDetectCookieSupport=1`, `ASP.NET_SessionId`, `__RequestVerificationToken_L1NNSVM1`
  and `AuthToken`. **Send a cookie jar before concluding a planning-portal route is broken.**
- The `plg_RDP/mplads.pdf` link on the same SMIS menu is the **MPLADS** counterpart — the MP tier, not the MLA
  tier; do not substitute it.

**West Bengal — CORRECTION. The recon says "no public source publishes allocated limit … per MLA".
The allocated limit *is* published — the entire historical series, on the nodal department's own page.**
- **The scheme is BEUP** — *Bidhayak Elaka Unnayan Prakalpa* (বিধায়ক এলাকা উন্নয়ন প্রকল্প), colloquially
  বিধায়ক তহবিল. Introduced **FY 2000-01**. Nodal department: **Department of Planning & Statistics**
  (confirmed on `https://planning.wb.gov.in/departmentdetails/5`, the "About" target of the site's own
  **BEUP** menu, 200 / 18,327 B).
- ✅ **THE PER-MLA ENTITLEMENT SERIES IS OFFICIALLY PUBLISHED** — the department's *"Write-up on Bidhayak
  Elaka Unnayan Prakalpa (BEUP)"* states it in full:
  | Period | Entitlement per MLA per FY |
  |---|---|
  | 2000-01 (12th Assembly) | **₹15.00 lakh** |
  | 2001-02 (13th Assembly) | **₹25.00 lakh** |
  | 2006-07 (14th Assembly) | **₹40.00 lakh** |
  | 2008-09 | **₹50.00 lakh** |
  | 2010-11 | **₹60.00 lakh** |
  | **2023-24 onward (present)** | **₹70.00 lakh** — *"as declared by the Finance Minister during the budget
  session of the assembly for the financial year 2023-24"* |
  and: *"The fund is released by the Department of Planning & Statistics in **two equal instalments of
  ₹35.00 lakh each**."* This is **the same class of finding as Mizoram's ₹2.00 crore notification** —
  recon's blanket "allocated limit not published" is wrong for WB as well.
- ✅ **The BEUP Guidelines 2025 document is live and I read it** —
  `https://planning.wb.gov.in/uploads/photos/pdf/Bidhayak_Elaka_Unnayan_Prakalpa_2025.pdf`
  (**36,143,910 B, 82 pages**). It is a **pure image scan: 0 fonts and 0 extractable chars on every page
  sampled** — the recon is right that `pypdf` cannot read it.
  ⚠️ **READING MODE — it is in BENGALI, and Bengali OCR *is* achievable.** `tesseract -l eng` produces pure
  noise here; the working recipe is to fetch **`ben.traineddata`** (855,841 B) from
  `github.com/tesseract-ocr/tessdata_fast`, render at 3000 px with `qlmanage`, and run
  `tesseract <png> - -l ben --tessdata-dir <dir>`. Homebrew ships **only eng/osd/snum**, so the model must
  be supplied. It renders cleanly (see the reading note below).
- **DOCUMENT READ — what the BEUP Guidelines 2025 actually say** (Bengali, OCR'd):
  - **§3 নির্দিষ্ট কর্তৃপক্ষগণ (Specified authorities):** the **Planning & Statistics Department** is the
    সমন্বয়কারী বিভাগ (coordinating department) for fund release, guideline-making, monitoring and
    evaluation. Approving authority: in districts the **Sabhadhipati of the Zilla Parishad** (Chairman,
    District Planning Committee) **or the District Magistrate** (Member-Secretary, DPC); for the Kolkata
    Municipal Corporation area the **Commissioner, KMC**. Drawing-and-disbursing: **District Magistrate** /
    **KMC Commissioner**. Implementing agencies: panchayats, urban local bodies, government departments,
    government corporations and agencies under the Government.
  - **§4 বরাদ্দ তহবিল (Allocated fund):** each member of a newly constituted Assembly gets the **full
    entitlement for every financial year** of the term; a term **starting in the second half** of the FY
    gets **50 %**, and a term **ending in the first half** may recommend against **50 %**. A member who
    vacates (death/resignation) — the new MLA may use the **unspent** amount. Unspent money must be
    **deposited to the treasury by challan within 6 months of dissolution or by the following 31 March,
    whichever is later**, with a copy of the challan to the coordinating department.
  - **§5.3–5.4 (Third-party inspection):** projects **≥ ₹20 lakh → 100 %** covered; **₹10–20 lakh → 50 %**;
    **₹5–10 lakh → 20 %**; the remainder → **≥ 5 % sample**. The money is valid for the **full term of a
    given Assembly** irrespective of release dates — the document gives the example *"সপ্তদশ বিধানসভার
    ক্ষেত্রে ২০২১ থেকে ২০২৬ পর্যন্ত: ৫ বছরের জন্য"* (for the 17th Assembly, 2021 to 2026: for 5 years).
  - **§5.5:** if an MLA does **not** want to spend for his own constituency he says so in writing; the
    coordinating department then releases nothing, and **withdraws** anything already released.
  - **§5.6–5.7 — THE PER-MLA ACCOUNTS ARE MANDATED:** the KMC Commissioner / District Magistrates
    *"বিধায়কদের জন্য ও বিধানসভা কেন্দ্রের জন্য পৃথক আ্যাকাউন্টে হিসাব রাখবেন"* — **shall keep separate
    accounts for each MLA and for each constituency** — and must inform the MLA and the approving
    authorities whenever money is credited or debited; the approving authority *"প্রত্যেক বিধায়কের জন্য
    পৃথক হিসাব রাখবে"* — shall keep **a separate account for every MLA** in the appropriate subsidiary
    ledger books.
  - **§6 নজরদারি ও প্রতিবেদন পেশ (Monitoring and reporting) — the per-MLA expenditure return exists on
    paper:** §6.2 requires the approving authority to send the coordinating department
    **monthly and quarterly reports of works-wise AND constituency-wise TOTAL EXPENDITURE** in the
    prescribed formats at **Annexure-3 and 3A**, *with a copy to the MLA*, plus the utilisation
    certificate in **Annexure-4**. §6.3 requires **block-level BEUP review meetings at least monthly**,
    with the MLA given **7–10 days' notice**.
- ❌ **What is still NOT published: per-MLA works and expenditure.** Exactly as with Mizoram, the state
  **computes and circulates** constituency-wise and MLA-wise expenditure every month and quarter (Annexure
  3/3A/4) and **keeps a separate ledger account per MLA** — but **none of it appears on any public
  website**. The old per-MLA reporting portal **`http://wbplan.gov.in/beupweb/`** (which once published
  *"Status Report of the 15th Assembly – 2011-16 … as on 11.02.2013"*) remains dead — **`wbplan.gov.in`
  re-tested: NXDOMAIN** — and the successor site `planning.wb.gov.in` carries only the guidelines and a
  Circular & Memo page whose items are unrelated schemes. **Do not reconstruct a per-MLA figure by summing
  district pages; there are none to sum.**
- The guidelines also require a site plaque: *"A plaque carrying the inscription 'BEUP Work' indicating the
  cost involved, the commencement, completion and inauguration date and name of the MLA sponsoring the
  project may be permanently erected at the site."* — a physical, not a digital, disclosure.

**Mizoram — CORRECTION on two counts. `SOURCES.md` says "No government page anywhere publishes the MLA's
annual allocated limit" and that fund data is "scattered across individual district websites with no
consolidated allocation or expenditure figure". The first is flatly wrong; the second is half wrong.**
- **The scheme is MLALADS** — *Member of Legislative Assembly Local Area Development Scheme*, not Vidhayak
  Nidhi. Operational **since 2005-06**; governing document is the
  **"Guidelines on MLALADS (Revised on 2023)"**, Planning & Programme Implementation Department, Aizawl
  (`…/uploads/attachments/2024/02/bcadb653693a36e21c4b0c0c315cb788/pages-113-mla-lads.pdf`, **200,
  430,389 B, 17 pages, born-digital TEXT**, 14,465 extractable chars). An earlier revision
  ("as on 15.7.2019", 11 pages, text) is live too.
- ✅ **THE ALLOCATED LIMIT IS PUBLISHED.** Official notification
  `https://planning.mizoram.gov.in/uploads/attachments/2024/06/aed07764f7c94f7258a48addd709c901/posts-101-enhancement-the-allotment-of-fund-under-mlalads.pdf`
  — **No. H.11020/2/2022-PLO/Pt, dated Aizawl, the 7th June 2024**:
  *"the Governor of Mizoram is pleased to **enhance the allotment of fund under MLALADS from the existing
  amount of Rs. 1.6 crore to Rs. 2.00 crore per constituency for 1 (one) financial year with effect from
  2024-2025**"* — signed **Lalmalsawma Pachuau, Secretary**, P&PID. ⚠️ This PDF is a **scan with a
  rubbish OCR layer** (pypdf gets 4,781 chars of `"PLANNING 81 PROORMIME DIPLIMBNTATION"`-grade noise);
  read it by OCR, not by `extract_text()`.
- ✅ **THERE *IS* A STATEWIDE PUBLICATION CHANNEL, and it carries financial sanctions.**
  The Planning & Programme Implementation Department website has a dedicated MLALADS page
  (`/page/guidelines-on-member-of-legislative-assembly-local-area-development-scheme-mlalads`) and a
  Circulars-and-Orders feed. Live in it, as of this verification:
  - **"Sanction of ₹40.00 Crore for 2nd Instalment of MLA-LADS, 2026–2027"** —
    `/post/sanction-of-4000-crore-for-2nd-instalment-of-mla-lads-20262027`, posted 10 Sep 2026, attachment
    `…/uploads/attachments/2026/09/9cccf8d5592de37ec4eb59b117bca4da/posts-149-download-pdf.pdf`
    (**1,553,678 B — a SCAN**, 1 page; `extract_text()` yields 80 chars of garbage). Read by rendering to
    3000 px with `qlmanage` + `tesseract -l eng` (the Department also publishes the same page as a
    2488×3504 JPEG, `plg-20260910-0001-page1-image1.jpg`):
    > **No.H.11023/3/2025-PLG, Dated Aizawl, the 9th September, 2026** — *"The Governor of Mizoram is
    > pleased to accord **Expenditure Sanction of ₹40.00 crore (Rupees Forty Crore only) for payment of
    > 2nd Installment of MLALADS for the year 2026-2027**."* Head of account **2575 – Other Special Areas
    > Programme / 60 – Others / 102 – Assistance to DRDAs / 01 – MLA Local Area Development Scheme /
    > 31 – GIA General**. Issued with the concurrence of Finance Department (EC) vide
    > I.D.No.FIN(EC):27700/2026-27/PPI dt. 09.09.2026. Signed **David Lalthantluanga, Secretary**;
    > countersigned **(Lalengzami Ralte), Under Secretary**.
    ⚠️ **The arithmetic is a useful integrity check:** ₹2.00 crore × 40 constituencies = **₹80 crore per
    year**, and the *2nd instalment* sanction is exactly **₹40.00 crore** (= half, matching §3.4 of the
    guidelines: *"released in two equal installments"*). The two official documents corroborate each other.
  - ⚠️ **But the sanction is a LUMP SUM to DRDAs, not a per-MLA breakdown** — it names no MLA and no
    constituency. It is a statewide release, not per-MLA expenditure.
- ⚠️ **Per-MLA works remain decentralised and patchy — and the district URL pattern is NOT uniform.**
  Verified live: **Aizawl** (`aizawl.nic.in/scheme/mlalad/`, 120,492 B) and **Mamit**
  (`mamit.nic.in/scheme/mlalad/`, 111,438 B) answer at `/scheme/mlalad/`; **Kolasib, Serchhip, Lunglei,
  Champhai, Lawngtlai, Saiha all 404** at that path. The richest works tables are on **SENHRI**
  (`*.mizoram.gov.in`) hosts under *different* slugs —
  **Saitual** `dcsaitual.mizoram.gov.in/page/works-under-mla-lads` (constituency index: *8-CHALFILH /
  LALBIAKZAMA → "Aizawl District khawih a nih avangin details a awm lo"* = **no details, executed by
  another district**; *9-TAWI / Prof. LALNILAWMA → Get Details*; *21-LENGTENG → empty cell*) and its
  per-MLA page `…/page/mlalads-9-tawi-2024-2025` → **106 rows of
  `Sl. No | Implementing Agency | Name of Works/GIA | Total Amount`** (e.g. *President, Tawi MUP Branch —
  Construction of Farmer's link road — 250000*); **Serchhip** `dcserchhip.mizoram.gov.in/page/mlalads`.
  Note `dcmamit`/`dckolasib`/`dclunglei`.mizoram.gov.in `/page/mla-lads` → **404** — the sibling-host
  guess is wrong for those three.
- ❌ **What is still NOT published: per-MLA *expenditure*.** Guidelines **Annexure III** proves the state
  computes it per constituency — a return reading *"Fund received from the constituency (Rs.in lakh):
  A. Balance of Fund carried forward from the previous year; B. Fund received during the year; C. Amount of
  interest Accrued; D. Total (A+B+C); E. Total cost of work sanctioned; F. Total cost of work
  unsanctioned (D-E); G. Actual expenditure; H. Total fund available with the District Administration"*,
  signed by the Deputy Commissioner, and §3.4 makes the **second instalment conditional on it**. That
  return goes to the Nodal Department and is **not published**. ⚠️ **Do not sum the district works tables
  to synthesise an expenditure figure** — Saitual's own index shows 8-Chalfilh with no details and
  21-Lengteng empty, so any total would be silently incomplete.
- ⚠️ The guidelines set **no fixed rupee entitlement**; §1.2 says works are recommended *"to the tune of
  fund earmarked by the Government from time to time"*. The ₹2.00 crore figure comes from the 2024
  **notification**, not from the guidelines — **cite the notification, not the guidelines.**
- Sibling tiers checked and not needed: the national **MPLADS** route (`mplads.mospi.gov.in`) covers
  Mizoram's **MPs** (1 Lok Sabha + 1 Rajya Sabha), not its 40 MLAs — do not substitute it.


- Fund name: **विधायक स्थानीय क्षेत्र विकास निधि (Vidhayak Nidhi / MLALAD)** — attested. But `mlalad.mp.gov.in`,
  `mlaladapp.mp.gov.in`, `vidhayaknidhi.mp.gov.in`, `vidhayak.mp.gov.in` all **NXDOMAIN**.
- The only official trace is the NEGD India-Stack-Local entry *"MLALAD Application — MADHYA PRADESH"*
  (`negd.gov.in/isl/Directory/statedata/244`): describes an MPSEDC-built workflow app, but its **"Website
  Link" field is empty** — documented as on-premise/internal, no public URL.
- `vsgrant*.htm` (स्वेच्छानुदान) is the Speaker/Dy.Speaker/LoP **discretionary grant**, not the MLA fund —
  three columns, no amounts, no MLA names. Record as absent, not missing.

**Tamil Nadu — MLACDS: the scheme is fully documented, but there is no per-MLA data portal.**
- The fund's official name is the **Member of Legislative Assembly Constituency Development Scheme (MLACDS)**
  — **not** Vidhayak Nidhi and **not** MLALAD (that name belongs to other states). Scheme page
  `tnrd.tn.gov.in/schemes/st_mlacds.html` (200, 24,963 B); rules in **G.O.(Ms.) No.145, RDPR (SGS.1), dated
  10.12.2021** (`tnrd.tn.gov.in/project/go_files/3_99999_2021_145.pdf`, ~25 MB, OCR'd/searchable — range-check
  206 confirmed live).
- **Entitlement is uniform and published** (Rs.2–3 crore per constituency per annum, Tied + Untied split), but
  **no per-MLA or per-constituency works/sanction/expenditure data exists** — the G.O. documents allocation
  history and aggregate sanctions, nothing per member. `mlacds.tn.gov.in` and `tnmlacds.tn.gov.in` both
  **NXDOMAIN**. Record as aggregate-only, not missing-entirely: the scheme and its entitlement are official,
  the per-MLA ledger is not.

**Kerala — SDF: rules and per-MLA ceiling are official; there is no per-MLA data portal.**
- The fund is the **Special Development Fund for MLAs (SDF / MLA-SDF)** — **not** Vidhayak Nidhi and not MLALAD
  — administered by the **Finance (Nodal Centre) Department**.
- **Read (step 10):** G.O.(P) No. 60/2002/Fin, dated **18-1-2002**, *"Guidelines Modified on Special Development
  Fund for MLAs"* (`lsgd.kerala.gov.in/wp-content/uploads/lsgd_orders_pdf/go20020118_6941.pdf`, 23,207 B, 2 pp,
  **readable English text**). It orders that **administrative sanction is issued by the District Collector**, that
  funds release in **three instalments** (first up to 50%) into a **separate PD Account in each Collector's
  name**, and sets a **total ceiling of ₹25,00,000 (twenty-five lakh) per MLA per financial year**, max ₹10 lakh
  per scheme. So the *entitlement* is official — but **no per-MLA allocated/works/spent figure is published**.
- All candidate portals **NXDOMAIN**: `mlafund`, `mlasdf`, `sdffund`, `mla` `.kerala.gov.in`. Work-level traces
  surface only as **tenders** on `tender.lsgkerala.gov.in` (e.g. "MLA-SDF-Tirurangadi LAC-2023-24").
- ⚠️ **Dead-end worth recording:** every `finance.kerala.gov.in` docman G.O. link returns a 383-byte JS stub
  redirecting to `infofinance.kerala.gov.in`, which **does not respond**. The LSGD copy above is the only
  working mirror of the SDF G.O.

**Karnataka — KLADS: no per-MLA portal.**
- The scheme is the **Karnataka Legislators' Area Development Scheme (KLADS)**, rendered in Kannada/press as
  **ಶಾಸಕರ ನಿಧಿ ("Shasakara Nidhi")** — there is **no "Vidhayak Nidhi"** branding in Karnataka.
- `klads.karnataka.gov.in`, `mlalad.karnataka.gov.in` and `lad.karnataka.gov.in` all **NXDOMAIN**; the state
  portal `karnataka.gov.in` carries **zero** occurrences of KLADS/MLALAD/Vidhayak/Nidhi. The official
  Economic Survey section (14.3) was on `des.kar.nic.in`, **which no longer resolves** — reachable only via the
  Internet Archive, and **aggregate-only, never per-MLA**.
- Per-MLA figures that circulate come from **B.PAC** and **OpenCity/CKAN** — **UNOFFICIAL**, recorded as leads
  only, never as provenance. **Record as none.**

**Telangana — CDF: the register exists, the search does not work headlessly.**
- The fund is the **Constituency Development Fund (CDF)** — **not** Vidhayak Nidhi/MLALAD. The reported
  entitlement (~₹5 crore/MLA, up from ₹3 crore) is **press-only, UNOFFICIAL**; no official Telangana document
  stating it was retrieved.
- **~25 candidate hosts NXDOMAIN**, including `mlacdf`, `cdf`, `mlafund`, `mlalad`, `cdfonline`,
  `vidhansabha`, `planning`, `tsgo`, `go` `.telangana.gov.in` and the `.nic.in` variants. The legislature site
  itself has **zero** hits for `CDF`/`constituency development`/`Vidhayak`.
- **The GO register (GOIR) is session-gated like everything else, and worse:** `goir.telangana.gov.in` returns
  200 with `__VIEWSTATE` 2,348 and `__EVENTVALIDATION` 1,688 (both byte-exact vs the recon) and all nine search
  fields present, but replaying a search POST for `constituency development fund` returns
  **302 → `/Errors.aspx`**. So the CDF scheme GO is **not retrievable by curl** — a browser session is required.
- Net: the scheme exists with per-MLA entitlements, but **no public per-MLA works/expenditure data**, and even
  the *rules* GO needs a browser. Data in the wild comes from **RTI replies** (press), never a published dataset.

**Haryana — no bill dataset, and the fund is a constituency entitlement with no ledger.**
- **Bills:** `/bills/` is explanatory prose (0 PDFs). Bill activity surfaces only through the
  `newspress-releases/` feed as legislative-business posts. **Private members' bills are not published as a
  dataset**, and NeVA Haryana does not close the gap. **Working source = PRS:**
  `https://prsindia.org/bills/states?state=Haryana` → **493** bills/ordinances, **2010–2026** (full pagination
  walk; page 11→12 repeats at 12 = end).
- `egazette.haryana.gov.in` and `gazette.haryana.gov.in` **NXDOMAIN**; Internet Archive `in.gov.hr.gazette*`
  = **0 items**. PRS is the only bill-text tier.
- **Fund:** Haryana has **no MLALAD-style per-MLA discretionary fund**, and the fund it does run publishes no
  per-MLA spending. The scheme is **VANGY** (*Vidhayak Adarsh Nagar Avam Gram Yojana*, launched 06.07.2015):
  **₹2.00 crore per constituency**, 100% state-funded, works identified by the MLA, **Deputy Commissioner as
  Nodal Officer**. That is a **constituency entitlement, not an expenditure ledger**.
  - Official scheme page: `haryanarural.gov.in/vidhayak-adarsh-nagar-avam-gram-yojana-vangy/` (86,350 B).
  - ⚠️ The **guidelines PDF is a scan** (`/Font` 0, `/Image` 32) — OCR required.
  - `mlalad` / `vidhayaknidhi` / `mlafund` `.haryana.gov.in` all **NXDOMAIN**; the national MPLADS portal covers
    **MPs only**. **Record as none** — do not substitute the ₹2 crore entitlement for a spent figure.
- **NeVA Haryana** (`hrla.neva.gov.in`, 52,672 B) is an **empty shell**:
  `Member/Member_Question?MemberId=32&AssemblyID=15` → 1,311 B, **"No Records Founds"**.

**Manipur — a complete 610-row metadata index (attributes private members), but PDFs for only 12 rows; the fund has no portal.**
- `/bills` (1,083,487 B) is a **610-row register from 1972 onward on a single page** (no pagination), columns
  `Sr. No. | Name of the bill(s) | Introduced on | Passed on | Assented on | Remarks | Download`. **Only 12 of
  the 610 rows link a PDF** — bills #1–7, 9, 10, 12, 13, 15 (all 1972); the other 597 rows have an **empty
  Download cell** (no document). All 12 PDFs are live (200, `%PDF`).
- **Private members' bills ARE attributed here** — the **Remarks column names the introducer**, e.g.
  `383 | The Manipur Official Language (Amendment) Bill, 2006 | **Private Members' Bill introduced by
  Shri O. Joy Singh, MLA**`. So unlike most states, Manipur's own register links a private-member bill to its
  member. Record that as an **official per-member bill attribution** (the only one found outside a gazette).
- **Convenience fallback = PRS:** `https://prsindia.org/bills/states?state=Manipur` → **62** bills,
  **2013–2026** (full pagination walk; page 2→3 repeats at 13 = end).
- ⚠️ `egazette.manipur.gov.in` and `gazette.manipur.gov.in` **NXDOMAIN**; Internet Archive
  `in.gov.mn.gazette*` = **0 items**. The assembly's own register is therefore the **primary** tier here, not a
  fallback — the reverse of TN/Kerala/UP.
- **Fund:** the scheme is **MLADF** (*MLA Local Area Development Fund*), not "Vidhayak Nidhi" — but
  **there is no portal**: `mladf.manipur.gov.in` and `mlalad.manipur.gov.in` are **NXDOMAIN**, and the strings
  `MLADF` / `MLALAD` / `vidhayak` / `nidhi` / "local area development" appear **nowhere** on
  `assembly.mn.gov.in` (every nav page fetched and grepped, plus the 106-URL sitemap). **Record as none.**
- **NeVA Manipur** (`manipur.neva.gov.in`, 52,194 B) is a **broken shell**:
  `ContactDirectory/FetchMembersList?MLT=4&MSLT=0&Assemblyid=0` returns **HTTP 500**, not data.

**Tripura — no bill register of its own, but a LIVE e-Gazette (CAPTCHA-gated).**
- **Bills:** `/Bill` (37,027 B) exposes `/Bill/FetchDataListBillsBySearch`, `/Bill/GetAllAssembliesList`,
  `/Bill/SessionList`, and the homepage counts **"Government Bills: 131"** for the 13th Assembly — but there is
  **no private-member category**, and members' own "BILLS" tabs mirror the same government list. **Working
  source = PRS:** `https://prsindia.org/bills/states?state=Tripura` → **102** bills, **2015–2026** (full
  pagination walk; page 3→4 repeats at 2 = end).
- **NEW FINDING — the Tripura e-Gazette is LIVE.** `https://egazette.tripura.gov.in/` returns **200, 108,557 B**,
  `<title>Tripura Gazette</title>`, *"Published By The Manager, Tripura Government Press, G.A (Printing and
  Stationery) Department, Bardowali, Agartala"*. It is a **JSP app** (`/egazette/home.jsp`, `aboutgazette.jsp`,
  `aboutus.jsp`, `contactus.jsp`, `login.jsp`).
  - It has a **genuine public search form**: `POST /egazette/newsearchr…` with Gazette/Other Notification type,
    department, sector, policy, `txtdatefrom`/`txtdateto`, `txtgazno`, `txtnotificno`.
  - ⚠️ **But the form carries a CAPTCHA field (`txtcaptchadata`), and there is a Login.** So the gazette is
    public-facing yet **not machine-queryable** — record it as a live-but-gated tier, not as a source the
    Harvester can use unattended. (Per the Login/CAPTCHA rule: record as absent, do not fight it.)
- `gazette.tripura.gov.in` **NXDOMAIN**; Internet Archive `in.gov.tr.gazette*` = **0 items**.
- **Fund:** the scheme is the **MLA Area Development Fund** — but **no portal**:
  `mladf` / `mlalad` / `vidhayaknidhi` `.tripura.gov.in` all **NXDOMAIN**, and the state portal's site search
  returns "no results" for `MLA fund` / `Vidhayak` / `area development fund`. Public knowledge is
  **aggregate press only** (a Jan-2024 hike to ₹75 lakh/MLA — **UNOFFICIAL**). **Record as none.**

**Meghalaya — no bill module, but a LIVE browsable gazette archive (2006–2026).**
- **Bills:** NeVA `/Bill` renders a Bill-Type filter (`Government Bill` / `Private Members Bills`) and a status
  filter, but **`/Bill/FetchDataListBillsBySearch` returns HTTP 500 (3,531 B)** — the shared NeVA error page —
  for **every parameter combination tried**, including `BillTypeId=1` and `2` against Assembly 11, with and
  without session/status/paging params. So **no bill records are retrievable** from the NeVA tenant.
  **Working source = PRS:** `https://prsindia.org/bills/states?state=Meghalaya` → **156** bills,
  **2010–2026** (full pagination walk; page 4→5 repeats at 24 = end).
- **NEW FINDING — the Meghalaya gazette is published openly.** The **Printing and Stationery Department** runs
  `https://megpns.gov.in/` (200, 11,548 B, *"Homepage: Printing and Stationery Department"*), and its gazette
  page `…/gazette/gazette.html` (6,455 B) is a **year index for 2006 → 2026**, one page per year
  (`gazette_2026.html`, … `gazette_2006.html`). **The recon recorded no gazette for Meghalaya at all.**
  - `gazette_2026.html` (14,146 B) alone carries **160 PDF links**, grouped by month, at
    **`gazette/YYYY/MM/DD-MM-YY-<PART>.pdf`** (e.g. `2026/08/06-08-2026-IX.pdf`, `2026/01/01-01-26-I.pdf`),
    with parts I / IIA / IIB / IX / X … So the path is *near*-predictable but **the part suffix must be read
    from the index** — never constructed.
  - **Read (step 10):** `06-08-2026-IX.pdf` renders to *"**The Gazette of Meghalaya — PUBLISHED BY AUTHORITY** —
    No. 32 Shillong, Thursday, August 6, 2026, 15th Shravana, 1948 (S.E.) — Advertisements and Notices by
    Government Offices and Public Service"*. A genuine state gazette.
  - ⚠️ **OPERATIONAL TRAP: the gazette PDFs are AES-encrypted** (`/Encrypt` present, `/AESV`, `/V 4|5`).
    `pypdf` raises **`cryptography>=3.1 is required for AES algorithm`** and yields nothing. **`qlmanage`
    renders them fine**, so the working route is **render → OCR** (`qlmanage -t -s 2600` then Tesseract), or
    install `cryptography` for in-process extraction.
- `egazette.meghalaya.gov.in` and `gazette.meghalaya.gov.in` are **NXDOMAIN** — the gazette lives on
  `megpns.gov.in`, not on a `gazette.*` host, so a hostname-pattern search misses it entirely.
- **Fund:** the MLA-area development scheme is **MLA-discretionary by design** but publishes **nothing per MLA**
  — `mladf` / `mlalad` / `vidhayaknidhi` `.meghalaya.gov.in` all **NXDOMAIN**. **Record as none.**

**Uttar Pradesh — none, and the name-check is clean.**
- **11** candidate hosts probed and **all DNS-fail**: `vidhayaknidhi.up.nic.in`, `mlalad.up.nic.in`,
  `nidhi.up.nic.in`, `vidhayaknidhi.gov.in`, `mlaup.gov.in`, `mlafund.up.gov.in`, `vidhayak.up.gov.in`,
  `eoffice.up.gov.in`, `nagarvikas.up.nic.in`, `upvidhansabha.gov.in`, `vidhansabha.up.nic.in`.
- **Zero** occurrences of `विधायक निधि` or `Vidhayak` on the assembly home (Hindi and English) or the
  Liferay member-information page. The `up.nic.in` family is otherwise live, so this is a genuine absence
  rather than a network artefact.
- **Three-tier check:** PRS = **258** bill/ordinance PDFs, 2019–2026 (see Bills); `egazette.up.gov.in` **resolves to 164.100.186.223
  but the connection times out on both http and https** — a DNS entry with no service, so it is
  *tested-and-absent*, not a gazette; `gazette.up.gov.in` and `upgazette.gov.in` DNS-fail; Internet Archive
  `in.gov.up.gazette*` = **0 items**. **UP has no reachable e-Gazette.**

**NeVA (UP tenant) — redirect trap, thin shell.** `/Bill`, `/Questions` and `/Debates` all bounce to
`/Home/NeVA`; only `/Member/Details/<id>` renders (200, 22,426 B) and it carries **0** attendance hits.

**Goa — no portal, but the e-Gazette carries a live per-MLA `MLA/ALD` trace.**
- **Scheme confirmed from a primary document, still reproducible.** The recon's eProcure tender link still
  returns 200 (70,606 bytes) and its Work Item reads *"**under MLA-LAD Scheme in Cortalim Constituency**"*
  — so the local name **"MLA-LAD Scheme"** is attested officially, not just in the press.
- All candidate hosts **DNS-fail**: `mlaladgoa`, `mlalad.goa`, `mla.goa`, `vidhayaknidhi.goa`,
  `goa.mlalad` `.gov.in`. `goa.gov.in` search returns **no scheme entry**.
- **NEW — the gazette is a per-MLA paper trail.** Goa gazettes cite MLAs' recommendations by a stable
  reference: `Note No. **MLA/ALD**/2025-26/363 dated 16-02-2026 from Hon'ble MLA, **Adv. Carlos Alvares
  Ferreira, Aldona Constituency**, GLA.` (`ALD` = Area Local Development). These appear inside
  District-Magistrate notifications that the MLA's note originated.
- **But it is far too sparse to be a dataset: exactly 1 `MLA/ALD` reference across all 145 gazettes of
  FY 2026-27.** So: the trail is official and per-MLA, but there is **still no allocation, sanction,
  expenditure or works ledger** — per-MLA fund figures remain unpublished.

**Odisha — the richest per-MLA fund source found in any state: a work-level JSON API.**
- The fund is **MLA LAD / MLALADS** (Planning & Convergence Department), not "Vidhayak Nidhi".
- **The API works, and this is the standout.** `GET https://mlalads.odisha.gov.in/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport`
  (a **GET**, DataTables server-side) returns **200 `application/json`** with one row **per recommended work**.
  Required: a **session cookie** (seed by GETting `/IPMS/Report`), the **`RequestVerificationToken`** header
  (a hidden input on that page), plus **`DistrictId`** and **`FinancialYear`** and the DataTables params
  (`draw`, `start`, `length`, `order[0][column]`, `order[0][dir]`).
- **Verified live** for ANUGUL (344) and BALANGIR (345) × FY 2026-27 and 2025-26, e.g. *"Renovation of Ram
  Mandir at Village Jarapada of Krutibashpur GP"* — **Shri Nalini Kanta Pradhan**, ATHAMALLIK, ANUGUL,
  recommended 14-07-2026.
- **Fields per row:** `fullName` (**the MLA**), `constituencyName`, `districtName`, `financialYear`,
  `letterNo`, `strRecommendationDate`, **`recommendationAmount`**, `grandRecommendationAmount`, `projectId`,
  **`workDescription`**, **`workStatus`** (Completed / In Progress / Not Started / Pending with EA),
  `workCategory`, `workSubCategory`, `locationType`, `blockULBName`, `wordVillageName`, `sanctionDate`,
  **`sanctionAmount`**, `grandSanctionedAmount`, `implementionAgencyName`, `workCompletionDate`,
  **`projectCode`** (`MLALADS/OD/344/3277/115590/0004`) and `totalCount`.
- ⚠️ **Three traps, all of which read as "no data":** (1) **`iTotalRecords` and `recordsFiltered` are 0 even
  when rows come back** — the real count is in the **first row's `totalCount`** (137 for ANUGUL 2026-27).
  (2) An **invalid `DistrictId` silently returns an empty `aaData`** with HTTP 200 — district ids start at
  **344** (ANUGUL), so `DistrictId=1` yields nothing, not an error. (3) Without the session cookie or the
  token the endpoint returns an empty set rather than refusing.
- ⚠️ **Two gaps:** the per-MLA **allocation limit** is **login-gated**
  (`GetMLAWiseFundLimitDetailsReport`), and the portal exposes only **FY 2025-26 and 2026-27** — earlier years
  exist only as the state-wide aggregate table.

**Rajasthan — strongest fund case so far (RDIWMS, Rural Development & Panchayati Raj Dept).**
- **Per-MLA JSON over POST**: `POST …/Dashboard_graph_amchart_new.aspx/get_mla_data` with
  `{"a_no":16,"fin_yr":0,"dist_code":0}` and `Content-Type: application/json;charset=utf-8`
  → **200 records / 95,966 B** in one call. Keys: `s_no, HMLAName, const_name, no_proposed,
  recommended_amt, no_fs, no_cc, fs_amt, avail_amt, remain_amt, district_name`; names arrive
  HTML-entity-encoded — run `html.unescape`.
- **Live drift proves it updates**: totals moved since the recon — approved works 58,791 → **58,965**,
  financially sanctioned 35,027 → **35,109**, completed 9,959 → **9,963**.
- ⚠️ **Key and semantics disagree**: `remain_amt` renders under the column headed `व्यय राशि`
  (expenditure). Treat it as the expenditure slot **as displayed**; do not silently rename it.
- ⚠️ **No published per-MLA entitlement/ceiling.** The allocated amount exists only as one unnamed
  component of `उपलब्ध राशि` (initial + other receipts + allocated) — the available total is
  official, the annual limit behind it is not.

**Punjab — none, and the negative is now driven rather than assumed.**
- All five candidate hosts **DNS-fail**: `mlafund`, `mlalad`, `vidhayak`, `mla`, `lgd` `.punjab.gov.in`.
- **Zero** occurrences of `vidhayak` / `nidhi` / `mlalad` on both `punjabassembly.gov.in` (572 KB) and
  `punjab.gov.in` (308 KB).
- **`rangla.punjab.gov.in` is a trap** — it resolves (200, 59 KB) but its title is *"Rangla Punjab |
  Society"*: a WordPress **donation** portal for flood relief (`donat`×16, `flood`×31, `relief`×9,
  `80(G)`×1, and **zero** `MLA`/`Vidhayak`/`Nidhi`). It is the **Chief Minister's Rangla Punjab Fund**,
  unrelated to the per-segment *Rangla Punjab Vikas Scheme*, and publishes no utilisation data.
- The per-segment Vikas Scheme is **news-only** — no government order, guideline PDF or portal found;
  it is an allocation per **assembly segment**, not a per-MLA discretionary fund. No MPLADS analogue.
- **Web-search last resort (searched after the live probes came up empty) — the scheme is real and
  better-documented than "news-only", but still has no per-MLA ledger.** *Rangla Punjab Vikas Yojana*
  had its **guidelines approved by Cabinet** (April 2025): **₹585 crore for FY 2025-26**, **₹5 crore per
  MLA/assembly segment annually** across 117 segments, with a first instalment of **₹213 crore**
  reported released ([Indian Express](https://indianexpress.com/article/cities/chandigarh/punjab-cabinet-meet-117-assembly-receive-rs-5-crore-development-fund-9964631/),
  [Parliamentary Affairs](https://parliamentaryaffairs.in/punjab-mlas-to-get-rs-5-cr-annually-to-boost-local-development/),
  [Babushahi](https://babushahi.com/view-news.php?id=214101)). So the fund is **announced, funded and
  guideline-backed** — **but no per-MLA/segment ledger, utilisation dashboard or portal is published**,
  and no MLALAD exists ([Indian Express, Sep 2024](https://indianexpress.com/article/cities/chandigarh/bereft-of-mlalad-funds-punjab-legislators-feel-helpless-we-are-for-attending-bhogs-weddings-only-9588664/lite/):
  MLAs "feel helpless"; the CM called MLALAD a non-starter). **Official-tier check:** the 701-page
  `Demand for Grants Vol-III FY 2026-27` (`finance.punjab.gov.in`) contains **0** occurrences of
  `MLA` / `Vidhayak` / `MLALAD` / `Legislator`; the only `Rangla` hits are the **`Rangla Punjab
  Society`** grant-in-aid (₹30–50 lakh) — a different entity (the donation body). So the scheme's money
  flows through **district demands**, not a per-MLA budget head, confirming the per-segment framing.
- ⚠️ **Web-search trap — do not import Pakistan's Punjab.** Queries like *"Punjab MLA attendance"*
  return the **Provincial Assembly of the *Punjab* (Pakistan)**, which *does* publish attendance online
  ([PILDAT](https://pildat.org/parliamentary-monitoring1/pildat-welcomes-provincial-assembly-of-the-punjabs-move-to-make-members-attendance-record-public),
  [The News](https://www.thenews.com.pk/print/18142-upload-mpas-attendance-on-web-punjab-pa-directed)).
  That is a **different legislature**, with MPAs not MLAs. Likewise the 2019 TOI case *"HC declines plea
  seeking disclosure of MLAs' attendance on portal"* is about the **Haryana** assembly, not Punjab —
  verified by reading the article body. Neither is evidence about Indian Punjab.

**Punjab — the *parliamentary* tier is a different answer: both figures ARE published.** For Punjab's
**MPs** (Lok Sabha), unlike its MLAs, fund and attendance are both retrievable per member — already
implemented in this repo:
- **Fund** — `tools/fetch-mplads.py IN-PB 1` (eSAKSHI / `mplads.mospi.gov.in/digigov/`, house 2 = Lok
  Sabha). Live-run: **13 constituencies**; Bathinda (Harsimrat Kaur Badal) **391 works**, Gurdaspur
  (Sukhjinder Singh Randhawa) **337 works** — per-MP, per-work, with amounts.
- **Attendance** — `tools/fetch-sansad-record.py 4433 18 IN-PB bhatinda` (`sansad.in/api_ls/member/getMemberAttendanceByMpsno`).
  Live-run: **107/156 across 8 sessions**. Same call also returns questions (88 for that MP) and bills.
- So if the MLA figure is unavailable, the **MP analogue is not** — worth stating explicitly rather than
  letting "Punjab publishes no attendance" stand unqualified.

**Goa e-Gazette — MAJOR CORRECTION TO `SOURCES.md`: it is LIVE, browseable, and born-digital.**
`SOURCES.md` records `goaprintingpress.gov.in` as **HTTP 503** ("server unavailable") and concludes the
scheme notification "could not be retrieved from the official gazette". **That is no longer true.**
- **Host is up**: `https://goaprintingpress.gov.in/` → **200, 277,232 bytes**, titled *"DEPARTMENT OF
  PRINTING & STATIONERY – GOVERNMENT PRINTING PRESS"*.
- **It is a browsable Apache directory**, not a search API: `/downloads/` lists **73 year folders**
  (FY-coded `0001`…`2627`, plus historical `3637`…`9900`) — effectively **1936-37 → 2026-27**.
  Folder sizes: `2627` (2026-27) **145** PDFs, `2526` **443**, `2425` **368**.
- **Gazettes are born-digital text** — e.g. `downloads/2627/2627-19-SII-EOG-2.pdf` (200, 384 KB):
  `/BaseFont` ×31, `/ToUnicode` ×14, 3,804 chars, opening *"EXTRAORDINARY No. 2 — GOVERNMENT OF GOA,
  Department of Finance, Revenue and Control Division, Notification"* (an excise/liquor closure order for
  a Village Panchayat bye-election). **No OCR required** — a genuine upgrade to Goa's bill/index tier.
- ⚠️ **The site advertises a search that is not deployed.** `/recent-e-gazettes/`, `/about-e-gazettes/`,
  `/search-e-gazettes-by-date/`, `/search-e-gazettes-by-no/`, `/dops/search-e-gazettes-by-ocr/`,
  `/bulletin/`, `/about-us` **all return 404** despite appearing in the nav. Several individual download
  links 404 too (`2627-21-SI-OG.pdf`, `2627-20-SI-EOG-1.pdf`), so the file list has gaps. **Treat this as
  a directory crawl, not a queryable gazette.**
- Naming: `SI/SII/SIII` = series, `OG` = Ordinary Gazette, `EOG` = Extraordinary, `SUG` = Supplement.
- **Round trip:** the recon's own conclusion (*no gazette*) would have been overturned by a single retry —
  worth re-testing any host recorded as 5xx before it hardens into a gap. Internet Archive has **0 items**
  for `in.gov.ga.gazette*` and `in.gov.goa.gazette*`, so this host is the **only** gazette tier.

## Attendance

**Bihar — no per-member MLA attendance exists, and this time the negative is genuinely driven (96 pages), with
three vocabulary hits all read and dismissed. But Bihar does publish the closest thing any state has shown:
a born-digital, current, per-SESSION sitting register running 1952 → 2026.**
- **Sweep.** The assembly's own `sitemap.html` (200, 13,907 B, **130 text lines**) enumerates **103 links**;
  excluding `#`, external and asset links leaves **96 pages/doc targets, all fetched** (89 in the first pass
  plus 7 re-fetched after percent-encoding — see the trap below).
  ⚠️ **7 of the 103 sitemap hrefs contain literal spaces** (`Sitting of bihar legislative assembly.pdf`,
  `Asset Declaration of Employees.html`, `List of Business/today.pdf`, `former speaker.pdf`,
  `parti in position in 1 assembly to 16 assembly.pdf`, `video Gallery.html`,
  `विभागीय परीक्षा की पद्धतियॉं.html`) — and **plain curl returns `000` (exit 3) on all seven.** Percent-encode
  the href before fetching, or **7 real documents are silently dropped and the sweep looks complete.**
- **Vocabulary grep across all 96 fetched files — `attendance` · `उपस्थिति` · `उपस्थित` · `हाजिरी`:
  3 files hit, and all three are read and non-legislative:**
  - `Recruitment Notice.html` and `index.html`: *"विभिन्न विज्ञापनों के अंतर्गत आयोजित परीक्षाओं में
    **उपस्थित** अभ्यर्थी अपना प्राप्तांक देखने हेतु क्लिक करें"* — **candidates who sat an exam**, i.e.
    recruitment-exam attendance, not the House's.
  - `video Gallery.html`: *"…कार्यक्रम में … वरीय पदाधिकारी **उपस्थित** रहे"* — **officials were present at a
    function**; narrative prose in a photo caption.
- **Route-name scan: 0 of the 96 URLs contain `attend`, `upasthiti`, `hazir` or `hajir`** — there is no
  attendance page to have missed, by name or by content.
- ❌ **NeVA has no attendance module for Bihar either.** Probed with the seeded session:
  **`/Attendance`, `/MemberAttendance`, `/Members`, `/Member/Attendance`, `/Member/Member_Attendance`,
  `/Member/MemberAttendance` → all 404 (1,245 B)** — six spelling variants, none exists. This is consistent
  with NeVA having no attendance module anywhere.
- ✅ **BUT the closest official record does exist, and it is better than the recon implies**:
  **`https://vidhansabha.bihar.gov.in/pdf/Sitting%20of%20bihar%20legislative%20assembly.pdf`** →
  **200, 436,260 B, 5 pages, 15,209 extractable characters, born-digital** (no OCR needed). It is a
  *"Statement showing dates, duration and number of sitting of the Bihar Legislative Assembly"* with columns
  **Sl. No. | Year | Assembly | Sessions of the Assembly | Date of Commencement | Date of Adjournment |
  Duration of the Session | Total No. of Sitting**.
  **214 rows spanning 1952 → 2026**, ending with the current House:
  | Sl. | Year | Assembly / Session | Commenced | Adjourned | Duration | **Sittings** |
  |---|---|---|---|---|---|---|
  | 212 | 2025 | **18th Assembly, 1st Session** | 01.12.2025 | 05.12.2025 | 05 | **5** |
  | 213 | 2026 | **18th Assembly, 2nd Session** | 02.02.2026 | 27.02.2026 | 26 | **19** |
  | 214 | 2026 | **18th Assembly, 3rd Session** | 20.07.2026 | 24.07.2026 | 05 | **5** |
- ⚠️ **Trap — the document's TITLE says "from 1952 to 2024" while its table runs to 2026.** The title is
  stale; the data is current and covers the 18th Assembly. **Judge coverage from the last row, not the title**
  — the same stale-heading pattern as `party in position.pdf` in the Profile section (there the heading said
  17th and the data was 18th; here the title says 2024 and the data reaches 2026).
- ⚠️ **This is per SESSION, not per MEMBER.** It answers "how many days did the House sit", never "how many
  days did MLA X attend". **Record it as aggregate sitting data and do not let it be rendered as attendance.**
- **Verdict: no per-member MLA attendance for Bihar.** Bihar joins the majority; **Rajasthan, Haryana and
  Chhattisgarh remain the only three jurisdictions found with per-member MLA attendance.**

**Dadra and Nagar Haveli and Daman and Diu — none, because there is no House to be absent from. The negative
is driven across the UT portal, the UT's election authority and the national platforms, and the two surviving
word-level hits are read and dismissed.**
- **Sweep result (the evidence, not an impression):** all **105 internal links** were collected from
  `ddd.gov.in` and **97 pages fetched**; across every one of them **`attendance` = 0 occurrences.** The same
  sweep returns **`legislature` 0, `vidhan|vidhayak` 0, `MLA` 0, `speaker` 0, `starred` / `unstarred question` 0.**
- **Second and third independent negatives:** `?s=legislature` and `?s=vidhayak` on the UT site both return
  *no-results*; the UT's election authority (`secforuts.mha.gov.in/ut-of-dadra-nagar-haveli/`, 200, 136,863 B)
  returns **`MLA` 0, `Legislative Assembly` 0, `Vidhan` 0, `Lok Sabha` 0** against 33 `Panchayat` and
  20 `Municipal` — i.e. the only attendance-like records this UT can have belong to **panchayats and municipal
  councils**, not to MLAs.
- The two `assembly` hits in the whole sweep are both in the **Administrator's biography**, describing his
  **Gujarat** MLA service. There is no attendance register, no per-member sitting record, and no attendance
  statistic anywhere on the UT's properties, **because the office that would produce one does not exist.**
- ⚠️ **The page that *looks* like a gazette/record repository is not one for our purposes**: the UT site's
  **"Online Gazette Search"** nav link is **dead** (404 on every path of `164.100.238.200/ddpress/`), and its
  `/publications/` page is **404**. **A dead link is not a source and must not be recorded as a coverage gap
  in the data — it is a broken link on the government's own site, and belongs in the source finding.**

**Chhattisgarh — MAJOR: per-member MLA ATTENDANCE IS PUBLISHED. This is the THIRD jurisdiction found with it
(after Rajasthan and Haryana) and recon's flat "Attendance: NOT PUBLISHED" is wrong — the file is linked from
`main.htm`, the very page recon says it enumerated.**
- ✅ **`https://www.cgvidhansabha.gov.in/hindi_new/satra/sixth_assembly/MembersAttendence6thVidhansabha.pdf`**
  → **200, 331,343 B, 4 pages, 8,053 extractable characters**, titled for the **6th Vidhan Sabha**.
  **Per member × 11 session columns + a printed total**, from the House's first sitting (*"19-12-2023 से"*).
- ✅ **Measured: 84 member rows, member numbers 1–89. Every one of the 84 printed totals EQUALS the sum of
  that row's session columns (84/84 consistent, 0 discrepancies), and the sheet totals 5,143 attendance-days.**
  Sample row: *1- मान्यवर श्रीमती रेणुका सिंह सरूता 3 0 4 2 4 7 3 3 0 1 5 **32*** (3+0+4+2+4+7+3+3+0+1+5 = 32).
- ⚠️ **Coverage is 84 of 90, and the gap is specific**: member numbers **15, 33, 35, 36, 78 and 90 are absent
  from the sheet entirely.** Record the shape of the gap, do not round it to "all members".
- ⚠️ **A dash is a value, not a blank.** The sheet's own note reads *"जिनके हस्ताक्षर उपस्थिति पत्रक पर नहीं
  हैं, उनके नाम के आगे -(डैश) अंकित है"* — members who did not sign the attendance register are marked with a
  dash (**12 such cells**). A parser must distinguish `-` from `0`.
- ⚠️ **Text layer is legacy-font** (`eku-` = मान्यवर, `mifLFkfr` = उपस्थिति): **the numbers are exact, the
  names are garbled** — join to the roster by **member number**, which is printed, not by name.
- **How it was found, because the method matters: the link sits in `/hindi_new/main.htm`** (the news/updates
  frame, 79,870 B) as `satra/sixth_assembly/MembersAttendence6thVidhansabha.pdf`. **Recon enumerates exactly
  that page and still reports "no attendance page … anywhere on the official site"** — so this negative was
  not driven, it was missed. **Two other files were missed the same way on the same page:**
  `satra/sixth_assembly/6thAssemblyQtn.pdf` (per-member question counts, see Questions) and
  `vidheyak.htm` + `vidheyak/Vidheyak_Number.pdf` (the bill tiers, see Bills).
- ⚠️ **Note the site's own spelling: `MembersAttendence`, not `Attendance`.** A grep for `attendance` still
  matches it here, but a route-name scan for `attend` would be reading a file the state calls something else.
- Nothing else on the site carries attendance: the NeVA-style route family is absent, and the sweep across the
  frameset's pages returns this one PDF and no register, statistic or sitting-wise record besides it.

**Goa — none, and this is the most thoroughly driven negative so far.**
- **The answer is not "the page is a stub" — the word does not exist on the site.** Fetched **all 44
  distinct `.php` pages** linked from the homepage and grepped each: **0 pages contain "attendance"**
  (the string is likewise absent from `mlas.php`, `member_detail.php?mem_id=94` and the homepage).
- **The paperless SPA has no attendance route either.** Fetched all **36 JS bundles** behind
  `eassemblygoa.gov.in` (`app.*.js`, `vendor.*.js` and 33 chunks, incl. the 1.4 MB main chunk):
  **0 bundles contain "attendance"**, and its route table (**39 routes** — `/bill`, `/laq`, `/lob`,
  `/motion`, `/SearchArchives_*`, `/verbatim`, …) has **no attendance route**. Note
  `goavidhansabha.gov.in/questions.php` serves this same 3,745-byte SPA shell, not HTML.
- **NeVA does not fill the gap.** `goa.neva.gov.in/Member/Details/94` renders an **empty shell** —
  `Assurances No Records Founds`, `Debates No Records Founds`, `BILLS No Records Founds`, and **no
  attendance tab at all** (0 hits). `/Bill` and `/Questions` hit the **redirect trap** → `/Home/NeVA`.
  The page title carries the shared-template artifact *"Member Details | NeVA | **eVidhan- Himachal
  Pradesh**"*, confirming it is the unmodified national template.
- Goa therefore joins the majority; nothing was missed, it was never published.

**Madhya Pradesh — none.** 0 hits for `attendance`/`उपस्थिति` across the home, profile
index, bills and proceedings pages; NeVA `Member_ProfileDetail` has no attendance field and returns blank.
Matches the recon's "hard, absolute gap" — no attendance page, table, PDF or portal anywhere.

**Tamil Nadu — none.** A **46-page sweep** of the assembly site found **zero** `attendance`
hits; `attendance.php` returns **404**. No per-member, per-sitting or aggregate attendance anywhere —
matches the recon's "hard gap".

**Kerala — none published, but the sweep proved the register exists internally.**
- **203-page sweep** of the assembly site: **one** page contains "attendance", and it is not attendance *data* —
  it is the **Legislature Secretariat staff duty list** (`index.php/legislature_secretariat/index/sections`).
  Read in context (the UP lesson — do not dismiss a small hit), one duty reads: *"**To prepare the Assembly
  Attendance Registers of the Members and keep the same in safe custody.**"* Another: *"compilation of … details
  in respect of attendance of Members of Legislature … for being published in the official website"*.
- So the honest finding is stronger than "zero hits": **the attendance register is an internal Secretariat
  document, and no attendance figure is published** — not per member, not per sitting, not in aggregate.

**Karnataka — none published.** A **52-page sweep** of `kla.kar.nic.in` (English `attendance` +
Kannada `ಹಾಜರಾತಿ`/`ಹಾಜರಿ`) produced **one** hit — and it is not data: `assembly/legislature.htm`, the
Assembly's *history* page, in a sentence about 1891 ("…**the attendance at the meeting was voluntary**").
Read in context (the UP/Kerala lesson) it is narrative prose, not a register. So there is **no per-member,
per-sitting or aggregate attendance** anywhere official. The only figures in circulation are **ADR's**
"Karnataka MLAs Performance (2018–2023)" — **UNOFFICIAL**, not provenance.

**Telangana — none published.** A **38-route sweep** of the legislature site found **one** hit — and it is
not MLA attendance: the **`archives`** page carries a COVID-19 circular, *"Relaxation of Lock down - Hundred
Percent Attendance in the Government Offices"* (dated 04/07/2020). Read in context (the UP/Kerala/Karnataka
lesson) it is a **government-office** attendance directive, unrelated to the House. So there is **no per-member,
per-sitting or aggregate** MLA attendance on any official source, and the NeVA tenant returns "No Records
Founds".

**Odisha — none published.** A **53-page sweep** of `assembly.odisha.gov.in` produced **zero** hits for
"attendance", and the NeVA Odisha member tabs are the broken `MemberId=0` shells described below. There is
**no per-member, per-sitting or aggregate** MLA attendance on any official Odisha source. The only
attendance-adjacent artefact in circulation is an **ADR NGO report** — **UNOFFICIAL**, not provenance.

**NeVA (Odisha tenant) — empty shell, and provably so.** `Member_ProfileDetail?MemberId=1`, `…=2` and
`…=1383` all return the **byte-identical 2,291-byte** page (md5-equal), because the shipped markup hardcodes
`var Mid = '0'; var AssID = '0';` and never binds the id from the route. `/Member` and `/Member/Index` are
404 and `/Member/AllMembers` is 500. `/Bill`, `/Business`, `/Debates` and `/Committee` all 302 to the
**national** landing page (which then serves Gujarat and Himachal notices). **Do not use for Odisha.**

**Haryana — MAJOR CORRECTION: per-member attendance IS published, and it IS aggregated per member.**
- `SOURCES.md` states attendance is *"published per sitting, but NOT aggregated per member"* and that
  *"per-member attendance … [is] never aggregated"*. **Both halves are wrong.**
- **The documents are per _session_, not per sitting day.** `members-attendance/` (82,978 B) is a filterable
  index (House 1–15 · Year 1990–2026 · Session) with **85 PDF links**, e.g.
  `Members-Attendance-April-Session-2026.pdf`, `Members-Attendance-Budget-Session-2026.pdf`.
- **The grid is per-member, per-date, WITH a Total column.** Verified on *Budget Session 2026* (4 pp):
  header reads **"Attendance of Members of 15th Legislative Assembly, Haryana — Session 20.02.2026 to
  18.03.2026 — TOTAL SITTINGS = 13"**, with one column per sitting date plus **`Total`**:
  `1. Aditya Devilal, Ch., Dabwali-43, INLD | P P P P P P P P A A A P P | 10`,
  `2. Aditya Surjewala, Shri Kaithal-17, INC | P P P P P P A A A A P P P | 09`,
  `3. Aftab Ahmed, Ch., Nuh-79, INC | P×13 | 13`. The arithmetic is consistent (13 sittings → totals ≤13).
  The single-sitting *April Session 2026* PDF is the same shape (`Total 01` / `00`).
- **Three-state code: `P` present · `A` absent · `NR` not recorded** — `NR` is a distinct state, so do not
  read it as absence. In the April 2026 sheet, e.g. `Anil Vij, Shri | NR | NR`.
- **Reading:** born-digital **text** PDFs (`/BaseFont` 4, `/ToUnicode` 2, `/Image` 0) — extraction gives
  ~5,100–7,700 chars. No OCR. The date columns are awkward to parse (the header wraps as `20.02.\n2026`),
  so read the **`Total`** column for a per-member figure rather than summing the matrix blindly.
- **So Haryana is the second jurisdiction — after Rajasthan — with published per-MLA attendance, and it is
  cleaner:** an explicit per-member count against a stated sitting total, for the **current** 15th Assembly.

**Manipur — none published, and the sweep's hits are all one Act's title.** A **106-page sweep of every
sitemap URL** returned **4** hits — and all four are the same false positive: the title of
*"The Manipur Departmental Inquiries (**Enforcement of Attendance** of Witness and Production of Documents)
Act, 1989"*, which appears on the acts/enacted-bills page, the bills register, and both question pages. None
of them is MLA attendance. Read in context (the established lesson) rather than counted, the negative holds:
**no attendance page, table, PDF or portal on any official Manipur source**, and the sitemap contains no
attendance URL.

**Tripura — none published, but the FAQ proves the data exists internally.** The only "attendance" anywhere
on the portal is `Home/FAQ` item 17: *"How Members mark the attendance in the House?"* →
**"By touching attendance button in e-book and then place registered finger on biometric device to mark
attendance."** (byte-exact with the recon). That confirms attendance **is captured** — biometrically, through the
member e-book app — while **no attendance figure is published** for any member, sitting or aggregate. Record it
as *captured internally, not published*, which is a stronger and more useful statement than a bare "none".

**Meghalaya — none published.** On the NeVA tenant, `/Attendance`, `/MemberAttendance` and `/Members` all
return **404**, and `/Today`, `/Business`, `/Questions`, `/Bill` and `/Debates` each render **zero** "attendance"
strings. The Assembly's own site is a 7,144-byte Vue shell with ~6 links, so an href sweep finds nothing to
check — the JSON endpoints are the site. There is **no per-member, per-sitting or aggregate** MLA attendance
anywhere official.

**Sikkim — none published.** `/Attendance`, `/MemberAttendance` and `/Members` all return **404** on the NeVA
tenant, and the roster, `/Questions`, `/Bill`, `/ContactDirectory`, `/Today`, `/Business`, `/Debates` and
`/Committee` all render **zero** "attendance" strings. The Members-module sidebar lists Member by Assembly,
Panel of Chairpersons, Council of Ministers, Whip, Birthday, Male/Female, Nominated, First-Time Elected,
Bye-Election, Political Party, Constituency, Resigned/Deceased/Disqualified and Caste Category — **attendance
is not among them**. No per-member, per-sitting or aggregate MLA attendance exists officially.

**Uttar Pradesh — MAJOR CORRECTION. `SOURCES.md` says "Attendance: NOT PUBLISHED. No attendance data was
found on any official property." That is wrong — and it was found only by sweeping the site, not by
looking at member pages.**
- **The document exists and is official.** `uplegisassembly.gov.in/Library/pdf/Archives/upvs_upveshan_mla_upasthiti_1937_1993.pdf`
  (200, **8,876,170 B**) — *"उत्तर प्रदेश विधान सभा के उपवेशन और उनमें माननीय सदस्यों की उपस्थिति
  [1937–1993]"* — **"Sittings of the UP Legislative Assembly and the Attendance of Hon'ble Members,
  1937–1993"**. It is linked from the Assembly **Library** pages (`Library/HindiPages/Pustakalay_hi.aspx`,
  `Library/EnglishPages/Library_en.aspx`), which is why a member-page/tab sweep misses it.
- **Format: 132 pages, pure scan** (0 `/BaseFont`, 0 `/ObjStm`, 132 image XObjects, 0 `/ToUnicode`).
  **How to read it:** `qlmanage -t -s 3000` to render a page, then Tesseract **`-l hin`** against the repo's
  vendored model — `tesseract <png> - -l hin --tessdata-dir work/election-atlas/tools/tessdata`. Homebrew's
  Tesseract ships only `eng/osd/snum`, so the vendored `hin.traineddata` is what makes this readable.
- **What it contains:** the bulk is a **date-wise sitting register** —
  `दिनांक | वर्ष | दिन | खण्ड संख्या | उपस्थिति संख्या` — for every sitting 1937→1993 (e.g. Sept 1958: 346,
  361, 300, 351…; Apr 1988: 374, 408, 364…). It closes with a substantive narrative on **members whose
  membership was terminated for long absence**, naming individuals (श्री अख्तर आंदिल, श्रीमती महारानी
  जगदम्बा देवी) and discussing leave applications and missing medical certificates.
- ⚠️ **Honest limit — it is not a per-member table.** Verified across pages 20 / 52 / 110: what the book
  tabulates is **house-level attendance COUNTS per sitting date**, not rows of members. The per-member names
  live one tier down, and the book's own preface says so: from **1957–1984 the names of all *present*
  members were published day-by-day in the proceedings**, and from **1985 onward only *absent* members were
  named** (the rest deemed present) — so per-member attendance for that span is derived from the
  **कार्यवाही (proceedings)**, which the Assembly also publishes. **I did not verify the proceedings side.**
- **Current House (18th Assembly, 2022–): still nothing.** A sweep of **134 pages** on the assembly site
  produced exactly **4** matches for `attendance`/`उपस्थिति` — all four on the Library pages, all four this
  same archival book. NeVA `/Attendance`, `/attendance`, `/MemberAttendance` and `/Member/Attendance` are
  all **404**.
- **Lesson worth generalising:** the recon searched for attendance *pages and tabs*. The data was a
  **library publication**. A negative for "attendance" must sweep **every page**, including Library/archives,
  before it is recorded.

Rajasthan is the **first** jurisdiction found with per-MLA attendance, and **Haryana is the second**
(per-member P/A/NR matrix with an explicit `Total`, per session). Everywhere else: none.

| State/UT | Working source | Kind | Status |
|---|---|---|---|
| Rajasthan | https://assembly.rajasthan.gov.in/MemberAttendance/MemberWiseAttendance.aspx | official assembly | ✅ **per-member signed / not-signed days, all 200 MLAs, per session** |
| Punjab | — | — | **none** — endpoint live but empty (112 calls, 0 rows) |
| Goa | — | — | **none** — 0 hits across 44 site pages and 36 SPA bundles |
| Uttar Pradesh | https://uplegisassembly.gov.in/Library/pdf/Archives/upvs_upveshan_mla_upasthiti_1937_1993.pdf | official assembly | ⚠️ **historical only (1937–1993)** — date-wise attendance counts; per-member names live in the proceedings. **Current House: none** |
| Madhya Pradesh | — | — | **none** — 0 hits across home/profile/bills/proceedings; NeVA `Member_ProfileDetail` blank |
| Tamil Nadu | — | — | **none** — 46-page sweep 0 hits; `attendance.php` 404; no per-member or per-sitting record |
| Kerala | — | — | **none** — 203-page sweep, only hit is the Secretariat *staff duty list* naming the internal register |
| Karnataka | — | — | **none** — 52-page sweep, 1 hit = a *historical narrative* ("attendance at the meeting was voluntary") |
| Telangana | — | — | **none** — 38-route sweep, 1 hit = a *COVID lockdown circular* ("Hundred Percent Attendance in the Government Offices") |
| Odisha | — | — | **none** — 53-page sweep, **0 hits** |
| Haryana | https://haryanaassembly.gov.in/members-attendance/ | official assembly | ✅ **per-member WITH an explicit `Total` column, per session** (P/A/NR matrix) — **counter to the recon's "never aggregated"** |
| Manipur | — | — | **none** — 106-page sitemap sweep; all 4 hits are one 1989 Act's title ("Enforcement of Attendance of Witness") |
| Tripura | — | — | **none published** — only hit is the *FAQ* explaining the biometric *mechanism* |
| Meghalaya | — | — | **none** — NeVA `/Attendance` `/MemberAttendance` `/Members` all **404**; 0 attendance strings on every other route |
| Sikkim | — | — | **none** — `/Attendance` `/MemberAttendance` `/Members` all **404**; 0 strings on every other route |
| Mizoram | — | — | **none** — 25-route assembly sweep + all NeVA routes = **0 hits**; the only "attendance" strings in the whole corpus are *"Medical Attendance Rules"* |
| West Bengal | — | — | **none** — the register **exists by rule** (Members Handbook §7) but is unpublished; NeVA sweep 0 hits (eng + উপস্থিতি), `/Attendance` `/MemberAttendance` `/Members` **404** |
| Jharkhand | — | — | **none** — 91 + 366 = **457 assembly pages** and 13 NeVA routes = 0 hits (Eng + उपस्थिति); `/sitemap` 31 routes = 0; `/Attendance` `/MemberAttendance` `/Members` **404** |
| Himachal Pradesh | — | — | **none** — 21 NeVA routes + 72 state-portal pages = **0 hits** (Eng + उपस्थिति); the 3 portal hits were a *biometric staff* link, *Lok/Rajya Sabha MP* datasets on data.gov.in, and a *video-conference* form |
| Jammu and Kashmir | — | — | **none** — 18 NeVA routes + the member page and its tabs = **0 hits**; the only "attendance" string in the whole jurisdiction is a *Civil Secretariat staff* biometric link (`basreports.attendance.gov.in`) |
| Ladakh | **not applicable — no legislature** | — | 121/123 UT pages swept: **0 legislature attendance, 0 `MLA` strings**; the 3 "attendance" hits are *staff biometric*, an *Independence Day staff circular* and a *girls' school scholarship* |
| Andaman & Nicobar Islands | **not applicable — no legislature** | — | 83 portal pages swept: **0 real-text `MLA`/`attendance` hits**; the lone `MLA` match was inside a **PDF** saved as `.html` |
| Lakshadweep | **not applicable — no legislature** | — | 120/121 portal pages swept: **0 real-text `MLA`/`Vidhan Sabha` hits**; the 3 "attendance" hits are *Medical Attendance Rules*, *school attendance*, and *staff attendance for salary bills* |
| Uttarakhand | — | — | **none** — 16 NeVA routes + member tabs = **0 hits** (Eng + उपस्थिति); assembly nav (131 routes, pre-auth snapshot) has **no attendance route**; `/Attendance` `/MemberAttendance` `/Members` **404** |
| Nagaland | — | — | **none** — 17 NeVA routes (incl. **3 spelling variants** of the attendance route, all 404) + **41/41** NLA pages + its 23-page REST API = **0 hits** |
| Chandigarh | **not applicable — no legislature** | — | 118-link sitemap: **0 assembly/MLA hits, 0 attendance**; no House to attend |
| Puducherry | — | — | **none** — 16 NeVA routes = **0 hits**; `/Attendance` `/MemberAttendance` `/Members` `/Member/Attendance` all **404** |
| Delhi | — | — | **none** — **89/89 sitemap pages** + 16 NeVA routes swept; **0 routes named attendance**; the 2 hits are a *statutory power to require attendance* and *Medical Attendance Rules* |
| Chhattisgarh | https://www.cgvidhansabha.gov.in/hindi_new/satra/sixth_assembly/MembersAttendence6thVidhansabha.pdf | official assembly | ✅ **per-member attendance, 6th Assembly — 84 members × 11 sessions + printed total**, 84/84 totals reconcile, 5,143 attendance-days; ⚠️ **84 of 90** (nos. 15/33/35/36/78/90 absent); dash = did-not-sign |
| Dadra and Nagar Haveli and Daman and Diu | **not applicable — no legislature** | — | **97/105 portal pages swept: `attendance` 0**; also `MLA` 0, `speaker` 0; `secforuts.mha.gov.in` UT page: **`MLA` 0, `Legislative Assembly` 0** vs 33 `Panchayat` / 20 `Municipal`; no House to attend |
| Bihar | https://vidhansabha.bihar.gov.in/pdf/Sitting%20of%20bihar%20legislative%20assembly.pdf | official assembly | ⚠️ **sitting register only — per SESSION, not per member**: 214 rows, **1952 → 2026**, current through the 18th Assembly's 3rd Session; ❌ **no per-member attendance** (96 sitemap pages swept, 3 hits all non-legislative; 6 NeVA attendance routes all 404) |
| _all others_ | — | — | pending review — **5 jurisdictions not yet swept:** Andhra Pradesh, Arunachal Pradesh, Assam, Gujarat, Maharashtra |

**Delhi — none, and the negative is driven across the entire assembly sitemap and the whole NeVA route set.
Both surviving hits are read and neither is an attendance record.**
- **The assembly site was swept exhaustively.** `/sitemap` → **200, 47,727 B** (`/sitemap.xml` → **404**, so
  the working path is `/sitemap` with no extension) enumerating **89 internal paths — all 89 fetched**.
  **Grep for `attendance` / `Attendance` / `उपस्थिति`: 2 files, both non-legislative, and `उपस्थिति` 0.**
  - `dlas` **Delhi Metropolitan Council** history page — *"the Administrator may attend and address any meeting
    of the Metropolitan Council and may for that purpose **require the attendance of members**"*. A
    **statutory power to compel attendance at the LG's address**, not a register.
  - **Salary and Allowances** page — *"in accordance with the **Medical Attendance Rules** and the DGEHS"* and
    *"Daily Allowance … for **attending** Assembly session/committee meetings"*. **Allowance rules, not data.**
- **Route-name screening, not just grep:** **0 of the 89 sitemap paths contain `attend`, `upasthiti`, `hazir`
  or `hajari`** — so there is no page to have missed, and the Library/publications pages are inside the swept
  set (`dlas-govt-bills`, the question archive, `sitemap` itself, all clean).
- **NeVA sweep — 16 routes, 0 hits.** `/`, `/Today`, `/Business`, `/Questions`, `/Bill`, `/Committee`,
  `/Debates`, `/ContactDirectory`, `/ContactDirectory/MenuContactDirec`, `/Home/DigitalLibrary`,
  `/AssemblyDocs/DigitalLibrary`, `/Notice/Index/DL`, and the attendance family **`/Attendance`,
  `/MemberAttendance`, `/Members`, `/Member/Attendance`** → **all four 404 (1,245 B)**;
  `/AssemblyDocs/DigitalLibrary` → 500 (1,208 B).
  **Four spelling variants probed — the module does not exist under any naming convention.**
- **Verdict:** no per-member, per-sitting or aggregate MLA attendance is published by Delhi in any form.
  Recon's *"NOT PUBLISHED AT ALL… the clearest gap"* survives verification unchanged. Delhi joins the
  majority (Sikkim, Meghalaya, Tripura, Manipur, Kerala, Karnataka, Telangana, Odisha, Tamil Nadu, MP, Goa,
  Mizoram, West Bengal, Jharkhand, Himachal Pradesh, Uttarakhand, Nagaland, Puducherry).

**Chandigarh — no attendance, because there is no House.** Its 118-link sitemap contains **0** assembly,
MLA or attendance strings. See the **"Chandigarh — NOT A GAP"** block under **Bills**.

**Puducherry — none.** **16 NeVA routes swept, 0 occurrences of `attendance`**; `/Attendance`,
`/MemberAttendance`, `/Members` **and `/Member/Attendance`** all **404 (1,245 B)**. Four spelling variants
tested — the module does not exist under any naming convention.

**Nagaland — none, and the negative is driven across NeVA (including the 404 family), the whole Assembly
Secretariat site, and its REST API.**
- **NeVA sweep — 17 routes, 0 hits.** `/`, `/Today`, `/Business`, `/Questions`, `/Bill`, `/Committee`,
  `/Debates`, `/ContactDirectory`, `/ContactDirectory/MenuContactDirec`, `/Home/DigitalLibrary`,
  `/AssemblyDocs/DigitalLibrary`, `/Notice/Index/NL`, `/News`, and the attendance family
  **`/Attendance`, `/MemberAttendance`, `/Members`, `/Member/Attendance`** — grepped for `attendance`:
  **zero on every route.** All four attendance-family routes → **404 (1,245 B)**;
  `/AssemblyDocs/DigitalLibrary` → **500 (3,531 B)**.
- ⚠️ **I probed BOTH route shapes for per-member attendance** — recon tested `/Member/Attendance` and
  `/Attendance`; I added **`/MemberAttendance`** (the spelling other NeVA states use) — **also 404**.
  **Three spelling variants, all 404: the module does not exist under any naming convention.**
- **The Assembly Secretariat's site is clean too — and this is the Library-equivalent check.**
  `nla.nagaland.gov.in` (200, 233,193 B, WordPress + **Divi v.4.24.3**): **42 internal links, 41/41 fetched**;
  **`attendance` 0, `Attendance` 0, `उपस्थिति` 0.** The single `MLA` hit is **news prose**, not a record —
  *"Shri. Benei M. Lamthiu, MLA and Chairperson of the Committee on Petitions convened an Introductory Meeting…"*.
  Its nav (`about-assembly-secretariate`, `chief-minister`, `deputy-speaker`, `governor`, `committees`,
  `notifications`, `organization-structure`, `profile`, `rti`, `history`) contains **no members/roster route
  and no attendance route** — so there is no page to have missed.
- **The REST API agrees.** `nla.nagaland.gov.in/wp-json/wp/v2/pages?per_page=100` → **200, 185,898 B,
  23 pages**, **0 occurrences of `attendance`/`Attendance`**, all titles administrative. A machine-readable
  enumeration of the site's content, with no attendance in it.
- **Verdict:** no per-member, per-sitting or aggregate MLA attendance is published by Nagaland in any form.
  Recon's *"This is a hard gap"* survives verification unchanged. Nagaland joins the majority (Sikkim,
  Meghalaya, Tripura, Manipur, Kerala, Karnataka, Telangana, Odisha, Tamil Nadu, MP, Goa, Mizoram,
  West Bengal, Jharkhand, Himachal Pradesh, Uttarakhand).

**Uttarakhand — none, and the negative is driven across NeVA, the member tabs, the whole assembly nav and the
Library page.**
- **NeVA sweep — 16 routes, 0 hits in English and Devanagari.** `/`, `/Today`, `/Business`, `/Questions`,
  `/Bill`, `/Committee`, `/Debates`, `/ContactDirectory`, `/ContactDirectory/MenuContactDirec`,
  `/Home/DigitalLibrary`, `/AssemblyDocs/DigitalLibrary`, `/Attendance`, `/MemberAttendance`, `/Members`,
  `/Notice/Index/UK`, `/News` — grepped for **`attendance` and `उपस्थिति`**: **zero in both on every route.**
  `/Attendance`, `/MemberAttendance`, `/Members` → **404 (1,245 B)**; `/AssemblyDocs/DigitalLibrary` → **500 (3,727 B)**.
- **The member page and its tab set are clean.** `/Member/Details/28?AssemblyID=5` → **0 attendance strings**;
  the tabs are **सामान्य | प्रश्न | नवीनतम सूचना | आश्वासनों | समिति | वाद-विवाद | विधेयक** — there is **no
  attendance tab**. (`/Member/Member_Assurance` and `/Member/Member_Debate` render as tabs; the endpoints are
  `/Member/Member_Question` and `/Member/Member_Notice`, both live.)
- **The assembly site's entire navigation contains no attendance route.** Because the host is **401 Basic Auth**
  to this network, I read the **pre-auth Wayback snapshot** instead and enumerated **all 131 internal links**:
  the sections are `document-category` (46 URLs), `agenda-YYYY` (2001–2025), `ad-hoc-committees`,
  `budget-speech`, `condolences`, `contacts`, `direction-regarding-proceedings`, plus
  **`/vidhan-sabha-library/`**. **Not one of the 131 is attendance-related.**
- ✅ **The Library page was checked explicitly (the UP rule) and is clean.** `/vidhan-sabha-library/`
  (pre-auth capture, 200, 92,961 B) → **0 `attendance`, 0 `उपस्थिति`, 0 PDF links** — it is a descriptive
  page, not a document archive. Its neighbouring CMS folder `department104/library_file/*.pdf` exists, but the
  live fetches are **401** and the 2026-09 Wayback captures are **also 401** (the auth predates them).
- **Route-name screening, not just grep:** across the pre-auth nav there is **no route whose name contains
  `attend`, `upasthiti`, `hazir` or `hajari`** — so there is no page to have missed.
- ⚠️ **The other half of the sweep is behind 401 and is recorded as a coverage limit, not as a pass**:
  the assembly's own site is **not clean, it is unreadable** — re-tested as `401 Unauthorized` /
  `WWW-Authenticate: Basic realm=""` on `/`, on `/dpages/present-members`, over both `http://` and `https://`.
- **Verdict:** no per-member, per-sitting or aggregate MLA attendance is published by Uttarakhand in any form.
  It joins the majority (Sikkim, Meghalaya, Tripura, Manipur, Kerala, Karnataka, Telangana, Odisha, Tamil Nadu,
  MP, Goa, Mizoram, West Bengal, Jharkhand, Himachal Pradesh).

**Andaman & Nicobar Islands and Lakshadweep — no attendance, because there is no House to attend.** See
the **"NOT GAPS"** block under **Bills**. A&N: **83 pages swept, 0 real-text hits** (the single `MLA` match
was binary — a PDF mis-saved as `.html`; always check the file type before believing a hit). Lakshadweep:
**120 of 121 pages, 0 real-text `MLA`/`Vidhan Sabha`/`Vidhayak` hits**; its three "attendance" hits are all
non-legislative and were read — **Medical Attendance Rules**, **school attendance**, and *"Furnishing of
attendance particulars of Senior Officers for preparation of salary bills"* (Standing Orders, 24/11/2023).

**Ladakh — no attendance, because there is no House to attend.** See the **"Ladakh — NOT A GAP"** block
under **Bills**. Swept **121 of 123** links on `ladakh.gov.in`: **0 legislature-attendance records and 0 `MLA`
strings anywhere**. The only three "attendance" hits were read and are non-legislative — a **GAD circular on
"Attendance of Officers/Officials"** for Independence Day 2026, the School Education Department's **"Girls'
attendance scholarship"**, and **NIC Kargil "Biometric Attendance"** (staff).


**Jammu and Kashmir — none, and the two "attendance" hits in the whole jurisdiction are a staff biometric
system rather than a legislature record.**
- **NeVA sweep — 18 routes, 0 hits in both English and Devanagari/Urdu terms.** `/`, `/Today`, `/Business`,
  `/Questions`, `/Bill`, `/Committee`, `/Debates`, `/ContactDirectory`,
  `/ContactDirectory/MenuContactDirec`, `/Home/DigitalLibrary`, `/AssemblyDocs/DigitalLibrary`,
  `/Notice/Index/JK`, `/News`, `/Home/Demandsgrants`, `/Home/RulesAndDirection`, `/Attendance`,
  `/MemberAttendance`, `/Members`. `/Attendance`, `/MemberAttendance`, `/Members` → **404 (1,245 B)**;
  `/AssemblyDocs/DigitalLibrary` → **500 (3,531 B)**.
- **The member page and its tabs are clean too.** `/Member/Details/68?AssemblyID=1` → 0 attendance strings,
  and the tab set is **General | Questions | Notice | Assurances | Committee | Debates | BILLS** —
  **there is no attendance tab.**
- ⚠️ **Both hits in the entire jurisdiction were read (the UP/Kerala rule).** `jkgad.nic.in` — the GAD order
  repository — contains exactly one "attendance" string, repeated on its home and order-search pages, and it is
  a menu link: *"**BAS Report for Civil Secretariat**"* →
  `https://basreports.attendance.gov.in/unibasreports/index.php?redirectwith=jandk`.
  **That is the national Biometric Attendance System for Civil Secretariat *staff*, not MLAs.** (Incidentally
  the J&K GAD menu links it over **plain `http://`** on one page and `https://` on the other — a mixed-content
  slip, not a data source.)
- `https://jk.gov.in/` — the UT apex portal — **still never responds**: `000`, 0 bytes after 25 s on **both**
  `http://` and `https://`, with the A record live at `164.100.223.4`. **Recon's "resolves but never responds"
  is confirmed**, and it means the apex portal is **not** part of this sweep — recorded as a coverage limit.
- `www.jklegislativeassembly.nic.in` (the dead standalone assembly site) → **NXDOMAIN** confirmed.
- **Verdict:** no per-member, per-sitting or aggregate MLA attendance is published by Jammu & Kashmir in any
  form, and no document found describes an internal register either. It joins the majority (Sikkim, Meghalaya,
  Tripura, Manipur, Kerala, Karnataka, Telangana, Odisha, Tamil Nadu, MP, Goa, Mizoram, West Bengal,
  Jharkhand, Himachal Pradesh).

**Himachal Pradesh — none, and every small hit was read before the negative was recorded.**
- **NeVA sweep — 21 routes, 0 hits.** `/`, `/Today`, `/Business`, `/Questions` (+ `?IsStateDashBoard=True`),
  `/Bill` (+ dashboard variant), `/Committee`, `/Debates`, `/ContactDirectory`,
  `/ContactDirectory/MenuContactDirec`, `/Home/DigitalLibrary`, `/AssemblyDocs/DigitalLibrary`,
  `/Notice/Index/HP`, `/News` (232,039 B), `/Home/RulesAndDirection`, `/Home/RightToInformation`,
  `/Home/Demandsgrants`, `/Attendance`, `/MemberAttendance`, `/Members` — grepped each for **"attendance"
  AND "उपस्थिति"**: **zero in both on every route.**
  `/Attendance`, `/MemberAttendance`, `/Members` → **404 (1,245 B)**; `/AssemblyDocs/DigitalLibrary` → **500 (3,727 B)**.
- **HP state portal sweep — 72 pages fetched and grepped; exactly 3 contain "attendance", and all three are
  non-MLA (this is the UP/Kerala rule — a small hit count is not noise, it must be read):**
  1. **Kinnaur district site** → *"**Online Biometric Attendance**"* — a staff attendance link in the
     district's IMPORTANT LINKS block. Not a legislature record.
  2. **`data.gov.in` (OGD Platform India)** → its category list contains
     *"Attendance of Students"*, *"**Attendance of the Members of Lok Sabha**"* and
     *"**Attendance of the Members of Rajya Sabha**"*. ⚠️ **These are national MP datasets — the
     parliamentary tier, not HP MLAs.** They confirm the **MLA-vs-MP** split explicitly: MP attendance is
     published nationally; HP MLA attendance is not published at all. Do not import them.
  3. **HPVC (NIC HP State Centre, Shimla)** → *"**VC Attendance Form**"* in its Related Links — a
     **video-conference** meeting attendance form, not legislative attendance.
- **`planning.hp.gov.in` (Planning Department home, 200, 36,091 B): 0 attendance hits**, and none of the four
  MLA-priority documents it links contains attendance data.
- **`hpvidhansabha.nic.in` remains unreachable** (TCP timeout on :80 and :443, re-confirmed), so the
  state-branded copy of the assembly site was **not** part of the sweep — recorded as a coverage limit, not
  as a clean page.
- **No sitemap route exists to have missed**: the HP NeVA instance exposes no `/sitemap`, and the assembly's
  own site is the NeVA tenant itself.
- **Verdict:** no per-member, per-sitting or aggregate MLA attendance is published by Himachal Pradesh in any
  form — matching the recon, which is one of the few HP claims that survived verification unchanged. It joins
  the majority (Sikkim, Meghalaya, Tripura, Manipur, Kerala, Karnataka, Telangana, Odisha, Tamil Nadu, MP,
  Goa, Mizoram, West Bengal, Jharkhand).

**Jharkhand — none, and the negative is driven over 457 fetched pages plus the sitemap route table.**
- **Assembly site sweep — 91 links from the homepage, then 818 second-level links; no relative-URL
  shortfall.** Fetched **91/91** first-level pages (the fetch count equals the link count — the UP trap
  checked and clear) and **366 of 400 sampled second-level pages**. Grepped every one for **`attendance`
  and the Hindi `उपस्थिति`**: **zero hits in both.**
- **The sitemap is the complete route table and it agrees.** `/sitemap` → **200, 49,948 B**, **31 internal
  routes** enumerated, **0** occurrences of `attendance`. (Note `/sitemap.xml` is **404** — the working path
  is `/sitemap` with no extension.)
- **The nav itself has no attendance entry.** The homepage menu is fully enumerated: राज्यपाल और अभिभाषण,
  मंत्रि मण्डल, समितियाँ एवं विशेष समितियाँ, सभा के कार्यवाहक (Protem Speaker/Speaker/Deputy Speaker/CM/…),
  वेतन और सुविधाएँ, प्रस्ताव (विश्वास/अविश्वास), संपर्क, **विधानसभा अपडेट**, **असंशोधित कार्यवाही**,
  **झारखण्ड विधानसभा सदस्यों की सूची**, **विधानसभा सत्र** (षष्ठम्/पंचम/चतुर्थ/तृतीय), अध्यक्षीय कार्यालय,
  विधायी शोध संदर्भ एवं प्रशिक्षण कोषांग, **विधानसभा पत्रिका**, निविदा, Recruitment, YouTube —
  **no attendance item.**
- **NeVA sweep — 13 routes, 0 hits, 404s on the attendance family.** `/`, `/Today`, `/Business`, `/Questions`,
  `/Bill`, `/Committee`, `/Debates`, `/ContactDirectory/MenuContactDirec`, `/Home/DigitalLibrary` all **200
  with 0 hits** (English *and* Hindi); `/Attendance`, `/MemberAttendance`, `/Members` → **404 (1,245 B)**;
  `/AssemblyDocs/DigitalLibrary` → **500 (3,727 B)**.
- ⚠️ **A small hit count was read, not dismissed (the UP rule).** The only "attendance" string in the entire
  Jharkhand sweep surfaced on the **state portal** `www.jharkhand.gov.in` (200, 276,061 B) — and it is
  **`AEBAS`**, the *Aadhaar Enabled Biometric Attendance System*, sitting in the portal's list of service
  links between *Passport*, *Jharkhand High Court*, *Single Window System*, *GST* and *JharSewa*. It is a
  **staff** attendance system for government offices, not an MLA record. Nothing else was found.
- **The roster PDF is clean too** — the Sixth Assembly list has **0** occurrences of `attendance` /
  `उपस्थिति` across all 6 pages.
- **Verdict:** no per-member, per-sitting or aggregate MLA attendance is published by Jharkhand in any form.
  ⚠️ Unlike West Bengal — where the Members Handbook documents the internal register and its retention rule
  — **no Jharkhand document found describes an internal attendance register either**, so this is a gap on
  both the publication *and* the mechanism side. It joins the majority (Sikkim, Meghalaya, Tripura, Manipur,
  Kerala, Karnataka, Telangana, Odisha, Tamil Nadu, MP, Goa, Mizoram, West Bengal).

**West Bengal — none published, but the *mechanism* is officially documented, which makes the negative
precise rather than vague.**
- **The Assembly *does* keep a signed per-member attendance register, and the official Members Handbook
  says so.** `OtherPDF/HandBookMembers.pdf` (396 pages, archived; **116,259 chars extractable from the first
  60 pages**) — the only meaningful hit in a whole-document sweep:
  > **"7. Attendance Register: A member is required to sign the Attendance Register on the days he attends
  > the sittings of the House. For the convenience of members, printed lists of the names of members which
  > serve as Attendance Register for each days are placed daily on a table in the Lobby during meeting
  > days."**
  The same section notes Art. 190(4) — a seat falls vacant after 60 days' unexcused absence — and Rules
  242/243 on leave of absence. So the data exists **in physical, daily, signed form**. It is simply never
  published. (The parallel with Kerala is exact: there the sweep found a Secretariat duty list saying
  *"To prepare the Assembly Attendance Registers of the Members and keep the same in safe custody."*)
- ⚠️ **All 8 other "attendance" hits in that Handbook were read before recording the negative, and none is
  attendance *data*:** *"Medical **Attendance** Rules"* (×2), *(Presiding Officers' Medical **Attendance**)
  Rules, 2010*, *"(West Bengal Ministers … Medical **Attendance**) Rules, 1969"*, the daily-allowance clause
  *"every day of **attendance** in the sitting…"*, and the Governor *"may require the **attendance** of
  members"* (Art. 175). This is the UP/Kerala lesson applied: a small hit count is not noise.
- **NeVA sweep — 0 hits, and 404s.** Fetched 17 routes (`/`, `/Today`, `/Business`, `/Questions`,
  `/Questions?IsStateDashBoard=True`, `/Bill` (+dashboard variant), `/Committee`, `/Debates`,
  `/ContactDirectory`, `/ContactDirectory/MenuContactDirec`, `/Home/DigitalLibrary`, `/AssemblyDocs/DigitalLibrary`,
  `/Home/NeVA`, `/Attendance`, `/MemberAttendance`, `/Members`) and grepped each for **"attendance" *and*
  the Bengali "উপস্থিতি"**: **zero** in both, on every route. `/Attendance`, `/MemberAttendance` and
  `/Members` return **404 (1,245 B)**; `/AssemblyDocs/DigitalLibrary` returns **500 (3,531 B)**. The
  member-detail tab set (সাধারণ / প্রশ্ন / লক্ষ্য করুন / নিশ্চয়তা / কমিটি / বিতর্ক / বিল) contains **no
  attendance tab**.
- **The assembly site's own route table contains no attendance control either** — derived from the archived
  homepage, which exposes **all 64 `__doPostBack` targets** (`btn_MList`, `btn_WhosWho`, `btn_question`,
  `btn_bp1..3`, `btn_lob`, `btn_Proc`, `btn_library`, `btn_ACT`, `btn_ORD`, `btn_BI*`, `btn_BCOM`,
  `btn_BWID`, `btn_EM`, `btn_nom`, `btn_CV`, `btn_Bye`, `btn_party`, `btn_Gender`, `btn_facility`, …).
  **Not one is attendance-related**, and the string count on the archived homepage is **0** (English *and*
  Bengali). So this is the site's complete enumeration, not a partial crawl.
- **Also swept and clean:** `LMLA.pdf` (110 pages, **0** hits for `attendance`, `Attendance`, `উপস্থিতি`,
  `quorum`, `sitting`), `BCRBook.pdf` (1,184 pages — *Rules of Procedure and Conduct of Business*, 83,285
  chars sampled, **0** hits), the NeVA homepage and `/Home/NeVA` (192,559 B, 0 hits), and
  `ceowestbengal.wb.gov.in` (65,427 B, 0 hits).
- ⚠️ `Act_1947_2018.pdf` (9,182,600 B) **could not be parsed** — `PdfStreamError: Stream has ended
  unexpectedly` (a truncated archived download). Recorded as **not read**, not as "no hits".
- **Verdict:** no per-member, per-sitting or aggregate MLA attendance is published by West Bengal in any
  form — but unlike a bare "0 hits" sweep, the internal register and its retention rule are documented, so
  the gap is a **publication gap, not a practice gap**. Reported party-level absenteeism exists only in news
  reporting (ANI/NDTV/TOI, 2023) and is **out of scope** as unofficial.

**Mizoram — none, and the sweep was driven across both platforms plus the Library equivalents.**
- **Assembly site, 25 route types fetched and grepped: zero "attendance"** — `/`, `/members`,
  `/members/details/*`, `/assembly` (Ex-Members), `/question`, `/government-bill`, `/private-bill`,
  `/proceeding`, `/bulletin`, `/calendar`, `/resolution`, `/list-of-business`, `/gazette`,
  `/committee-reports`, `/committees`, `/budgetspeech`, `/governor-speech`, `/election`, `/gallery`,
  `/downloads/forms`, `/downloads/others`, `/seniorofficers`, `/page/*`. `/sitemap.xml` is **404**
  (Laravel "Not Found"), so there is no second route list to check — the nav is fully enumerated and
  adds nothing.
- **NeVA, all fetched routes: zero "attendance"** — `/`, `/ContactDirectory/*`, `/Member/Details/{id}`,
  `/Member/Member_Question`, `/Questions`, `/Questions/FetchDataList*`, `/Questions/FetchUnListQuestions`,
  `/Bill`, `/Today`, `/Business`, `/Committee`, `/Debates`. The member-detail tab set is
  **General | Questions | Notice | Assurances | Committee | Debates | BILLS** — **there is no attendance
  tab**, exactly as the recon says. (Recon's claim is right here, unlike its questions claim.)
- **The Library-equivalent sweep found 2 hits, and reading them is what makes the negative clean.**
  `/downloads/others` links a 114-page **"Compilation of Salaries Acts and Rules for Legislators of
  Mizoram"** (Third Edition, up to November 2020) whose only two "attendance" strings are
  **"**Medical Attendance** Rules"** — a hospital-treatment entitlement for the Speaker, Deputy Speaker
  and Ministers, *not* legislative attendance. Also grepped: `/downloads/others` bill/act PDFs,
  **`/proceeding` PDFs (all rows), bulletin PDFs, governor-speech PDFs, the 30-Years and "MLA at Work"
  commemorative volumes (160 and 86 pages, both pure scans, 0 chars) and the `/gallery` (551,839 B)** —
  **0 candidates**.
- ⚠️ **The only residual per-sitting attendance trace is the usual one and it is not a register:** the
  **proceedings/verbatim** record. Note that **`/proceeding`'s Download links are WRONG** — every row's
  href points into `/storage/governor-speeches/…` (verified: the row for *30/11/2017* links
  `PMIZ-01M0W3NGRHHJ4FPGG6DJC4ZAB6.pdf`, a governor's speech). **A link's target can be a different
  document type than its label** — read the file, do not trust the row. Regardless, no proceedings or
  bulletin PDF sampled contains an attendance figure.
- **The internal register is implied, not published.** The legislature maintains one (any Assembly must),
  and the Salaries compilation governs members' allowances — but **no per-member, per-sitting or aggregate
  MLA attendance document exists on any Mizoram government domain**. This joins the majority (Sikkim,
  Meghalaya, Tripura, Manipur, Kerala, Karnataka, Telangana, Odisha, Tamil Nadu, MP, Goa). Mizoram is
  **not** a Rajasthan/Haryana-style per-MLA attendance state.

**Rajasthan — MAJOR CORRECTION. `SOURCES.md` records attendance as "ADVERTISED BUT NOT
RETRIEVABLE" with "no attendance figure … obtainable". That is wrong — the data is public.**
- **The postback works.** Two steps: (1) POST the house dropdown → a session list
  (`सत्र संख्या | बैठक की अवधि`, e.g. session 5 = 28/01/2026 to 10/03/2026); (2) POST that session's
  `__doPostBack` LinkButton → the per-member grid:
  `क्र.सं. | विभाजन संख्या | सदस्य का नाम | सदस्य द्वारा हस्ताक्षरित दिवस | सदस्य द्वारा अनहस्ताक्षरित दिवस`.
- Verified across **three sessions → 200 / 200 / 195 member rows**, with real variance
  (days signed 0–3, days not signed 0–2) — not a stub, not all-zero.
- **Why the recon got it wrong (and I nearly repeated it):** the house dropdown's option
  **display text is `16` but its `value` is `4`**. POSTing the *displayed* number returns
  `302 → /404?aspxerrorpath=…`; POSTing `4` returns the data. The same display/value split exists
  on the sibling report (`DatewiseAttendanceStatus.aspx`).

**Punjab — none, and this time the negative was *driven*, not inherited.**
- The endpoint is real and correctly shaped —
  `Members/GetAllMemberAttendanceDates_Neva_Latest?AssemblyID=16&SessionID={s}&MemberID={m}`, returning
  the `{sessionDates, Attendancestatus}` JSON the page's own JS expects — it is simply **unpopulated**.
- Swept **14 sessions × 8 members = 112 calls → 0 non-empty**. The rendered profile tab agrees
  ("No Record Found"), and the **sitemap shows no attendance route at all** — the tab is its only entry
  point, so there is nothing else to drill into.
- **Two traps recorded so this is not re-probed as broken.** (1) The page hardcodes
  `var defaultSessionID = '42'` — a NeVA template leftover, and **42 is not one of the 14 real session
  IDs** (397, 389, 388, 386, 379, 200, 194, 193, 188, 187, 173, 172, 171, 170); calling 42 returns `[]`
  and means nothing. (2) The Members and Questions routes use **different session-ID namespaces**
  (Members `397` ↔ Questions `185` for the same session) — posting one into the other is silently wrong.
- **Web-search last resort: no alternative source, and one that will mislead.** No news article, RTI
  report or third-party tracker publishing Punjab *MLA* attendance was found — the only systematic
  figures are for **Punjab MPs** (`sansad.in`, 107/156 for Bathinda). Two near-misses to reject
  explicitly: the *"HC declines plea seeking disclosure of MLAs' attendance on portal"* case is
  **Haryana**, and *"Punjab PA makes attendance record available online"* is **Pakistan's** Provincial
  Assembly. The MLA-level gap is therefore a **real documented gap**, not a search failure.
