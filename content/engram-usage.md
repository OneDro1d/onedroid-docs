---
title: Using Engram
nav: Using Engram
description: Connect an MCP client, write your first object, search it back, read the results correctly, and share with a team.
section: Engram
order: 21
---

[What Engram is](/engram) covers why it exists. This page takes you from nothing to a working
connection, a first write and a search you can trust. Every call and response on it was run
against the live service on 2026-09-15.

Prefer a browser? [The Engram web app](/engram-web-app) does most of this by hand. Every tool and
its arguments are in the [tool reference](/engram-tools).

## The shape of things

Four levels, and the two you name day to day are the middle ones.

```
Library      a top-level container. You own it, and you share it
  Namespace  a subject area inside a library — the thing you write into
    Object   a document: title + content, plus a freeform kind
      Chunk  what search actually matches on. Engram makes these for you
```

An **object** carries a `kind` — a freeform label you choose, defaulting to `document`.
`note`, `session`, `decision`, `config` are all fine. It is a description, not an enum, and
nothing validates it against a list.

> **The parameter is called `collection`, and it takes a namespace.** It is a historical name
> for the namespace argument, and accepts the namespace's name or its UUID.

**Access groups are a separate tree.** Libraries hold content; access groups hold people; a
*grant* connects a group to a library with `read` or `read-write`.

## Connect

### 1. Get a token

