---
title: Argus quickstart
nav: Quickstart
description: The two kinds of token, and the one command that proves your setup before you trust anything else.
section: Argus
order: 11
---

This page gets you to a working CLI and a token that resolves. It does not run a test yet —
[Tester guide](/argus-tester-guide) and [Builder guide](/argus-builder-guide) do that, and
which one you want depends on whether you write scenarios or are judged by them. An app gets one
of each, set up in order (tester first); [Set up a tester and a builder](/argus-session-setup)
has that order and the token table.

## 1. Get the `argus` CLI

The CLI is the same binary as the in-environment test server. If `argus version` already
answers, skip to the explanation below it. If not, install it from a GitHub release.

**Get access first.** The Argus release repository is private. Ask your Argus operator for read
access to it, and log in with the GitHub CLI (`gh auth login`) as an account that has it. The
commands below name that repository as `<argus-repo>`; your operator gives you its `owner/name`.

**Download the latest release rather than copying a version number from a page**, including this
one: a pinned number goes stale the day a new release ships. On Linux (amd64):

```bash
V=$(gh release view -R <argus-repo> --json tagName -q .tagName | sed 's/^v//')
gh release download "v$V" -R <argus-repo> -p "argus_${V}_linux_amd64.tar.gz" -p SHA256SUMS
grep " argus_${V}_linux_amd64.tar.gz\$" SHA256SUMS | sha256sum -c -
tar -xzf "argus_${V}_linux_amd64.tar.gz"
install -m 0755 "argus_${V}_linux_amd64/argus" ~/.local/bin/argus   # ~/.local/bin must be on your PATH
argus version   # must print $V
```

The check must print `OK` for the archive before you unpack it. For another platform, change
`linux_amd64` to `linux_arm64`, `darwin_amd64` (Intel Mac) or `darwin_arm64` (Apple silicon). On a
Mac, `sha256sum` is not installed by default: use `shasum -a 256 -c -` in its place.

**Windows.** Releases are built for macOS and Linux only. On Windows, install WSL 2 and follow the
Linux steps inside it.

Once you hold a token or an enrolled instance, cross-check the install against the version your
control plane recommends (`min_recommended_version` in the `author_get_executor_status` MCP tool;
the **Environments** page under **Settings** shows it too), rather than trusting a number written in a document.

Confirm you have it:

```bash
argus version
```

`version` reports this binary's own build identity (its version, commit and build date) and
reads nothing else — no config, no scenarios, no control plane — so it is one of the few
commands that answers with no token at all. It exists for exactly that reason: to let you
(or `argus update`) ask "what am I running?" before any credential is in place.

Bare `argus --help` (no token needed either) prints the full command list. From v0.3.41,
`argus <command> --help` prints that command's own usage and exits `0`, with no token set. A
name the CLI does not know prints the full command list instead. Before v0.3.41, most commands
printed the full list for `--help`, so a generic list there does not mean your token is missing.

## 2. The two kinds of token

Argus actually has **two separate credential systems**, and they are easy to conflate because
both eventually reach your local environment. Keep them apart. (The names used here are the
ones in the token table on [Set up a tester and a builder](/argus-session-setup#the-tokens):
the **author token** and **builder token** are a person's; `ARGUS_EXECUTOR_SECRET` and
`ARGUS_RUNNER_TOKEN` belong to the execution plane.)

- **The in-env hat token** — decides who you are to the CLI/MCP surface that runs *next to your
  system* (`run`, `get-report`, `list-scenarios`, `read-scenario`, and the rest). The execution
  plane is configured with two secrets, `ARGUS_RUNNER_TOKEN` and `ARGUS_EXECUTOR_SECRET`, at
  onboarding. Whichever one you present — with `--token` or `ARGUS_TOKEN` — is the one that
  decides your role: it must match one of the two exactly, and the matched token *is* the hat.
  Presenting `ARGUS_EXECUTOR_SECRET`'s value gets you the full test-agent hat (author + runner
  scope, sees everything); presenting `ARGUS_RUNNER_TOKEN`'s value gets you the product-agent hat
  (runner scope only, redacted). Neither is the **author token** below. Both must be configured (as env vars on the machine running the CLI) before either
  works.
