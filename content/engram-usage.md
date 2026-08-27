---
title: Using Engram
nav: Using Engram
description: Connect, write your first object, search it back, and understand what the results mean.
section: Engram
order: 21
---

[What Engram is](/engram) covers why it exists. This page is how to actually use it.

## The shape of things

Four levels, and the only two you name day to day are the middle ones.

```
Library      a top-level container. You own it, you invite people to it
  Namespace  a subject area inside a library — the thing you write into
    Object   a document: title + content, plus a freeform kind
      Chunk  what search actually matches on. Engram makes these for you
```

An **object** also carries a `kind` — a freeform label you choose, defaulting to `document`.
`note`, `session`, `decision`, `config` are all fine. It is a description, not an enum, and
nothing validates it against a list.

> **The parameter is called `collection`, and it takes a namespace.** It is a historical
> name for the namespace argument, and it accepts either the namespace's name or its UUID.
> When a tool asks for `collection`, give it a namespace.

**Access groups are a separate tree.** Libraries hold content; access groups hold people,
and a *grant* connects a group to a library with `read` or `read-write`. They are not
namespaces and do not nest with them.

## Connect

Engram has its own endpoint:

```
https://engram.onedroid.ai/mcp
```

Tokens look like `engram_` followed by 32 hex characters. Mint one from the **API Tokens**
page, which shows the plaintext once, or with `engram_create_token`. Pass it as a header:

```bash
curl -s https://engram.onedroid.ai/mcp \
  -H "Authorization: Bearer engram_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",
       "params":{"protocolVersion":"2025-06-18","capabilities":{},
                 "clientInfo":{"name":"probe","version":"1.0"}}}'
```

With no credential, or a bad one, you get **HTTP 401 with the plain-text body
`Unauthorized`** — not JSON. A JSON parse error on that response means you are unauthorised,
not that the service is broken.

You can also reach Engram **through a Synapse hub** as a connection, which is how you get it
audited alongside your other tools. It is a token-type connection: paste the Engram token
into the row and click Connect. See [Connections and credentials](/connections).

## Your first write

Namespaces live inside a library, so you need one library first. If you have none:

```
engram_create_library   name: "My Knowledge"
```

Then a namespace:

```
engram_create_namespace   name: "project-notes"
```

> **`engram_create_namespace` takes no library argument.** It puts the namespace in the
> oldest library **you own**. With more than one owned library that may not be the one you
> meant — check with `engram_list_libraries` first, and move it afterwards with
> `engram_move_namespace` if it landed somewhere else.
>
> With no owned library at all it fails with:
> `no library found — create a library first (use engram_create_library) or complete onboarding`

Now write:

| Parameter | Required | Notes |
|---|---|---|
| `collection` | yes | namespace name or UUID |
| `title` | yes | ≤ 500 characters |
| `content` | yes | ≤ 500,000 characters. Markdown preferred |
| `kind` | no | defaults to `document` |

```
engram_write
  collection: "project-notes"
  title:      "Why we picked Postgres over Mongo"
  content:    "## Decision\n\nWe chose Postgres because ..."
  kind:       "decision"
```

Engram chunks and embeds it. It is searchable straight away.

> **Content sent through a tool call travels through your LLM provider.** For sensitive
> material use the REST endpoint `POST /api/namespaces/{id}/objects` or the web upload,
> both of which bypass the model entirely.

## Searching it back

Only `query` is required. Omit `collection` and it searches everything you can reach.

| Parameter | Default | Notes |
|---|---|---|
| `query` | — | required, ≤ 2000 characters |
| `collection` | all namespaces | narrow to one |
| `limit` | 10 | maximum 50 |
| `vector_weight` | 0.7 | 1.0 = meaning only, 0.0 = keywords only |
| `min_score` | 0.35 | raise to cut weak matches |

Search is **hybrid**: semantic similarity and keyword matching at once, blended 70/30 by
default. Each result carries all three numbers, so you can see which engine found it:

```json
{ "score": 0.34, "vector_score": 0.49, "bm25_score": 0 }
```

`bm25_score: 0` with a healthy `vector_score` means meaning matched and the literal words did
not — normal, and often exactly what you wanted.

### Two results that look like answers and are not

**An empty result is not an error.** A valid namespace with nothing matching returns HTTP
200 and `{"results": [], "total_results": 0}`. So does a namespace that is genuinely empty.
If a query that previously matched suddenly returns zero, treat that as a **liveness
question**, not as an answer — check the namespace still has objects before concluding the
knowledge is gone.

**Search can silently fall back to keywords only.** If the query embedding cannot be
generated, Engram sets the vector weight to zero and runs BM25 alone. You get results and no
warning. The tell is every result showing `vector_score: 0`; the fix is usually transient.

A wrong namespace name **does** error, so a typo in `collection` fails loudly rather than
returning nothing.

## Beyond search

| You want to | Tool |
|---|---|
| Read one object by UUID | `engram_read` (`document_id` must be a UUID, not a title) |
| Statistics and object list for a namespace | `engram_list` |
| See what namespaces exist | `engram_list_namespaces` |
| See what libraries you can reach, and your role | `engram_list_my_libraries` |
| Search with related-context expansion | `engram_search_graph` |
| Version history / compare / roll back | `engram_history`, `engram_diff`, `engram_restore` |
| Connect two objects in the graph | `engram_link`, then `engram_traverse` or `engram_neighbors` |
| Ingest a web page on a refresh schedule | `engram_register_link` |
| Share a library with a team | `engram_create_access_group` → `engram_grant_library` |

There are 44 `engram_*` tools in total; the ten above cover almost all day-to-day use.

## Sharing with a team

Sharing goes through access groups, not by adding people to libraries one at a time:

1. `engram_create_access_group` — you become its first owner
2. `engram_add_access_group_member` — by **email**, lowercased and trimmed for you
3. `engram_grant_library` — give the group `read` or `read-write` on a library

Re-granting the same pair updates the role in place rather than erroring. Revoking takes
effect immediately.

> **Engram groups and Synapse groups are different systems** and are managed separately.
> Membership of one grants nothing in the other.

## Related

- [What Engram is](/engram) — the positioning and the bring-your-own-Postgres model
- [Connections and credentials](/connections) — reaching Engram through a Synapse hub
- [Troubleshooting](/troubleshooting)
