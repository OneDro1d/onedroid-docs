---
title: Indie token cost: per commit, repo, day and session
nav: Token cost
description: How onedroid writes AI token cost into commit messages and reports it per commit, repo, day and session at list price, each claim with its check.
section: Indie
order: 48
---

> These pages are made from [`docs/PRODUCT.md`](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/PRODUCT.md) in the OneDroid Indie repository (commit `b5ae7f9`). That file is the source and travels with the code; the pages are regenerated from it on each Indie release.

## 3. Token burn and cost

### C1. In a repository that opted in, each commit gets `Valor:` lines with tokens per model and the ticket key, read from Claude Code's own transcripts.

```sh
onedroid init --opt-in        # in the clone: four git hooks, the mark, .github/valor.yml
git add .github/valor.yml
git commit -m "Opt in to OneDroid cost lines"   # carries no Valor: lines
# the session then spends tokens (here: 4,000 in, 500 out, 20,000 cache read, 3,000 cache write)
git add hello.txt
git commit -m "ABC-7 add hello.txt"
git log -1 --format=%B
```

```
ABC-7 add hello.txt

Valor: id=01M7Q39FHCYXWFR0KGCJ070962 ticket=ABC-7 model=claude-sonnet-5-5 in=4000 out=500 cr=20000 cw5=3000 cw1h=0
```

Before the commit, `onedroid status` listed the same numbers as "not in a commit yet":
`claude-sonnet-5-5  4,000  500  20,000  3,000  0  $0.02`, `Owner decided by: paths 100%`.
The transcript here was the replayed one (A0 note); the counting code reads the same files Claude
Code writes.
Source: `internal/valorline/valorline.go:63` (the line format), `internal/account/account.go:46` (`Run`),
`internal/transcript/scan.go:37` (`Scan`), hooks in `internal/hook`.
Tests: `internal/cli/scenario_test.go` (`TestScenarioAmend` `:79`, `TestScenarioOptInCommitWritesNothing` `:418`,
`TestScenarioTicketFromFirstPromptAndExtraPattern` `:514`). How a commit is counted:
[COST-LINES.md](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/COST-LINES.md).

**Limit:** opting in shows spend per author in `git log` to anyone who can read the repository.

### C2. `onedroid report` totals the commits' lines per ticket and per model at dated list prices, counting each `(id, model)` once.

```sh
onedroid report
```

```
3 commit(s), 1 with 'Valor:' lines; 1 line(s) counted.

ticket                                   in          out     cache read    cache wr 5m    cache wr 1h   list price
ABC-7                                 4,000          500         20,000          3,000              0        $0.02

model                                    in          out     cache read    cache wr 5m    cache wr 1h   list price
claude-sonnet-5-5                     4,000          500         20,000          3,000              0        $0.02

Total: 27,500 tokens, $0.02 at list price (prices of 2026-10-15; not a bill).
```

`onedroid report --json` gives the same with `usd_list_price: 0.0225` and `price_effective_from: "2026-10-15"`;
`--csv FILE` writes a CSV; `--pr N` builds it from a GitHub PR's commits. Prices are list prices with
a source URL each in `internal/prices/prices.json`; they are not your bill (on a subscription an extra token
costs nothing until the limit).
Source: `internal/report/report.go:77` (`Build`), `internal/prices/prices.go:96`.
Tests: `TestBuildCountsOnceAndPrices` (`internal/report/report_test.go:18`), `TestNoTicketBucketAndEstimates` (`:85`),
`TestScenarioReportCSV` (`internal/cli/scenario_test.go:543`).

### C3. `onedroid init --backfill` counts this checkout's past spend as local-only estimates that `onedroid report` shows apart from commit lines.

```sh
onedroid init --backfill --days 30
onedroid report --json
```

```
Backfill: 19,910 tokens from 2026-10-19 to 2026-11-18 10:29, kept locally as estimates for `onedroid report`.
```

