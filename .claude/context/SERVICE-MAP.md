# Service Map (compressed)

`OneDro1d/onedroid-docs` — the markdown source of truth for **https://docs.onedroid.ai**.
The repo is authoritative; the site is a build artefact. There are no services here: one
build script, one edge function, one dependency. Verify against code before acting; flag
drift to knowledge-keeper.

⚠️ **`AGENTS.md` at the repo root is authoritative for HOUSE RULES** (what to document, how
to write it, the endpoint distinction). This store describes STRUCTURE only and deliberately
does not restate them — two homes for one rule is how a correction reaches one of them and
not the other. Read `AGENTS.md` before editing content.

## Components
| Component | Lang | Role | In → Out |
|---|---|---|---|
| `build.mjs` | Node ESM | The whole build. Walks `content/`, parses frontmatter, renders HTML + the byte-identical markdown twin, generates nav / `llms.txt` / `sitemap.xml` / `robots.txt` | `content/**/*.md` → `dist/` (`build.mjs:180-233`) |
| `build.mjs --check` | Node ESM | Staleness gate: exits 1 if `dist/` would differ from a fresh build. `npm run check` | `content/` + `dist/` → exit 0/1 (`build.mjs:221-232`) |
| `middleware.js` | Vercel Edge | Serves the **markdown source** to AI-agent user-agents at the canonical URL; humans get HTML from the same path | request → `x-middleware-rewrite` to `<path>.md` (`middleware.js:17-33`) |
| `vercel.json` | config | Build command, `cleanUrls`, security headers, `text/markdown` + CORS on `*.md` and `/llms.txt` | — |
| `content/*.md` | markdown | The only place to change what the site says. 7 pages on `main` | — |

## Cross-component contracts that silently break if drifted
- **Frontmatter `title` + `description` are REQUIRED.** `build.mjs:59-60` throws without them,
  deliberately — a page an agent cannot identify is a page that will not be retrieved.
  `section` groups the sidebar, `order` sorts it, `nav` overrides the label (`build.mjs:80-99`).
- **`dist/` is generated, never hand-edited — and it is GITIGNORED** (`.gitignore:2`), so it
  never leaves your machine. Vercel builds it from `content/` on every deploy. A stale local
  `dist/` therefore misleads only you, and only until the next `npm run build`; it cannot ship.
  ⚠️ `AGENTS.md` says "run `npm run check` before committing", which reads as if `dist/` were
  part of the commit. It is not. The check is still worth running — it is the only thing that
  proves your local preview matches what Vercel will build — but a stale `dist/` is not a
  publishing risk, and no push gate can see it.
- **The markdown twin is the SOURCE, byte for byte** (`build.mjs:184`, `files.set(…, p.raw)`),
  not a re-render of a render. Anything that rewrites `p.raw` on the way out breaks the
  agent-facing contract.
- **`middleware.js` cannot be a `vercel.json` rewrite.** Vercel evaluates rewrites only AFTER
  the filesystem check, so a rewrite on a path that already resolves to a file never fires —
  verified the hard way on onedroid.ai (`middleware.js:3-7`). Moving this back into config
  silently serves agents the HTML.
- **Nav, `llms.txt`, `sitemap.xml` and `robots.txt` are generated from the content.** There is
  no hand-maintained page list to update.

## Infra & cross-cutting
- **Host**: Vercel, project `onedroid-docs`. Build `node build.mjs`, output `dist/`.
- **Domain**: `docs.onedroid.ai`. Machine index `/llms.txt`. MCP registry entries
  `ai.onedroid/synapse`, `ai.onedroid/engram`.
- **Dependencies**: exactly one — `marked ^15.0.0`. Deliberate; every package is a thing
  somebody has to patch.
- **No client-side JavaScript.** Docs that need JS to render are docs an agent cannot read.
- **No second copy.** Content that exists here and elsewhere will drift; link instead
  (`AGENTS.md`, House rules).
- **Documented subjects**: OneDroid Synapse (the governed MCP gateway) and **Engram**
  (`content/engram.md`).

⚠️ **`main` is not the whole content set.** `content/engram-usage.md`, `connections.md` and
`claude-desktop.md` live in **open PR #2** (`docs/connections-credentials-and-engram-usage`),
not on `main`. Read the branch before concluding a page is missing.

⚠️ **Engram ENGINEERING docs are not here.** They live in the private platform repo's own
context store. This repo is the public-facing surface only — and the two must not become a
second copy of each other. (This repo is public: do not name private repos, hosts, clusters
or internal paths in it, here or in `content/`.)

---
_Add components above this line. Cite a `file:line` or ruling for every claim; verify against code before acting._
