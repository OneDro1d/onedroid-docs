---
title: Argus quickstart
nav: Quickstart
description: The two kinds of token, and the one command that proves your setup before you trust anything else.
section: Argus
order: 31
---

This page gets you to a working CLI and a token that resolves. It does not run a test yet —
[Tester guide](/argus-tester-guide) and [Builder guide](/argus-builder-guide) do that, and
which one you want depends on whether you write scenarios or are judged by them.

## 1. Get the `argus` CLI

The CLI is the same binary as the in-environment test server. Confirm you have it:

```bash
argus version
```

`version` reports this binary's own build identity (its version, commit and build date) and
reads nothing else — no config, no scenarios, no control plane — so it is one of the few
commands that answers with no token at all. It exists for exactly that reason: to let you
(or `argus update`) ask "what am I running?" before any credential is in place.

Bare `argus --help` (no token needed either) prints the full command list. For most other
commands, though, `argus <command> --help` does **not** print that command's own usage — it
falls back to the same full command list, whether or not a token is set, because the CLI
checks the tokens are configured before it looks at what you actually typed. A handful of
commands parse their own flags and DO print real per-command usage without a token —
`preflight` (below) is one; if `<command> --help` gives you the generic list instead of specific
flags, that is expected, not a sign your token is missing.

## 2. The two kinds of token

Argus actually has **two separate credential systems**, and they are easy to conflate because
both eventually reach your local environment. Keep them apart:

- **The in-env hat token** — decides who you are to the CLI/MCP surface that runs *next to your
  system* (`run`, `get-report`, `list-scenarios`, `read-scenario`, and the rest). The execution
  plane is configured with two secrets, `ARGUS_RUNNER_TOKEN` and `ARGUS_AUTHOR_TOKEN`, at
  onboarding. Whichever one you present — with `--token` or `ARGUS_TOKEN` — is the one that
  decides your role: it must match one of the two exactly, and the matched token *is* the hat.
  Presenting the author token gets you the full test-agent hat (author + runner scope, sees
  everything); presenting the runner token gets you the product-agent hat (runner scope only,
  redacted). Both must be configured (as env vars on the machine running the CLI) before either
  works.
- **The cloud session** — decides who you are to the `cloud-*` commands (workspace management,
  enrollment, minting), which talk to the control plane over the network rather than to the
  instance next to you. `argus cloud-login --control-plane <url>` runs an OAuth device-code
  sign-in once and persists it to a local session file; every `cloud-*` command after that
  authenticates and refreshes through that session automatically. For a non-interactive caller,
  a personal access token minted from the control plane's **API Tokens** page (prefixed `odts_`,
  shown once) can be passed as `--token` / `ARGUS_CP_TOKEN` instead of logging in.

Commands on the in-env side refuse outright if the two hat secrets aren't both configured:

```bash
argus list-scenarios
```

```json
{
  "error": "auth not configured: auth: token configuration invalid: both ARGUS_RUNNER_TOKEN and ARGUS_AUTHOR_TOKEN must be set (set ARGUS_RUNNER_TOKEN + ARGUS_AUTHOR_TOKEN)"
}
```

**What a tester needs:** the author hat token (`ARGUS_AUTHOR_TOKEN`'s value, presented as
`--token`/`ARGUS_TOKEN`) to author and read scenarios and see unredacted reports — this is
generated locally at onboarding, into the test-agent's own environment, and is not the same
value as the `odts_` cloud PAT. If you're also enrolling an instance or managing workspaces
from a script, you additionally need the cloud session (`cloud-login`, or an `odts_` PAT).

**What a builder or runner needs:** only the runner hat token (`ARGUS_RUNNER_TOKEN`'s value).
It reaches the same six-tool runner surface the author hat also has (`validate-config`, `run`,
`get-report`, `get-sagas`, `tail-logs`, `get-dashboard-url`) — never the scenario-authoring
commands — and every answer comes back redacted: no scenario content, no expected values. It
never needs the cloud session at all, because a builder never calls a `cloud-*` command.

A runner token is minted per execution-plane instance, not per person — see
[Tester guide § Enrolling an instance](/argus-tester-guide#enrolling-an-instance) if you are
standing one up.

## 3. Point the CLI at your control plane

```bash
export ARGUS_CP_URL=<your-argus-control-plane-url>
argus cloud-login --control-plane "$ARGUS_CP_URL"
```

Without `--control-plane` (or `ARGUS_CP_URL`) every `cloud-*` command refuses immediately,
naming the missing flag — that is the check to run first whenever a cloud command is not
working, before suspecting the token:

```json
{
  "error": "cloud-login: --control-plane (or ARGUS_CP_URL) is required"
}
```

## 4. Prove read access before wiring anything else

`preflight` predicts whether an environment can host an execution plane at all — run it before
creating anything, not after something fails:

```bash
argus preflight --tier <compose|k3d|managed> --kube-context <your-kube-context>
```

If you already have an execution plane running, check that it is actually reachable end to
end — registered **and** answering, which are two different things:

```bash
argus cloud-executor-status --control-plane "$ARGUS_CP_URL" --instance-id <instance-id>
```

You want `"registered": true` **and** `"poll_accepted": true`. Registered alone means the
executor introduced itself once; it does not mean anyone is listening to it now.

## Where to go next

- **Writing and running tests?** [Tester guide](/argus-tester-guide).
- **Your system is what's being tested?** [Builder guide](/argus-builder-guide) — read the
  holdout section first.
