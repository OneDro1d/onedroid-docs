# Data Flow — the data-transform view of THIS repo

Companion to `SERVICE-MAP.md`. The service map says *where things live*; this says *what the
data is, who owns its truth, and how it is transformed*. There is one datum here — a page of
documentation — and one interesting question about it: **which copy is true.**

## Data nodes (what the data is + who owns its truth)
| Node | Shape / schema | Origin | Authority (system-of-record) | Class / governance |
|---|---|---|---|---|
| `page source` | markdown + `---` frontmatter (`title`, `description` required; `section`, `order`, `nav` optional) | a human or agent editing `content/*.md` | **`content/*.md` in this repo — the only one** | public |
| `dist/ HTML` | rendered page, nav + canonical + og tags | `build.mjs` `page()` | `content/` (derived) | public |
| `dist/<slug>.md` | **byte-identical copy of `page source`** (`build.mjs:184`) | `build.mjs` | `content/` (derived) | public |
| `llms.txt`, `sitemap.xml`, `robots.txt` | generated indexes | `build.mjs:187-219` | `content/` (derived) | public |
| `docs.onedroid.ai` response | what a reader actually sees | Vercel deploy of `dist/`, plus `middleware.js` on the agent path | `content/` (derived, and may be stale) | public |
| `frontmatter contract` | `title` + `description` mandatory | `build.mjs:59-60` | `build.mjs` | internal |

## Transform graph
```
page source (content/*.md)
   │  parse frontmatter (pure; THROWS on missing title/description — build.mjs:59-60)
   │  marked.parse + template (pure)                 ──►  dist/<slug>/index.html
   │  passthrough of p.raw (pure, byte-identical)    ──►  dist/<slug>.md
   │  index generation (pure)                        ──►  llms.txt · sitemap.xml · robots.txt
   ▼
dist/  ──► git commit (effect: idempotent — `npm run check` is the test that it IS current)
       ──► Vercel build + deploy (effect: idempotent by commit; undo = redeploy a prior commit)
       ──► middleware.js rewrite on agent UA (pure per-request; no state)
```

## Validation rules
| Rule | Locus | Action on violation | Enforced at |
|---|---|---|---|
| every page has `title` and `description` | `LOCAL` | **build fails** — reject, do not default | `build.mjs:59-60` |
| `dist/` matches a fresh build of `content/` | `GLOBAL` | reconcile against `content/` — regenerate `dist/`, never edit it | `npm run check` (`build.mjs:221-232`); also the agent push gate, `.claude/docs-map.json` |
| a published page disagrees with the markdown | `GLOBAL` | **the markdown is right and the site is stale** — redeploy, never patch the site | `AGENTS.md`, "What this repo is" |
| no second copy of any sentence | `GLOBAL` | link instead of duplicating; the other home wins if it is the system of record | `AGENTS.md`, House rules — reviewer, not mechanical |
| documented behaviour was actually observed | `LOCAL` | do not write it — call the endpoint, produce the error | `AGENTS.md`, House rules — reviewer, not mechanical |

> **Authority is `content/`, always.** `dist/`, the deployed site, the MCP registry listing and
> any wiki page repeating this material are all derived. A transform that would make one of
> them the place a correction is made has moved authority off the node of record — block and
> escalate, never "fix" it there.

⚠️ **The last two rules have no mechanical enforcer, and cannot get one.** A hook can prove a
file moved; it cannot prove a sentence is true or that it exists only once. A green
`npm run check` means `dist/` is current — it never means the docs are right.

---
_Add nodes/transforms/rules above this line. Cite a `file:line` or ruling for every
claim; mark unknowns explicitly — never guess origin, authority, or data class._
