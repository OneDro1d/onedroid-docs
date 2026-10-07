---
title: Connect Argus as a remote MCP
nav: Connect as a remote MCP
description: Add Argus to a Synapse hub so every agent on the hub can call it, or connect one agent to Argus directly. The exact fields, whose token goes where, and what each failure means.
section: Argus
order: 10.7
---

Argus is a remote MCP server. An agent reaches it in one of two ways:

- **Through a Synapse hub.** A hub admin adds Argus once. Every person on the hub then pastes
  their own Argus token, and their agent sees the Argus tools among the hub's tools.
- **Directly.** One agent session holds the address and a token itself.

The same steps are in the Argus app, on **Settings → API Tokens**, in the section
**Connect Argus as a remote MCP**. That section shows the address of your own control plane.

## What you need

1. **The address.** It is the address you open Argus at in the browser, plus `/mcp`. For
   example, if you sign in at `https://argus.example.com`, the address is
   `https://argus.example.com/mcp`. Use `/mcp`. The `/sse` address is an older transport, for
   clients that cannot use `/mcp`.
2. **An Argus token**, from **Settings → API Tokens**. It is shown once, when you generate it.
   - An **author token** opens the author tools (`author_list_runs` and the like). A tester uses it,
     and so does a hub.
   - A **builder token** opens only the `runner__*` tools and belongs to one workspace.
3. **The token travels in a header, never in the address.** Argus refuses a token placed in the
   address.

Never paste a token into a chat. A token that passes through an agent's transcript should be
treated as leaked.

## Through a Synapse hub

### Add Argus to the hub (a hub admin, once)

1. In Argus, generate an **author token** and copy it.
2. In Synapse, open **Connections** and click **Add Remote MCP**. Only a hub admin can.
3. In the **Add Remote MCP Server** dialog, fill in:

   | Field | Value |
   |---|---|
   | **Namespace** | `argus` |
   | **Display Name** | any name you like |
   | Transport | **HTTP (Modern)** |
   | **Server URL** | your Argus address ending in `/mcp` |
   | Auth Type | **API Token** |
   | **Discovery Token (optional)** | the author token from step 1 |

   The namespace takes lowercase letters, digits and hyphens only. Synapse puts it in front of
   every tool name, so pick something short.

   The discovery token is optional. Synapse uses it only to list the tools. Without it the hub
   shows no Argus tools until someone has saved their own token.
4. Click **Add Server**. Argus refuses a request that carries no token, and Synapse accepts the
   connection anyway: that refusal is how it knows the address is right.

### Add your own token (every person, once)

5. In Synapse, open **Connections**, find the Argus row, paste your own Argus token into the
   field **Paste API token…** and connect.
6. Paste the token only, without the word `Bearer`. Synapse adds it for you.
7. Synapse checks the token as soon as you save it. A connected row keeps a **Verify** button
   that checks it again.

A connection being on is not the same as you being connected. See
[Connections and credentials](/connections) for the two switches on every row.

### What the tools are called

Your agent sees each Argus tool with the namespace and two underscores in front. With the
namespace `argus`, an author token gives tools such as `argus__author_list_runs` (one underscore
after `author`), and a builder token gives tools such as `argus__runner__run`.

If the tools do not appear, reconnect your agent's connection to the hub.

### When the token expires

A token you generate lasts 90 days, and the API Tokens page warns you 14 days before. Argus does
not replace it for you. Generate a new one, paste it into the Argus row in Synapse, then revoke
the old one in Argus. If the hub admin set a discovery token, that one needs replacing too.

## Directly from an agent

On the machine where the agent runs, one command writes the connection for you:

- `argus tester init <app>` for a tester session, with an author token
- `argus builder init <app>` for a builder session, with a builder token

Each writes a small script that prints the header, adds an `argus` entry to the session's
`.mcp.json`, and tells you which file to paste the token into. The token stays in that file, not
in `.mcp.json`. The entry looks like this:

```json
{
  "mcpServers": {
    "argus": {
      "type": "http",
      "url": "https://argus.example.com/mcp",
      "headersHelper": "/home/<you>/.config/argus/argus-headers-<app>.sh"
    }
  }
}
```

Start the agent session again after the file changes. The full walk-through for both sessions is
[Set up a tester and a builder for your app](/argus-session-setup).

## If it does not work

| You see | Likely cause | What to do |
|---|---|---|
| "Unauthorized", or error `-32001` | no token, a wrong one, or an expired one | generate a new token and paste it in |
| The hub shows the Argus connection but no Argus tools | no discovery token was set, and nobody has saved a token yet | save your own token in the row |
| You see `runner__` tools but no `author_` tools | the token is a builder token | use an author token |
| The token is refused right after you pasted it in Synapse | you may have pasted the word `Bearer` with it | paste the token only |
| The tools are in the hub but your agent does not show them | the agent has not refreshed its list | reconnect the agent's connection to the hub |
| Your agent offers an **Authenticate** button for Argus | the token is the connection | do not click it; fix the token instead |
