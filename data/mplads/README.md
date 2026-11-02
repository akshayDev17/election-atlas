# data/mplads — MPLADS data, news, and the schema decision

## What's here now (v1 — static JSON on GitHub Pages)

- `IN-UP/{constituency_key}.json` — one MP's MPLADS record: `tiles`, `charts`, `works`.
- `IN-UP/index.json` — index mapping `constituency_key` → MP (`mp_name`, `mp_id`, `works` count, `file`).

These are produced by `tools/fetch-mplads.py` (curl-only against the eSAKSHI portal). News is **not fetched yet** — this file records the decision before we do.

---

## News: fetch vs store — the decision

**Store it. Always. Live-fetch is a refresh job, never a read path.**

- **Never fetch news at page-load.** It is slow, rate-limited, non-deterministic, and the source can vanish (paywall, redaction, takedown).
- A **scheduled job** (nightly, or on-demand per MP) fetches new articles and **writes** them to storage. The page only ever reads storage, so it stays fast and stable regardless of the source.
- **Every fetch writes a snapshot** — the archived copy (full text, HTML, and/or a screenshot) — plus a `sha256` hash of it. This is the "screenshot proofing": if an article is later redacted or deleted under pressure, our copy survives, and the hash proves it is byte-for-byte the copy we captured on that date.
- **Abstract is nullable.** A paywalled article may have no abstract, or a shorter one. The UI renders the abstract only when present (see the MP-page mock).

Growth is not a reason to skip storing. News is **bounded to news *about* a person** (a handful per MP per term, not the whole firehose), and binary snapshots go to object storage, not the database, so the DB stays small.

---

## News — v1 JSON schema (what the static page will consume)

One file per person, mirroring the MPLADS layout:

```jsonc
{
  "schema": 1,
  "person": "gorakhpur",                 // constituency_key (join key)
  "fetched_at": "2026-09-14T00:00:00Z",
  "articles": [
    {
      "id": "thehindu-2024-12-04-rail-link",
      "headline": "Ravi Kishan pushes Gorakhpur rail link in Lok Sabha",
      "source": "The Hindu",
      "source_url": "https://www.thehindu.com/…",
      "published_at": "2024-12-04T00:00:00Z",
      "abstract": "The MP raised the long-pending rail link …",   // null when paywalled
      "status": "live",                   // live | redacted | removed
      "snapshot": {
        "kind": "html",                   // html | full_text | screenshot | wayback
        "path": "archive/thehindu-2024-12-04-rail-link.html",  // relative to data/news/
        "sha256": "9f2c…",
        "captured_at": "2024-12-05T10:00:00Z"
      }
    }
  ]
}
```

A concrete example with all four adaptive cases (full abstract, null abstract,
`redacted` + screenshot snapshot) lives at `data/news/IN-UP/gorakhpur.json`.

v1 keeps the snapshot inline (small files in the repo). This is a throwaway shape for shipping on GitHub Pages — the DB below is the long-term target.

---

## Long-term schema (recommended DB)

**PostgreSQL** for metadata + **object storage** (S3 / Cloudflare R2) for binary snapshots. This is the standard news-archive architecture: relational metadata, cold binary blobs, an integrity hash on everything.

