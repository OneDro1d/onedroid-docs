---
title: Install a Dark Factory kit
nav: Install a kit
description: Copy the kit into your own private repo, add this machine, install, and verify — plus the five failures that actually happen.
section: Dark Factory
order: 41
---

A **kit** is a Tier-3 record provisioned for a person: a lockfile and machine config, and no
method content. The skills and hooks arrive from its pins when you install.
[What a Dark Factory is](/dark-factory) explains the model; this page is the doing.

If someone has handed you a kit repo, start here.

## Before you start

On the machine you are setting up:

```sh
for c in git jq bash python3 gh claude; do command -v "$c" >/dev/null && echo "ok       $c" || echo "MISSING  $c"; done
gh auth status
claude -p 'Reply with the single word: ok' --output-format text
```

Every tool should print `ok`, `gh auth status` should show an account that can see the kit,
and the last command should print `ok`.

Your kit may also need access that no file can grant you — org membership, a hub, a token, a
board. A well-formed kit states its own list, with a self-check per row; read its `KIT.md`
first. **Granting any of it is somebody else's act, deliberately:** a kit that could grant its
own access would be a kit that could quietly widen it. If a check fails, ask — do not route
around it.

## The install is one instruction

Open Claude Code in the kit directory and say:

> **"Read START-HERE.md and execute it."**

`START-HERE.md` is a runbook written for the agent. It works top to bottom, every step ends
with a check it must pass before moving on, and it stops to ask you at the steps marked
**HUMAN** — the ones needing a decision, a login or a grant only you can give.

You are not meant to read it first. You are meant to watch it report, and to disbelieve any
step reported as done without the output of its check.

## What it does, in order

1. **Works out where it is.** A kit, the public method repo, or somebody else's instance are
   three different situations. If the record's `instance.kind` is `instance` and `origin` is
   somebody else's repo, it stops — installing that would give this machine another person's
   environment.
2. **Makes the kit yours.** A kit is a **template**. It keeps the original as a second remote
   (`kit-upstream`, so you can still take its updates) and creates **your own private repo**
   as `origin`, then flips `instance.kind` to `instance`. From then on you install from your
   copy.
3. **Adds this machine**, as its own record under `instances/<machine>/`. A laptop and a cloud
   workspace are two records in one repo; each machine installs only its own.
4. **Installs**, and then **verifies** — and the validation report is committed into your repo
   rather than printed and lost.

⚠️ **Customise your copy, never the shared kit.** A change made in the shared repo is
overwritten by its next update and nothing warns you.

Choosing the owner of your new private repo is the one place to think: your own account always
works, while an organisation needs repo-creation rights there.

## The five failures that actually happen

These are the ones worth knowing in advance, because each presents as something else.

**A 404 usually means the wrong identity, not a missing repo.** If your estates use different
GitHub logins, a repo you know exists comes back as *"repository not found"* when `gh` is
authenticated as the other account. When a repo you are certain about 404s, check
`gh auth status` before you believe the repo is gone. `gh auth switch` moves between accounts.

**Installed is not the same as reachable.** <a id="installed-is-not-the-same-as-reachable"></a>
If a kit's commands are installed but their directory is not on your `PATH`, you get
`command not found` — which points at the wrong thing entirely. The installer warns about this
and names the directory; add it to your profile and open a new shell. Installed-but-unreachable
is not installed.

**A green install is not a working hub.** Enabling a service on your hub and giving it *your*
credential are two different actions, and only the second lets you call anything. An upstream
can report `connected: true` and answer a real call with *"you haven't connected your
credentials."* Test with a real call, never a status listing — see
[Connections and credentials](/connections).

**An unattended run inherits its environment, and fails silently when it is empty.** If your
kit expects a token exported in your shell profile, a scheduled or headless run launched from
a shell without it starts cleanly, fails every write, and keeps going. Check the variable
again before anything unattended.

**A placeholder is not a finding.** A freshly minted kit ships loud placeholders for the paths
it cannot know — your code root, your home directory — so a preflight run reports drift before
you have configured anything. That is the design: a kit that silently claimed to be someone
else's machine would be a wrong value that reads exactly like a right one. Read the rows, not
the totals, and fix the placeholders at the "add this machine" step.

## Taking an update

Later, when the method or your organisation's layer has moved, taking it is a one-line SHA bump
in the record, then an install.

⚠️ **The pin and the machine are two different facts.** Moving the pin is a declaration; only
the install makes it true of a box. If you repin on someone's behalf, the honest report is
*"declared, not installed"* — their machine is behind the record until they re-run the install.

And the inverse: an upstream that declares `track` is resolved fresh at every install and so is
current without a repin, while an upstream without `track` can never become current on its own.
Check which one you are looking at before concluding a kit is stale — or that it is fine.

## Reproducing a machine exactly

```sh
bash install.sh --frozen
```

This ignores every `track` and installs exactly the pins the record holds — which is how you
rebuild a machine as it was, rather than as today's upstream would make it.

## Where the method lives

The tier model, the generators for your own organisation layer, and the full instance template
are in the public repo:
[`OneDro1d/dark-factory`](https://github.com/OneDro1d/dark-factory) →
[`starter-kit/`](https://github.com/OneDro1d/dark-factory/tree/main/starter-kit).
