# MPLADS eSAKSHI — direct-fetch recipe (curl-only)

Portal: `https://mplads.mospi.gov.in/digigov/dashboard.html` (ZK/Java + jQuery)
REST base: `https://mplads.mospi.gov.in/rest/PreLoginDashboardData`
Verified working: 2026-09-13 ~20:09–20:20 UTC, all endpoints HTTP 200.

## The single thing that was blocking everything

Every endpoint takes a **CSV "combo" string**. Three different envelopes are used,
and mixing them up is what produced the earlier `503`/HTML-shell/`{}` symptoms:

| Envelope | Endpoints | Body |
|---|---|---|
| JSON object, `uname` = CSV | `getTilesData`, `getTenureData` | `{"uname":"33,424,3019214,2,7"}` |
| **bare CSV string** (not JSON!) | `getgraphdata` | `33,424,3019214,2,7,Development Fund` |
| JSON object, `combo`+`key` | `getTilesReportData`, `new_gettabledata` | `{"combo":"33,424,3019214,2,7","key":"Works Recommended"}` |
| JSON object, other keys | `getConstituencyData` `{"id":"33"}` · `getMpNamesData` `{"state_combo":"33,2,"}` · `getMpAndConstCombo` `{"const_combo":"424,2,"}` | |
| empty body | `getPieChartLabels` | `` (literally nothing) |
| `{}` | `getStateData` | `{}` |

### Combo grammar
```
tiles / tenure          : <state>[,<const>[,<mp>]],<house>[,<tenure>]
                          e.g. "0,0,0,2"        (national, Lok Sabha, current tenure)
                               "33,424,3019214,2,7"
graphdata               : <state>,<const>,<mp>,<house>[,<tenure>],<pie_label>
                          e.g. "33,424,3019214,2,7,Development Fund"
house  : 2 = Lok Sabha, 1 = Rajya Sabha   <-- reversed vs intuition, confirmed in loksaba.js/rajyasaba.js
tenure : 5 = 17th Lok Sabha, 7 = 18th Lok Sabha (omitted => current, i.e. 7)
```
Pie labels come from `getPieChartLabels` and are **appended verbatim** (spaces and all):
1. `Development Fund`  2. `Location wise Development Work Recommendation`
3. `Development Work Recommendation Status`  4. `Work Category wise Development Work Recommendation`

## Working curl recipes (no cookie, no session, no browser)

```bash
BASE=https://mplads.mospi.gov.in/rest/PreLoginDashboardData
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'
CT='Content-Type: application/json; charset=utf-8'   # REQUIRED — without it: HTTP 415

# labels (do this first — you need them for getgraphdata)
curl -s -A "$UA" -H "$CT" --data-raw '' "$BASE/getPieChartLabels"

# states
curl -s -A "$UA" -H "$CT" --data-raw '{}' "$BASE/getStateData"

# UP -> constituencies, then constituency -> MPs
curl -s -A "$UA" -H "$CT" --data-raw '{"id":"33"}'          "$BASE/getConstituencyData"
curl -s -A "$UA" -H "$CT" --data-raw '{"const_combo":"424,2,"}' "$BASE/getMpAndConstCombo"

# PER-MP headline tiles
curl -s -A "$UA" -H "$CT" --data-raw '{"uname":"33,424,3019214,2,7"}' "$BASE/getTilesData"

# PER-MP charts (bare CSV body, NOT JSON)
curl -s -A "$UA" -H "$CT" --data-raw '33,424,3019214,2,7,Development Fund' "$BASE/getgraphdata"

# tenure list / per-tile drill-down table
curl -s -A "$UA" -H "$CT" --data-raw '{"uname":"0,0,0,2"}' "$BASE/getTenureData"
curl -s -A "$UA" -H "$CT" --data-raw '{"combo":"33,424,3019214,2,7","key":"Works Recommended"}' "$BASE/getTilesReportData"
```

`//getgraphdata` and `//getPieChartLabels` (double slash, as the archived frontend used)
also work — the server normalises it.

## Parsing gotchas

* Response `Content-Type` is `text/plain;charset=ISO-8859-1` — **decode as latin-1**, not UTF-8.
* Money strings are prefixed with a **non-breaking space**. Usually a lone byte `0xA0`
  (→ `\u00a0`); one observed response used real UTF-8 `0xC2 0xA0` (→ `\u00c2\u00a0`).
  Strip both. In shell: `tr -d '\302\240'` (the `tr` locale error is what you get if you forget).
* Values may sit in a 1-, 2- or 3-element array: `["count","raw","Crore"]` for money tiles,
  `["amount","Crore"]` for the first two tiles, `["count"]` for plain counts.
* `getTilesReportData` returns a JSON **string** inside a JSON object — parse twice.
* `"Current Tenure"` is `[{"ID":7,"CAPTION":"18th Lok Sabha"}]`, not a number.

## Session / anti-bot

None. The server *sets* `JSESSIONID`, `ROUTEID`, `TS01d11681` on every response, but
none of them is required to read data. Verified: bare curl with no cookie jar at all
returns 200 on all 10 endpoints. No CSRF token, no auth header, no captcha on this path
(the captcha belongs to `/rest/PreLoginCitizenWorkRcmdRest/` on the landing page).

## Environment note

Traffic exits through a TLS-intercepting proxy (`Via: 1.1 ... uproxy-2`) whose root CA is
in the macOS keychain (`/etc/ssl/cert.pem`). `curl` works out of the box. Python's stdlib
and Node need that bundle explicitly:
* Python: `ssl.create_default_context(cafile="/etc/ssl/cert.pem")`
* Node:   `NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem`

## Stability

The F5 pool serves an F5 "Error code: 95" 503 page (`Service Unavailable`, 189 bytes,
no `Server`/`Date` headers) when no member is available — the whole site 503s, not just
the dashboard. On 2026-09-13 it was down for **102 s** (20:07:15 → 20:08:56 UTC) and then
stayed up. A retry loop with ~25 s spacing is appropriate; the 503 is transient, not a ban.

## Proven sample data

Uttar Pradesh (33) → GORAKHPUR (const 424) → MP `3019214` = *Ravindra Shyamnarayan Alias
Ravi Kishan Shukla*, 18th Lok Sabha (tenure 7):

```
Allocated Limit for Hon'ble MPs ......... 14,70,00,000.00  (14.70 Crore)
Expenditure on Completed/On-going Works .. 1,54,41,179.00  (1.54 Crore)
Works Recommended ........................ 107  (10.19 Crore)
Works Completed .......................... 0
Works Sanctioned ......................... 9    (2.13 Crore)
Amount consented for Calamity ............ 0
```

Cross-checked against a second MP — Narendra Modi, Varanasi (const 457, MP `3017469`):
Allocated 16,20,70,276.11 / Recommended 216 / Completed 196.