Sign in at **https://engram.onedroid.ai**, open **API Tokens**, and create a **library token**
([how, with screenshots](/engram-web-app#api-tokens)). Tokens look like `engram_` followed by 32
hex characters.

| | Reaches | Use it for |
|---|---|---|
| **Library token** | one library, nothing else | anything shared: a teammate, a CI pipeline, an agent you want bounded |
| **Full-access token** | every library you own — *"equivalent to being logged in"* | your own single client, when it really needs everything |

Reach for the library token by default. We checked what one actually sees: `engram_list_libraries`
returns only its own library, `engram_list_namespaces` only that library's namespaces, and a
namespace in any other library answers `collection "…" not found`.

### 2. Point your client at the endpoint

```
https://engram.onedroid.ai/mcp
```

Any MCP client that speaks streamable HTTP and can send a header will do. Send the token as:

```
Authorization: Bearer engram_YOUR_TOKEN
```

You can check a token without a client:

```bash
curl -si https://engram.onedroid.ai/mcp \
  -H "Authorization: Bearer engram_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",
       "params":{"protocolVersion":"2025-06-18","capabilities":{},
                 "clientInfo":{"name":"probe","version":"1.0"}}}'
```

A good token gets **HTTP 200**, a `Mcp-Session-Id` response header, and a result naming the
server `engram`. Send that header back on every later request in the session. After
`notifications/initialized`, `tools/list` returns 45 tools.

**No token, a wrong one or a revoked one** gets **HTTP 401**, a plain-text body `Unauthorized`,
and `WWW-Authenticate: Bearer realm="engram"`. It is not JSON, so a client that tries to parse it
reports a parse error — that means unauthorised, not broken. A revoked token is refused on its
very next request.

Two alternatives, both working:

- **Token in the URL:** `https://engram.onedroid.ai/mcp?token=engram_…`, for clients that cannot
  set headers. URLs end up in logs and history; use the header when you can.
- **Legacy SSE:** `https://engram.onedroid.ai/mcp/sse`, for clients without streamable HTTP.

### Through a Synapse hub

Reach Engram through a [Synapse hub](/connections) and its calls are governed and audited with
the rest of your tools. The hub we created for these docs came with the **Engram** connection
already switched on for the hub — each person still adds their own token:

![A hub's Connections page: the Engram connection is switched on for the hub, and the credential row asks for an API token](/img/engram-usage/hub-engram-connection.png)

Paste a library token into **Paste API token…** and choose **Paste token**.

If the token is wrong or revoked, the row looks like this:

![The Engram connection after a wrong token: SERVER UNREACHABLE, with the error upstream returned HTTP 401 underneath](/img/engram-usage/hub-engram-401.png)

Read the red line, not the badge: **`upstream returned HTTP 401`** means Engram rejected the
token. The server is reachable. Mint a fresh token, paste it, and **Reconnect**.

## Your first write

Namespaces live inside a library, so you need a library first:

```
engram_create_library     name: "Acme Research"
engram_create_namespace   name: "product-decisions"
```

> **`engram_create_namespace` takes no library argument.** It puts the namespace in a library
> you own — and not necessarily the one you just made: ours went into the account's original
> *Personal* library. Check with `engram_list_libraries`, then move it:
>
> ```
> engram_move_namespace   namespace_id:      "<the namespace's UUID>"
>                         target_library_id: "<the library's UUID>"
> ```
>
> Use the namespace's **UUID** from `engram_create_namespace`'s response. A name fails with
> `invalid input syntax for type uuid`.
>
> With no library of your own at all, `engram_create_namespace` fails with
> `no library found — create a library first (use engram_create_library) or complete onboarding`.

Now write:

| Parameter | Required | Notes |
|---|---|---|
| `collection` | yes | namespace name or UUID |
| `title` | yes | ≤ 500 characters |
| `content` | yes | ≤ 500,000 characters. Markdown preferred |
| `kind` | no | defaults to `document` |

```
engram_write
  collection: "product-decisions"
  title:      "Why we chose Postgres over MongoDB"
  content:    "## Decision\n\nWe store product events in Postgres ..."
  kind:       "decision"
```

The response tells you what happened:

```json
{
  "id": "535a7c35-…",
  "commit_sha": "cfeef59a…",
  "chunk_count": 3,
  "embedded_count": 3,
  "title": "Why we chose Postgres over MongoDB"
}
```

`embedded_count` equal to `chunk_count` means every chunk is searchable by meaning. It is
searchable straight away — no provider to configure first. Our test library had no embedding
credential of its own and still returned meaning-based matches, because libraries without one use
the platform's managed embedding. To use your own provider, see
[Embedding and credentials](/engram-web-app#embedding-and-credentials).

> **Content sent through a tool call travels through your model provider.** For sensitive
> material, add it in the [web app](/engram-web-app#adding-an-object) instead — that path never
> touches a model.

## Changing an object — and getting it back

`engram_write` always makes a **new** object. To change one, update it:

```
engram_update   object_id: "535a7c35-…"   content: "<the whole new content>"
```

Each update is a new version. **An update whose content is unchanged returns `noop: true` and
records nothing**, so it is safe to call blindly.

The history, newest first:

```
engram_history   object_id: "535a7c35-…"

restore: Why we chose Postgres over MongoDB to cfeef59    a332094…
update: Why we chose Postgres over MongoDB               0204181…
add: Why we chose Postgres over MongoDB                  cfeef59…
```

`engram_diff` shows what changed between two of those commits, as a unified diff.
`engram_restore` brings an old version back **as a new version** — the top line above — so
restoring never destroys the version you restored over.

## Searching it back

Only `query` is required. Leave out `collection` to search everything you can reach.

| Parameter | Default | Notes |
|---|---|---|
| `query` | — | required, ≤ 2000 characters |
| `collection` | all namespaces | narrow to one |
| `limit` | 10 | maximum 50 |
| `vector_weight` | 0.7 | 1.0 = meaning only, 0.0 = keywords only |
| `min_score` | 0.35 | raise it to cut weak matches |

Search is **hybrid**: semantic similarity and keyword matching together, blended 70/30 by
default. A real result for *"which database did we pick for events and why"*:

```json
{
  "document_title": "Database backup runbook",
  "heading": "Restore",
  "content": "1. Pick the dump for the date you need. …",
  "score": 0.688,
  "vector_score": 0.556,
  "bm25_score": 0.299,
  "kind": "note",
  "namespace_name": "docs-test-notes"
}
```

How to read it:

- **Results are chunks, not objects.** `heading` says which section matched, and one object can
  appear several times — our decision object came back three times, once per section.
- **`score`** is the blend used for ranking. **`vector_score`** is how close the meaning is.
  **`bm25_score`** is the keyword match, already weighted.
- **`bm25_score: 0`** with a healthy `vector_score`: the meaning matched and the words did not.
  Normal, and often what you wanted.
- **`vector_score: 0`** on a result: only the keyword engine found that chunk.
- **`min_score` is judged fairly across both engines.** A chunk is compared against the most it
  could have scored from the engines that actually found it. So a meaning-only match is kept when
  its `vector_score` reaches `min_score` — which is why results with a `score` below 0.35 can
  still appear.

### Two results that look like answers and are not

**An empty result is not an error.** A valid namespace with nothing matching returns
`{"results": [], "total_results": 0}`, and so does a namespace that is genuinely empty. If a query
that used to match suddenly returns nothing, treat it as a **liveness question** — check the
namespace still has objects before concluding the knowledge is gone.

**Search can silently fall back to keywords only.** If the query cannot be embedded, Engram
drops the meaning engine and runs keywords alone. You get results and no warning. The tell is
**every** result showing `vector_score: 0`; the cause is usually transient.

A **wrong namespace name does error** — `collection "…" not found` — so a typo fails loudly
rather than returning nothing.

## Links between objects

Objects can be connected, and search can follow the connections.

```
engram_link   from_id: "<runbook>"   to_id: "<decision>"   relation: "REFERENCES"
```

- `engram_neighbors` lists what one object is directly linked to; `engram_traverse` walks further.
- `engram_search_graph` searches, then pulls in objects linked to the best hits. Asked *"how do I
  restore a backup"*, it returned the runbook from search **and** the Postgres decision it links
  to, marked `"source": "graph"`.
- Engram also links similar objects **by itself**, as `auto_similar`. You did not make those
  links, and they are expected.

## Sharing with a team

Sharing goes through access groups, not by adding people to libraries one at a time:

1. `engram_create_access_group` — you become its first owner.
2. `engram_add_access_group_member` — by **email**. Addresses are lowercased and trimmed for
   matching, so `" Teammate@Example.com "` and `teammate@example.com` are the same person.
3. `engram_grant_library` — give the group `read` or `read-write` on a library.

Check it with `engram_list_library_grants`. Granting the same pair again changes the role in
place. `engram_revoke_library_grant` takes effect on the members' next request.

> **Engram access groups and Synapse groups are different systems.** Membership of one grants
> nothing in the other.

The same steps in the web app: [Sharing](/engram-web-app#sharing).

## Known issues

Found while writing this page on 2026-09-15. Each has a workaround; each note goes when its fix
ships.

- **Some namespaces cannot be found by name.** In a library created with `engram_create_library`,
  a namespace can be missing from `engram_list_namespaces`, answer `collection "…" not found` when
  named, and fail `engram_list` even by UUID. **Workaround:** pass its UUID to search, read and
  write, and use the web app to browse it.
- **`engram_move_namespace` needs the namespace's UUID**, although its argument says "name or ID".
- **After moving a namespace, library tokens miss what was written before the move.** Content
  written or updated after the move is found normally. **Workaround:** re-save the objects you
  need with `engram_update` — an object we updated after the move was found again.
- **`engram_global_search` returns nothing through a library token.** Use `engram_search` with
  `collection`.
- **`engram_revoke_token` refers to `engram_list_tokens`, which does not exist.** Keep the `id`
  from `engram_create_token`, or find it on the API Tokens page.
- **`engram_add_access_group_owner` accepts a user id that does not exist.** A mistyped owner still
  counts as one, so removing the real owner afterwards can leave a group nobody can manage.
  Double-check the id, and never remove yourself until the new owner has confirmed they can manage
  the group.
- **The GitHub Sync page lists no namespaces.** See [GitHub Sync](/engram-web-app#github-sync).

## Related

- [The Engram web app](/engram-web-app) — every screen
- [Engram tool reference](/engram-tools) — all 45 tools
- [What Engram is](/engram) — why it exists, and bringing your own Postgres
- [Connections and credentials](/connections) — reaching Engram through a Synapse hub
- [Troubleshooting](/troubleshooting)
