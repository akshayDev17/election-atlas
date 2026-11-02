# HARVEST_BILLS(state) — Algorithm

## Input

| Symbol | Meaning |
|---|---|
| `state` | ISO code of the jurisdiction |
| `REG[state]` | Working source(s) per section + operational envelope, from `SOURCE-REGISTRY.md` |
| `VLM(image) -> struct` | Vision model; reads page images and returns fields; **no OCR** |

## Output

```text
ROW[] = {
    state,
    title,
    number,
    year,
    type,
    department,
    introducer,
    introduced_date,
    passed_date,
    source_kind,
    doc_links,      # list — a bill routinely maps to MORE THAN ONE document
    doc_types,      # list, parallel to doc_links; kind inferred from the URL
    reading_mode,
}
```

## Phases

### Phase 0 — Resolve sources

```text
0.1  read REG[state].Bills -> ordered tier list
0.1a read REG[state].Bills.variant     ∈ { introduced, passed, none }
         (composed availability -> introduced-only | passed-only | both | neither)
0.1b read REG[state].Bills.capability  ∈ { index_only, document_scan, document_text, none }
0.2  assign per tier: primary fetch_mode + ordered fallbacks, each with a trigger
         primary; on empty / 404 -> next fallback
         modes: static_curl | neva_session | webforms_postback | prs_pager | gazette_postback
```

### Phase 1 — Index harvest

```text
for each tier:
    1.1  obtain the INDEX — the listing page that yields per-bill rows
             (title, number, year, date, doc_link) — dispatch on fetch_mode:
         1.1a  static_curl (default):
                   plain GET; UA + Referer as the envelope says
         1.1b  neva_session:
                   GET host "/" into jar once; carry jar; Referer = host "/"
         1.1c  webforms_postback:
                   GET page -> echo __VIEWSTATE + __EVENTVALIDATION
                       + __VIEWSTATEGENERATOR (+ __ncforminfo if WAF)
                   POST to trailing-slash URL
         1.1d  prs_pager:
                   walk page = 1..N, per-page = 50
                   stop when page file-set == previous page
                   union distinct files
         1.1e  gazette_postback:
                   POST search (number/year); capture row filename cell
    1.2  extract per row: title, number, year, date, doc_links[]
    1.3  normalize every link in doc_links:
             percent-encode spaces; resolve relative; "\\" -> "/"
    1.4  drop rows with no usable content; keep metadata-only rows as gap rows
             (never drop a row merely because doc_links is empty)
```

### Phase 2 — Document acquisition

```text
for each row, for each link in doc_links:
    2.1  resolve real doc URL:
             if session_bound:
                 replay its lnkOpenPdf postback
                 then GET OpenFile.aspx (same jar)
    2.2  download; verify:
             http 200, size > 0, trailing "%%EOF", matches content-length
    2.3  on mismatch: retry once; else mark gap (truncated)
```

### Phase 3 — Text-layer classify

```text
for each doc:
    3.1  t = extract_text()
    3.2  if len(t) > 0 and unicode_ratio(t) > TH:
             mode = born_digital
    3.3  elif len(t) > 0 and unicode_ratio(t) <= TH:
             mode = legacy_font          # digits still exact
    3.4  else:
             mode = scan
    3.5  store mode on row
```

> **No OCR** at any point. Classification is decided by attempting text
> extraction, never by grepping raw bytes.

### Phase 4 — Field extraction

```text
4.1  born_digital: regex title / number / year / dates / department
4.2  legacy_font : regex digits + dates (exact); names left to VLM
4.3  scan        : no text read here
```

### Phase 5 — VLM read

```text
for row where mode in {scan} or (legacy_font and introducer unknown):
    5.1  split multi-page -> single-page images, render >= 3000px
    5.2  select pages: cover, statement-of-objects, closing/signature
    5.3  for each page image: R = VLM(page)
    5.4  merge R:
             title, number, introducer, department,
             introduced_date, passed_date, assent, statement_of_objects
    5.5  GUARD: never VLM a born_digital text page
```

### Phase 6 — Introducer resolution

```text
6.0  gate: apply introduced-vs-passed preference only if both variants exist
         (introduced_variant > passed_variant)
6.1  if introduced_variant present:
         read introducer from it (text or VLM)
6.2  elif passed_variant only:
         introducer = "not published (passed copy)"
6.3  elif only department:
         introducer = department name; flag "dept_only"
6.4  cross-check legacy-font digits vs VLM digits:
         on conflict, prefer legacy digit
```

### Phase 7 — Merge + dedup

```text
7.1  merge index metadata + doc fields
7.2  canonicalize number:
         strip "क्रमांक" / "Bill" / "सन्"; int(year); int(number); zero-pad
7.3  dedup key = (year, number, type, sorted(doc_links)); keep strongest evidence
         merge doc_links/doc_types across duplicates — never discard a document
7.4  conflict flag:
         title header vs table content mismatch
         stale heading
         172-vs-472 style digit inversion
```

### Phase 8 — Validate

```text
8.1  every displayed figure must carry a resolved official link from doc_links
8.2  every row must have been read (chars > 0 or VLM answered)
8.3  unverifiable row -> emit as finding with shape_of_gap, never blank
```

### Phase 9 — Emit

```text
write ROW[]; return
```
