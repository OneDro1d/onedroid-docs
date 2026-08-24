---
title: Troubleshooting
nav: Troubleshooting
description: The failures people actually hit, and the one probe that tells them apart.
section: Reference
order: 6
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

## The connections count stays at zero

Expected on a fresh hub. Upstream services are enabled under **Connect → Connections**, and
only an admin can enable them — so the question is which hub this is.

**If you created the hub, you administer it** and this is simply the next step of your own
setup — there is nobody to ask. **If you were invited into someone else's hub**, it is not
yours to fix: the token is fine, the hub has no upstreams, and the owner has to enable them.

Once a connection is enabled, each member supplies their own token or OAuth login for it.

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
