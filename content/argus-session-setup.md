---
title: Set up a tester and a builder for your app
nav: Set up tester and builder
description: Every app you test with Argus gets two agent sessions, kept apart. The order to set them up in, the tokens each one holds, and one path per session.
section: Argus
order: 10.5
---

Every app you test with Argus gets **two agent sessions**, and they must stay separate:

| | Tester session | Builder session |
|---|---|---|
| Who | a new session, one per app | the app's own development session |
| Its job | decides what to test and what the tests may touch; installs the execution plane; runs and schedules the checks; triages a red | builds the app; fixes what goes red; re-runs the checks to confirm its fix |
| What it sees | everything: the checks, what they expect, the full reports | only what the app actually did: redacted reports and alerts, **never the checks** |
| Its Argus credential | an **author token** | a **builder token** |

**Why two:** the builder is judged by checks it cannot see. That's the
[holdout](/argus): it has to make the app work, not make a known list of checks pass. So the
checks must never be on the builder's disk, even briefly. **Run the tester in its own
workspace or machine**, not as a second session next to the builder.

## The order

**Set up the tester first, the builder second.** The builder has nothing to run until the tester
has an execution plane with checks on it, and the builder is joined to that execution plane by a
runner id the tester mints.

1. **Tester:** get the CLI, make the author token, enroll the execution plane, run the checks
   once by hand, then turn on the `monitor` schedule.
2. **Tester:** mint a runner id for that instance and hand it to the builder. The id is an
   identifier, not a secret.
3. **Builder:** get a builder token, connect with the runner id, and start the fix loop.

Each session reads one path through the docs. The tester follows [Set up the tester](#set-up-the-tester)
here, then the [Tester guide](/argus-tester-guide). The builder follows
[Set up the builder](#set-up-the-builder) here, then the [Builder guide](/argus-builder-guide).
Neither needs the other's pages.

## The tokens

Four credentials appear in the Argus docs. Only the first two are a person's token. The same
names are used on every Argus page.

| Name | Who holds it | Where it comes from | Where it goes |
|---|---|---|---|
| **Author token** | the tester | **Settings → API Tokens**, then **Generate author token**, bound to the app's workspace | the environment variable `ARGUS_CP_AUTHOR_TOKEN` in the tester's environment |
| **Builder token** | the builder | **Settings → API Tokens**, then **Generate builder token**, bound to the app's workspace | the builder's own environment; it reaches only the `runner__*` tools |
| `ARGUS_EXECUTOR_SECRET` | the execution plane | generated when the execution plane is installed | the Secret the install renders, in the execution plane's namespace |
| `ARGUS_RUNNER_TOKEN` | the execution plane | generated when the execution plane is installed | the same Secret |

`ARGUS_EXECUTOR_SECRET` and `ARGUS_RUNNER_TOKEN` are the execution plane's own two local secrets.
They are not a person's token, and they are not what a tester or builder uses to reach the
control plane. The page is called **API Tokens**; open it from the **Settings** menu at the top right of the Argus app.
Never paste any of these into a chat: a token that passes through an agent's transcript should
be treated as leaked.

## Before you start

- An Argus account on your control plane, and one **workspace per app**. Create it on the
  **Settings → My workspaces** page (**Create workspace**); everything for that app (instances, checks, runs, tokens) lives in it.
- A cluster where the app's execution plane will run, ideally where the app lives. The execution
  plane only needs outbound HTTPS to your app and to the control plane
  ([Installing into a Kubernetes cluster](/argus-tester-guide#installing-into-a-kubernetes-cluster)).
- The `argus` CLI in the tester's environment ([Quickstart](/argus-quickstart#1-get-the-argus-cli)).

## Set up the tester

1. **Give it its own environment**: a workspace or machine that the builder does not share,
   with `kubectl` access to the cluster the execution plane goes in. It creates one namespace
   there, `argus-inst-<instance-id>`, and nothing else.
2. **Mint its author token.** In the Argus app, switch to the app's workspace, open **Settings → API Tokens**,
   and choose **Generate author token**, bound to that workspace. Set it as the environment variable
   `ARGUS_CP_AUTHOR_TOKEN` in the tester's environment yourself (a CLI at v0.3.39 or earlier reads
   it as `ARGUS_CP_TOKEN`).

   On a machine whose sessions do not read `~/.bashrc` (a Coder terminal), run
   `argus tester init <app>` instead (v0.3.47 or later). It writes an empty
   `ARGUS_TESTER_TOKEN_<APP>=` line in `~/.config/argus/tester.env`, a helper that gives the MCP
   client its header, an `argus-<app>` wrapper that hands the CLI the token, and an `argus`
   entry in `.mcp.json`. It never reads or prints a token. You paste the token after the `=`
   yourself. Then run `argus doctor --tester` to check each phase.
3. **Start the session with a brief** (template below). From there the tester follows the
   [Tester guide](/argus-tester-guide): enroll the execution plane, write the checks, run them
   once by hand, then turn on a `monitor` schedule.
4. **When the schedule is on, mint a runner id** for the instance and give it to the builder:
   in the Argus app, **Settings → Environments**, the instance's **runner id** row, **Mint runner id**
   (or `argus runner-id mint --instance-id <instance-id>`). Never give the
   builder files, check text or the author token.

## Set up the builder

Do this after the tester's schedule is on. The builder is the session that already develops the
app. It needs:

1. **A builder token.** In the Argus app, open **Settings → API Tokens** in the app's workspace and choose
   **Generate builder token**. It reaches only the builder tools, and only in that workspace.
   Set it in the builder's environment yourself. ⛔ **Never give a builder an author token.** An
   author token can read the checks, and the holdout is gone.

   In the builder's own notepad directory, `argus builder init <app>` (v0.3.47 or later) writes
   the same plumbing under `.argus-builder/`, with an empty `ARGUS_BUILDER_TOKEN_<APP>=` line in
   `builder.env` for you to fill in. Run it again after you paste the token: it asks the control
   plane which tools that token reaches, and fails (exit 3) unless every one is a `runner__*`
   tool. Only then does it write `.mcp.json`.
2. **A runner id from the tester.** The id pairs the builder with that execution plane; it is an
   identifier, not a secret.
3. **The [Builder guide](/argus-builder-guide).** The builder runs the checks with `runner__run`,
   reads `runner__get_report`, and watches `runner__list_alerts` for reds. Each report shows
   what the app did, never what was expected.

## Tester brief (template)

Paste this into the tester's first message and fill in the angle brackets:

> You are the Argus **tester** for **<app>**. You decide what to test and what the tests may
> touch. Argus workspace: `<workspace>` on `<control-plane URL>`. Your execution plane goes in
> `<cluster>`, in its own namespace. Your author token is in `$ARGUS_CP_AUTHOR_TOKEN`; never print
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

> `money_writes` needs an execution plane on v0.3.39 or later. Update the execution plane before
> you add the block.

## Related

- [What Argus is](/argus): the holdout, and why the builder is kept apart
- [Quickstart](/argus-quickstart): the CLI and the credentials
- [Tester guide](/argus-tester-guide) · [Builder guide](/argus-builder-guide)
