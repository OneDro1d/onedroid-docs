---
title: Troubleshooting
nav: Troubleshooting
description: The failures people actually hit, and the one probe that tells them apart.
section: Reference
order: 12
---

Before anything else, run the curl probe from [the quickstart](/quickstart#4-prove-it-works-before-wiring-anything-else).
It separates *the token is wrong* from *the client is not sending the header*, and those two
look identical from inside an agent.

## `401 missing_token`

The header is not being sent. Check with `claude mcp get <name>` and look for the `Headers`
block.

## `401 invalid_token`

Typo, or the token was rotated or revoked. **Reveal** it from the tokens page and compare,
or rotate and reconfigure.

## `ERR_SCOPE_UNAVAILABLE`

You are calling `/hub/<slug>/mcp` with a slug that does not match the token's hub. Switch to
`/agent/mcp`, which resolves the hub from the token and needs no slug.

## `403` on a token that used to work

The hub is resolved from your current memberships every time. If you have left the hub, or
your role was removed, the token stops resolving — by design. Nothing to re-issue: get
access back and the same token works again.

## `✗ Failed to connect`

Run the curl probe first. If curl returns 200 but Claude Code does not, it is a header
mismatch in the client config, not the token.

## A tool says "workspace not found"

Auth is fine — the hub has not connected that upstream yet. Add it under **Connect →
Connections**. Authentication and upstream connections are separate things.

## "You haven't connected your credentials for 'X'"

Your token is good and the hub is healthy. What is missing is **your** credential for that
one connection.

```
You haven't connected your credentials for 'engram'. Please add your token via the
My Connections tab.
```

> **"My Connections" is a stale name in that message** — the tab no longer exists. Go to
> **Connect → Connections** and use **My credential** on that row.

Check the name inside the quotes before anything else. If it is not the row you
credentialed, you have two aliases of the same service and connected the other one — see
[Connections and credentials](/connections#why-there-are-several-copies-of-the-same-service).

## A status says `connected: true` but the call still fails

Both are right; they are about different things. `connected` from
`router_list_upstreams` describes the **gateway's** transport. `connected` from
`synapse__list_connections_catalogue` describes **your** credential.

Branch on `ready`, or on `auth_status`, never on a bare `connected`. And for connections
that authenticate per user, `router_list_upstreams` reporting `connected: false` is normal
rather than an outage —
[the full explanation](/connections#the-field-called-connected-means-two-different-things).

## The connections count stays at zero

A fresh hub has none until somebody adds them, and adding one is an admin gesture — on a hub
you created, that is you. Enabling a connection is only half of it; you then supply your own
credential. See [Connections and credentials](/connections).

## Clicking **Connect** does nothing at all

Three different causes, and the fix depends which kind of connection it is:

- **Token connections** (Engram, Supabase, most third-party servers) never open a popup. A
  *Paste API token* field appears in the row itself. That is the whole flow.
- **OAuth connections** (Slack, Monday, Notion, Miro, GitHub, Betterstack) open a popup — so
  a blocked popup looks exactly like a dead button. Allow popups for `synapse.onedroid.ai`.
- **Google** stays disabled until the hub has a Google OAuth app. On
  `synapse.onedroid.ai` there is no platform-wide one, so save your own under **Use your own
  Google app** first.

Full walkthrough per kind: [Connections and credentials](/connections).

## Several copies of the same service in the list

Not a bug. Each row is a named **alias** in front of a shared catalogue definition, so one
service can appear many times with different names and separate credentials. Connecting
`engram` does not connect `engram-prod`. See
[Connections and credentials](/connections#why-there-are-several-copies-of-the-same-service).

## Onboarding: "OneDroid Managed" → **Next** flashes and comes back

The button briefly reads *Connecting…*, then returns to **Next** and the screen never
advances. This is an **expired sign-in session**, not a database problem — the request is
being rejected before it reaches the database step at all.

The screen now tells you so and offers **Sign in again**. Take it, and start the flow over.

> ⚠️ If signing in again lands you in the same place, you have hit a known open issue rather
> than a mistake of your own. It shows up when the account was created with one sign-in
> method and is being used with another — the [Clerk split-account
> problem](#signed-in-but-the-hub-is-missing-or-wrong) — and re-authenticating does not
> clear it. Email <michal@onedroid.ai> rather than retrying; we want the report.

## Signed in, but the hub is missing or wrong

Almost always a second account. Sign-in is handled by Clerk, and Google and Microsoft
sign-ins with the *same email address* are still different accounts. Sign out and back in
with the method you originally used.

## 404 deep-linking to a settings page

The dashboard uses hash-based routing, so a settings URL pasted into a fresh tab will not
resolve. Start at the root and navigate from the sidebar.

## Still stuck

Email <michal@onedroid.ai>. You will reach the person who wrote the code, and we reply
within one business day. If the problem is this page rather than the product,
[open an issue](https://github.com/OneDro1d/onedroid-docs/issues) — the docs are the repo.
