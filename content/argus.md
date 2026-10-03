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

These pages describe Argus v0.3.52. Each note below links to the section that has the detail.

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
- **A new web app layout** (control plane, October 2026): the sidebar has five places, **Overview**,
  **Capacity**, **Runs**, **Checks** and **Proof** (Proof was called Ledger). **Environments**,
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
- **[Ledger and certificates](/argus-ledger)** — certify a build, see every anchor on the Proof
  page, and check a certificate as a third party.
