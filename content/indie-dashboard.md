---
title: Indie dashboard: sessions and tests on a local page
nav: Dashboard
description: What onedroid ui shows (sessions, alerts, costs and tests), what it refuses, each claim with its check.
section: Indie
order: 46
---

> These pages are made from [`docs/PRODUCT.md`](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/PRODUCT.md) in the OneDroid Indie repository (commit `b5ae7f9`). That file is the source and travels with the code; the pages are regenerated from it on each Indie release.

## 1. Local dashboard of sessions and tests (`onedroid ui`)

### UI1. `onedroid ui` serves your sessions, each session's timeline and verdict, credential alerts, worktree checkpoints and the "is it recording?" findings on one local page.

```sh
onedroid ui --port 8791 &
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://127.0.0.1:8791/
curl -s http://127.0.0.1:8791/ | grep -o -E "<h2>[^<]*"
```

Output:

```
200 text/html; charset=utf-8
<h2>Is it recording?
<h2>Credential alerts
<h2>Sessions
```

The Sessions table has the columns Session, Started, Last event, State, Events, Gaps, and
"Verdict at the last Stop" (here: `1 prose claim(s), 1 contradicted` for a replayed session whose
agent said "all tests pass" after a failing run). A session page is `/session?id=<id>`, alerts are
`/alerts`; a session page also lists its worktree checkpoint.

Source: routes `internal/ui/ui.go:113`; page templates `internal/ui/page.go`.
Tests: `TestIndexShowsSessionsVerdictAlertsAndDoctor` (`internal/ui/ui_test.go:264`),
`TestSessionPage` (`:292`).

### UI2. The page answers only on a loopback address, refuses a request that names another host, and writes nothing to the record except a person's Pause or Resume.

```sh
onedroid ui --host 0.0.0.0
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: evil.example" http://127.0.0.1:8791/
```

The second command printed `421`. The first exited 2 with
`onedroid ui: the page is served on a loopback address only (127.0.0.1, ::1 or localhost): "0.0.0.0"`
(refused before a socket opens). The Pause and Resume button needs a token made fresh for
each run of `onedroid ui`; the page has no login, so anyone who can reach that port on the
machine can read it ([SECURITY.md](https://github.com/OneDro1d/onedroid-indie/blob/main/SECURITY.md), boundary 3).

Source: `internal/ui/ui.go:39` (`Loopback`), `:50` (listen refuses), `:109-110` (421).
Tests: `TestListenLoopbackOnly` (`internal/ui/ui_test.go:185`), `TestOtherHostRefused` (`:236`),
`TestPauseNeedsThePageToken` (`:371`), `TestTokenIsPerRun` (`:444`), `TestPagesWriteNothing` (`:461`),
`TestNoExternalAssets` (`:355`).

### UI3. The page never shows a registered key or an escaped script from a recorded session.

Tests only: `TestEscapedAndOwnKeyHidden` (`internal/ui/ui_test.go:323`).

### UI4. A Costs page (`/costs`) shows token burn and list-price cost per day, per session, per repo and per commit, read-only.

Fixture: two git repositories with three `Valor:` commit lines, two recorded sessions with
transcripts (one using a model that is not in the price list), and a third recorded session
whose transcript is gone.

```sh
onedroid ui --port 18765 --repo <scratch>/alpha --repo <scratch>/beta &
curl -s http://127.0.0.1:18765/costs | grep -o -E "<h2>[^<]*"
curl -s -o /dev/null -w "POST /costs -> %{http_code}\n" -X POST http://127.0.0.1:18765/costs
```

Output (trimmed):

```
<h2>Per day (UTC): ESTIMATE
<h2>Per session: ESTIMATE
<h2>Per repo (from commits' 
POST /costs -> 405
```

The Per day table shows `2026-11-01 ... $5.40`, `2026-11-02 ... $9.20`,
`2026-11-03 ... $0.00 +unpriced`, total `$14.60 +unpriced`, under the banner
"These are list-price estimates, not a bill." The numbers are the same as `onedroid report --by`
(C4). A commit subject such as `fix <b>edge</b> case` is shown as text, not as HTML.

Source: route `internal/ui/ui.go:253`, page `internal/ui/costs.go:50`.
Tests: `TestCostsPageShowsDayAndSessionAsEstimates` (`internal/ui/costs_test.go:92`),
`TestCostsPageShowsRepoAndCommitFromValorLines` (`:106`), `TestCostsPageEscapesCommitSubjectsAndSessionNames` (`:121`),
`TestCostsPageIsReadOnlyAndLoopbackOnly` (`:133`), `TestCostsPageNamesSessionsWithoutATranscript` (`:147`).

Limit: the page re-reads the transcripts on every load (no cache), so it is slow with a very
large `~/.claude`.

### UI5. A Tests page (`/tests`) lists every `onedroid test` pass list with its verdict per scenario and whether its signature verifies, plus the runner's run records.

`onedroid test` now keeps a copy of each pass list under `$VALOR_HOME/passlists/`, wherever
`--out` writes it.

```sh
onedroid test --only B4,B6 --runs 1 --out <scratch>/elsewhere.json
curl -s http://127.0.0.1:18765/tests | grep -o -E "signature verifies|<td>B[0-9]</td><td>[a-z_]*"
```

Output (a stand-in for Claude Code that records nothing, so each run is a harness error):

```
signature verifies
<td>B4</td><td>harness_error
<td>B6</td><td>harness_error
```

The signature is checked offline on every load. A list changed after signing, or signed by a
key that is not this machine's, is flagged (test below). A valid signature proves only that the
list was not changed after signing, not that the checks ran as written.

Source: route `internal/ui/ui.go:256`, page `internal/ui/tests.go:50`.
Tests: `TestTestsPageListsEachScenarioAndWhetherTheSignatureVerifies` (`internal/ui/tests_test.go:62`),
`TestTestsPageFlagsAChangedListAndAForeignKey` (`:78`), `TestTestsPageEscapesWhatTheListsHold` (`:104`),
`TestTestsPageListsTheRunnersRunRecords` (`:124`), `TestTestsPageIsReadOnly` (`:155`).

Limits: results of `onedroid record run` are written only to its `--out` folder and are not
listed here; run records' signatures are shown, not re-checked.
