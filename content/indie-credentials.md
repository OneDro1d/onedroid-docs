---
title: Indie credentials monitor: keys, alerts, block and pause
nav: Credentials
description: How onedroid refuses your registered keys, alerts on other credentials, blocks them on request and pauses a session.
section: Indie
order: 48.5
---

> These pages are made from [`docs/PRODUCT.md`](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/PRODUCT.md) in the OneDroid Indie repository (commit `b5ae7f9`). That file is the source and travels with the code; the pages are regenerated from it on each Indie release.

## 4. Leaked-credentials monitor

### D1. A prompt that carries a key you registered is refused before the model sees it, and the key's value is never written to the record.

```sh
printf 'zq9-demo-own-key-7f3a91c2d8e4b605\n' | onedroid keys add work-token
# Registered "work-token". Only a salted hash and the length are kept; the key itself is not written anywhere.
printf '%s' '{"session_id":"cccccccc-3333-4333-8333-000000000003","hook_event_name":"UserPromptSubmit","cwd":"/tmp","prompt":"deploy with zq9-demo-own-key-7f3a91c2d8e4b605"}' | onedroid hook claude UserPromptSubmit
```

```
{"decision":"block","reason":"onedroid: This prompt was not sent: it carries your registered key \"work-token\" (rule own-key). Remove it and send again. Its text is still in Claude Code's own transcript on disk."}
```

```sh
grep -rlE "zq9-demo-own-key|AKIAIOSFODNN7EXAMPLE" "$VALOR_HOME"    # no output, exit 1
```

The reason names the label, never the value. A refused prompt is still in Claude Code's own transcript
on disk: refusing keeps it from the model, not off the disk. The same refusal applies to a tool call's
input (`PreToolUse` answers `permissionDecision: deny`). Real Claude Code behaviour on a block answer is
Claude Code's, not shown here.
Source: `internal/recorder/guard.go:186` (`AddKey`), `:289` (`own`), `:712` (`refuseReason`).
Tests: `TestOwnKeyBlocksPrompt` (`internal/recorder/guard_test.go:64`), `TestOwnKeyDeniesToolCall` (`:92`),
`TestOwnKeyHiddenInEverySummary` (`:281`).

### D2. Any other credential raises an alert and the call goes ahead, unless `block --all on` is set; a credential in a tool result only alerts, because the command already ran.

```sh
onedroid alerts
```

```
ALERT     TIME         SESSION   SEQ  WHERE               RULE                STATUS  BLOCKED  EXCERPT
86b35234  11-18 10:30  cccccccc  1    prompt              own-key:work-token  open    true     deploy with [REDACTED:own-key:work-token]
bf5bce8b  11-18 10:30  cccccccc  2    tool_input (Bash)   aws-access-key-id   open    false    {"command": "export AWS_ACCESS_KEY_ID=[REDACTED:secret-assignment]"}
4d8bb30a  11-18 10:30  cccccccc  3    tool_result (Bash)  aws-access-key-id   open    false    {"stdout": "key=[REDACTED:aws-access-key-id]"}
```

