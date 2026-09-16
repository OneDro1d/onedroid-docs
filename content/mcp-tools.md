---
title: The MCP tools your hub exposes
nav: MCP tool reference
description: The baseline tools every hub has — discovery, credentials, memory, admin — with what each returns and who may call it.
section: Reference
order: 13
---

The moment an agent connects to a hub it has a set of **baseline tools**, regardless of
which upstreams are mounted. Everything else — Jira, Slack, Supabase, and so on — arrives
from the connections an admin has added. This page documents the baseline set: what each
tool is for, who may call it, and what it returns. The shapes below are from live calls
against a running hub; example values are illustrative, not any real hub's inventory.

> **Every tool call carries your identity.** A tool runs as the user whose token or OAuth
> session made the call, with that user's role and audit trail. Nothing here is a service
> account. A tool visible in your list is not necessarily one you may invoke — the list is
> filtered by role, and admin-only tools return a permission error for non-admins rather than
> being hidden in every context.

## Discovery

### `start_here`

Call it once at the start of a session. It returns the hub's bootstrap document — how this
hub is set up, the baseline tools, and how to discover the rest. No arguments.

```json
{
  "hub": { "name": "your-hub-abc123", "display_name": "Your Hub", "my_role": "owner" },
  "source": "engram",
  "text": "# Synapse: Start Here\n..."
}
```

`my_role` is your resolved role on this hub; `source` is `engram` when an operator has
customised the document, `default` for the compiled-in copy.

### `synapse__list_hub_connections`

The list an agent should consult **before planning work**: the connections mounted on this
hub, each with your own authentication state. No arguments.

```json
[
  {
    "namespace": "engram",
    "display_name": "Engram",
    "auth_type": "token",
    "tool_count": 45,
    "mounted": true,
    "mount_enabled": true,
    "ready": true,
    "auth_status": "ready"
  },
  {
    "namespace": "slack",
    "auth_type": "oauth_discovery",
    "mounted": true,
    "mount_enabled": true,
    "ready": false,
    "auth_status": "needs_credential"
  }
]
```

**Branch on `ready`, or on `auth_status` — never on a bare `connected`.** `ready: true` means
mounted, enabled, credentialed, and the transport is up, i.e. its tools are callable right
now. The six `auth_status` values, and who resolves each:

| `auth_status` | Meaning | Who fixes it |
|---|---|---|
| `ready` | everything passes — the only value with `ready: true` | — |
| `mount_disabled` | the hub has the connection but it is switched off | an admin |
| `needs_credential` | switched on, but *you* have not supplied a credential | you |
| `upstream_unreachable` | your credential is stored, but the upstream is not answering | wait, or report |
| `not_configured` | the platform has no app for this service | the deployment |
| `unknown` | the credential lookup itself failed — **not** a synonym for "disconnected" | try the tools |

### `synapse__list_connections_catalogue`

The org **catalogue** — everything that *could* be mounted on a hub, whether or not this hub
uses it. Same row shape as above, plus `mounted` telling you whether it is bound to the
current hub. Use it to decide what to add; use `list_hub_connections` for what is usable now.

### `router_list_tools`, `router_search_tools` *(admin)*

`router_list_tools` is a progressive catalogue of upstream tools: no arguments returns the
namespace list with tool counts; a `namespace` returns its tools; a `namespace` plus `tool`
returns one tool's full schema. `router_search_tools` finds a tool by keyword across every
upstream when you know what it should do but not which connection provides it. Both are
admin-only.

```json
{ "namespaces": [ { "namespace": "engram", "tool_count": 45, "connected": true } ] }
```

## Credentials

These let an agent bootstrap a hub over MCP without the web UI. **Credential *values* are
UI-only by design** — you cannot read a stored token back through a tool — but everything
else about a credential is here.

| Tool | Role | What it does |
|---|---|---|
| `synapse__save_credential` | you | save your API/bearer token for an upstream |
| `synapse__verify_connection` | you | check your stored credential still works *now* |
| `synapse__remove_credential` | you | disconnect your own credential |
| `synapse__add_connection` | admin | mount a new upstream on the hub |
| `synapse__edit_connection` | admin | change a mounted connection |
| `synapse__remove_connection` | admin | unmount a connection |
| `synapse__toggle_connection` | admin | switch a connection on or off for the hub |
| `synapse__import_api` | admin | import an OpenAPI spec as a hub connection |

`verify_connection` is the one worth reaching for: it proves the credential works at call
time, rather than that it was accepted once. A newly mounted connection takes effect on your
**next** connection, so reconnect after an admin adds one.

## Memory — Engram

Engram is versioned agent memory. Three baseline tools reach it through the hub, so it is
governed and audited alongside everything else:

- **`engram_search`** — fans out across every Engram group you can reach and returns hits
  tagged by group. Hybrid vector + keyword match.
- **`engram_read`** — read one object by id from a specific `group`.
- **`engram_write`** — write an object into a specific `group`.

```json
{
  "results": [
    { "document_title": "…", "document_id": "…", "score": 0.51, "namespace_name": "…" }
  ],
  "total_results": 1
}
```

The Engram dispatchers forward their arguments verbatim to the upstream, so use the
parameter names that upstream advertises (for example `object_id` on legacy Engram,
`document_id` on newer). Engram has its own detailed pages: [What Engram is](/engram) and
[Using Engram](/engram-usage). It is also reachable directly at
`https://engram.onedroid.ai/mcp` — going through the hub is what gets it governed.

## Administration

Hub administration has a full MCP surface, so an agent can run it without the web UI. All are
admin-only except where noted, and each returns a permission error (not a silent empty
result) when the caller lacks the role.

| Tool | Does |
|---|---|
| `synapse__invite_member` | invite a user to a group on this hub |
| `synapse_add_group_member` / `synapse_remove_group_member` | manage group membership |
| `synapse_create_group` / `synapse_delete_group` | manage groups |
| `synapse_grant_hub` / `synapse_revoke_hub_grant` | grant or revoke a group's role on the hub |
| `synapse_toggle_tool` | enable or disable a tool hub-wide |
| `synapse_transfer_hub_ownership` | hand the hub to another owner |
| `synapse_list_groups`, `synapse_list_hub_grants`, `synapse_list_tool_toggles` | read (reader) |
| `router_call_tool` | *admin* — audited passthrough to any upstream tool |

The web-UI equivalents of these are in [Members, groups & sharing](/hub-administration) and
[Tools and governance](/tools-and-governance).

## When a call is refused

- **`You haven't connected your credentials for '<name>'`** — the hub is healthy and your
  token is good; what is missing is *your* credential for that one connection. Check the name
  in the quotes: if it is an alias you did not expect, you credentialed a different row. Go to
  **Connect → Connections** and use **My credential** on that row. (The message still says
  "My Connections tab"; that name is stale.)
- **A permission error on an admin tool** — expected for a non-admin; the tool is visible but
  gated at invocation. Not an outage.
- **An empty result where you expected data** — check `auth_status` on the connection first;
  `unknown` means the check failed, not that you are disconnected.

## Related

- [Connections and credentials](/connections) — the UI side of credentialing
- [Endpoints and authentication](/endpoints) — how your client reaches the hub
- [Troubleshooting](/troubleshooting) — the failures, and the one probe that tells them apart
