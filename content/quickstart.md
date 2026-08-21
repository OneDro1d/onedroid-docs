---
title: Connect Claude Code
nav: Connect Claude Code
description: One command and one bearer token. No install, no tunnel, no device-code flow.
section: Start here
order: 3
---

This is the fastest path, and it is the right one for Claude Code, CI, and any HTTP MCP
client. If you are connecting Claude Desktop or claude.ai in a browser, you want the OAuth
route instead — see [Endpoints and authentication](/endpoints).

## 1. Create a token

Sign in at [synapse.onedroid.ai](https://synapse.onedroid.ai). **Check the hub picker in
the top-left is on the hub you want** — tokens are bound to one hub and one user, so this
choice matters. Then go to **Manage → API Tokens** and click **Create token**.

Give it a name you will recognise later (`claude-code-laptop`, `ci-nightly`) and an expiry.
Prefer a bounded lifetime for anything that is not on a rotation schedule.

> **Copy the token before dismissing the dialog.** The plaintext is shown once. If you lose
> it you can **Reveal** it later from the tokens table, or **Rotate** to issue a new one —
> but do not rely on that mid-setup.

## 2. Add it to Claude Code

```bash
claude mcp add \
  --transport http \
  "synapse" \
  https://synapse.onedroid.ai/agent/mcp \
  --header "Authorization: Bearer syn_YOUR_TOKEN"
```

The label `synapse` is arbitrary. The URL is not — see
[Endpoints and authentication](/endpoints).

## 3. Reload, then confirm

MCP servers load at startup, so if you ran that inside a running session, reload the window
or open a new one. Then:

```bash
claude mcp list
# synapse: https://synapse.onedroid.ai/agent/mcp (HTTP) - ✓ Connected
```

Or type `/mcp` in an interactive session — you should see the `synapse` entry listing the
tools your hub exposes.

## 4. Prove it works before wiring anything else

This returns HTTP 200 with a JSON-RPC result when the token is good,
`401 {"code":"invalid_token"}` when it is wrong, and `401 {"code":"missing_token"}` when the
header did not arrive:

```bash
curl -s https://synapse.onedroid.ai/agent/mcp \
  -H "Authorization: Bearer syn_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",
       "params":{"protocolVersion":"2025-06-18","capabilities":{},
                 "clientInfo":{"name":"probe","version":"1.0"}}}'
```

Run this **first** whenever something is not working. It separates "the token is wrong"
from "the client is not sending the header", which are the two failures that look identical
from inside an agent.
