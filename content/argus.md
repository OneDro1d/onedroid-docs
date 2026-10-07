---
title: Argus — end-to-end tests your builder can't see
nav: What Argus is
description: End-to-end tests run against your real, deployed system and judged on its own logs — with the builder held to a genuine holdout.
section: Argus
order: 30
---

Argus runs end-to-end tests against a real, deployed system — never a mock — and judges the
result the way an operator would: by reading the system's own structured logs, its saga
events, and its database state, from a process that sits next to it. The output is a report
you can trust precisely because the agent fixing the system was never shown what would be
checked.

## The holdout

Argus separates two roles, deliberately, and keeps them apart:

- **A tester** writes and runs scenarios — plain-Markdown contracts that say what to trigger
  and what a healthy response looks like.
- **A builder** — the agent (or person) who owns the system under test — fixes what's broken
  and re-runs the tests to check the fix. The builder gets a pass/fail report built from
  *observed* reality — logs, saga events, response bodies — and never the scenario's expected
  values. It cannot read what it is being judged against.

This holdout is enforced twice, not once: by what a builder's credential is even allowed to
call, and separately by what its own environment is allowed to hold a copy of. A builder that
already knows the answer isn't proving anything by going green.

If you write and run tests, start with the **[Tester guide](/argus-tester-guide)**. If you are
the agent whose system is under test, start with the **[Builder guide](/argus-builder-guide)**
— and read the holdout section first, because the most common mistake is asking a tester
agent's question from a builder session.

## What gets checked

A scenario is a `TRIGGER` (what to do — an HTTP call, a message, a database read, an MCP tool
call), a `VERIFY` (where to look), and an `EXPECT` (what "healthy" means there). Argus judges
across whichever of these layers your scenario declares: HTTP ingestion, message flow,
database state, external delivery, error paths, rate limiting, and permissions — plus MCP
tool-call testing and UI flows for systems that expose them. Nothing is mocked: the assertions
run against your system's actual logs and actual state, correlated by a `correlation_id` that
propagates through it.

## Two planes

A **control plane** holds the scenario catalog, the run history, and the workspace that scopes
who can see what. An **execution plane** runs next to your system — inside its own network or
namespace — and is the only thing that ever calls it. The execution plane reaches the control
plane outbound only: your system's network needs egress, never an inbound route.

## The two modes

| Mode | Runs | For |
|---|---|---|
| **Run** | whichever scenarios you ask for, once | authoring and iterating |
| **Monitor** | your reviewed scenario set, on a schedule | watching a live system stay healthy |

