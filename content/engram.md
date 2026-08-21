---
title: Engram — portable agent memory
nav: What Engram is
description: Versioned, permissioned context in a Postgres you own, reachable by any MCP client behind any model.
section: Engram
order: 7
---

Models are interchangeable. Your context is not. Engram is where an organisation's durable
knowledge lives — versioned, permissioned, searched by several engines at once, and
reachable by any MCP client behind any model. Every document, embedding and revision is a
row in a Postgres you control.

## Why it exists

A model session ends and takes everything with it. The next tool starts from nothing, so the
same context gets re-pasted, re-explained and re-discovered — by every agent, every time.
Engram is the layer that stops that: write once, and every application you run can use it.

## What makes it different from a vector store

**Portable.** Reachable by any MCP client, from any harness, behind any model. Context
written by one agent is available to the next — including the one you have not chosen yet.
Changing model does not cost you what you knew.

**Persistent and versioned.** Objects carry revision history, so you can see what an agent
knew and when it changed. Knowledge accumulates as an asset instead of evaporating at the
end of a session.

**Rich, not just a vector blob.** Hybrid retrieval — semantic and keyword together — over a
typed object graph, so relationships like *supersedes* or *references* are explicit and
traversable rather than inferred from similarity.

**Permissioned and yours.** Scoped by group and namespace, so context is shared deliberately
rather than pooled by accident — and all of it in a database you own.

## Bring your own database

Point Engram at your own Postgres and that is where everything lives: documents, chunks,
embeddings, history, permissions. Read it with SQL whenever you like. Back it up with the
tools you already trust. Leave, and the data simply stays where it always was — with you.

The same model serves a single developer's notebook and a regulated enterprise knowledge
base.

## Connecting

Engram has its own endpoint:

```
https://engram.onedroid.ai/mcp
```

It is also available through Synapse as an upstream, which is how you get it governed and
audited alongside every other tool in the hub. One account covers both — free for
individuals and small teams.

In the official MCP registry it is published as `ai.onedroid/engram`.