- **The cloud session** — decides who you are to the `cloud-*` commands (workspace management,
  enrollment, minting), which talk to the control plane over the network rather than to the
  instance next to you. `argus cloud-login --control-plane <url> --scope author` runs an OAuth device-code
  sign-in once and persists it to a local session file; every `cloud-*` command after that
  authenticates and refreshes through that session automatically. For a non-interactive caller,
  an **author token** (the control plane's **Settings → API Tokens** page, then **Generate author token**;
  prefixed `odts_`, shown once) can be passed as `--token` / `ARGUS_CP_AUTHOR_TOKEN` instead of
  logging in.
  While `ARGUS_CP_AUTHOR_TOKEN` (or its old name `ARGUS_CP_TOKEN`) is exported, it outranks the
  session file. A later `cloud-login` is not used until you `unset ARGUS_CP_AUTHOR_TOKEN
  ARGUS_CP_TOKEN`. If the control plane refuses that token, the error now says it was refused
  (v0.3.48 or later) rather than asking you to log in again.

> **Renamed variables.** `ARGUS_EXECUTOR_SECRET` was called `ARGUS_AUTHOR_TOKEN`, and
> `ARGUS_CP_AUTHOR_TOKEN` was called `ARGUS_CP_TOKEN`. The old names were easy to mistake for a
> person's author token. CLI releases after v0.3.39 read the new names and still accept the old
> ones, with a warning. v0.3.39 and earlier read only the old names.

Most commands on the in-env side refuse outright if the two hat secrets aren't both configured.
Four local checks need no token at all: `validate-scenario`, `validate-config`, `package-check`
and `propose-from-repo`. Everything else, `list-scenarios` for example, refuses:

```bash
argus list-scenarios
```

```json
{
  "error": "auth not configured: auth: token configuration invalid: both ARGUS_RUNNER_TOKEN and ARGUS_EXECUTOR_SECRET (formerly ARGUS_AUTHOR_TOKEN) must be set",
  "diagnose": "argus doctor — read-only; its local-hats check says which of ARGUS_TOKEN, ARGUS_RUNNER_TOKEN, ARGUS_EXECUTOR_SECRET is missing or mismatched (they are a role map: any two distinct strings), and the export that fixes it"
}
```

The `diagnose` key points at `argus doctor` and says which check of it answers this refusal
(v0.3.47 or later). It is a separate key, so the `error` text stays the same.

**What a tester needs:** an **author token** for the `cloud-*` commands and the test-agent MCP
tools (`cloud-login`, or the token in `ARGUS_CP_AUTHOR_TOKEN`). To author and read scenarios and see
unredacted reports from the CLI next to the system, it also needs the full test-agent hat:
`ARGUS_EXECUTOR_SECRET`'s value, presented as `--token`/`ARGUS_TOKEN`. That value is generated
locally at onboarding, into the test-agent's own environment, and is not the same value as the
`odts_` author token.

**What a builder needs:** a **builder token** (**Settings → API Tokens**, then **Generate builder
token**), which reaches only the `runner__*` tools. A builder who calls the CLI next to the system
uses the runner hat instead: `ARGUS_RUNNER_TOKEN`'s value.
It reaches the same six-tool runner surface the author hat also has (`validate-config`, `run`,
`get-report`, `get-sagas`, `tail-logs`, `get-dashboard-url`) — never the scenario-authoring
commands — and every answer comes back redacted: no scenario content, no expected values. It
never needs the cloud session at all, because a builder never calls a `cloud-*` command.