`Monitor` is a schedule: set it once and your system is tested continuously without you
driving it by hand. See [Tester guide § Monitor schedules](/argus-tester-guide#monitor-schedules)
for the exact call — set `mode` to `"monitor"` on every schedule you create.

## Certify, and let anyone check it

Beyond running and monitoring, a tester can **certify** a build: commit to what is being
certified, write and seal a set of tests the builder never sees, then run them once as a `final`
run. Argus anchors each step on a blockchain as it happens: the sealed set before the run, the
verdict after it, and the moment the tests are revealed. The result is a **certificate** that a
third party checks against the chain themselves, with no Argus account and without seeing a
single test. See **[Ledger and certificates](/argus-ledger)**.

## What changed recently

These pages describe Argus v0.3.65. Each note below links to the section that has the detail.

- **A connection that must fail is now a claim, and `argus calm import`** (v0.3.65):
  `- step <name>: unreachable` passes only when the connection could not be made, and
  `argus calm import` turns a CALM architecture into checks. Both need executor v0.3.65 or later
  for the claim. See [Connections that must fail](/argus-tester-guide#connections-that-must-fail-v0365-or-later)
  and [Checks from a CALM architecture](/argus-tester-guide#checks-from-a-calm-architecture-v0365-or-later).
- **Two fixes in v0.3.65:** an MCP check against a server that sends notifications before its
  result (on a `text/event-stream` answer) now judges the result, not the first notification. And
  `validate-config` no longer asks for `targets.mcp.base_url` for a chain check that also carries an
  `mcp` tag: it decides by the engine that runs the check, chain before mcp.
- **Clearer onboarding** (v0.3.63 and v0.3.65): credential files are created 0600, a full Docker
  address pool is named, and a workspace-bound token says it cannot onboard. See
  [Onboarding notes](/argus-tester-guide#onboarding-notes-v0363-or-later).
- **Load checks keep connections open, and the load record says why requests failed** (v0.3.63):
  see [Connections and the load record](/argus-tester-guide#connections-and-the-load-record-v0363-or-later).
- **A target that runs in no cluster** (v0.3.63): `outside_cluster: true`. Update the executor before
  you add the key. See
  [Several test targets](/argus-tester-guide#several-test-targets-v0352-or-later).
- **Logs and metrics survive a pod recreate on Kubernetes** (v0.3.62): the Loki and Pushgateway
  now keep their data on volumes, and `--obs-storage-class` picks the class. Existing instances get
  them when you onboard again or run `argus upgrade --apply`. See
  [Storage for logs and metrics](/argus-tester-guide#storage-for-logs-and-metrics-v0362-or-later).
- **`check_env`, `${INGESTION_URL}` and clearer onboarding errors** (v0.3.62): declare the names a
  check needs, use the base URL in a chain step, and read why a config was refused. See
  [Values a check uses](/argus-tester-guide#writing-a-scenario).
- **A target can be declared never load tested** (v0.3.60): `load_test: never`. Update the executor
  before you add the key. See
  [Several test targets](/argus-tester-guide#several-test-targets-v0352-or-later).
- **`argus validate-config --scenarios` reports the scenario writers' rules** (v0.3.59), and a
  load step the broker blocked is no longer flagged `generator_limited`. See
  [Writing a scenario](/argus-tester-guide#writing-a-scenario) and
  [Load testing](/argus-tester-guide#load-testing).
- **A blocked broker reads as what it is** (v0.3.55 and v0.3.56): the run fails with
  `blocked by broker: <reason>`. See [Load testing](/argus-tester-guide#load-testing).
- **A failed numeric claim shows the number** (v0.3.54): `failed_claims[].observed` holds the value
  the field held, not the saved-value placeholder. See [Running](/argus-tester-guide#running).
- **Comparing systems** (v0.3.57): see [Comparing systems](/argus-compare).
- **A new web app** (v0.3.53): five places, **Overview**, **Capacity**, **Runs**, **Checks** and
  **Proof**, one run drawer, and **Needs a person** items you file with `author_file_attention`.
  Hand-started runs can say what they are for with `intent`, `expect` and `note`. See
  [What the Argus app shows](/argus-tester-guide#what-the-argus-app-shows) and
  [Running](/argus-tester-guide#running).
- **A least-privilege AMQP load login, and metrics retention** (v0.3.53): `queues.load` sets the
  queue name prefix, and `observability.pushgateway.group_retention` limits how long a run's
  metrics stay. See [Load testing](/argus-tester-guide#load-testing) and
  [How long a run's metrics are kept](/argus-tester-guide#how-long-a-runs-metrics-are-kept-v0353-or-later).
- **`argus doctor`** (v0.3.53): a working cloud tester no longer fails, and `sut-reachable` tells a
  fresh reading from a stale one. See the [Quickstart](/argus-quickstart#4-prove-read-access-before-wiring-anything-else).
- **Proof page** (v0.3.53): certified releases first, filters and search, and an **Anchored** filter
  on Runs. See [Ledger and certificates](/argus-ledger#for-people-the-proof-page).
- **AMQP load testing is open** (v0.3.52): a load run against a broker you list under
  `load_allowed_targets`. See [Load testing](/argus-tester-guide#load-testing).
- **`## LOAD` durations work again.** From v0.3.37 to v0.3.51 every load duration was ignored, so
  load numbers taken in that range are not measured: re-run them on v0.3.52. See
  [Load numbers taken before v0.3.52](/argus-tester-guide#load-numbers-taken-before-v0352).
- **Log queries take a whole correlation id** (v0.3.52), for every role. See
  [Reading a red](/argus-tester-guide#reading-a-red) and the
  [Builder guide](/argus-builder-guide#triage-blind).
- **Your own dashboard, several test targets, summary numbers** (v0.3.52): see
  [Configuring what your environment shows](/argus-tester-guide#configuring-what-your-environment-shows).
- **`argus preflight` checks Docker and host ports** on a Docker machine, and `--obs none`
  renders no observability (v0.3.52): see
  [Installing into a Kubernetes cluster](/argus-tester-guide#installing-into-a-kubernetes-cluster)
  and the [Quickstart](/argus-quickstart#4-prove-read-access-before-wiring-anything-else).
- **Reports and checks** (v0.3.51 and v0.3.52): `observed_status`, an exact HTTP `equals`, and the
  failed body check named for the tester. See [Running](/argus-tester-guide#running).
- **Install the CLI from a release** and the `argus doctor` fixes: see the
  [Quickstart](/argus-quickstart#1-get-the-argus-cli).
- **Where things moved in the web app** (v0.3.53): Proof was called Ledger. **Environments**,
  **API Tokens**, **My workspaces** and **Onboarding & setup** are in the **Settings** menu at the top
  right. Old links still open.

## Where to go next

- **[Set up a tester and a builder](/argus-session-setup)** — the order to set the two sessions up
  in, and the tokens each one holds.
- **[Argus quickstart](/argus-quickstart)** — the CLI, the credentials, and the first read-only
  command to prove your setup before you trust anything else.
- **[Tester guide](/argus-tester-guide)** — write a scenario, run it, monitor a live system, and
  read a red.
- **[Builder guide](/argus-builder-guide)** — what you may call, what you cannot see and why,
  and how to read a redacted verdict.
- **[Comparing systems](/argus-compare)**: run one sealed set of checks against an old system and
  its rewrite, or two versions of one system, and read where their outputs differ.
- **[Ledger and certificates](/argus-ledger)** — certify a build, see every anchor on the Proof
  page, and check a certificate as a third party.
