---
title: Engram tool reference
nav: Tool reference
description: All 45 engram_* MCP tools, grouped by what they act on, with their arguments and the behaviour you only learn by calling them.
section: Engram
order: 23
---

Every tool below was listed by a live `tools/list` against `https://engram.onedroid.ai/mcp` on
2026-09-15 — **45 tools** — and, unless it says otherwise, called on that date. Where a tool's
behaviour surprised us, the surprise is written next to it.

New to Engram? Start with [Using Engram](/engram-usage); this page is for looking things up.

## Conventions that apply to every tool

- **`collection` means namespace.** It is the historical name of the namespace argument and
  takes a namespace's name or its UUID.
- **Object and library ids are UUIDs.** `engram_read` with a title fails with
  `document_id must be a valid UUID`.
- **`workspace_id` is deprecated** on every tool that still lists it. Your identity comes from
  your token; leave it out.
- **Errors come back as a tool error with a short message** (`collection not found`,
  `access denied: no role on library`), not as an HTTP error. HTTP errors mean the request never
  reached a tool — see [Connect](/engram-usage#connect).
- **"Owner-only"** means the caller must own the library, or the access group, named in the call.

## Libraries

| Tool | Required | What it does, and what to know |
|---|---|---|
| `engram_create_library` | `name` | Creates a library; you are its owner. Optional `description`. New libraries start with on-chain audit **on**. |
| `engram_list_libraries` | — | Libraries you belong to, with your `role` and a `namespace_count`. |
| `engram_list_my_libraries` | — | Every library you have **any** role on — owned or shared with you — with the `effective_role` for each. |
| `engram_my_role_on_library` | `library_id` | Your effective role on one library: `owner`, `read-write`, `read`, or an empty string for none. Ownership wins; otherwise the highest role across your access groups. |
| `engram_delete_library` | `library_id` | Fails while the library still contains namespaces — move or delete them first. On a library we had no role on it failed with `access denied: no role on library`. |
| `engram_transfer_library_ownership` | `library_id`, `new_owner_email`, `confirm: true` | Owner-only. You become `read-write`. The new owner must have signed in to OneDroid at least once, or it fails with `new owner has not signed in yet`. |
| `engram_toggle_library_audit` | `library_id` | Owner-only. `policy`: `off`, `on`, or `forced_on` — on and locked, so it can no longer be relaxed. Setting the current value returns `noop: true`. The toggle is always audited, whatever you set. |

## Namespaces

| Tool | Required | What it does, and what to know |
|---|---|---|
| `engram_create_namespace` | `name` | **Takes no library argument.** The namespace goes into a library you own — ours landed in the account's original *Personal* library, not the one we had just created. Check with `engram_list_libraries`, then move it. Names: letters, numbers, dots, hyphens, underscores. |
| `engram_list_namespaces` | — | Namespaces you can reach, with object and chunk counts and their library's name. See [Known issues](/engram-usage#known-issues): some libraries' namespaces are missing from this list. |
| `engram_list` | `collection` | One namespace's counts and its objects (id, title, kind, format, source, dates). Pages with `limit` (default 100, max 500) and `offset`. A wrong name returns `collection not found`. |
| `engram_move_namespace` | `namespace_id`, `target_library_id` | You must own the target library or be an editor of it. **Pass the namespace's UUID:** a name fails with `invalid input syntax for type uuid`, even though the argument says "name or ID". Returns `{"status": "moved"}`. |
| `engram_delete_namespace` | `collection` | Deletes the namespace and everything in it. No undo through the tools. |
| `engram_reembed` | `collection` | Embeds chunks that have no embedding, 500 at a time, up to 100,000 per call; it stops early if a page makes no progress. It does not redo chunks that already have one. Returns counts, e.g. `{"embedded": 0, "failed": 0, "status": "ok"}` when nothing was missing. |

## Objects

| Tool | Required | What it does, and what to know |
|---|---|---|
| `engram_write` | `collection`, `title`, `content` | Adds a **new** object — calling it twice makes two. Optional `kind` (default `document`). Returns the new `id`, a `commit_sha`, and `chunk_count` / `embedded_count`. Content travels through your model provider; for sensitive material use the [web app](/engram-web-app#adding-an-object). |
| `engram_read` | `document_id` | One object by UUID: content, kind, format, `content_hash`, author and dates. |
| `engram_update` | `object_id`, `content` | Replaces an existing object's content, and optionally `title` or `kind`, recording a new version. **Returns `noop: true` and changes nothing when nothing changed.** One exception: if the object has no history yet, its current content is first saved as a `baseline:` version, and the response carries `baseline_commit_sha`. |
| `engram_delete` | `object_id` | Deletes the object, its chunks, embeddings and stored file. Returns `{"deleted": true}`. |
| `engram_history` | `object_id` | Every version, newest first: `commit_sha`, author, message (`add: …`, `update: …`, `restore: … to <sha>`, or `baseline: …`), timestamp. |
| `engram_diff` | `object_id`, `from_sha`, `to_sha` | A unified diff between two versions from `engram_history`. |
| `engram_restore` | `object_id`, `commit_sha` | Brings back an earlier version **as a new version** — history keeps everything, including the version you restored over. Returns `new_commit_sha`. |
| `engram_register_link` | `collection`, `url` | Fetches an `https://` page into the namespace and re-fetches it every `fetch_interval_seconds` (default 3600, minimum 300). `http://` fails with `ssrf: scheme must be https: got "http"`. **No tool removes a link** — delete it in the [web app](/engram-web-app#external-links). |

## Search

| Tool | Required | What it does, and what to know |
|---|---|---|
| `engram_search` | `query` | Hybrid search — meaning and keywords together. Optional `collection`, `limit` (default 10, max 50), `vector_weight` (default 0.7), `min_score` (default 0.35). Results are **chunks**, so one object can appear several times. How to read the scores: [Searching it back](/engram-usage#searching-it-back). |
| `engram_search_graph` | `query` | `engram_search`, then follows graph links from the top hits (`anchor_count`, default 5) to pull in connected objects. Each result says whether it came from `search` or `graph`, with `search_score`, `graph_score` and `merged_score`. |
| `engram_global_search` | `query` | A **text match** — the whole query as one phrase, any letter case — on titles and content across every library you can reach. Not semantic. Optional `library_filter`, `namespace_filter`, `limit` (default 20, max 100). The web app's search box uses the same match. |

## Graph

| Tool | Required | What it does, and what to know |
|---|---|---|
| `engram_link` | `from_id`, `to_id`, `relation` | A typed, directed link between two objects. `relation` is yours to name: letters, numbers, underscores (`REFERENCES`, `depends_on`). Optional `weight` (default 1.0). |
| `engram_unlink` | `from_id`, `to_id`, `relation` | Removes one link. |
| `engram_neighbors` | `object_id` | The objects linked directly to this one, with each relationship. |
| `engram_traverse` | `start_id` | Paths outward to `max_depth` (default 2, max 5), optionally only one `relation`. Paths can loop back through the start object — de-duplicate by `object_id` using the top-level `nodes` list. |

> **Engram links similar objects on its own.** Beside the links you make, you will see
> relationships with `relation: "auto_similar"` and `created_by: "system:auto_link"` — in our
> test, between a runbook and the decision it mentioned, at weight 0.81.

## Access groups and sharing

Access groups are sets of people by email. A **grant** gives a group `read` or `read-write` on a
library. The walk-through is in [Using Engram](/engram-usage#sharing-with-a-team).

| Tool | Required | What it does, and what to know |
|---|---|---|
| `engram_create_access_group` | `name` | You become its first owner. Optional `description`. |
| `engram_list_access_groups` | — | Groups you own or belong to. |
| `engram_get_access_group` | `group_id` | One group with its members and owners. You must be one of them, or it reads as `access group not found or not visible`. |
| `engram_update_access_group` | `group_id` | Owner-only. New `name` and/or `description`. |
| `engram_delete_access_group` | `group_id` | Owner-only. Removes the group, its members and owners, and every grant it held. |
| `engram_add_access_group_member` | `group_id`, `email` | Owner-only. The address is lowercased and trimmed; the original spelling is kept for display. |
| `engram_remove_access_group_member` | `group_id`, `email` | Owner-only. The same normalisation applies, so the spelling does not have to match. |
| `engram_add_access_group_owner` | `group_id`, `user_id` | Owner-only. ⚠️ **Takes an account user id (`user_…`), and does not check that it exists** — see [Known issues](/engram-usage#known-issues). |
| `engram_remove_access_group_owner` | `group_id`, `user_id` | Owner-only. Its description says it will not remove the last owner — but a mistyped owner still counts as one, so it will happily remove you. |
| `engram_grant_library` | `library_id`, `group_id`, `role` | Library-owner-only. `role` is `read` or `read-write`. Granting an existing pair again changes the role in place. |
| `engram_revoke_library_grant` | `library_id`, `group_id` | Library-owner-only. Takes effect on the group members' next request. |
| `engram_list_library_grants` | `library_id` | Every group with a grant on the library, with role, member count, and who granted it when. Needs at least `read` on the library. |

## Tokens

| Tool | Required | What it does, and what to know |
|---|---|---|
| `engram_create_token` | `name` | `scope: "group"` (the default) binds the token to one library and **requires `library_id`**; `scope: "admin"` reaches every library you own. `expires_in_days` 1–90, default 30. `never_expires: true` is library-owner-only and limited to five in 24 hours. **The token is in the response once** — keep the `id` too, you need it to revoke. |
| `engram_revoke_token` | `token_id` | Revokes one of your tokens; it is refused on its next request. Its description points at `engram_list_tokens`, which **does not exist** — take the id from `engram_create_token`'s response, or from the API Tokens page. |

## Deprecated names

Kept so older clients keep working. Prefer the library names.

| Tool | Use instead |
|---|---|
| `engram_create_group` | `engram_create_library` — it creates a **library**, not an access group |
| `engram_list_groups` | `engram_list_libraries` |
| `engram_delete_group` | `engram_delete_library` |

## Related

- [Using Engram](/engram-usage) — connecting, searching, sharing, known issues
- [The Engram web app](/engram-web-app)
- [What Engram is](/engram)
