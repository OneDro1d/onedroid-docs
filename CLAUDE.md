# CLAUDE.md

**`AGENTS.md` is the house rules for this repo — read it first.** What to document, how to
write it, the endpoint distinction, no-JS, no-second-copy. This file does not restate any of
it: two homes for one rule is how a correction reaches one of them and not the other.

## AI Agents & Context Store (read before working)

This repo ships an agent inner-loop in `.claude/`. **Before any investigation, change or
review, read the context store first — do NOT re-scan the repo:**
`.claude/context/SERVICE-MAP.md` (structure: build, middleware, the contracts that break
silently) → `DATA-FLOW.md` (what the data is, who owns its truth, the validation rules) →
`FINDINGS.md` (already-known problems) → `DECISIONS.md` (ADRs). Hand-off contracts and the
pure/effect + verification rules are in `.claude/context/AGENT-CONTRACTS.md`.

**Dispatch the right subagent** (full map in `.claude/agents/README.md`):

| Request | Agents (in order) |
|---------|-------------------|
| "Find the bug" | `investigator` → `root-cause-analyzer` |
| "Explain the root cause" | `root-cause-analyzer` |
| "Add or restructure a page" | `feature-architect` → `implementer` → `validator` |
| "Review this change" | `validator` |
| Record a learning / commit | `knowledge-keeper`, then the `commit-sync` skill |

**Standing rules** (every agent honors):
- **Read the context store first**; stop reading as soon as you have enough.
- **No guessing** — cite `file:line`; **escalate** when evidence is missing. In this repo that
  rule has teeth beyond code: `AGENTS.md` forbids documenting behaviour you have not observed.
- **Hand-offs are contracts** — a consumer **rejects** an incomplete hand-off
  (`contract-check`) instead of guessing.
- **Verify, don't trust** — re-run the evidence; no agent is its own auditor.
- After confirming a root cause or decision, have `knowledge-keeper` write it back so it is
  never re-investigated. **Never commit/push without explicit approval.**
- **Keep the build and the context store in lockstep.** A `pre-commit` staleness gate
  (`.claude/hooks/pre-commit`) blocks a commit that changes `build.mjs`, `middleware.js`,
  `vercel.json` or `package.json` without staging `SERVICE-MAP.md`, `DATA-FLOW.md` or
  `AGENTS.md`. It **self-arms** each session via the `SessionStart` hook in
  `.claude/settings.json` (→ `.claude/hooks/ensure-gate.sh`), so a fresh clone activates it
  with no manual step. Editing `content/*.md` is deliberately NOT a trigger — that is the
  normal work here, and a gate that fires on it is a gate people learn to bypass.
- A separate **push** gate reads `.claude/docs-map.json` (agent pushes only; a human `git push`
  in a terminal is untouched). Both gates prove a file MOVED, never that it is right.

## Two things that are not in this repo

- **Engram and Synapse ENGINEERING docs.** This repo is the public-facing surface; they live
  in the private platform repo's own context store.
  ⚠️ **This repo is public.** Do not name private repos, internal hosts, clusters, namespaces
  or filesystem paths in it — not in `content/`, and not in `.claude/` either.
- **`dist/`.** It is gitignored and built by Vercel from `content/` on every deploy. A stale
  local `dist/` misleads only you. `npm run check` is still worth running; it is just not a
  publishing risk, and no gate can see it.
