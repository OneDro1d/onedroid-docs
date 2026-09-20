---
title: Tools, features and the audit trail
nav: Tools & governance
description: See every tool your hub exposes, turn one off for everyone, set hub features, and read the log of what happened.
section: Start here
order: 7
---

Once a hub has connections, it exposes their tools to your agents. The rest of the **Connect**
and **Admin** nav is about seeing that surface, narrowing it, and reviewing what was done
with it.

## Tools — what your hub actually exposes

**Connect → Tools** lists every tool available on the hub, grouped by the service it comes
from, with a count per service and a running total. It is the authoritative answer to *what
can my agent call here* — search it by name, description or namespace. The page shows a
total tool count, one chip per service, a search box, and the list of tools, each tagged
with its source.

The list includes **built-in** tools (the baseline `synapse__*`, `router_*`, `engram_*`
and first-party Atlassian / Google tools that every hub has) plus one block per connected
upstream. **Refresh all** re-fetches the list from the upstreams — use it after mounting a
new connection, since a client only sees a hub's tools as of the moment it connected.

> A caller never sees more than they could call. The list is filtered by role: a
> non-member of the hub sees only the baseline self-service tools, a member sees everything
> except admin-only tools, and admin-only tools show only to admins. So two people on the
> same hub can see different-length lists, and that is correct.

## Tool Toggles — turn one tool off for everyone

**Admin → Tool Toggles** disables a specific tool across the whole hub. Every tool is enabled
by default; this page holds only the explicit overrides. Disable one by its canonical name
(for example `gmail_send_email`) and it is gone for every member until you re-enable it.

![The Disable a Tool dialog: a single field for the tool's canonical name and the note that this disables it for every member of the hub](/img/tools-and-governance/disable-tool.png)

Use it to keep a destructive or irrelevant tool out of reach on a hub without removing the
whole connection it belongs to.

> **This is a blunt, hub-wide switch.** For *per-person* differences in what tools are
> reachable, use roles and groups ([Members, groups & sharing](/hub-administration)) rather
> than toggles — a toggle is all-or-nothing for the hub.

## Compact tool list

Also worth knowing, and set under **Features** below: **Compact tool list**. With it on, an
agent sees **one dispatcher tool per connection** instead of every individual tool — it
calls the dispatcher with `describe` to discover the connection's operations, then invokes
one. It is off by default. It changes how many tools an agent *sees*, never what it can
ultimately *do* — the same operations are reachable either way. Turn it on for a hub with
many connections where the raw tool count would otherwise overwhelm a client.

## Features

**Admin → Features** carries the hub's security and behaviour switches. Several are **locked
on** by a platform-wide policy and cannot be turned off for an individual hub — the page says
which, and why, on each row.

![The Features page: toggles for PHI detection, credential encryption, audit trail, compliance logging, rate limiting and more, with several marked locked-on by a platform override](/img/tools-and-governance/features.png)

What you will see, and which are typically forced on:

| Feature | Notes |
|---|---|
| **PHI Detection & Redaction** | scan tool input/output for PII/PHI; often **locked on** platform-wide |
| **Credential Encryption** | AES-256-GCM for stored credentials — **always on**, cannot be disabled |
| **Blockchain Audit Trail** | a cryptographic hash chain over operations; often **locked on** |
| **Compliance Logging** | long-term retention; often **locked on** |
| **Activity Logging** | records tool-call activity to this hub's log (fail-open); often **locked on** |
| **Rate Limiting** | per-user, per-tool throttling |
| **IP Allowlist** | restrict tool access to specific CIDRs |
| **Message Bus / Event Log Encryption** | encrypt AMQP payloads / audit payloads at rest |

A row marked *locked on by a platform-wide override* is set by a platform operator across
every hub; a hub admin cannot change it. The **Platform-wide Overrides** block at the bottom
is where an operator sets those, and it is visible to admins but only a real platform
operator (not merely a hub owner) can write it.

## Activity Logs and Reporting

**Admin → Activity Logs** is the live event stream for the hub: hub created, member invited,
role changed, connection enabled, token created, feature toggled, and every tool call. Filter
by event type; each row names the time, the actor, the target and the details.

![The Activity Logs page: a filter bar and a table of events with time, event, actor, target and details columns](/img/tools-and-governance/activity-logs.png)

**Admin → Reporting** is the same underlying record, organised for review and export:
**Activity**, **Compliance**, **Blockchain** and **Governance** tabs, each filterable, with
**Export CSV**. A brand-new hub shows "no records yet" until activity happens.

![The Reporting page: Activity, Compliance, Blockchain and Governance tabs with an Export CSV control](/img/tools-and-governance/reporting.png)

> Every call made through a token or an OAuth connection is attributed to the **person**, not
> to an anonymous agent — an agent acting on your behalf appears in these logs as you acting
> through an agent. That is the point of routing tools through a governed hub, and it is what
> makes these logs worth reading in a review.

## Related

- [Members, groups & sharing](/hub-administration) — who can reach the tools in the first place
- [Connections and credentials](/connections) — where the tools come from
- [The MCP tools your hub exposes](/mcp-tools) — the baseline tools, and doing this over MCP