and the JSON has an `estimates` array (`"estimate": true`, `"commit": ""`) and an `estimate_total`, next to the
commit rows; the estimates are in no commit and no git note. `--no-estimates` leaves them out.
Source: `internal/cli/main.go:523` (`backfillCmd`), `internal/mark/mark.go:397-402`.
Test: `TestNoTicketBucketAndEstimates` (`internal/report/report_test.go:85`).

### C4. `onedroid report --by commit|repo|day|session` groups spend by that key; `--repo PATH` (repeatable) covers several repositories.

Per commit and per repo come from the commits' `Valor:` lines (what was recorded at commit
time). Per day (UTC) and per session come from the transcripts of the recorded sessions, so they
also count spend that never reached a commit; they are labelled ESTIMATE. Same fixture as UI4.

```sh
onedroid report --by day
onedroid report --by repo --repo <scratch>/alpha --repo <scratch>/beta
onedroid report --by commit
```

```
day                                        in          out     cache read    cache wr 5m    cache wr 1h   list price
2026-11-01                          1,000,000       50,000      2,000,000              0              0        $5.40
2026-11-02                          2,500,000      180,000      3,000,000              0              0        $9.20
2026-11-03                              1,000        1,000              0              0              0 $0.00 +unpriced

Total: 8,732,000 tokens, $14.60 +unpriced at list price (ESTIMATE) (prices of 2026-10-15; not a bill).
Days are UTC.
1 recorded session(s) have no transcript on this machine and are not counted: cccccccc-1111-2222-3333-444444444444.
Not in the price list: some-future-model.

repo                                       in          out     cache read    cache wr 5m    cache wr 1h   list price
<scratch>/alpha                     1,000,000      200,000      5,000,000              0              0        $9.00
<scratch>/beta                      2,000,000      100,000              0              0              0        $5.00

Total: 8,300,000 tokens, $14.00 at list price (prices of 2026-10-15; not a bill).

commit                                     in          out     cache read    cache wr 5m    cache wr 1h   list price
211cc61f1ee3                                0      200,000      5,000,000              0              0        $5.00  alpha: fix <b>edge</b> case
32246d897a3f                        1,000,000            0              0              0              0        $4.00  alpha: add parser
```

`--by session` gives one row per recorded session (`aaaaaaaa-… $9.60`, `bbbbbbbb-… $5.00 +unpriced`).
`--json` and `--csv FILE` carry the grouping (`"by": "commit"`, a `by,name,label,…` CSV header).
`onedroid report` with no `--by` is unchanged (C2). A recorded session whose transcript is gone is
named, not counted; a model missing from the price list is named and its rows are marked `+unpriced`.

Source: flag `internal/cli/main.go:829`, grouping `internal/report/breakdown.go`.
Tests: `TestReportByCommit` (`internal/cli/reportby_test.go:60`), `TestReportByRepoWithSeveralRepos` (`:79`),
`TestReportByDayAndSessionFromTranscripts` (`:104`), `TestReportByCSVAndJSON` (`:123`), `TestReportByRefusals` (`:157`).

Limits: backfill estimates (C3) are not merged into `--by`. Per day and per session come from
this machine's transcripts, not from a repository, so `--by day` with `--repo` or `--pr` exits 2
with a message (tested in `TestReportByRefusals`).

### C5. The dashboard's Costs page shows the same numbers as `onedroid report --by`.

In the fixture both give `$14.60 +unpriced` per day and per session, and `$9.00` / `$5.00` per repo
(UI4 and C4 above). Both are built by the same code: `internal/ui/costs.go:50` calls the
`internal/report` breakdown that `onedroid report --by` prints.

### C6. Posting a PR comment with the cost needs GitHub. (not yet shown)

`onedroid post --dry-run` builds the comment; sending it calls GitHub. Not run here (no GitHub repository
in the isolated home). Tests: `internal/post`, `TestScenarioPost` (`internal/cli/scenario_test.go:602`).
