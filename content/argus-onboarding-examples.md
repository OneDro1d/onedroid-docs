---
title: Argus onboarding examples
nav: Onboarding examples
description: Real apps taken through Argus onboarding from start to finish — the commands that were run, what they printed, and the problems hit on the way.
section: Argus
order: 15
---

Each example here walks one real app through Argus onboarding from start to finish: the commands
that were run, what they printed, and the problems hit along the way. An example only adds what is
specific to its app. The general steps are in the [Tester guide](/argus-tester-guide) and the
[Quickstart](/argus-quickstart). If an example and those pages disagree, follow those pages.

## Examples

| App | What it is | Tier | Argus version | Last run |
|---|---|---|---|---|
| [Documenso v2.19.0](/argus-example-documenso) | open-source document signing (Node, Postgres) | local Docker Compose, registered with a control plane | 0.3.50 | 2026-10-02, 4 of 4 scenarios passed |

## Adding an example

Add a page called `content/argus-example-<app>.md` to this docs repo, titled
`Example: <app> (<tier>)`, and a row to the table above. Write down only what you
actually ran. If you did not run a step, say so. Each example should have:

1. **What you end up with**: the app, the tier and the instance, plus the Argus version and the
   machine you used.
2. **Before you start**: what to install, which ports must be free, and what access you need.
3. **App-specific changes**: any patch, settings or compose file the app needed. Most apps need a
   way to log Argus's request ID.
4. **Config and scenarios**: the full `argus-config.yaml` and at least one complete scenario file.
5. **Onboard and run**: the commands you ran, and what they printed.
6. **Proof the checks can fail**: one planted failure for each kind of check, with its run ID.
7. **Troubleshooting**: every problem you hit, with its cause and fix.
8. **Removing it again**: teardown, or a note that you have not run it yet.
9. **Reference run**: run IDs and results, so a reader with access to the same control plane can
   find them on its Runs page.

Never put a credential on these pages, including an expired one. Write commands so they generate
secrets or read them from a local `.env` file.
