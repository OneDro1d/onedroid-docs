---
title: Claim witness setup — account, credits, key, and your agent
nav: Set up
description: Step by step from no account to your agent's first signed check, over MCP (Claude Code or any MCP client) or plain HTTP.
section: Claim witness
order: 44.3
---

Five steps. At the end your agent has run one check and you have seen its signed answer.

## 1. Create an account

Open https://evidence.onedroid.ai and sign up. The account is where your credits, keys and kept
records live.

## 2. Get credits

Open **Account → Credits** (https://evidence.onedroid.ai/account/credits). A new account has
**0 credits**, and a check with no credits is refused before anything runs:

```json
{"error": "insufficient_credits", "available": 0, "needed": 1}
```

Nothing is charged or held when that happens. During the preview OneDroid adds credits by hand;
there is no purchase page yet. To get credits, email michal@onedroid.ai. 100 credits is enough for 100 checks without a model, or 9
judged checks with one model.

## 3. Make an API key

Open **Account → API keys** (https://evidence.onedroid.ai/account/api-keys) and fill in **Create a key**:

- **Name**: anything that tells you where it is used, for example `laptop agent`.
- **Scope**: **Claim witness only** is enough. (The wider choices add the older witness and audit services.)
- **Expires in days**: optional, at most 365.

The key is shown **once**. It starts with `odk_`. Copy it into your password manager or your
agent's secret store. The page also shows a ready-made MCP configuration with the key in it.

> Keep the key out of files you commit. It goes in an `Authorization: Bearer` header, never in an
> address: a key in a URL is refused.

## 4. Connect your agent

### Claude Code

Put the key in an environment variable, then add the server to your project's `.mcp.json` (or to
your user configuration). Claude Code expands `${…}` from the environment, so the file never holds
the key:

```bash
export ONEDROID_CLAIM_KEY='odk_…'   # your key, from step 3
```

```json
{
  "mcpServers": {
    "onedroid-claims": {
      "type": "http",
      "url": "https://evidence.onedroid.ai/mcp",
      "headers": { "Authorization": "Bearer ${ONEDROID_CLAIM_KEY}" }
    }
  }
}
```

Start Claude Code in that folder and approve the `onedroid-claims` server when it asks.

### Any other MCP client

| Setting | Value |
| --- | --- |
| Address | `https://evidence.onedroid.ai/mcp` |
| Transport | Streamable HTTP (one JSON-RPC message per POST, answered as `application/json`), protocol `2025-06-18` |
| Header | `Authorization: Bearer odk_…` |

Without a key the server still answers, but lists only the four open tools: `claim_price`,
`claim_methods`, `claim_search` and `claim_record`. With a valid claim key it lists eleven more,
including `claim_check` and `claim_keep`.

**Claude Desktop and claude.ai custom connectors** sign in with OAuth and cannot send a header. The
claim witness takes only an API key, so they cannot connect to it directly yet. Use Claude Code or
another client that can send a header.

### Plain HTTP

The same checks are a REST API at `https://app.onedroid.ai/bff/v1/witness/…`, with the same key.
The full reference is https://evidence.onedroid.ai/docs/claim-witness. Two differences from MCP:
each file needs its `sha256`, and the claim object must have exactly five fields. See
[Daily use](/claim-witness-daily-use#plain-http).

## 5. Run your first check

Ask your agent:

> Use the onedroid-claims tool `claim_check` with method `match.exact`. Evidence: two text objects,
> slot `submitted` (name `a.txt`) and slot `target` (name `b.txt`), both with the exact text
> `hello claims`. Tell me the outcome and the record id.

It should answer `SUPPORTED` and a 64-character record id, and your balance drops by 1 credit.
The arguments it sends look like this (the tool computes each file's `sha256` itself):

```json
{
  "method": "match.exact",
  "evidence": [
    {"slot": "submitted", "kind": "object", "media_type": "text/plain", "name": "a.txt", "content_b64": "aGVsbG8gY2xhaW1z"},
    {"slot": "target",    "kind": "object", "media_type": "text/plain", "name": "b.txt", "content_b64": "aGVsbG8gY2xhaW1z"}
  ]
}
```

If instead you see:

| Answer | Fix |
| --- | --- |
| `401 unauthorized: this tool needs a OneDroid API key` | The header is missing or the variable is empty: `echo ${#ONEDROID_CLAIM_KEY}` must print a number above 0 in the shell that started your agent. |
| Only four tools listed, no `claim_check` | The key did not reach the server, or it has no claim scope. Change its scope on the API keys page. (Over plain HTTP the second case is `403 {"error":"scope","needs":"claim"}`.) |
| `402 insufficient_credits` | Step 2. |

Next: [Daily use](/claim-witness-daily-use).
