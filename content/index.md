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

Everyone starts by [setting up a hub](/setup) — sign in, choose where your data lives, give
it a name. After that the path forks by how you work.

**If you do not live in a terminal**, connect your assistant through the browser:
[Claude Desktop or claude.ai](/claude-desktop). Nothing to install, no token to look after.

**If you write code**, use the token route: [Connect Claude Code](/quickstart) — one command
and one bearer token, and the same path works for CI and any HTTP MCP client.

**Both paths then converge** on [Connections and credentials](/connections). This is the step
that catches almost everyone, because enabling a service on your hub and giving it *your*
login are two different actions and only the second one lets you call anything. If you are
stuck right now, start there.

Then:

- **Want memory that outlives the session?** [Using Engram](/engram-usage) — write your first
  object and search it back.
- **Wiring something else?** [Endpoints and authentication](/endpoints) explains the two
  routes and which one your client needs.
- **Something broken?** [Troubleshooting](/troubleshooting) covers the failures people
  actually hit, with the one probe that tells them apart.

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
