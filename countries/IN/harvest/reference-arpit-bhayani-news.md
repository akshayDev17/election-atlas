# Arpit Bhayani's "news website" — what actually exists

**Purpose.** Reference reconnaissance for the Election Atlas Level-3 news fetcher. The brief asked
whether Arpit Bhayani runs a "news site" that is "a mix of news aggregation and research article
aggregation and analysis", so that the MP-page news fetcher can be modelled on it.

**Method.** Every claim below is backed by a URL fetched live on **2026-09-14 (UTC)**: his own site,
the live product, its public repo/API, and the live site's own endpoints. Where a number is
aggregate, the method used to compute it is stated so it can be reproduced. Nothing here is taken
from a secondary write-up about him.

---

## 0. Bottom line

**Yes — he does run a real aggregator, and it is very close to what was described. Its name is not
"news", it is [The Daily Diff](https://tdd.cat/) (`tdd.cat`), and its domain is technical content,
not general news.**

- It aggregates **third-party** papers and articles ([arXiv](https://arxiv.org/), Hacker News
  submissions, GitHub projects) — it is *not* his blog and *not* his newsletter.
- It publishes one numbered **edition per day**, so it reads like a newspaper, not a feed.
- Content is **LLM-processed, not just linked**: each item carries a written `why_read` and a short
  summary body, plus four numeric scores.
- He describes it himself as *"A curated daily feed of technical papers and articles from arXiv and
  Hacker News, organised by day and ranked by interest score."*
  ([arpitbhayani.me/projects](https://arpitbhayani.me/projects))
- The framing that does **not** hold: it is not a news outlet, it carries no general/political news,
  and it does not surface Indian public-affairs coverage. An MP news fetcher can copy its *shape*
  (schema, editions, scoring, endpoints); nothing about its *content pipeline* transfers domain-wise.

The probe that found it: his GitHub account lists 100 repos; `the-daily-diff` is the only one whose
description is an aggregator ([github.com/arpitbbhayani?tab=repositories](https://github.com/arpitbbhayani?tab=repositories),
[API listing](https://api.github.com/users/arpitbbhayani/repos?per_page=100&sort=updated)).

---

## 1. The Daily Diff — the product

| Property | Value | Source |
|---|---|---|
| Live site | https://tdd.cat/ | live fetch |
| Repo | https://github.com/arpitbbhayani/the-daily-diff | repo page |
| Created | 2026-07-11 | [GitHub API](https://api.github.com/repos/arpitbbhayani/the-daily-diff) |
| Default branch | `master` | same |
| Language / stack | Astro (`astro@^7`), Bulma CSS (Sass), `@astrojs/rss`, `@astrojs/sitemap`, Chart.js | [package.json](https://github.com/arpitbbhayani/the-daily-diff/blob/master/package.json) |
| Deploy target | Vercel (`vercel.json`); images on a separate Bunny CDN host `tdd-edge.b-cdn.net` | [vercel.json](https://github.com/arpitbbhayani/the-daily-diff/blob/master/vercel.json), live `<img src>` |
| Stars / forks | 84 / 15 (2026-09-14) | GitHub API |
| Licence | **none declared** (`license: None` in the API response) | GitHub API |
| Tagline | *"A daily newspaper for software engineers who value depth over noise."* | [src/config.ts](https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/config.ts) |

His own projects page lists it alongside DiceDB and px0 as third-party-visible projects, with the
one-line description quoted above ([arpitbhayani.me/projects](https://arpitbhayani.me/projects)).

### 1.1 Content types — a mix, not a single feed

Computed by downloading the repo tarball
(`https://codeload.github.com/arpitbbhayani/the-daily-diff/tar.gz/refs/heads/master`, 2.8 MB) and
parsing the frontmatter of every `src/content/stories/<date>/*.md` file. **51 editions,
2026-07-17 → 2026-09-12, 3,406 stories, average 66.8/day (min 8, max 114).**

| `source` | Count | What it is |
|---|---|---|
| `hn` | 2,385 | a Hacker News submission, linked to the external article |
| `github` | 957 | a GitHub project — **all 957 also carry an `hn_id`**, i.e. they arrived via HN too |
| `arxiv` | 63 | a research paper (`arxiv_id` + `categories`, and 187 rows point at `arxiv.org`) |
| `youtube` | 1 | an outlier; the schema has `channel` / `video_id` fields for it |

Sections (his own classification): `ai` 2,136 · `systems` 542 · `engineering` 429 · `databases` 278 ·
`career` 21. **1,501 distinct domains** appear as link targets, dominated by `github.com` (953) and
`arxiv.org` (187), with `twitter.com` (67), `huggingface.co` (46), `clickhouse.com` (30),
`www.theregister.com` (26), `medium.com` (26) etc. — i.e. it is a **link log over third-party sites**,
with his own prose attached to each link.

Live filters on the edition page: **Source (HN / GitHub)** and **Signal (All / Recommended /
Must-Read)** ([edition HTML](https://tdd.cat/), [src/components/EditionPage.astro](https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/components/EditionPage.astro)).
The Signal tiers map to `interest_score` — buttons carry `data-filter="8"` (Recommended) and
`data-filter="9"` (Must-Read) — and in the archive **every published story scores 8 (3,125) or 9
(281)**: anything below 8 is dropped before publication.

### 1.2 Where the content comes from

- **Third-party links, always.** Each story's `url` is the external article; the repo holds **no
  scraped article text**. The body is generated prose (a 2–3 paragraph summary plus a `why_read`
  line), and `authors`, `comments` (HN thread), `hn_id`, `arxiv_id` give the attribution trail.
  Example frontmatter: [01-hn-49677519-…md](https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/content/stories/2026-09-12/01-hn-49677519-openai-s-jalapeno-architecture-defined-by-user-experien.md).
- **The ingest/fetch code is NOT in the public repo.** A full-text grep of the tree for
  `firebaseio|arxiv.org/api|hn.algolia|openai|anthropic|gemini|hacker-news` across all
  `.ts/.js/.astro/.mjs/.json` files returns **zero hits**; the only script is
  [`scripts/generate-latest.js`](https://github.com/arpitbbhayani/the-daily-diff/blob/master/scripts/generate-latest.js),
  a prebuild step that concatenates the newest day into `public/md`. There are no CI workflows. The
  content simply **appears as a daily commit by Arpit himself** — so the fetcher/curator is a private
  pipeline that writes into the repo, and what is public is the *output contract*, not the fetcher.
- **The pipeline is LLM-driven, and he publishes its cost.**
  [`src/data/stats.jsonl`](https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/data/stats.jsonl)
  logs per-day `tokenUsage` (input/output/total/cost) *and* analytics (views, uniques, countries);
  [`src/lib/statsAggregate.ts`](https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/lib/statsAggregate.ts)
  aggregates it for the public [stats page](https://tdd.cat/stats/). Across the 13 logged days
  (2026-07-17 → 2026-08-01): **8,146,006 input + 3,960,349 output tokens, $125.17, 29,122 views** —
  roughly **$5–18/day**, and the same records split text vs image spend, where image generation is
  the expensive half (2026-07-28: text $1.17 vs image $14.68).
- **Editorial delay is deliberate and stated.** The archive page says: *"Editions are updated 2 days
  late so that we get time to popularity and top HN stories settle."* ([tdd.cat/archive](https://tdd.cat/archive/))

### 1.3 How it is organised and presented

- **Editions, numbered and dated.** `/archive/` lists "051 · Sat, Sep 12, 2026 · 63 Stories" back to
  edition 001; `/` always redirects/render the latest edition; each edition is its own route
  `/<YYYY-MM-DD>/` with prev/next navigation ([src/pages/[day]/index.astro](https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/pages/%5Bday%5D/index.astro),
  [src/pages/index.astro](https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/pages/index.astro)).
- **Newspaper layout**, stories sorted by `interest_score` inside the edition, with a source filter
  and a signal filter, dark/light theme toggle, PWA install banner and service worker.
- **Per-story metadata is the centre of gravity.** Zod schema in
  [`src/content.config.ts`](https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/content.config.ts):
  required `title, source, url, date`; optional `tags[], arxiv_id, hn_id, categories, why_read,
  authors[], interest_score, image, comments, section, depth_score, novelty_score, utility_score`.
  Measured coverage: `why_read` on **3,406/3,406**, `comments`+`hn_id` on 3,342, the three sub-scores
  on 3,336, `image` on 1,299 (~14 frontmatter keys per story).
- **Two machine-readable mirrors of the current edition**, with content types forced by
  `vercel.json`: [`/md`](https://tdd.cat/md) (whole edition as one Markdown file, prebuilt by
  `generate-latest.js`) and [`/json`](https://tdd.cat/json) (same edition as JSON). Both serve the
  latest edition only.
- **RSS is edition-level, not story-level**: one `<item>` per day, title `"The Daily Diff — <long
  date>"`, description listing the **top 5 stories by interest score** plus the day's total count
  ([src/pages/rss.xml.ts](https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/pages/rss.xml.ts), [tdd.cat/rss.xml](https://tdd.cat/rss.xml)).
- **Sitemap** via `@astrojs/sitemap` with `changefreq: daily` on `/` and `monthly` elsewhere
  ([astro.config.mjs](https://github.com/arpitbbhayani/the-daily-diff/blob/master/astro.config.mjs),
  [tdd.cat/sitemap-index.xml](https://tdd.cat/sitemap-index.xml)).
- **Cadence is genuinely daily**, verified from the commit log: 30 consecutive commits, one per
  edition, authored by Arpit Bhayani, messages `Add stories for <date>` (early) then
  `Sync stories for <date>`, timestamped between ~02:00 and ~13:00 UTC
  ([commits API](https://api.github.com/repos/arpitbbhayani/the-daily-diff/commits?per_page=30)).
  Editions exist for 51 of the 58 calendar days from 2026-07-17 to 2026-09-12.

### 1.4 What is *not* published about the build

- No ingest script, no cron/Action, no prompt files, no model choice, no source-list config, no
  licence. The repo's only agent-facing docs are
  [`AGENTS.md`](https://github.com/arpitbbhayani/the-daily-diff/blob/master/AGENTS.md) /
  `CLAUDE.md` (symlink) / `GEMINI.md`, and they only describe how to run the Astro dev server.
- **Practical consequence:** the copyable asset is the **output contract + presentation**, not the
  fetcher. Everything about *how* stories are discovered, deduplicated and scored is inferred from
  the artefacts it leaves behind (scores, tags, `why_read`, the 2-day lag, the token telemetry).

---

## 2. His other properties, and what each actually is

The brief's uncertainty is understandable — he has several. None of the others is an aggregator:

| Property | What it actually is | Source |
|---|---|---|
| [`arpitbhayani.me`](https://arpitbhayani.me/) | **First-party writing.** Long-form blogs/essays — 111 items in the site RSS ([rss.xml](https://arpitbhayani.me/rss.xml)) — plus **673 atomic "notes"** with categories (Career Growth 273, Distributed Systems 225, AI Systems 60, Software Engineering 37, …) and tags | [notes index](https://arpitbhayani.me/notes), [blogs](https://arpitbhayani.me/blogs), [rss](https://arpitbhayani.me/rss.xml) |
| [Arpit's Newsletter](https://arpitbhayani.me/newsletter) | A **weekly curated email**: *"one nugget on career growth, three interesting engineering articles, and a research paper recommendation, every week"*, "❤️ by 145,000 readers", subscribed via LinkedIn **and** Substack. Sections on Substack: Career Growth, System Design Deep Dives, Papers and Musings, Outage Dissections | [newsletter page](https://arpitbhayani.me/newsletter), [arpit.substack.com/about](https://arpit.substack.com/about) |
| Substack mirror | [`arpit.substack.com`](https://arpit.substack.com/feed) — feed shows 20 items, weekly on Sundays; **the newest item indexed is 2025-11-30**, so treat Substack as the older/archived channel and the LinkedIn newsletter as the promoted one | [feed](https://arpit.substack.com/feed) |
| [DiceDB](https://dicedb.io/) | Open-source Valkey-derived key/value engine — a database, not content | [dicedb.io](https://dicedb.io/), [projects](https://arpitbhayani.me/projects) |
| [px0.ai](https://px0.ai/) | Read-only IDE, Go binary — a dev tool | [px0.ai](https://px0.ai/) |
| [obsidian-hackernews](https://github.com/arpitbbhayani/obsidian-hackernews) | A **client-side** HN reader: an Obsidian plugin that periodically fetches top stories from the **official HN Firebase API** (`hacker-news.firebaseio.com/v0/topstories.json`, `/v0/item/<id>.json`) and lets you save a story as a note. The closest thing to a "news fetcher" that is fully public source | [README](https://github.com/arpitbbhayani/obsidian-hackernews), [API endpoints listed in its privacy section](https://github.com/arpitbbhayani/obsidian-hackernews#privacy) |
| [arxiv-download](https://github.com/arpitbbhayani/arxiv-download) | A Python utility that downloads arXiv papers asynchronously from an arXiv search URL | [README](https://github.com/arpitbbhayani/arxiv-download) |
| [arxiv / knowledge-base](https://github.com/arpitbbhayani/arx) | "the second brain behind arpitbhayani.me" (Python, 2021); `knowledge-base` is a 226-star notes dump. Personal tooling, not products | [arx](https://github.com/arpitbbhayani/arx), [knowledge-base](https://github.com/arpitbbhayani/knowledge-base) |
| [engineering-blogs](https://github.com/arpitbbhayani/engineering-blogs) | A **curated list** of engineering blogs — a source list, not a running site | repo description via GitHub API |
| Ecosystem links in his footer: *Revine*, *The Smarter Chimp* | Listed on his site but `revine.com` and `thesmarterchimp.com` did not resolve from this machine (empty response), and web search produced no primary page for either. **Unverified — do not treat as news products.** | [arpitbhayani.me footer](https://arpitbhayani.me/projects) |

**One directly relevant piece of his own writing.** He has a note titled *"Say you are building a
news aggregator (like Google News)"* (2026-02-23): the core problem is **de-duplicating articles
across millions of documents**; naive O(n²) comparison does not scale, and the answer is
**MinHash + LSH** — shingling into overlapping n-grams, ~100–200 hash signatures, banded LSH
buckets, then only compare candidate pairs
([note](https://arpitbhayani.me/notes/say-you-are-building-a-news-aggregator-like-google-news)).
It is a conceptual note, not a write-up of his own fetcher — and it is the single most transferable
idea for an MP news fetcher pulling the same wire story from ten outlets.

---

## 3. What to actually copy for the Election Atlas news fetcher

Labelled as **adaptation guidance**, not as claims about his product.

**Copy the output contract, not the pipeline.** His fetcher is private; his *artefact* is public and
is exactly the thing worth mirroring. Per news item, store:

```
title            story headline
source           hn | github | arxiv | youtube      → for us: pib | sansad | thehindu | ...
url              the external article               → never store the article body
date             YYYY-MM-DD  (folder = edition day)
authors[]        attribution
comments         link to the discussion thread       → for us: the parliament/debate record link
tags[]           free tags
section          ai|systems|engineering|databases|career → for us: scheme|question|fund|constituency
why_read         one-line "why this matters"         → for us: "why this MP story matters"
summary body     2–3 paragraphs, written, not scraped
interest_score   0–10   (he publishes only ≥8)
depth/novelty/utility_score   0–10 each
image            optional generated infographic
```

Three of his habits are the load-bearing ones:

1. **Link out, summarise in your own words.** No scraped article text anywhere in 3,406 records;
   every story is `url` + attributed `authors` + generated prose. That is the difference between an
   aggregator and a scraper, and it is also the legally safe shape for an Indian news fetcher.
2. **Score before you store, then hide the filter in the UI.** `interest_score` is the sort key;
   sub-scores (`depth/novelty/utility`) exist to *produce* it; only items ≥8 reach the page, and the
   reader still gets All / Recommended / Must-Read. For the atlas: an MP page should show maybe 5–8
   stories selected by a score, with the score's inputs retained in the data file.
3. **Editions, not a stream.** One immutable dated folder per day, numbered, with prev/next, an
   archive index, and one RSS item per day whose description is the day's top 5. This maps cleanly
   onto a static GitHub Pages site: `data/news/<mp-slug>/<YYYY-MM-DD>.json` is the same idea at MP
   granularity, and a per-MP `feed.xml` with one item per update is the same RSS decision.

**Also worth lifting:**

- **Machine endpoints next to the human page.** `/json` and `/md` exist precisely so agents can read
  the edition, with the `Content-Type` pinned in config. For a static Pages site the analogue is a
  committed `data/news/<mp-slug>/latest.json` (plus `index.json` for the archive) — no server needed.
- **Two-day lag as a feature, stated in the UI.** *"Editions are updated 2 days late so that we get
  time to popularity and top HN stories settle."* For parliamentary news the same reasoning applies
  more strongly: a PIB release and its coverage settle, corrections land, and the story is no longer
  changing.
- **Publish the provenance and the cost.** His stats page shows per-day tokens and dollars
  ($5–18/day, image generation ~10× the text cost). For the atlas the analogue is a build log in the
  data dir: items fetched, items kept, items dropped, model calls, cost.
- **De-duplicate before you write prose** — his own MinHash + LSH note is the method, and an MP's
  news stream has exactly this shape (one PTI copy syndicated to many outlets).
- **Astro content-collections + zod** is the mechanism that makes the contract self-enforcing: an
  item with a malformed date or a non-URL `url` fails the build. A Python fetcher writing JSON should
  validate against the same schema before writing.

**Do not copy:**

- **The licence.** The repo declares none; the code cannot be reused verbatim. Reimplement the
  schema and page structure from the description above.
- **The domain assumptions.** arXiv/HN scores are meaningless for Indian public affairs; the scorer
  needs its own rubric (e.g. does it name the MP, is it about their constituency, is it a
  fund/scheme milestone, is the source primary like PIB/Sansad vs secondary).
- **The image generation budget** unless the budget exists — it was ~10× the text spend.
- **Anything inferred as fact.** His ingestion source list, prompts, and model choice are simply not
  public; assume nothing about them.

---

## 4. Open items / explicitly unverified

- **The ingest pipeline is unverified by design** — no fetch code, no workflow, no prompt, no source
  config is public. Claims about *how* he fetches would be invention; the counts in §1.1 are what the
  committed artefacts themselves prove.
- **Substack vs LinkedIn cadence.** His newsletter page calls it weekly and cites 145,000 readers;
  the Substack feed's newest item is 2025-11-30 and LinkedIn returned HTTP 500 to an unauthenticated
  fetch, so current cadence is not independently verified.
- **`Revine` and `The Smarter Chimp`** are listed in his site footer but produced no resolving page
  from this machine and no primary source in search.
- **The `image` field in frontmatter 404s on the site's own domain** — images are served from
  `tdd-edge.b-cdn.net`; the relative `/infographics/...` path in the Markdown is not resolvable at
  `tdd.cat`. Relevant only if copying the image pattern.
- **`stats.jsonl` stops at 2026-08-01** even though editions continue to 2026-09-12, so the cost
  figures are a 13-day window, not a full run.

---

## 5. Sources (all fetched 2026-09-14 UTC)

**Primary — product**
- https://tdd.cat/ · https://tdd.cat/archive/ · https://tdd.cat/stats/ · https://tdd.cat/rss.xml ·
  https://tdd.cat/json · https://tdd.cat/md · https://tdd.cat/sitemap-index.xml · https://tdd.cat/robots.txt
- https://github.com/arpitbbhayani/the-daily-diff
- https://github.com/arpitbbhayani/the-daily-diff/blob/master/README.md
- https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/content.config.ts
- https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/config.ts
- https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/components/EditionPage.astro
- https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/pages/rss.xml.ts
- https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/pages/index.astro
- https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/pages/%5Bday%5D/index.astro
- https://github.com/arpitbbhayani/the-daily-diff/blob/master/scripts/generate-latest.js
- https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/data/stats.jsonl
- https://github.com/arpitbbhayani/the-daily-diff/blob/master/src/lib/statsAggregate.ts
- https://github.com/arpitbbhayani/the-daily-diff/blob/master/package.json · .../astro.config.mjs · .../vercel.json · .../AGENTS.md
- https://api.github.com/repos/arpitbbhayani/the-daily-diff · https://api.github.com/repos/arpitbbhayani/the-daily-diff/commits?per_page=30
- https://codeload.github.com/arpitbbhayani/the-daily-diff/tar.gz/refs/heads/master (2.8 MB; source of the 3,406-story counts)

**Primary — his own site and writing**
- https://arpitbhayani.me/projects · https://arpitbhayani.me/newsletter · https://arpitbhayani.me/notes · https://arpitbhayani.me/blogs
- https://arpitbhayani.me/rss.xml (111 items) · https://arpitbhayani.me/robots.txt · https://arpitbhayani.me/sitemap-index.xml
- https://arpitbhayani.me/notes/say-you-are-building-a-news-aggregator-like-google-news
- https://arpit.substack.com/feed · https://arpit.substack.com/about

**Primary — related repos**
- https://github.com/arpitbbhayani/obsidian-hackernews · https://github.com/arpitbbhayani/arxiv-download ·
  https://github.com/arpitbbhayani/arx · https://github.com/arpitbbhayani/knowledge-base ·
  https://github.com/arpitbbhayani/engineering-blogs · https://api.github.com/users/arpitbhayani/repos?per_page=100&sort=updated

**Products named for completeness (not content sites)**
- https://dicedb.io/ · https://px0.ai/

**Secondary, noted but not relied on**
- A Chinese-language write-up describing a "daily tech aggregation site that picks papers and
  articles from arXiv and Hacker News" exists at
  https://www.toutiao.com/article/7669257063989641770/ — the page body did not render for an
  unauthenticated fetch, so **no claim above depends on it**; it is listed only as corroboration that
  the product is being read outside his own channels.
