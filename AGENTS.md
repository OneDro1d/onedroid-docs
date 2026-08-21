# AGENTS.md

Instructions for coding agents working in this repo. Humans: see [README.md](README.md).

## What this repo is

The markdown source of truth for **https://docs.onedroid.ai**. The repo is authoritative; the
site is a build artefact. If a published page disagrees with the markdown here, the markdown
is right and the site is stale.

## Layout

- `content/*.md` — the docs. This is the only place to change what the site says.
- `build.mjs` — markdown → `dist/`. One dependency (`marked`).
- `middleware.js` — serves the markdown source to AI agents at the canonical URL.
- `tools/`, `dist/`, `node_modules/` — not content. Never edit `dist/` by hand; it is generated.

## Making a change

```bash
npm install
npm run build     # regenerate dist/
npm run check     # exits 1 if dist/ is stale — run before committing
```

Every page needs `title` and `description` in frontmatter. The build **fails** without them,
deliberately: a page an agent cannot identify is a page that will not be retrieved.

`section` groups the sidebar, `order` sorts it, `nav` overrides the sidebar label.

Nav, `llms.txt`, `sitemap.xml` and `robots.txt` are **generated from the content**. Do not
hand-maintain a page list — there isn't one to update.

## House rules

**Do not document behaviour you have not verified.** These docs describe a live service. If
you are writing about an endpoint, call it. If you are writing about an error, produce it.
The one thing worse than a missing page is a confident wrong one, because the reader —
increasingly an agent — has no way to tell.

**Prefer the failure over the happy path.** The most-read page here is Troubleshooting. When
you learn something by getting it wrong, that belongs in the docs while you still remember
what was confusing.

**Keep the endpoint distinction exact.** `/agent/mcp` is for personal access tokens and takes
no hub slug. `/hub/<slug>/mcp` is for browser OAuth, where the slug selects the hub. They are
not interchangeable, and blurring them is the most common wiring mistake we see.

**No client-side JavaScript, and no second copy.** Docs that need JS to render are docs an
agent cannot read. Content that exists both here and elsewhere will drift; link instead.

## Where things are published

- Site: https://docs.onedroid.ai (Vercel, project `onedroid-docs`)
- Machine index: https://docs.onedroid.ai/llms.txt
- MCP registry: `ai.onedroid/synapse`, `ai.onedroid/engram`
