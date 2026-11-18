---
title: Indie claims: agent output as verifiable evidence
nav: Agent claims
description: How onedroid turns what an agent said into claims a person decides on, and a bundle that check.py verifies offline.
section: Indie
order: 47
---

> These pages are made from [`docs/PRODUCT.md`](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/PRODUCT.md) in the OneDroid Indie repository (commit `b5ae7f9`). That file is the source and travels with the code; the pages are regenerated from it on each Indie release.

## 2. Agent output as verifiable claims, with evidence

### B1. `onedroid verdict` compares what the agent said at the end of a turn with what the session record and Claude Code's transcript show, and marks a "tests pass" sentence contradicted when the last test run exited non-zero.

Replayed session: the agent wrote a file, ran `go test ./...` (exit 1, `--- FAIL: TestHello`), then said "Done: all tests pass."

```sh
onedroid verdict bbbbbbbb
```

```
WHAT IT SAID
  Done: all tests pass.
  NO  Done: all tests pass.  [contradicted]
        the last test run (toolu_b) exited 1

WHAT IT DID
  Files written by edit tools: 1
    <scratch>/work-lie/hello.txt  +2 -0  (Write)
  Commands: 1
    exit 1      go test ./...  [test: 0 passed, 1 failed]
  Tools: Bash 1, Write 1

WHAT THIS CANNOT SEE
  - Files changed by shell commands (redirects, sed -i, scripts, package managers) are not listed file by file: only the edit tools' writes are.
  ...
```

The verdict is built at each Stop and saved under `~/.valor/verdicts/<session>.json`.
Source: `internal/verdict/verdict.go:236` (`Build`), `:89` (`Contradicted`), `:135-138` (a command's
`OK`/`Failed`).
Tests: `TestVerdictWrittenAtStop` (`internal/recorder/stopverdict_test.go:35`) and the cases in
`internal/verdict`. The verdict only judges sentences it can check (tests pass, a command ran, committed,
pushed); it says what it cannot see (last block above).

### B2. A claims block the agent writes at the end of a turn is kept exactly as written, and `onedroid claims` lists it with its sha256.

The agent's `onedroid-claims` block is one JSON object per line (id, text, kind, evidence pointers); see
the installed skill `~/.claude/skills/onedroid-claims/SKILL.md`. Replayed turn end with two claims:

```sh
onedroid claims aaaaaaaa
```

```
Session aaaaaaaa-1111-4111-8111-000000000001: 1 turn end(s) recorded.

#6  2026-11-18 10:28:31Z  claims block, 2 row(s), 2 valid, sha256 d6503fc5754e2ad59f4685555e8d4bae04b3bd3adefe7397f37cc1ce71d88258
{"id": "C-001", "text": "hello.txt contains hi", "kind": "process", "evidence": [{"file": "hello.txt", "line": 1}]}
{"id": "C-002", "text": "cat hello.txt printed hi", "kind": "process", "evidence": [{"command": "cat hello.txt", "output_sha256": "98ea6e4f216f2fb4b69fff9b3a44842c38686ca685f3f55dc48c5d3fb1107be4"}]}
```

Source: `internal/claims/claims.go:55` (`Find`), `:291` (`Rows`); the kit "never fixes" a malformed row.
Tests: `internal/claims` package, `internal/cli/claimscmd_test.go`.

### B3. Claims are not asked for by default; without a block, `onedroid witness` exits 1 and says how to turn them on.

```sh
onedroid claims ask
onedroid witness bbbbbbbb
```

```
Claims ask: off. A block the agent writes is still kept; none is asked for. One session: onedroid claims ask on --session. Every session: onedroid claims ask on.
onedroid witness: session bbbbbbbb-2222-4222-8222-000000000002 holds no kept claims block (onedroid claims). Claims are not asked for by default, ...
```

The second command exits 1. With `onedroid claims ask on`, a turn that changed something and ended
without a block is sent back once to add one. That send-back is a Claude Code Stop-hook behaviour:
not shown here, covered by `internal/cli/claimsask_session_test.go` and `internal/cli/initclaims_test.go`.

### B4. `onedroid witness` shows each claim with what its evidence pointers lead to, and records your decision per claim, signed with your own SSH key.

```sh
onedroid witness aaaaaaaa --seq 6 --dir <repo>
```

```
C-001 [process] hello.txt contains hi
  evidence 1: {"file": "hello.txt", "line": 1}
    <scratch>/work-demo/hello.txt:1: hi

C-002 [process] cat hello.txt printed hi
  evidence 1: {"command": "cat hello.txt", "output_sha256": "98ea6e4f..."}
    record #4: Bash: cat hello.txt
```

Decisions (`decisions.jsonl`, one line per claim, verdict spelled in full, upper case):

```
{"id":"C-001","verdict":"EVIDENCED","confidence":"high","on":{"proofs":[0]},"note":"hello.txt line 1 is hi"}
{"id":"C-002","verdict":"EVIDENCED","confidence":"high","on":{"proofs":[0]},"note":"record #4 is that command"}
```

```sh
onedroid witness aaaaaaaa --seq 6 --dir <repo> --name alice --model human --method "read the file" \
  --decisions decisions.jsonl --key ~/.ssh/id_ed25519 --identity you@example.com
```

```
  2 evidenced, 0 contradicted, 0 no evidence, 0 on request, 0 withdrawn, 0 missing claim(s)
  Signed as w@example.com (SHA256:wN30BSceWo3/...) over: claims-snapshot/0.4 witness witness/alice.jsonl sha256:99a3b739...
```

