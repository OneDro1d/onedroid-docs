# onedroid-docs

Markdown source of truth for **[docs.onedroid.ai](https://docs.onedroid.ai)**.

## What these docs are

The working manuals for OneDroid's four products: what each one is for, how to set it up step
by step, the exact commands, fields and tool names, and the failures people actually hit.
The pitch lives on [onedroid.ai](https://onedroid.ai); this repo holds what to type and what
you should see.

## Who they are for

Teams building software with AI coding agents, whoever looks after those agents on every
machine, the platform and security leads who answer for what agents can reach, developers
and everyday users connecting Claude Code, Claude Desktop or claude.ai, and AI agents
themselves (every page is served as markdown).

## The products, in the order the docs lead with them

| Product | What it does | Start at |
|---|---|---|
| **OneDroid Argus** | End-to-end tests against your real, deployed system, judged from its own logs, with the builder never shown what will be checked | [`content/argus.md`](content/argus.md) · [docs.onedroid.ai/argus](https://docs.onedroid.ai/argus) |
| **Dark Factory** | The same governed agent (skills, hooks, hard stops) on every machine, decided by a lockfile | [`content/dark-factory.md`](content/dark-factory.md) · [docs.onedroid.ai/dark-factory](https://docs.onedroid.ai/dark-factory) |
| **OneDroid Synapse** | A governed MCP gateway: one URL for every agent, credentials held for you, every call in an audit log you own | [`content/synapse.md`](content/synapse.md) · [docs.onedroid.ai/synapse](https://docs.onedroid.ai/synapse) |
| **OneDroid Engram** | Versioned, permissioned agent memory in a Postgres you control | [`content/engram.md`](content/engram.md) · [docs.onedroid.ai/engram](https://docs.onedroid.ai/engram) |

Each product has its own section in the sidebar, in that order, followed by Reference.

## How the repo works

Edit a file in `content/`, push, and Vercel rebuilds the site. There is exactly one copy of
every sentence — the repo. The site is a build artefact.

## Layout

```
content/*.md     the docs. frontmatter: title, description, nav, section, order
build.mjs        markdown -> dist/. one dependency (marked)
middleware.js    serves the markdown source to AI agents at the canonical URL
vercel.json      build config and content-type headers
```

## Local

```bash
npm install
npm run build      # -> dist/
npm run check      # exit 1 if dist/ is stale
```

## Adding a page

Create `content/<slug>.md` with frontmatter:

```markdown
---
title: Connect Claude Code
nav: Connect Claude Code
description: One command and one bearer token.
section: Synapse
order: 32
---
```

`title` and `description` are required — the build fails without them, because a page an
agent cannot identify is a page that will not be retrieved. `section` groups the nav,
`order` sorts it, `nav` overrides the sidebar label. Sections appear in the order of their
first page, so keep a new page inside its section's range (the `section:` value, then
`order:`): `Start here` 1, `Argus` 10–19, `Dark Factory` 20–29, `Synapse` 30–39, `Engram` 40–49,
`Reference` 50–59.

Navigation, `llms.txt`, `sitemap.xml` and `robots.txt` are all generated from the content.
There is no separate list to keep in sync.

## Agent-readable by construction

Every page is served as markdown at `<path>.md`, and to AI-agent user-agents (or
`Accept: text/markdown`) at the canonical URL. The markdown served is the **source file**,
byte for byte — not HTML converted back to markdown. An agent reading these docs gets what
the author wrote.

The index for machines is [`/llms.txt`](https://docs.onedroid.ai/llms.txt).

## Why the site has almost no dependencies

`marked` is the only one. Docs are a security surface that nobody watches: they are public,
they are rarely touched, and a compromised build step here would serve to every agent that
trusts us. The build is a single file you can read in a sitting.

No client-side JavaScript either — docs that need JS to render are docs an agent cannot
read.
