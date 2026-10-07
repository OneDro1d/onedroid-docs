---
title: OneDroid documentation
nav: Overview
description: How to test what your AI agents build, put the same governed agent on every machine, connect agents to your tools through one gateway, and give them memory that outlives the session.
section: Start here
order: 1
---

## What these docs are

These are the working manuals for OneDroid's four products: **OneDroid Argus**, **Dark
Factory**, **OneDroid Synapse** and **OneDroid Engram**. Each section says what the product
is for, takes you through setting it up step by step, gives the exact commands, fields and
tool names, and lists the failures people actually hit, with the check that tells them apart.

They are not marketing. If you want the pitch, it is on [onedroid.ai](https://onedroid.ai).
Here you will find what to type, what you should see, and what it means when you see
something else.

## Who they are for

- **Teams building software with AI coding agents**, who need to know whether what an agent
  built actually works, not whether the agent says it does. Start with OneDroid Argus.
- **Whoever looks after the agents themselves**: the person who has to make sure every
  laptop and cloud workspace runs the same skills, hooks and hard stops. Start with Dark
  Factory.
- **Platform and security leads, and hub owners**, who have to answer what agents can reach,
  whose credentials they use, and what they did. Start with OneDroid Synapse.
- **Developers and everyday users** connecting Claude Code, Claude Desktop or claude.ai to
  their tools and to memory that outlives the session. Start with
  [Set up your hub](/setup).
- **AI agents.** Every page is also served as markdown, so an agent can read these docs
  directly ([below](#for-agents-reading-this)).

## OneDroid Argus — end-to-end tests your builder can't see

OneDroid Argus runs end-to-end tests against your real, deployed system, never a mock, and
judges the result from the system's own logs, events and database state. The agent fixing
the system is never shown what will be checked, so a green run means something.

[What OneDroid Argus is](/argus) · [Set up a tester and a builder](/argus-session-setup) ·
[Quickstart](/argus-quickstart) · [Tester guide](/argus-tester-guide) ·
[Builder guide](/argus-builder-guide)

## Dark Factory — the same governed agent on every machine

Dark Factory is how the agent itself gets onto a machine: the same skills, the same hooks,
the same hard stops, on your laptop and on a cloud workspace, provably rather than by hand. A
lockfile decides what exists, and taking an update is a one-line change. It is a method, not
a service, and the method is a public repo.

[What a Dark Factory is](/dark-factory) · [Install a kit](/dark-factory-kits) if somebody
has handed you one

## OneDroid Synapse — one governed connection to your tools

OneDroid Synapse is a governed MCP gateway. Your agents connect to one URL instead of holding
a dozen sets of credentials, and every tool call is authenticated, policy-checked, and
written to an audit log you own. Synapse has [its own section](/synapse): setting up a hub,
connecting your agent, giving it your credentials, running a hub for a team, and governing
what agents can do.

[What Synapse is](/synapse) · [Set up your hub](/setup) ·
[Connect Claude Code](/quickstart) · [Claude Desktop & claude.ai](/claude-desktop) ·
[Connections and credentials](/connections)

## OneDroid Engram — memory that outlives the session

OneDroid Engram is versioned, permissioned agent memory that lives in a Postgres you
control, reachable by any MCP client behind any model. Context written by one agent is
there for the next, including the one you have not chosen yet.

[What Engram is](/engram) · [Using Engram](/engram-usage) ·
[The web app](/engram-web-app) · [Tool reference](/engram-tools)

## Something broken?

[Troubleshooting](/troubleshooting) covers the failures people actually hit, with the one
probe that tells them apart. If an agent is connected but every call is refused, read
[Connections and credentials](/connections) first: that is almost always the cause.

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

Synapse and Engram are published to the official MCP registry under the DNS-verified
`ai.onedroid` namespace:

```
ai.onedroid/synapse
ai.onedroid/engram
```
