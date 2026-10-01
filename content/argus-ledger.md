---
title: Argus Ledger — test results anyone can verify
nav: Ledger and certificates
description: How Argus anchors a certification on a blockchain — the tests sealed before the run, the verdict after it — and how people, AI agents and third parties use and check it.
section: Argus
order: 34
---

A green test run is a claim. The Ledger turns it into evidence. Argus writes each step of a
certification to a blockchain as it happens: what was being certified, the sealed set of tests,
the verdict, and the moment the tests were revealed. Anyone can then check, with no Argus account
and without seeing a single test, that:

- **the tests existed, sealed, before the run.** Nobody could have written them to fit the result.
- **the verdict was recorded against exactly those tests**, and has not changed since.
- **the tests stayed hidden until the result was in.** The reveal is itself recorded, so a leak
  cannot be backdated.

Be precise about what that proves. The chain proves **priority**: when each piece existed and that
it has not changed since. It does not prove **custody**: that nobody showed the tests to the
builder in between. Custody is what the [holdout](/argus#the-holdout) enforces. The builder,
whether a person or an AI agent, gets a credential that cannot read a test and an environment that
never holds one. Together they make a verdict worth checking: tests the builder could not have seen,
fixed before the build was judged, and a result that cannot be quietly rewritten.

## What goes on chain

Only ids, hashes, digests, counts and the verdict. **Never a scenario, an expected value, an
observed value, a workspace, an instance or a host.**

| Record | Written when | What it carries |
|---|---|---|
| **Commitment** (version 1) | You start a certification: `author_anchor_commit` | the commit under certification, its image digests, the runner release digest, an opaque commitment id |
| **Scenario set sealed** (version 2) | You seal the set: `author_seal_set` | the Merkle root of the sealed scenario set, the acceptance-criteria hash, the set hash, how many scenarios |
| **Verdict** (version 3 and later) | A `final` or scheduled certification run finishes | the run id, the artifact digest it certified, the evidence-bundle hash, the verdict, the tallies (passed, failed, errored, degraded) and when the run finished |
| **Reveal** | Someone first reads the run's reveal document | the run id, when it was revealed, the SHA-256 of the exact reveal document, the commitment id |
| **Run result** | Any run finishes, on chains where **Every run** is on | the run id, mode, outcome, evidence-bundle hash (and artifact digest and set hash when the run has them) |

The first four form one record, versioned on each chain. A certificate is checked against those
versions. Run results are separate, one record per run.

## Chains

Each Argus environment is configured with its chains. On an Ethereum-style chain every record is
a transaction you can open. On **Bitcoin via OpenTimestamps**, only a hash is timestamped. It shows
*Pending Bitcoin confirmation* until a Bitcoin block includes it, usually within a few hours, and
then *Bitcoin block N*.

The Argus dev environment has three:

| Chain | Kind | Where you look |
|---|---|---|
| `base-sepolia` | public Ethereum test network | **View on explorer** opens the transaction on Basescan |
| `bitcoin-ots` | Bitcoin, through OpenTimestamps | **View on explorer** opens the Bitcoin block once attested |
| `argus-dev-poa` | private chain run by Argus | **View transaction** opens Argus's own viewer: signer, whether that signer is allowed, the record's payload |

A third party can read a public chain themselves. A private chain is proof only to people who can
reach it. For a certificate you will hand to someone outside, keep certification on at least one
public chain.

## For people: the Ledger tab

Open **Ledger** in the sidebar of your workspace.

**What gets written to each chain.** One row per chain, two switches:

- **Certification record**: the commitment, the sealed set, the verdict and the reveal of every
  certification. On by default.
- **Every run**: each run's result hash, for ordinary runs too. Off by default.

Only the workspace owner can change them. At least one chain must keep **Certification record**
on, or no certification could be anchored anywhere. A **Certification record** change applies to
the next certification you start, never to one already in flight: its chains are fixed when it
begins. An **Every run** change applies from the next run that finishes.

**Every anchor in this workspace.** Newest first: when, which chain, what it is (*Commitment v1*,
*Scenario set sealed v2*, *Verdict v3*, *Reveal*, *Run result*), which run or commitment it
anchors, where it sits (block, or Bitcoin state), and the transaction hash with a link to look at
it. A run id opens that run.

**Runs that could not be anchored.** This section appears only when there is something in it: a
run that finished but whose result did not land on every chain it was meant for, with the reason
and the transactions that did land. Argus retries a run-result write that was interrupted. A run
listed here has ended failed and is not retried. A run is never shown as anchored when it only
partly is. A **verdict** that failed on one chain is a different case, and is retried: see step 5
under "For AI agents".

## For AI agents: certify a build

These are the tester's tools. A tester agent connects with an author token (see the
[Tester guide](/argus-tester-guide)). A **builder** agent has none of them and never needs them:
it sees only the verdict, through `runner__get_report`.

The order matters, and each step is refused by name if you skip one:

1. **Start the certification.**
   `author_anchor_commit` with `instance_id`, `commit_digest` (the commit under certification),
   `runner_digest` (the pinned runner release digest), and optionally `image_digests` and
   `criteria` (the acceptance criteria, one per line). This creates a *draft* commitment and
   anchors version 1, before any test exists.
2. **Write the certification tests.**
   `author_propose_scenario`, or `author_write_scenario` with `set_kind: "certification"` and a
   path under `certification/`. Accepted only while the commitment is a draft.
3. **Seal the set.**
   `author_seal_set` with `instance_id`. The set is frozen from here on. Its Merkle root is
   anchored as version 2, before any run against it.

   An instance may hold several drafts and several sealed sets at once. When more than one
   exists, name one with `commitment_id` on `author_seal_set`, `author_request_run` and
   `author_set_schedule`. `author_list_commitments` lists them with their ids. Without a
   `commitment_id`, a call is refused by name and lists the candidates.
