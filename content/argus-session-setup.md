---
title: Set up a tester and a builder for your app
nav: Set up tester and builder
description: Every app you test with Argus gets two agent sessions, kept apart. What each one is for, and how to set both up.
section: Argus
order: 30.5
---

Every app you test with Argus gets **two agent sessions**, and they must stay separate:

| | Tester session | Builder session |
|---|---|---|
| Who | a new session, one per app | the app's own development session |
| Its job | decides what to test and what the tests may touch; installs the execution plane; runs and schedules the checks; triages a red | builds the app; fixes what goes red; re-runs the checks to confirm its fix |
| What it sees | everything: the checks, what they expect, the full reports | only what the app actually did: redacted reports and alerts, **never the checks** |
| Its Argus credential | an **author** token | a **builder** token |

**Why two:** the builder is judged by checks it cannot see. That's the
[holdout](/argus): it has to make the app work, not make a known list of checks pass. So the
checks must never be on the builder's disk, even briefly. **Run the tester in its own
workspace or machine**, not as a second session next to the builder.

## Before you start

- An Argus account on your control plane, and one **workspace per app**. Create it on the
  **Workspaces** page; everything for that app (instances, checks, runs, tokens) lives in it.
- A cluster where the app's execution plane will run, ideally where the app lives. The execution
  plane only needs outbound HTTPS to your app and to the control plane
  ([Installing into a Kubernetes cluster](/argus-tester-guide#installing-into-a-kubernetes-cluster)).
- The `argus` CLI in the tester's environment ([Quickstart](/argus-quickstart)).

## Set up the tester

1. **Give it its own environment**: a workspace or machine that the builder does not share,
   with `kubectl` access to the cluster the execution plane goes in. It creates one namespace
   there, `argus-inst-<instance-id>`, and nothing else.
2. **Mint its author token.** In the Argus app, switch to the app's workspace, open **Tokens**,
   and choose **Generate author token**, bound to that workspace. Set it as an environment variable
   in the tester's environment yourself. Never paste a token into a chat: a token that passes
   through an agent's transcript should be treated as leaked.
3. **Start the session with a brief** (template below). From there the tester follows the
   [Tester guide](/argus-tester-guide): enroll the execution plane, write the checks, run them
   once by hand, then turn on a `monitor` schedule.

## Set up the builder

The builder is the session that already develops the app. It needs:

1. **A builder token.** In the Argus app, open **Tokens** in the app's workspace and choose
   **Generate builder token**. It reaches only the builder tools, and only in that workspace.
   Set it in the builder's environment yourself. ⛔ **Never give a builder an author token.** An
   author token can read the checks, and the holdout is gone.
2. **A runner id from the tester.** The tester mints one for its instance
   (`argus runner-id mint --instance-id <instance-id>`) and passes it on. The id pairs the builder
   with that execution plane; it is an identifier, not a secret.
3. **The [Builder guide](/argus-builder-guide).** The builder runs the checks with `runner__run`,
   reads `runner__get_report`, and watches `runner__list_alerts` for reds. Each report shows
   what the app did, never what was expected.

## Tester brief (template)

Paste this into the tester's first message and fill in the angle brackets:

> You are the Argus **tester** for **<app>**. You decide what to test and what the tests may
> touch. Argus workspace: `<workspace>` on `<control-plane URL>`. Your execution plane goes in
> `<cluster>`, in its own namespace. Your author token is in `$ARGUS_AUTHOR_TOKEN`; never print
> it. Start with docs.onedroid.ai/argus-tester-guide. The builder session for this app must never
> see your checks: give it a runner id, never files. Agree with <owner> what the tests may write
> and any limits on it.
> About this app: <where it lives, what it must never touch, accounts or test data it may use>

## Apps that move money

Argus does not decide what your tests may do. The tester and the app's owner do, and the app's
Argus config records it. Argus enforces what the config declares.

For an app that moves money, the config has an optional safety switch. Set
`money_handling: true` and Argus refuses any write the config does not list: plain HTTP GETs
still run, and a check on a path naming an order, quote, swap, rebalance or claim is refused.
To allow writes, list each one under `money_writes.allow`, with the limits you choose:

```yaml
money_handling: true
money_writes:
  allow:
    - method: POST
      path: /api/v1/trading/quote
      spends: false
    - method: POST
      path: /api/v1/trading/order
      spends: true
      amount_field: source_amount   # the request field that carries the amount
      max_amount: 25                # per request
      max_per_run: 4                # requests per run
```

Argus checks this when a check is written, when the config is validated, and when the check runs.
Leave `money_handling` out and none of it applies.

> `money_writes` needs an execution plane newer than v0.3.37. Until that release, an app with
> `money_handling: true` gets read checks only.

## Related

- [What Argus is](/argus): the holdout, and why the builder is kept apart
- [Quickstart](/argus-quickstart): the CLI and the two kinds of token
- [Tester guide](/argus-tester-guide) · [Builder guide](/argus-builder-guide)