```sql
-- The representative (MP / MLA). News attaches to this stable id.
CREATE TABLE representatives (
  id            bigserial PRIMARY KEY,
  external_id   text NOT NULL UNIQUE,      -- mplads mp_id, or constituency_key
  tier          text NOT NULL,             -- 'mp' | 'mla'
  name          text NOT NULL,
  constituency  text
);

-- The article: light metadata, always kept. The live pointer is here, but it is
-- NOT the source of truth — the snapshot table is.
CREATE TABLE news_articles (
  id            bigserial PRIMARY KEY,
  person_id     bigint NOT NULL REFERENCES representatives(id) ON DELETE CASCADE,
  headline      text NOT NULL,
  source        text NOT NULL,             -- publisher name
  source_url    text NOT NULL,             -- canonical URL at publish time
  published_at  timestamptz NOT NULL,
  abstract      text,                      -- NULL when paywalled / unavailable
  lang          text NOT NULL DEFAULT 'en',
  status        text NOT NULL DEFAULT 'live',  -- 'live' | 'redacted' | 'removed'
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX news_articles_person_published
  ON news_articles (person_id, published_at DESC);

-- The archived copy — the proof. One or more per article.
CREATE TABLE article_snapshots (
  id            bigserial PRIMARY KEY,
  article_id    bigint NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  kind          text NOT NULL,             -- 'full_text' | 'html' | 'screenshot' | 'pdf' | 'wayback'
  content       text,                      -- for text/html snapshots
  object_key    text,                      -- S3/R2 key for binary (screenshot/pdf)
  sha256        text NOT NULL,             -- integrity: proves the copy is ours
  capture_url   text,                      -- the URL actually captured (may redirect)
  captured_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX article_snapshots_article ON article_snapshots (article_id);

-- Provenance: every fetch attempt, successful or not.
CREATE TABLE article_fetches (
  id            bigserial PRIMARY KEY,
  article_id    bigint REFERENCES news_articles(id) ON DELETE SET NULL,
  method        text,                      -- 'api' | 'scrape' | 'manual' | 'wayback'
  http_status   int,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  error         text
);
```

Notes on the design:

- **`status` on `news_articles`** is the redaction ledger: when a live article is
  taken down, we set `status = 'redacted'` (with the date in `updated_at`) and the
  snapshot remains. The UI can then show "original snapshot" instead of a dead link.
- **`sha256` is mandatory** on every snapshot — it is what turns "we saved a copy"
  into "we can prove this is the copy we saved."
- **`object_key` vs `content`** — small text lives inline; screenshots/PDFs go to
  object storage so Postgres never bloats with binary.
- **Many-to-many** — an article can mention a constituency or several people. For v2
  add a `article_mentions (article_id, person_id, role)` join table; v1 assumes
  one primary `person_id`.
- **Migration path** — the v1 JSON maps 1:1 onto these tables, so the GitHub-Pages
  ship is just a flat dump of `news_articles + article_snapshots` keyed by person.

---

## Parliamentary record (profile · attendance · questions · bills)

A third data domain (Sansad / Lok Sabha), distinct from MPLADS and news. Recipe in
`tools/sansad-record-recipe.md`. Same two-layer shape: a throwaway v1 JSON for
GitHub Pages, and PostgreSQL for the long term.

**Provenance is the whole point here.** Every bill, question and attendance figure
we display carries a `source_url` pointing at the *official* document, so the page
can always say "this is the official record — here is the source." That is the
legal shield.

- Bill → `billIntroducedFile` (official bill text PDF).
- Question → `questionsFilePath` (`.pdf`, present on **every** question — the
  canonical, browser-native source link) and `questionsDocPath` (`.docx`, the
  editable Q&A used to extract the reply text — **absent on ~36 earliest-session
  questions**, which have only a PDF). Verified empirically: 274/274 have a PDF,
  238/274 have a DOCX (all 36 gaps are session 2).
- Profile (name, date of birth, photo) → Sansad `api_ls/member/{mpsno}`.

**Binary stays out of the DB.** The bill PDF and question DOCX/PDF are downloaded at
fetch time and written to object storage (S3 / Cloudflare R2) — or, in the v1
GitHub-Pages ship, to a file under `data/`. The DB stores only the extracted TEXT
(`bill_text`, `reply_text`) plus an `object_key` pointer + `sha256`, never the
binary itself. Age and attendance % are computed at render from `date_of_birth`
and `signed_days/total_days` — never stored.

`reply_text` is extracted in a second pass — `fetch-sansad-record.py --replies` —
that reads the DOCX first (clean paragraph text) and falls back to the always-present
PDF (line-wrapped text) for the ~46 questions whose DOCX is absent or is a binary
OLE `.doc`. The PDF reader is **pypdf**, pinned in `requirements.txt` (a pure-Python
build-time dependency, no external service).