4. **Run it.**
   `author_request_run` with `mode: "final"` and `artifact_digest` (the digest of the artefact
   being certified). When the result arrives, the verdict is anchored as version 3. To keep
   re-certifying a live system, `author_set_schedule` re-runs the sealed set on an interval, and
   each run is anchored as the next version.

   Before a `final` or `scheduled` run starts, the executor reads the image digests that are
   actually running in the system under test (v0.3.47 or later). If your `artifact_digest` is
   provably not among them, the run is refused: no scenario runs, and there is no verdict. If
   the executor cannot tell, the run goes ahead and the certificate says `not_measured`, with
   the reason. On Kubernetes the system's owner must let the executor list pods in the system's
   namespace. `argus render-k8s --sut-namespace <ns> --emit-sut-access-role` writes that
   read-only Role. Without it, every certifying run reads `not measured: forbidden`.

   To check a certification set before you seal it, run it as a rehearsal:
   `author_request_run` with `mode: "rehearsal"` runs the **draft** set. A rehearsal binds no
   verdict, writes no anchor, and takes no `artifact_digest`. Its results are yours alone.
5. **Hand out the proof.**
   `author_get_certificate` with `instance_id` and `run_id` returns the certificate: proof
   without the tests. It carries no scenario, no expected or observed value, and no id that names
   your workspace or system. It is refused by name until the set and the verdict are both
   anchored. A v3 certificate also carries `artifact_measurement`, with `state` `matched` or
   `not_measured`: whether the digest you declared was among the digests running in the system
   (a run on an executor older than v0.3.47 gets a v2 certificate, which says nothing about
   this).

   **Is anchoring finished?** A certificate is issued as soon as any chain holds the verdict.
   Its `anchoring.status` is `in_progress` while a chain still lacks it: fetch the certificate
   again until it says `complete`. A verdict that failed on one chain is retried about every
   10 minutes for 72 hours after the run finished. When Argus stops retrying (the 72 hours
   passed, or the commitment was revealed, or the run has no `artifact_digest`), the status is
   `incomplete` and `anchoring.note` says which chain is missing the verdict and why. Fetching
   again will not change it, and the certificate verifies only what it carries.
6. **Reveal, when you choose to.**
   `author_get_reveal` with `instance_id` and `run_id` returns the full reveal document: the
   sealed scenarios, their Merkle proofs, the per-scenario verdicts and the commands to replay
   them. The first call also anchors the reveal. If that anchor cannot be written, the reveal is
   refused. The seal is never broken off the record.

**Read the ledger.** `author_get_ledger_settings` (which chains get which records) and
`author_list_ledger_anchors` (every anchor, newest first. Filter with `kind`: `commitment`,
`set`, `verdict`, `reveal` or `run`. Page with `before` set to the previous call's
`next_before`). The answer also carries `verdict_anchor_failures` (the newest 20): each run
whose verdict failed to anchor on a chain, with `retrying`, `retry_until` and, once `retrying`
is false, the reason in `error`. Both are read-only. **No agent can change a ledger setting or write to a chain
directly.** Records are written by Argus as a side effect of the steps above, and settings are
changed by the workspace owner in the Ledger tab.

## For anyone: check a certificate

You need the `argus` CLI and the certificate file. You do not need an Argus account: these
commands never contact Argus.

```
argus certificate verify cert.json --rpc https://sepolia.base.org
```

It reads each anchor back through the chain you point `--rpc` at (here Base Sepolia's public
endpoint) and checks it against what the certificate declares, under the signer the anchor
recorded. Each anchor comes back `verified`, `mismatch`, `unreachable` or `pending`. An anchor on a
chain you did not point at, such as a private one, comes back `unreachable`, and that does not fail
the check. The command exits `0` when at least one of the run's verdict anchors verified and no
anchor mismatched. Add `--chains <your own chains.json>` to check each signer against your own list
rather than trusting the one the certificate declares. Add `--btc-headers <url-or-file>` to check an
OpenTimestamps anchor. Give it a block explorer API base URL, or a JSON file
`{"<height>": "<merkle root>"}`. Write the merkle root in display order, exactly as a block
explorer or `bitcoin-cli getblockheader` prints it. A header file written for v0.3.46 used the
other order and must be rewritten (v0.3.47 or later reads display order).

Given a reveal document, you can go further:

```
argus anchor verify reveal.json --rpc <ethereum-rpc-url> --btc-headers <url-or-file>
argus replay <scenario_id> --against <artifact_digest> --reveal reveal.json --config argus-config.yaml
```

`anchor verify` checks every anchor in the reveal and prints one line per check, each
`VERIFIED`, `MISMATCH`, `UNREACHABLE` or `PENDING`. The last line is `OVERALL: verified` or
`OVERALL: NOT verified`. It exits `0` only when no line is a `MISMATCH` and at least one of the
run's verdict anchors is `VERIFIED`. A reveal also carries `current_receipts` beside its frozen
bytes: an OpenTimestamps receipt that was pending when the reveal was assembled and a Bitcoin
block has attested since. `anchor verify` uses the current receipt and says so on that line.
`replay` runs one revealed scenario against a
system **you deployed yourself** from the certified artefact, so you can see the verdict hold
without trusting anyone's environment.

## Where to go next

- **[Tester guide](/argus-tester-guide)**: writing and running scenarios, and the author token.
- **[Builder guide](/argus-builder-guide)**: what the system's own agent can and cannot see.