`ARGUS_RUNNER_TOKEN` is minted per execution-plane instance, not per person — see
[Tester guide § Enrolling an instance](/argus-tester-guide#enrolling-an-instance) if you are
standing one up.

## 3. Point the CLI at your control plane

```bash
export ARGUS_CP_URL=<your-argus-control-plane-url>
argus cloud-login --control-plane "$ARGUS_CP_URL" --scope author
```

`--scope` is required from v0.3.41 on, and there is no default: `author` for a tester or
operator (the `cloud-*` commands and the test-agent tools), `runner` only for a builder session.
Without it the sign-in stops before it starts:

```json
{
  "error": "cloud-login: --scope is required, there is no default — pass --scope author (operator/tester tools) or --scope runner (builder tools)"
}
```

The sign-in opens a device-approval page in your browser. If that page approves the same code
twice (a reload, a double click), it says it is approved (v0.3.52 or later); before that, the
second try showed `invalid_request` over a sign-in that had worked. A code approved by a
different account is still refused, and the page says so.

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
argus preflight --tier <aks|k3d|managed> --kube-context <your-kube-context> --control-plane "$ARGUS_CP_URL"
```

`--tier` is `aks`, `k3d` or `managed`: `managed` for any other cluster, including one you run
yourself (k3s, kubeadm). `kind` and `minikube` are not tiers; use `k3d` for them, which
renders identically. `render-k8s` also accepts `eks` and `gke`. See the
[tier table](/argus-tester-guide#installing-into-a-kubernetes-cluster) for what each one means.

To check a Docker (compose) machine instead, leave out `--kube-context` and `--tier`. From v0.3.52
`preflight` then also checks that the Docker daemon answers and that the host ports the shared
observability stack publishes are free, and names the container holding any port that is not. Pass
the same `--obs` you will onboard with: with `--obs none` no shared stack starts, so its ports are
not checked (Docker still is). A Docker or port problem is reported before onboarding starts, not
halfway through it.

If you already have an execution plane running, check that it is actually reachable end to
end — registered **and** answering, which are two different things:

```bash
argus cloud-executor-status --control-plane "$ARGUS_CP_URL" --instance-id <instance-id>
```

You want `"registered": true` **and** `"poll_accepted": true`. Registered alone means the
executor introduced itself once; it does not mean anyone is listening to it now.

**Stuck at any step? Run `argus doctor` first** (CLI v0.3.45 or later):

```bash
argus doctor --control-plane "$ARGUS_CP_URL"
```

It checks your control-plane sign-in (which credential you hold, and whether the control plane
accepts it), your local tokens, your `argus-config.yaml`, your scenarios folder and the executor your
runs land on, and prints the literal fix for each problem. It writes nothing except a renewed session
token, and never prints a credential. Add `--config <argus-config.yaml>` and `--scenarios <dir>` once you
have them. Without `--scenarios` it looks for the bundled OrderService demo folder. A CLI installed
from a release has no such folder, so from v0.3.52 that check is a warning ("not checked") and
`doctor` still exits `0`; before v0.3.52 it was a failure. The fix it prints names
`test-agent/scenarios`, the folder an onboarded kit has.

With `--config`, `doctor` also prints the warnings `validate-config` prints (a `base_url` with a
path, for example) as `validate-config warns: …`, and counts them as a warning rather than a pass
(v0.3.52 or later; before it, `doctor` reported such a config as fine).

Three more things changed in v0.3.53:

- A working cloud tester no longer fails. If `ARGUS_TOKEN` holds a control-plane token and no
  local role map is set, `local-hats` is a warning, not a failure.
- `sut-reachable` tells a fresh "unknown" from a stale one. Fresh: the executor's probe ran and
  returned no verdict, which is neither a pass nor a failure. Stale: the last reading is older
  than 3 minutes, so it says nothing about now and the fix is to check the executor is running.
- The credential line says when `doctor` used a renewed session token: that the control plane
  accepted the session with the renewed token.

On a tester machine, use `argus doctor --tester` instead (v0.3.47 or later). It prints one line
per onboarding phase, each PASS, FAIL or SKIP: the token, the tools it reaches, the workspace,
the cluster, the instance namespace, whether every image pull Secret the executor's Deployment
names exists (`tester-pullsecrets`, names only, never the Secret's contents), and whether the
executor is registered and polling. It exits `4` on any FAIL.

## Where to go next

- **Setting up both sessions for an app?** [Set up a tester and a builder](/argus-session-setup):
  the order (tester first, builder second) and the tokens each holds.
- **Writing and running tests?** [Tester guide](/argus-tester-guide).
- **Your system is what's being tested?** [Builder guide](/argus-builder-guide) — read the
  holdout section first.