### v1 JSON (one file per person)

```jsonc
{
  "schema": 1,
  "person": "gorakhpur",
  "profile": {
    "dateOfBirth": "1969-07-17"               // age computed at render, never stored
  },
  "loksabha": 18,
  "attendance": { "signedDays": 108, "totalDays": 156 },
  "bills": [
    {
      "billNumber": 28,
      "billName": "Traditional Fishermen (Protection and Welfare) Bill, 2024",
      "billType": "Private Member",
      "introducedOn": "2024-07-26",
      "status": "Pending",
      "sourceUrl": "https://sansad.in/…billIntroducedFile…",   // OFFICIAL, NOT NULL
      "billText": "…",                                          // extracted, nullable
      "billFile": "archive/bills/bill-28.pdf"                   // local copy, nullable
    }
  ],
  "questions": [
    {
      "questionNumber": "Q6364",
      "subject": "…",
      "ministry": "…",
      "type": "UNSTARRED",
      "date": "2024-12-04",
      "pdfUrl": "https://sansad.in/getFile/…questionsFilePath…",   // PDF, ALWAYS present — source of truth
      "docxUrl": "https://sansad.in/getFile/…questionsDocPath…",   // DOCX, nullable (36 earliest-session Qs lack it)
      "sourceUrl": "<== pdfUrl>",                                  // OFFICIAL, NOT NULL (alias of pdfUrl)
      "replyText": "…",                                            // DOCX preferred, PDF fallback, nullable
      "questionFile": "archive/questions/Q6364.docx"               // local copy, nullable
    }
  ]
}
```

### Long-term DB (adds to / amends the tables above)

```sql
-- profile fields live on the person row, not a separate table
ALTER TABLE representatives ADD COLUMN date_of_birth date;
ALTER TABLE representatives ADD COLUMN photo_url text;

CREATE TABLE ls_bills (
  id            bigserial PRIMARY KEY,
  person_id     bigint NOT NULL REFERENCES representatives(id) ON DELETE CASCADE,
  bill_number   int  NOT NULL,
  bill_name     text NOT NULL,
  bill_type     text,                     -- 'Private Member' | 'Government'
  introduced_on date,
  status        text,
  source_url    text NOT NULL,            -- official billIntroducedFile (provenance)
  bill_text     text,                     -- extracted text, nullable
  object_key    text,                     -- S3/R2 key of the PDF, nullable
  sha256        text,                     -- integrity of the stored binary
  UNIQUE (person_id, bill_number)
);

CREATE TABLE ls_questions (
  id            bigserial PRIMARY KEY,
  person_id     bigint NOT NULL REFERENCES representatives(id) ON DELETE CASCADE,
  question_no   text NOT NULL,
  subject       text NOT NULL,
  ministry      text,
  q_type        text,                     -- 'STARRED' | 'UNSTARRED'
  q_date        date,
  session_no    int,
  source_url    text NOT NULL,            -- official questionsFilePath (the always-present PDF)
  reply_text    text,                     -- DOCX preferred, PDF fallback, nullable
  object_key    text,                     -- S3/R2 key of the DOCX/PDF, nullable
  sha256        text,
  UNIQUE (person_id, question_no)
);

CREATE TABLE ls_attendance (
  id            bigserial PRIMARY KEY,
  person_id     bigint NOT NULL REFERENCES representatives(id) ON DELETE CASCADE,
  loksabha      int,
  session_no    int,
  signed_days   int,
  total_days    int,
  source_url    text NOT NULL,            -- official attendance endpoint/page
  UNIQUE (person_id, loksabha, session_no)
);
```

Two rules stated flat:

- `source_url` is NOT NULL and mandatory — no bill, question or attendance figure
  is published without its official source link.
- Binary (PDF/DOCX) never lives in Postgres. It goes to object storage; the DB keeps
  `object_key` + `sha256` + the extracted text. In v1 the "object storage" is just a
  path under `data/`.
