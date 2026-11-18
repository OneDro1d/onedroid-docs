---
title: Indie privacy: what stays on your machine
nav: Privacy
description: What onedroid keeps, where, who can read it and what can leave the machine, each claim with its check.
section: Indie
order: 49
---

> These pages are made from [`docs/PRODUCT.md`](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/PRODUCT.md) in the OneDroid Indie repository (commit `b5ae7f9`). That file is the source and travels with the code; the pages are regenerated from it on each Indie release.

## 5. What stays on your machine

### P1. Nothing leaves the machine on its own, and the kit's own connections are listed.

```sh
onedroid egress
```

```
The kit opened no connections. It reaches only GitHub, for `onedroid post` and `onedroid report --pr`, and an Enterprise plane once `onedroid connect` connects one; the price list and the basic pack are built in.

The agent's connections: none named in its recorded tool calls.
```

Only three places in the source import `net/http`: the plane client (`internal/plane`, used by `connect`, `sync`,
`evidence push`, `runner`), GitHub (`internal/post`) and the local page (`internal/ui`, `internal/cli/uicmd.go`).
The module has no dependencies (`go.mod` has a `module` and a `go` line and no `require`). There is no daemon and no proxy; Claude Code runs the hook once per event.

```sh
grep -rl '"net/http"' --include=*.go --exclude=*_test.go .
cat go.mod
```

And with the network cut (Linux, needs `unshare`), `sh scripts/egress-test.sh "$(command -v onedroid)"` ran every
command in a network namespace with no DNS and no route:

```
PASS  post (GitHub is cut: must fail)    exit 1
PASS  egress log: only GitHub (1 line(s)) exit 0
PASS  connect (the plane is cut: must fail) exit 1
42 passed, 0 failed
```

Source: `internal/cli/egresscmd.go:25`, `internal/egress`. Tests: `TestEgressRecordsEveryGitHubCall`
(`internal/cli/egresscmd_test.go:31`), `TestEgressNothingYet` (`:117`), `scripts/egress-test.sh`.

### P2. The record is private to your user, and how much text it keeps is your choice.

```sh
ls -la "$VALOR_HOME"          # directories drwx------, files -rw-------
onedroid text                 # Text mode: short (the default). ... first 200 characters of its text, redacted
onedroid text hash            # only a sha256 of each text
```

`onedroid text hash` printed `Text mode: hash. From the next event, the record keeps the sha256 of prompts, ...
and credential alerts keep no excerpt. Events already recorded keep what they hold. Claude Code's own transcript,
and the claims and verdict files in this home, still hold the text`. `ls -la` showed every folder `drwx------`
and every file `-rw-------`.

`short` (default) keeps the first 200 characters of prompts, messages, errors and the main field of each tool input,
secrets redacted; `full` keeps all of it, **so whole prompts sit on disk**; `hash` keeps only a SHA-256. A tool
result is kept as a hash and size. The full list of files is in the README, "What stays on your machine".
Source: `internal/recorder/guard.go:84-97` (`TextMode`, `SetTextMode`), `internal/cli/textcmd.go`.
Tests: `TestTextModeFullRedactsAtAnyPosition`, `TestTextModeFullHidesOwnKeyPast200` (`internal/recorder`),
`internal/cli/textmode_test.go`.

### P3. `onedroid uninstall --claude` removes exactly the hooks `init --claude` added; `--purge` also deletes the record.

```sh
onedroid uninstall --claude
```

```
Skill removed: <scratch>/claude/skills/onedroid-claims/SKILL.md
Skill removed: <scratch>/claude/skills/onedroid-witness/SKILL.md
Removed 11 recording hook(s) from <scratch>/claude/settings.json:
  ConfigChange: '<scratch>/onedroid' hook claude ConfigChange
  ... (one line per hook)
The record already written stays in <scratch>/valor: onedroid uninstall --purge deletes it.
```

`--purge` was not run on this page. Tests: `internal/cli/uninstallcmd_test.go`, `internal/cli/uninstall_kitfiles_test.go`, `internal/install`.
Left behind on purpose: the binary, a repository's `.git/valor/` and `refs/valor/checkpoints`, committed
`.github/valor.yml` and the `Valor:` lines ([INSTALL-CODER.md](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/INSTALL-CODER.md), "Uninstall").

### P4. Connecting to a OneDroid Enterprise plane is optional, off until you run `onedroid connect`, and then sends the session record there only. (not yet shown)

Not shown here: it needs a plane. Tests: `internal/cli/connectcmd_test.go`, `internal/plane`. What is sent and
when: [INSTALL-CODER.md](https://github.com/OneDro1d/onedroid-indie/blob/main/docs/INSTALL-CODER.md), "Connecting to OneDroid Enterprise". `onedroid runner` runs what that
plane sends, as you (SECURITY.md, boundary 2).
