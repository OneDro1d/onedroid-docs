---
title: Dark Factory — a governed agent, reproducible on every machine
nav: What a Dark Factory is
description: The three-tier model that puts the same governed agent on every machine, where a lockfile decides what exists and taking an update is a one-line SHA bump.
section: Dark Factory
order: 20
---

Synapse governs what an agent may *call*. Engram gives it memory that outlives the session.
**Dark Factory is how the agent itself gets onto a machine** — the same skills, the same
hooks, the same hard stops, on your laptop and on a cloud workspace, provably rather than
by hand.

It is a method, not a service. The method is a public repo:
[`OneDro1d/dark-factory`](https://github.com/OneDro1d/dark-factory). You do not need an
account here to use it, and nothing on this page requires a hub — though a kit is the
usual way an agent ends up [connected to one](/setup).

## The problem it solves

Anyone can configure one agent on one machine. It stops working at the second machine and
the second person. Configuration drifts, nobody can say which version of a skill a given
laptop is running, and "I fixed that" turns out to mean "I fixed it on mine".

So the unit of truth is not a machine. It is a **record** of a machine.

## Three tiers

```
Tier 1   the generic method        public, and nobody clones it to consume it —
                                   installers FETCH it at a pinned commit
Tier 2   your organisation layer   what your estate adds: curated skills, hooks,
                                   doctrine. Stripped to deltas, not copies
Tier 3   one record per machine    a lockfile plus machine config. Generated,
                                   never forked
```

Each tier pins the one above it by commit SHA. The full model, the generator scripts and the
design rules are in the repo's
[`starter-kit/`](https://github.com/OneDro1d/dark-factory/tree/main/starter-kit) — including
how to stand up your own Tier 2 in one command. This page does not restate them; the repo is
the source of truth and a second copy would drift.

## The two ideas that make it work

**Lockfiles are the authority; installers are only mechanism.** Every tier declares exactly
what it installs. Content sitting on disk that no lockfile declares is installed by nothing
and reported by nothing — so it does not exist. If you want to know what an agent has, read
the record, not the directory listing.

**A fix merged upstream changes nothing until a pin moves and an install runs.** This sounds
obvious and is the single most common way a Dark Factory estate goes quietly wrong: the fix
is merged, everyone believes it shipped, and no machine has it. Taking an update is a
one-line SHA bump — which is cheap precisely so that it actually happens.

## What a kit is

A **kit** is a Tier-3 instance provisioned for a *person* rather than for one machine. It
holds a lockfile and machine config and **no method content** — the skills and hooks arrive
from the pins at install time.

You use it like this: copy the kit into your own private repo, then install from that copy on
every machine you work on. Each machine gets its own record inside your repo, so a laptop and
a cloud workspace are two records in one place, and each installs only its own.

That copy step matters. A kit you were handed is a **template**: its maintainer keeps pushing
to it, so a change you make in the shared repo is overwritten by the next update and nothing
warns you.

→ [Install a kit](/dark-factory-kits)

## Pins, and the one that moves on purpose

An upstream in a record is normally a frozen commit SHA. Pin commits, never branches: a
branch moves under you between installs, and it moves most while it is under review — which
is exactly when people onboard onto it.

An upstream may instead declare `track`, naming a ref to follow. The installer resolves it on
the remote, installs what it resolved to, and **rewrites the record's own commit** with the
SHA it landed on, so the pin moves rather than stops existing. `bash install.sh --frozen`
ignores every `track` and installs exactly the recorded pins — that is how you reproduce a
machine as it was.

⚠️ **The consequence is worth stating plainly:** an upstream that tracks a ref is current at
every install, and an upstream without `track` can never become current on its own. If a
change is merged into a layer nothing tracks, only a repin delivers it.

## A current pin is not an installed machine

A record is a declaration. Only an install makes it true of a box, and only the machine's own
verification can say it worked. Keep the two apart in your head and in your reporting: the
honest sentence after a repin is *"declared, not installed"*.

The same distinction catches people one level down — see
[installed is not reachable](/dark-factory-kits#installed-is-not-the-same-as-reachable).
