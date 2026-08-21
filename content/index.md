---
title: OneDroid documentation
nav: Overview
description: Connect your agents to one governed endpoint, and give them memory that outlives the session.
section: Start here
order: 1
---

OneDroid is two products that solve the two halves of the same problem.

**OneDroid Synapse** is a governed MCP gateway. Your agents connect to one URL instead of
holding a dozen sets of credentials, and every tool call is authenticated, policy-checked,
and written to an audit log you own.

**OneDroid Engram** is versioned agent memory that lives in your own Postgres. Context that
survives the session, is portable between agents, permissioned, and yours to keep.

> When a frontier model is just an API call away, context is the moat. The model is a brain
> in a jar — swappable, and getting cheaper. What it knows about your business is not.

## Where to start

- **Setting up for the first time?** [Set up your hub](/setup) — sign in, choose where your
  data lives, create a hub.
- **Just want it connected?** [Connect Claude Code](/quickstart) — one command, one bearer
  token.
- **Wiring something that isn't Claude Code?** [Endpoints and authentication](/endpoints)
  explains the three routes and which one your client should use.
- **Something broken?** [Troubleshooting](/troubleshooting) covers the failures people
  actually hit.

## These docs are open source

Everything on this site lives as markdown in
**[OneDro1d/onedroid-docs](https://github.com/OneDro1d/onedroid-docs)**, and the site is
built from it. **The repo is the source of truth** — if a page here disagrees with the
markdown, the markdown is right and the page is stale.

That is not a detail about our build. It is the same claim the products make: you should be
able to check what we told you, rather than take it on faith. Found something wrong, or
missing? [Open an issue](https://github.com/OneDro1d/onedroid-docs/issues) or edit the page
directly — every page footer links to the exact file it came from.

## For agents reading this

Every page here is available as markdown: append `.md` to any path, or send an AI-agent
user-agent (or `Accept: text/markdown`) to the canonical URL and you will get the markdown
source rather than rendered HTML. The index is at [`/llms.txt`](/llms.txt).

Both servers are published to the official MCP registry under the DNS-verified
`ai.onedroid` namespace:

```
ai.onedroid/synapse
ai.onedroid/engram
```
