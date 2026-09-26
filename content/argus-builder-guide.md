---
title: Argus builder guide
nav: Builder guide
description: What a builder agent may call, what it cannot see and why, and how to read a redacted verdict.
section: Argus
order: 33
---

This is for the agent — or person — who owns the system under test: you fix what's red and
re-run the tests to check your own fix. [What Argus is](/argus) covers why this role is kept
separate from the tester's; this page is what that separation means for you in practice.

## Read this first: the holdout

You will not be shown the scenarios, or what they expect. This is deliberate, and it is
enforced twice, not once — so do not go looking for a workaround to either:

1. **Your credential can't reach author-scoped commands.** A runner token gets
   `not permitted for the product scope` from anything that would read scenario content —
   `list-scenarios`, `read-scenario` — naming exactly which token it needed instead
   (`ARGUS_AUTHOR_TOKEN`). This isn't a UI restriction; it's checked at the protocol layer.
2. **Your own environment never holds a copy.** Scenarios live in the tester's folder and the
   control plane's catalog — never in yours, even transiently. If you can see a scenario file
   on disk, something is misconfigured; say so rather than reading it.

If you find yourself asking "what does this scenario actually check" — stop. That question
belongs to the tester. Yours is "what did my system actually do, and does that look healthy."

## What you may call

Everything you need to run tests and triage a failure blind, and nothing that would tell you
what a passing answer looks like in advance:

| Command | What it's for |
|---|---|
| `validate-config` | check your `argus-config.yaml` parses and every layer it uses has a target |
| `run` | execute the scenario set against your system |
| `get-report` | the pass/fail report for the last run |
| `get-sagas --correlation-id <id>` | the saga trail for one request |
| `tail-logs --correlation-id <id>` | windowed, correlation-scoped logs for one request |
| `get-dashboard-url` | a link into the shared observability dashboard |

That's the same six-tool surface regardless of which side you're on — the tester has these
plus the authoring commands; you have exactly these.

## Reading a redacted report

`get-report` gives you **observed reality**, never the expected values it was checked against:

```json
{
  "id": "HTTP-001",
  "status": "fail",
  "assertions_enforced": ["status=200", "body contains ready"],
  "failure": {
    "observed": "..."
  }
}
```

(`failure.observed` is always a single string — a description of what your system actually did
— never a structured object; `failure.expected` exists in the same shape but is the field the
holdout strips for you, so on your reports it is simply absent, not null or empty.)

`assertions_enforced` tells you what was actually checked — read it, not just the pass/fail —
and `failure.observed` is the real response your system gave. Work from that. You will never
see the line that says what should have happened; the fact that `status=200` was checked, and
your system returned `503`, is the whole of what you need to know it's wrong.

## Triage, blind

Follow the trail, not a guess:

```bash
argus get-sagas --correlation-id <the correlation id from the failing scenario>
argus tail-logs --correlation-id <same id>
argus get-dashboard-url
```

A saga-first read tells you what your system believed it did; the logs tell you what actually
happened around it. Triage lands on one of a small set of verdicts — a real defect in your
system (**CODE_BUG**), a scenario asserting the wrong thing (**TEST_BUG** — report it to the
tester, don't just work around it), a gap neither side accounted for
(**REQUIREMENT_GAP**), a one-off (**FLAKE**), or, honestly, not enough evidence to land
anywhere (**INCONCLUSIVE**) — which is a better answer than guessing.

## Fix, re-deploy, re-test

Fix your system, redeploy it however you normally do, and re-run:

```bash
argus run --config <your-argus-config.yaml>
argus get-report
```

If you only changed code — not how your system is reachable — you don't need to touch your
config or re-enroll anything; just run again.

## Related

- [What Argus is](/argus) — the holdout, the two planes, the two modes
- [Tester guide](/argus-tester-guide) — the other side of the holdout
