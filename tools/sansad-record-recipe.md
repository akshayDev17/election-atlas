# Sansad / Lok Sabha — per-MP record endpoints (curl-only)

All endpoints below return **HTTP 200 with bare curl, no cookie jar, no CSRF token, no session**.
Every endpoint is declared `API_AUTH:!1` in the site's own bundle config. Nothing needed to "get past" anything.

Anchor subject: Ravi Kishan, Gorakhpur, UP — `mpsno` / `mpNo` / `memberCode` = **5144**.

## 0. Resolve an MP
```
curl -s "https://sansad.in/api_ls/member?lang=en"                     # all 5,426 -> membersDtoList[].mpsno
curl -s "https://sansad.in/api_ls/question/getMembers?lkNo=18"        # 544 sitting LS18 -> [{mpNo, mpName}]
```
`mpNo` == `mpsno` == the value to pass as `memberCode`. Stable across all three record types.

## 1. Questions asked + official reply
```
GET https://sansad.in/api_ls/question/qetFilteredQuestionsAns
    ?loksabhaNo=18&pageNo=1&locale=en&pageSize=500&memberCode=5144
```
Alt path `https://sansad.in/api_ls/question/member/qetFilteredQuestionsAns` behaves identically.

Params: `loksabhaNo`, `sessionNumber` (INTEGER, not roman — `VIII` → HTTP 500),
`pageNo`, `pageSize`, `locale`, `memberCode`, `keyWord`, `questionNumber`,
`ministryCode`, `questionType` (`STARRED`|`UNSTARRED`), `answerdate`.

Returns a 1-element array: `[{ listOfQuestions: [...], totalRecordSize: N, _metadata: null }]`.

### Ravi Kishan, LS18: totalRecordSize 274
| session | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|
| questions | 36 | 37 | 50 | 36 | 24 | 60 | 31 |

255 UNSTARRED + 19 STARRED, across 51 ministries.

### Field schema (listOfQuestions[])
`quesNo, subjects, lokNo, member[], ministry, type, date, questionText, answerText,
answerTextHindi, questionsFilePath, questionsFilePathHindi, questionsDocPath,
questionsDocPathHindi, sessionNo, supplementaryQuestionResDtoList, supplementaryType`

`questionText` / `answerText` / `answerTextHindi` are **always null** — verified on both a
starred and unstarred detail query. The reply text is **not** in JSON. It is in the
per-question document:

```
questionsDocPath  -> .../annex/187/AU6364_gHApBo.docx   (parseable via unzip + word/document.xml)
questionsFilePath -> .../annex/187/AU6364_gHApBo.pdf    (3 pages, same content)
```
238/274 records carry a doc. The 36 without are all session 2 (Aug 2024).

Filename prefix encodes answered-ness: **`AS` = Answered Starred (19), `AU` = Answered Unstarred (255)**.
`annex/{n}` is the session's annex volume (182–188 for LS18 sessions 2–8). Token is opaque —
always take the URL from the record, never construct it.

The DOCX contains the complete official Q&A — question text, the list of asking members with the
primary asker marked `†`, then `ANSWER` + minister + reply. Verified end-to-end for Q3961 and Q6364.

### Caveat on `member[]`
It lists every member on the question (unstarred questions are clubbed; one record had 26 names).
**Order is not reliably the primary asker** — for Q6364 the API lists Ravi Kishan first while the
official document names Manish Jaiswal first. For a strict "questions he personally asked" count,
parse the `†` marker out of the DOCX; `member[]` is otherwise "questions he is a signatory to".

## 2. Bills (Private Members')
```
GET https://sansad.in/api_rs/legislation/getBills
    ?loksabha=18&billType=Private%20Member&page=1&size=500&locale=en
    &sortOn=billIntroducedDate&sortBy=desc
```
Note: `/api_rs/` (Rajya Sabha path) served under the LS site — the LS legislation page calls it directly.

**No member filter exists.** `member`, `memberCode`, `mpNo`, `mpsno`, `billIntroducedBy`,
`introducedBy`, `name` were each fuzzed and all returned the unfiltered 291 — filter client-side on
`billIntroducedBy` (a name string, e.g. `"Ravindra Shukla Alias Ravi Kishan Shri"`).

Full param set: `loksabha` (`""` for Rajya Sabha), `sessionNo`, `billName`, `house`,
`ministryName`, `billType`, `billCategory`, `billStatus`, `introductionDateFrom/To`,
`passedInLsDateFrom/To`, `passedInRsDateFrom/To`, `page`, `size`, `locale`, `sortOn`, `sortBy`.

Totals: LS18 = 291 bills (202 Private Member) in one `size=500` page; LS17 = 728 Private Member.

### Ravi Kishan, LS18 — 3 Private Members' Bills
| # | Title | Introduced | Category | Status |
|---|---|---|---|---|
| 28 | The Traditional Fishermen (Protection and Welfare) Bill, 2024 | 2024-07-26 | Financial | Pending |
| 43 | The Artists (Social Security) Bill, 2024 | 2024-07-26 | Financial | Pending |
| 58 | The Constitution (Amendment) Bill, 2024 (Amendment of Eighth Schedule) | 2024-07-26 | Ordinary | Pending |

