---
title: Indie known limits
nav: Known limits
description: What onedroid does not do, and every claim that is not yet shown.
section: Indie
order: 49.5
---

> These pages are made from [`docs/PRODUCT.md`](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/PRODUCT.md) in the OneDroid Indie repository (commit `b5ae7f9`). That file is the source and travels with the code; the pages are regenerated from it on each Indie release.

## 6. Known limits

Each is stated by the product or its docs, not found by this page.

- **Claims are off by default.** No block, nothing for `claims` and `witness` to show (B3).
- **The verdict judges only sentences it can check** (tests pass, a command ran, committed, pushed), and says
  what it cannot see: files changed by shell commands, what a command did beyond its exit code, skipped tests
  (`onedroid verdict`, "WHAT THIS CANNOT SEE").
- **Signatures are integrity, not authenticity.** The signing key is a file in `~/.valor`. A pass list is a smoke
  test, not a certificate ([SIGNING.md](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/SIGNING.md), B7, B8).
- **A paused session does not stop a command already running**, or a tool Claude Code runs on its own servers (D3).
- **The hooks fail closed on prompts and tool calls.** If the binary is moved or deleted, Claude Code refuses
  everything until `onedroid uninstall --claude` (SECURITY.md, boundary 1).
- **`onedroid ui` has no login.** Loopback only, but anyone who can open a connection to the port on a shared
  machine can read it while it runs (SECURITY.md, boundary 3).
- **Opting in shows spend per author** in `git log` to anyone who can read the repository (C1).
- **A commit the agent makes itself does not carry its own spend**; it goes on the next commit, never lost
  ([COST-LINES.md](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/COST-LINES.md), "A commit the agent makes itself").
- **Prices are list prices, not a bill**, and differ from Claude Code's `/cost` in named ways
  ([COST-LINES.md](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/COST-LINES.md), "Known differences").
- **A refused prompt's text stays in Claude Code's own transcript** on disk (D1).
- **`text full` keeps whole prompts on disk**; `claims bundle --with-record` and `evidence push` can send them (P2).
- **Only the latest release is supported** (SECURITY.md).
- **Claude Code only.** Other agents are not recorded.
- **The first public release is `Unreleased` in [CHANGELOG.md](https://github.com/OneDro1d/onedroid-indie/blob/main/CHANGELOG.md)**; this page was written against `0.1.0-dev`.
- **Evidence in this page used replayed hook payloads, not a live Claude Code session** (see "How to read this page").

## Claims cut or not yet shown

| Claim | Status | Why |
|---|---|---|
| UI4, UI5, C4 | fixture, not a live session | two throwaway repositories and replayed transcripts; a stand-in for Claude Code in the `onedroid test` run |
| B8 basic pack and signed pass list | not yet shown | needs real Claude Code sessions and tokens; unit tests only |
| C6 PR comment | not yet shown | needs a GitHub repository |
| P4 Enterprise connect | not yet shown | needs a plane |
| UI3 | tests only | no command shows it; the test does |
| P3 `--purge` | not run | only `uninstall --claude` was run |
| Claude Code actually calling the hooks | not shown | needs a live session; covered indirectly by A0 and D4 |
