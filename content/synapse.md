---
title: Synapse — one governed connection between your agents and your tools
nav: What Synapse is
description: A governed MCP gateway. Your agents connect to one URL, every tool call is authenticated and policy-checked, and every call is written to an audit log you own.
section: Synapse
order: 30
---

OneDroid Synapse is a governed MCP gateway. Your agents connect to **one URL** instead of holding a
dozen sets of credentials, and every tool call that passes through it is authenticated,
policy-checked, and written to an audit log you own.

OneDroid Argus installs Synapse, and a [Dark Factory kit](/dark-factory-kits) is the usual way an
agent ends up connected to a hub. You can also run Synapse on its own.

## The problem it solves

Agents are being wired to production databases, SaaS accounts and internal APIs one config
file at a time, each with its own token, invisible to whoever has to answer for them. Ask
what your agents did last week and the answer is an investigation. Synapse replaces those
scattered connections with one gateway your team can see, scope, and prove.

## How it works

- **Connect.** Agents point at one MCP URL. Claude Code, Claude Desktop, claude.ai and any
  client that speaks MCP over HTTP connect without a custom integration. Which URL, and which
  way of signing in, depends on the client: [Endpoints and authentication](/endpoints).
- **Govern.** A **hub** is a workspace with its own members, roles and tool surface. You
  decide which services the hub can reach, people connect their own accounts to it once, and
  agents call tools under those grants without ever seeing the underlying tokens. An admin
  can turn any single tool off for everyone on the hub.
- **Prove.** Every call is logged: who, which tool, when, and how it ended. The log belongs to
  the hub, so "what did our agents do?" is a query.

## Where to start

1. [Set up your hub](/setup) — sign in, choose where your data lives, name it.
2. Connect your agent: [Claude Code and other token clients](/quickstart), or
   [Claude Desktop and claude.ai](/claude-desktop) if you do not work in a terminal.
3. [Connections and credentials](/connections) — the step that catches almost everyone,
   because enabling a service on the hub and giving it *your* login are two different
   actions, and only the second one lets you call anything.
4. Then, as you need them: [Members, groups & sharing](/hub-administration) for a team, and
   [Tools & governance](/tools-and-governance) to narrow or audit what agents can do.

The [Reference](/endpoints) section holds the details: endpoints, tokens, the baseline MCP
tools every hub exposes, and troubleshooting.