### Field schema (records[])
`billNumber, billName, billType, billCategory, ministryName, billYear, billIntroducedInHouse,
billIntroducedBy, billIntroducedDate, billIntroducedFile, billPassedInLSDate, billPassedInLSFile,
billPassedInRSDate, billPassedInRSFile, billPassedInBothHousesFile, errataFile,
referredToCommitteeDate, reportPresentedDate, reportFile, actNo, actYear, billAssentedDate,
billGazettedFile, billSynopsisFile, status`
Envelope: `_metadata{currentPageNumber, perPageSize, totalElements, totalPages}`

## 3. Attendance — YES, cleanly exposed
Three complementary endpoints, all per-MP and per-session:

**(a) Per-MP, legend-grouped date lists** (the detail view)
```
GET https://sansad.in/api_ls/member/getMemberAttendanceByMpsno
    ?loksabha=18&session=8&mpsno=5144
```
-> `[{attendanceType:"S", dates:["2026-07-20 00:00:00", ...]}, {attendanceType:"NR", dates:[]}, ...]`
Always returns all six buckets in order: `S, NR, NS, S*, S#, NS@`.

**(b) Per-session aggregate for every MP** (one call, all 540 members — best for a leaderboard)
```
GET https://sansad.in/api_ls/member/getMemberAttendanceMemberWise?loksabha=18&session=8&locale=en
```
-> `[{mpsno, memberName, constituency, state, stateCode, signedDaysCount, division}]`
Ravi Kishan: `{mpsno:5144, memberName:"Ravindra Shukla Alias Ravi Kishan", constituency:"Gorakhpur",
state:"Uttar Pradesh", signedDaysCount:15, division:51}`

**(c) Date-wise register for the whole House** (attendance on one sitting day)
```
GET https://sansad.in/api_ls/member/getMemberAttendanceDateWise
    ?loksabha=18&session=8&dateOfAttendance=2026/08/12&locale=en
```
-> `[{mpsno, memberName, attendanceStatus, division}]` (540 rows, 47 KB)
**Date format is `YYYY/MM/DD`** despite the frontend holding `DD/MM/YYYY` (it reverses before sending).

**Denominator:** `GET https://sansad.in/api_ls/member/attendance/session-dates?loksabha=18&session=8`
-> `["20/07/2026", ...]` the sitting dates of that session.

**Legend:** `GET https://sansad.in/api_ls/member/attendance-legends?locale=en`
`S` signed · `S*` signed via mobile app · `S#` signed both register and app · `NS` did not sign ·
`NS@` present but forgot to sign · `NR` not required.
`getMemberAttendanceMemberWise.signedDaysCount` counts `S + S* + S#`.

### Ravi Kishan — LS18 attendance
| Session | Sitting days | Signed | Not signed | % |
|---|---|---|---|---|
| 1 | 8 | 7 | 0 | 88% |
| 2 | 16 | 2 | 13 | 13% |
| 3 | 20 | 15 | 5 | 75% |
| 4 | 26 | 22 | 4 | 85% |
| 5 | 21 | 18 | 3 | 86% |
| 6 | 15 | 6 | 9 | 40% |
| 7 | 31 | 23 | 8 | 74% |
| 8 | 19 | 15 | 4 | 79% |
| **LS18** | **156** | **108** | **46** | **69.2%** |

Cross-checked: `signedDaysCount:15` for session 8 == 15 `S` dates from (a) == 15 `S` rows walking
all 19 days of (c). All three agree. LS17 sessions also return full history.

## 4. Auth / robustness
- **No session, cookie, CSRF, referer, or User-Agent required** — confirmed with `-H "Cookie:"`.
- **No rate limiting observed**: 12 rapid sequential calls -> 12x HTTP 200, ~0.7–1.3 s each.
- Every endpoint is slow-ish (~1 s) — a government server; allow generous timeouts.
- Gotchas: `sessionNumber=VIII` -> HTTP 500 (`sessionNumber` must be the integer).
  `supplementary-questions-answers` -> 404; `qetAllQuestions`, `qetAllQuestionsForMember`,
  `getMemberAttendanceMonthWise` -> 404/400 (logged-in-only or dead routes).
  `rsdoc.nic.in/bill/getbill_advance_search` -> 500 "Invalid input" (needs body/other params).
  `/ls/members/5144` -> 404 (no public per-MP profile route at that path).

## 5. Sanity check on other MPs
Shashi Tharoor (4569, INC): 135 questions, 6 PM bills, 18/19 signed in session 8.
Nishikant Dubey (4324, BJP): 254 questions, 6 PM bills, 19/19 signed in session 8.
Recipe generalizes across party and state.

## 6. Minimal curl-only recipe
```bash
MP=5144; LS=18
# questions + reply docs
curl -s "https://sansad.in/api_ls/question/qetFilteredQuestionsAns?loksabhaNo=$LS&pageNo=1&locale=en&pageSize=500&memberCode=$MP"
# bills (filter client-side on .billIntroducedBy)
curl -s "https://sansad.in/api_rs/legislation/getBills?loksabha=$LS&billType=Private%20Member&page=1&size=500&locale=en"
# attendance, per session
curl -s "https://sansad.in/api_ls/member/getMemberAttendanceByMpsno?loksabha=$LS&session=8&mpsno=$MP"
# attendance, all MPs one session
curl -s "https://sansad.in/api_ls/member/getMemberAttendanceMemberWise?loksabha=$LS&session=8&locale=en"
# reply text (URL comes from the question record)
curl -sL "<questionsDocPath>"   # .docx -> unzip -> word/document.xml
```
