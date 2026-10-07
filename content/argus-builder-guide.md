---
title: Argus builder guide
nav: Builder guide
description: What a builder agent may call, what it cannot see and why, and how to read a redacted verdict.
section: Argus
order: 13
---

This is for the agent — or person — who owns the system under test: you fix what's red and
re-run the tests to check your own fix. [What Argus is](/argus) covers why this role is kept
separate from the tester's; this page is what that separation means for you in practice.
You are the second session set up for an app: the tester goes first, and hands you a runner id
once its schedule is on. [Set up a tester and a builder](/argus-session-setup) has that order and
the token table; the steps for your side are under
[Set up the builder](/argus-session-setup#set-up-the-builder).

## Read this first: the holdout

You will not be shown the scenarios, or what they expect. This is deliberate, and it is
enforced twice, not once — so do not go looking for a workaround to either:

1. **Your credential can't reach author-scoped commands.** A runner token gets
   `not permitted for the product scope` from anything that would read scenario content —
   `list-scenarios`, `read-scenario` — naming exactly which token it needed instead
   (`ARGUS_EXECUTOR_SECRET`, formerly `ARGUS_AUTHOR_TOKEN`). This isn't a UI restriction; it's checked at the protocol layer.
2. **Your own environment never holds a copy.** Scenarios live in the tester's folder and the
   control plane's catalog — never in yours, even transiently. If you can see a scenario file
   on disk, something is misconfigured; say so rather than reading it.

If you find yourself asking "what does this scenario actually check" — stop. That question
belongs to the tester. Yours is "what did my system actually do, and does that look healthy."

## Two ways to reach Argus: which one is yours?

- **Through the control plane (the usual case).** Your app's tester runs the execution plane and
  gives you a **runner id** (`rid_…`). You connect your agent session to the control plane's MCP
  endpoint with a **builder token** and call the `runner__*` tools below. You need no Argus config
  and no Argus install of your own. Use this section.
- **Self-hosted, with a local router.** Argus runs next to your system and you call it with the
  `argus` CLI and your own `argus-config.yaml`. Skip to [What you may call](#what-you-may-call).

If you were given a runner id, you are on the first path.

### Connect your session

1. Your operator generates a **builder token** in the Argus app (**Settings → API Tokens** → *Generate builder
   token*, in your app's workspace) and puts it in a file in your environment. It is not an
   **author token**, and not the execution plane's own `ARGUS_RUNNER_TOKEN`
   ([the token table](/argus-session-setup#the-tokens)). Never paste a token into a chat.
2. Add the control plane's MCP endpoint to your session with that token as a bearer header.
3. Check it: your tool list should show **only** `runner__*` tools. If it shows `author_*` tools,
   the token is the wrong kind: stop and say so.

⛔ **Never use the Authenticate / sign-in button your MCP client offers for Argus.** A browser
sign-in can grant a broader scope than a builder may hold. If the tools don't load, the fix is
the token, not a sign-in.

### The tools

| Tool | Arguments | What it does |
|---|---|---|
| `runner__run` | `runner_id`; optional `scenario_ref`, `tag`, `layer` | Queues a run of your app's checks and returns `run_request_id` straight away. The execution plane picks it up on its next poll. Refused, with nothing queued, if the selection matches no check. |
| `runner__get_report` | `runner_id`; optional `run_request_id` or `run_id` (default: the last run) | The report for one run: what your system did, never what was expected. While the run is not finished it answers `queued` or `running`; an id it does not know answers `not_found`. |
| `runner__list_alerts` | optional `instance_id`, `after_id`, `limit` | Scheduled checks that changed state: went red, produced no result, or recovered. Poll with `after_id` set to the previous call's `next_after_id`. No `runner_id`. |
| `runner__validate_config` | `runner_id` | Checks the execution plane's configuration against its checks. |
| `runner__get_dashboard_url` | `runner_id`; optional `correlation_id` | Links into the dashboard, deep-linked to one request if you give its correlation id. |

`get-sagas` and `tail-logs` are **not** available on this path. They exist only on a local router.

### A fix loop on this path

1. Fix your system and deploy it.
2. `runner__run` with your `runner_id` → note the `run_request_id`.
3. Poll `runner__get_report` with `runner_id` and `run_request_id`. It answers `queued`, then `running`
   (with the `run_id`), then the report.
4. Read it as described in [Reading a redacted report](#reading-a-redacted-report). Between fixes,
   `runner__list_alerts` tells you when a scheduled check turns red or recovers.

## What you may call

On the self-hosted path: everything you need to run tests and triage a failure blind, and
nothing that would tell you what a passing answer looks like in advance:

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
and `failure.observed` is the real response your system gave. From v0.3.51 the scenario also
carries `observed_status`, the HTTP status your system returned (and `observed_status_codes` when
several requests fired). A status-only check has an `assertions_enforced` count of `0`; that is
not "nothing was checked". Work from that. You will never
see the line that says what should have happened; the fact that `status=200` was checked, and
your system returned `503`, is the whole of what you need to know it's wrong.

## Triage, blind

Follow the trail, not a guess:

```bash
argus get-sagas --correlation-id <the correlation id from the failing scenario>
argus tail-logs --correlation-id <same id>
argus get-dashboard-url
```

`get-sagas` and `tail-logs` take a **whole** correlation id (v0.3.52 or later): the
`tr-<run_id>-<scenario_id>-<8 hex>` id exactly as `get-report` gives it. A prefix, a fragment or a
pattern is refused, and the refusal names the shape it expects. Before v0.3.52 these calls took
any text and matched it as a substring, so a fragment such as `tr-` could read the log lines of
every run in the window, including runs whose ids you are never given. An id is not a pattern.

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
- [Set up a tester and a builder](/argus-session-setup) — the order, and the tokens each holds
- [Tester guide](/argus-tester-guide) — the other side of the holdout