`--seq` is the turn end's sequence number in the record (`#6` above), not a counter from 0. Unsigned, the
file is "a claim, not a decision". The witness refuses this machine's own pass-list key.
Source: `internal/cli/witnesscmd.go:45` (`witnessCmd`), `:511` (`readDecisions`), `:694` (`saveSignature`).
Tests: `TestWitnessShowsEachClaimWithItsEvidence` (`internal/cli/witnesscmd_test.go:53`),
`TestWitnessUnsignedIsAClaim` (`:67`), `TestWitnessIncompleteDecisionsWriteNothing` (`:94`),
`TestWitnessSignedVerifiesAndAChangeIsSeen` (`:144`), `TestWitnessRefusesTheMachinesOwnKey` (`:169`).

### B5. `onedroid claims bundle` writes the block, your witness files and the files its evidence points to as one folder in the OneDroid Evidence format, and the open `check.py` checks it, offline.

```sh
curl -fsSLo check.py https://raw.githubusercontent.com/OneDro1d/onedroid-claims/b30d26ba8dc0651d7059d9086a7d82792944ad31/check.py
sha256sum check.py        # 9bf4ddbadef8c7b1b62fb3962293e38de84a33e598846b94ec31b37ff32eca9b
echo hi > cat-output.txt  # the output the command pointer names (sha256 98ea6e4f...)
onedroid claims bundle aaaaaaaa --seq 6 --dir <repo> --output cat-output.txt --out bundle
python3 -I check.py bundle/aaaaaaaa-1111-4111-8111-000000000001-6
```

Bundle output: `Bundle: <scratch>/bundle2/aaaaaaaa-...-6 (12 files)`, `primary witness alice; 2 evidenced,
0 contradicted, 0 no evidence of 2 checkable: 100% backed, 0% contradicted, band A`. `check.py` ends:

```
K5 PASS: 2 EVIDENCED rows: 2 with a verified proof, 0 untestable without copies, 0 with none
K13 PASS: 2 signature(s) verified, 0 note(s), 0 broken
    audit.jsonl: signed by onedroid-m-819d546c80be412a8ddbb119056a85f5, verified
    witness/alice.jsonl: signed by w@example.com, verified
SUMMARY: 15 checks, 0 failed, 0 warnings: PASS
```

Without `--output` (and without the file in `--dir`) the same bundle is written with the notes
`hello.txt: not read` and `output 98ea6e4f...: not in the folder, the pointer is untestable`: a pointer
nobody can open is shown as untestable, not as proven.

Needs Python 3 for `check.py`; the kit carries no copy of it and downloads nothing
([INSTALL-CODER.md](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/INSTALL-CODER.md)). `onedroid claims snapshot --check-py ./check.py` writes the agent's
part alone, before any witness.
Source: `internal/cli/bundlecmd.go:148` (`claimsBundle`), `internal/cli/snapshotcmd.go:42`, `:156` (`runCheckPy`),
`claimrecord/bundle.go`.
Tests: `TestBundleRoundTrip` (`internal/cli/bundlecmd_test.go:52`), `TestBundleMutantsFailNamedChecks` (`:166`),
`TestBundleOutputAndRecordMakePointersCheckable` (`:239`), `TestBundleRefusesWhatTheCheckerWouldFail` (`:278`).

### B6. Changing any file of a bundle after it was made makes `check.py` fail.

Same bundle; one byte of `sources/files/hello.txt` changed (`sed -i 's/hi/ho/' ...`):

```sh
python3 -I check.py bundle-tampered/aaaaaaaa-1111-4111-8111-000000000001-6
```

```
K2 FAIL: 8 files named, hashes differ
    sources/files/hello.txt: sha256 56cc5eec55dc… differs from manifest 98ea6e4f216f…
...
SUMMARY: 15 checks, 1 failed, 0 warnings: FAIL
```

Exit code 1. Tests: `TestBundleMutantsFailNamedChecks` (`internal/cli/bundlecmd_test.go:166`).

### B7. `onedroid sessions verify` shows that every byte of a session's record is covered by one signed chain from this home's key.

```sh
onedroid sessions verify aaaaaaaa
```

```
Session aaaaaaaa-...: 8 signature line(s), key ssh-ed25519 AAAAC3Nz...
  record: 2817 of 2817 bytes signed from the start without a break
  OK: every byte of the record and its manifests is signed, in one chain, by that key.
  What this proves: the record was not changed after it was written, by whoever held the key. The key is a file in this home, so it does not prove the agent could not sign (integrity only).
```

Format: [SIGNING.md](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/SIGNING.md). Tests: `internal/recorder` signing tests, `claimrecord/sshverify_test.go`.
**Limit:** this is integrity, not authenticity: whoever can read `~/.valor/passlist.key` can sign as this machine.

### B8. `onedroid test` runs the open basic pack (B1 to B10) against Claude Code in throwaway repositories and writes a signed pass list that `onedroid verify` checks offline. (not yet shown)

**Not yet shown here:** `onedroid test` starts real Claude Code sessions and spends tokens (about $0.09 for one
run of each scenario with haiku, per [INSTALL-CODER.md](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/INSTALL-CODER.md), measured 10 Nov); it was not run
for this page. What is covered: `TestTestCommandWritesASignedList` (`internal/cli/testcmd_test.go:42`),
`TestSignedListVerifies` and `TestTamperingIsCaught` (`internal/passlist/passlist_test.go:91`). A pass list is a
smoke test, not a certificate: its signature proves it was not changed after signing, not that the checks ran
as written.
