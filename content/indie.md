---
title: OneDroid Indie: what it does, and how to check
nav: What Indie is
description: The free local recorder and checker for Claude Code sessions, as claims you can verify: each with the command to run, the output that proves it, and the source that implements it.
section: Indie
order: 45
---

> These pages are made from [`docs/PRODUCT.md`](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/PRODUCT.md) in the OneDroid Indie repository (commit `b5ae7f9`). That file is the source and travels with the code; the pages are regenerated from it on each Indie release.

OneDroid Indie is one binary, `onedroid`, free under Apache-2.0.

- It records every Claude Code session on your machine as a signed, append-only record.
- It reads what an agent said it did and compares it with what the record shows.
- It writes the AI token cost of each ticket into your commit messages, if a repository opts in.
- It watches prompts, tool calls and tool results for credentials, and can refuse them or pause a session.
- It runs on your machine and sends nothing anywhere unless you run a command that sends it.

**Who it is for:** developers and small teams who use Claude Code and want to know what their
agents did, what it cost, and whether the work they claimed holds up.

## How to read this page

Every claim below is one plain sentence about what the product does. Under it is the evidence
you can check yourself: the command to run, the output that proves it, and where it is
implemented (`file:line`) or tested (test name). A claim we cannot show you yet is marked
**not yet shown**, with the reason.

The outputs were produced on 18 Nov 2026 with a binary built from this tree
(`go build -o onedroid ./cmd/onedroid`, `onedroid 0.1.0-dev`, Go 1.23.4, Linux), in an isolated
home so nothing of a real setup was touched:

```sh
export HOME=$PWD/home VALOR_HOME=$PWD/valor CLAUDE_CONFIG_DIR=$PWD/claude
mkdir -p "$HOME" "$VALOR_HOME" "$CLAUDE_CONFIG_DIR"
onedroid init --claude
```

**What was and was not a real Claude Code session.** The sessions in the outputs below were
*replayed*: the same JSON that Claude Code sends to each hook (`session_id`, `hook_event_name`,
`tool_name`, `tool_input`, `transcript_path` ...) was piped into `onedroid hook claude <Event>`,
with a transcript file in Claude Code's format. That exercises the recorder, the verdict, the
claims and the cost code exactly as Claude Code would. It does not prove that Claude Code
itself calls the hooks; the claim that it does rests on the hook entries `onedroid init --claude`
writes (A0 below) and on the recorder's own heartbeat check (D3). Wherever a claim needs a real
session, the claim says so and names the test that covers it instead. Paths in the outputs are
shortened to `<scratch>`.

Replaying one event looks like this (it is the exact form used for the D claims):

```sh
printf '%s' '{"session_id":"dddddddd-4444-4444-8444-000000000004","hook_event_name":"UserPromptSubmit","cwd":"/tmp","prompt":"hello"}' | onedroid hook claude UserPromptSubmit
```

A hook prints nothing and exits 0 unless it refuses something.


## Install and record

### A0. `onedroid init --claude` adds 11 recording hooks to Claude Code's settings, keeps your own, and the two hooks that can refuse are installed to fail closed.

```sh
onedroid init --claude
grep -c "hook claude" "$CLAUDE_CONFIG_DIR/settings.json"
grep -c "onFailure" "$CLAUDE_CONFIG_DIR/settings.json"
```

Output (trimmed): `Added or moved to this binary: 11 recording hook(s) in <scratch>/claude/settings.json:` then
`SessionStart UserPromptSubmit PreToolUse PostToolUse PostToolUseFailure PermissionDenied Stop
SubagentStart SubagentStop ConfigChange SessionEnd`; the two `grep -c` print `11` and `2`.
`PreToolUse` and `UserPromptSubmit` carry `"onFailure": "block"`.

Source: `internal/recorder/claude.go:121` (the list and why), `:173` (`cmd["onFailure"] = "block"`).
Tests: `internal/cli/initclaims_test.go`, `internal/install` package tests.

The other side: with the binary gone, Claude Code refuses every prompt and tool call until you
run `onedroid uninstall --claude` ([SECURITY.md](https://github.com/OneDro1d/onedroid-indie/blob/main/SECURITY.md), boundary 1).
`onedroid doctor` reports the missing binary. Not run here (it needs Claude Code to hit the
missing hook): `TestScenarioMissingBinary`, `internal/cli/scenario_test.go:266`.

Pages: [Dashboard](/indie-dashboard) · [Agent claims](/indie-claims) · [Token cost](/indie-cost) · [Credentials](/indie-credentials) · [Privacy](/indie-privacy) · [Known limits](/indie-limits)
