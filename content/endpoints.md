---
title: Endpoints and authentication
nav: Endpoints and auth
description: Two ways in — a personal access token, or browser OAuth — and they are not interchangeable.
section: Reference
order: 10
---

Synapse has two authentication avenues, and which one you use determines which URL you use.
Getting this backwards is the most common wiring mistake.

| | Personal access token | Browser OAuth |
|---|---|---|
| **URL** | `https://synapse.onedroid.ai/agent/mcp` | `https://synapse.onedroid.ai/hub/<slug>/mcp` |
| **Hub selected by** | the token | the slug in the path |
| **Best for** | Claude Code, CI, headless agents, containers | Claude Desktop, claude.ai in a browser |
| **Credential lives** | wherever you put it — client config, secret store | the client's account |
| **Setup** | create a token, paste one header | click through a consent screen |

## Use `/agent/mcp` for tokens. No hub slug.

A token is bound to a hub when you create it, so `https://synapse.onedroid.ai/agent/mcp`
resolves that hub server-side — you never type a slug.

`/hub/<slug>/mcp` is a different route, used by OAuth clients where the slug in the path
selects the hub. A token can reach it, but only if the slug matches the hub the token was
bound to; a mismatch returns `ERR_SCOPE_UNAVAILABLE`. There is no reason to prefer it for a
token client.

## Why OAuth needs the slug and a token does not

This is not an arbitrary difference. **Each hub is its own OAuth protected resource.**

Ask either endpoint for its metadata and you get different answers:

```bash
curl -s https://synapse.onedroid.ai/hub/<slug>/.well-known/oauth-protected-resource
# {"resource":"https://synapse.onedroid.ai/hub/<slug>", ...}

curl -s https://synapse.onedroid.ai/.well-known/oauth-protected-resource
# {"resource":"https://synapse.onedroid.ai", ...}
```

The hub is carried by the **resource identifier**. A browser OAuth flow against a URL with
no slug in it therefore has no hub to bind the resulting token to. A personal access token
has the hub inside it already, which is why it needs no slug.

Both endpoints advertise RFC 9728 protected-resource metadata, and the authorization server
supports dynamic client registration, PKCE `S256`, and the device-code grant.

### Two guarantees that follow from how `/agent/mcp` works

`/agent/mcp` is not a parallel implementation. It authenticates the token, resolves the hub
from your own membership list, and then hands off to exactly the same hub-scoped path the
OAuth route uses. Two consequences worth relying on:

- **It fails closed.** The hub is resolved by scanning *your* memberships, not the token's
  stored value. A token for a hub you have since left resolves to nothing and returns 403 —
  there is no window where a stale token outlives the access it was granted.
- **The audit log names you.** Calls arriving through a token are attributed to the user who
  minted it, not to a synthetic "agent" principal. An agent acting on your behalf is
  recorded as you acting through an agent, which is the only version that is any use in a
  review.

## Engram

Engram is reachable directly, with a fixed URL:

```
https://engram.onedroid.ai/mcp
```

It is also available through Synapse as an upstream, which is how you get it governed and
audited alongside everything else in the hub.

## Finding us from a registry

Both servers are published to the official MCP registry under the DNS-verified
`ai.onedroid` namespace, which is bound to `onedroid.ai` by a TXT record rather than to a
GitHub account:

```bash
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=onedroid"
```

`ai.onedroid/synapse` lists both remotes described above — the OAuth route first, with the
hub as a documented variable, and the token route with the `Authorization` header it needs.
