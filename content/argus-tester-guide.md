---
title: Argus tester guide
nav: Tester guide
description: Write a scenario, enroll an execution plane, run it, monitor a live system, and read a red.
section: Argus
order: 32
---

This is for whoever authors and runs Argus scenarios against a system — a person, or the test
agent in a two-agent loop. [What Argus is](/argus) covers the holdout — the separation that
this guide's other half, the [Builder guide](/argus-builder-guide), lives behind.
[Argus quickstart](/argus-quickstart) gets your CLI and tokens working; this page assumes both.

## Your workspace

Everything you author and run is scoped to a **workspace** — one per system under test, in the
common case. Your author token is bound to it: `argus cloud-list-workspaces` shows what you can
reach, and `argus cloud-switch-workspace` changes which one later commands act on.

## Enrolling an instance

An **instance** is one execution plane, running next to one system, identified by an
`instance_id`. Standing one up is an operator-level step — it needs somewhere to run the
execution plane (a compose stack, a container namespace, or a cluster namespace next to your
system) and, for a cloud-registered instance, a short-lived **enrollment token**:

```bash
argus cloud-enroll --control-plane "$ARGUS_CP_URL" --instance-id <instance-id>
```

The enrollment token this mints is deliberately short-lived — it authorizes the execution
plane's *first* introduction to the control plane, nothing after. Once the instance is up,
check it the same way every time, because registered and reachable are different claims:

```bash
argus cloud-executor-status --control-plane "$ARGUS_CP_URL" --instance-id <instance-id>
```

`"registered": true` alone is not enough — an instance can register once and then be refused on
every later poll. Want both to be true before you trust anything else about the instance.

## Writing a scenario

A scenario is one Markdown file, one contract, in a fixed shape:

```markdown
# Scenario: <one line — what healthy looks like>

## Metadata
- **ID**: HTTP-001
- **Layer**: HTTP Ingestion
- **Tags**: http, smoke

## TRIGGER
GET `<the endpoint, from your execution plane's network vantage>`

## VERIFY
N/A — the HTTP layer judges the response directly.

## EXPECT

### Runnable
- status=200
- body contains ready

## TIMEOUT
10s

## CLEANUP
N/A — read-only.
```

**Probe the endpoint yourself before writing its `EXPECT`.** Write down what you actually got,
from the vantage your execution plane has — not your laptop's. A scenario that asserts against
what you assumed the response would be, rather than what it is, is the most common kind of red
that turns out to be the scenario's fault, not the system's.

Every scenario declares a **layer** — HTTP ingestion, message flow, database state, external
delivery, error paths, rate limiting, or permissions — and only the layers your scenarios
actually use need a target configured. An HTTP-and-database system with no message bus is a
complete, ordinary thing to test.

Author with the dedicated tools, not by hand-editing files on disk: `propose-scenario` turns
plain English into a draft, `validate-scenario --file <draft.md>` checks its shape before
anything is written, and `write-scenario --file <draft.md> --path <ID>-<slug>.md` validates
again and commits it to the catalog — the catalog, not a local folder, is the source of truth
for what your scenario set *is*.

```bash
argus list-scenarios
argus read-scenario --scenario HTTP-001
```

`read-scenario` and `list-scenarios` are author-scoped — they refuse with `not permitted for
the product scope` on a runner token, naming exactly which token they need
(`ARGUS_AUTHOR_TOKEN`). That refusal is the holdout enforcing itself on the tester's own tools,
not just the builder's.

## Running

```bash
argus run --config <your-argus-config.yaml>
```

or, against an already-enrolled instance, request a run and poll its status until it's
terminal. However you run it, the report tells you what was actually checked:

```bash
argus get-report
```

Each scenario in the report carries `assertions_enforced` — what was actually checked, not
just what you intended — and, on a fail, `failure.observed`: the real value that didn't match.
**Check `assertions_enforced` after any change to a scenario.** It is how you know a re-run
actually picked up your edit rather than replaying a stale copy.

## Monitor schedules

Once a hand-run is green — or every red in it is one you've read and decided to keep — turn on
a schedule so your system is tested continuously without you driving it. There is no CLI
command for this; it is the `author_set_schedule` MCP tool, called with the instance's id, an
interval, and `mode: "monitor"`:

| Argument | Required | Meaning |
|---|---|---|
| `instance_id` | yes | the instance the schedule runs against |
| `interval` | yes | a Go duration string, **15 minutes minimum** (e.g. `"30m"`, `"2h"`), or the literal `"off"` to stop this named schedule without losing it |
| `mode` | **yes** | set to `"monitor"` for a recurring run — always include it explicitly |
| `name` | no (default `"default"`) | lets you run several named schedules on one instance at once |
| `layer` / `tag` / `scenario_ref` | no | filter which scenarios this named schedule runs — at most one of the three |

**Always set `mode` to `"monitor"` on every schedule you create.** A schedule with no `mode`
given, or with a `mode` other than `"monitor"`, will not run your tests on its own — it will
sit there, due, and never fire. `mode: "monitor"` re-runs your reviewed scenario set — what you
want for "keep watching a live system stay healthy":

```json
{
  "instance_id": "<instance-id>",
  "interval": "30m",
  "mode": "monitor"
}
```

Confirm the first tick actually fired before walking away — a schedule that exists is not a
schedule that runs: `author_get_run_status` (with neither `run_id` nor `run_request_id`) shows
the schedule, and after one interval has passed its `last_requested_at` should be set and
`last_skip_reason` absent.

To stop a schedule without losing it, call `author_set_schedule` again with `interval: "off"`
(keep `mode: "monitor"` on that call too):

```json
{
  "instance_id": "<instance-id>",
  "interval": "off",
  "mode": "monitor"
}
```

## Reading a red

Triage one scenario at a time, saga first:

```bash
argus get-sagas --correlation-id <correlation-id>
argus tail-logs --correlation-id <correlation-id>
argus get-dashboard-url
argus get-report
```

`get-sagas` and `tail-logs` both refuse outright without `--correlation-id` — there is no
"show me everything" mode, deliberately: triage is scoped to one scenario's own trail, not a
grep across the whole run.

Read `failure.observed` before changing anything. A red is the system telling you something —
never weaken an assertion to make it go green; the only honest reason to drop a check is proof
that it measures the harness rather than your system, and that proof belongs recorded in the
scenario itself.

**A green can be a skip.** `ok` reads the same whether a check ran or was silently skipped —
look at how long it took. A scenario that "passed" with no measurable duration didn't check
anything.

## Related

- [What Argus is](/argus) — the holdout, the two planes, the two modes
- [Builder guide](/argus-builder-guide) — the other side of the holdout