(the tool input and result carried AWS's published example key `AKIAIOSFODNN7EXAMPLE`). Then:

```sh
onedroid block --all on
# replay the same Bash tool call
onedroid hook claude PreToolUse   # with the same export AWS_ACCESS_KEY_ID=... input
```

```
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"onedroid: This Bash call was refused: it carries what looks like a credential (rule aws-access-key-id), and blocking of every credential pattern is on (`onedroid block --all off` turns it off). Pass the key through an environment variable, not its value. ..."}}
```

`onedroid alerts ack|fp|reopen <id>` changes a status (a new line, never an edit). The excerpt shows a few
characters around the match with the match redacted; the value itself is not kept. The patterns are the
ones in the `redact` package: a credential shape it does not know is not seen.
Source: `internal/recorder/guard.go:45-51` (`OwnKeyRule`, `BlockAll`), `:359` (`findings`), `:487` (`appendAlerts`),
`:550` (`SetAlertStatus`); patterns in `redact/`.
Tests: `TestGenericKeyAlertsThenBlocksWithAll` (`internal/recorder/guard_test.go:119`), `TestToolResultAlertsOnly` (`:140`),
`TestAlertStatusIsAppended`.

### D3. `onedroid pause <session>` makes every tool call of that session refuse until a person runs `onedroid resume`.

```sh
onedroid pause cccccccc --reason "checking the deploy"
# replay a PreToolUse event for that session
onedroid resume cccccccc
```

```
Paused cccccccc-3333-4333-8333-000000000003. Every tool call of this session is refused until you run `onedroid resume cccccccc`.
Commands already running are not stopped, and tools Claude Code runs on its own servers do not pass through this hook.
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"onedroid: a person paused this session (reason: checking the deploy). Every tool call is refused until they run `onedroid resume cccccccc`. Nothing resumes on its own."}}
Resumed cccccccc-3333-4333-8333-000000000003.
```

The dashboard's session page has the same Pause and Resume button (UI2).
Source: `internal/recorder/guard.go:633` (`Pause`), `:649` (`Resume`), `:729` (`pauseReason`).
Tests: `TestPauseHoldsUntilResume` (`internal/recorder/guard_test.go:156`), `TestBrokenPauseFileStillPauses`.

### D4. `onedroid doctor` tells you when recording has silently stopped: a hook removed, the binary moved, tool calls the hooks missed, or a transcript changed after it was recorded.

```sh
onedroid doctor
```

On the replayed session `aaaaaaaa`, whose transcript this page edited after the session ended, it exited 1 with:

```
problem   session aaaaaaaa-...: transcript changed since the session ended: the hash recorded at entry 8 no longer matches <scratch>/claude/projects/demo/aaaaaaaa-....jsonl
problem   session aaaaaaaa-...: 1 gap(s) in the record: heartbeat: 1 of 3 tool calls in Claude Code's transcript never reached the PreToolUse hook (first: toolu_xa (Edit))
note      session cccccccc-...: Claude Code's transcript for it was not found (it keeps them 30 days by default), so its record was not checked against one
```

A gap found is also written into that session's record, so `onedroid show` and `onedroid verdict` carry it.
The hooks fail open when they stop running; this check against Claude Code's own transcript is how the
kit notices. It cannot check hooks in a project's own `.claude/settings.json`, sub-agents' own tool calls, or
sessions whose transcript Claude Code already deleted.
Source: `internal/recorder/heartbeat.go:489` (a hook that does not fail closed), `internal/cli/doctorcmd.go`.
Tests: `TestHeartbeatFindsMissedCalls` (`internal/recorder/heartbeat_test.go:60`), `TestHeartbeatCompleteRecord`,
`TestDoctorCommand` (`internal/cli/doctorcmd_test.go:35`).

### D5. A worktree snapshot is taken when a recorded session starts, and `onedroid restore` brings a file back as it was.

```sh
onedroid checkpoints
rm README.md
onedroid restore aaaaaaaa <repo>/README.md
```

```
SESSION                               N  TAKEN             WORKTREE ...      COMMIT        FILES  CHANGED  NEW  SKIPPED  TOOK
aaaaaaaa-1111-4111-8111-000000000001  0  2026-11-18 10:28  <scratch>/work-demo  b121b51304a5  1      0        0 B  0        8ms
restored  <scratch>/work-demo/README.md
From checkpoint 0 of session aaaaaaaa-1111-4111-8111-000000000001, taken 2026-11-18 10:28 (b121b51304a5).
```

The snapshot is a git commit under `refs/valor/checkpoints/<session>/<n>` in the repository's own `.git`; your index,
HEAD, branches and stash are untouched. Files over 5 MiB, ignored files and nested repositories are listed as not
captured. `VALOR_CHECKPOINT=off` turns it off.
Source: `internal/checkpoint/checkpoint.go:504` (`Find`).
Tests: `TestRestoresSessionStartState` (`internal/checkpoint/checkpoint_test.go:101`), `TestTakeLeavesTheRepositoryAlone`,
`TestRestoreKeepsCurrentAndStaysInside`.
