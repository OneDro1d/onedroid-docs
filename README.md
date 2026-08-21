# onedroid-docs

Markdown source of truth for **[docs.onedroid.ai](https://docs.onedroid.ai)**.

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
section: Start here
order: 3
---
```

`title` and `description` are required — the build fails without them, because a page an
agent cannot identify is a page that will not be retrieved. `section` groups the nav,
`order` sorts it, `nav` overrides the sidebar label.

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
