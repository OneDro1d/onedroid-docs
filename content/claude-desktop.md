---
title: Connect Claude Desktop or claude.ai
nav: Claude Desktop & claude.ai
description: The browser route — sign in through a consent screen instead of handling a token. No terminal.
section: Start here
order: 4
---

If you do not work in a terminal, this is your page. There is no command to run, nothing to
install, and no token to keep safe. You sign in through a consent screen, the way you would
connect any other app.

Developers wiring Claude Code, CI, or a script want [the token route](/quickstart) instead.

## What you need first

1. A hub — see [Set up your hub](/setup).
2. **Your hub's slug**, which is not quite what you typed. Synapse adds a short suffix, so
   `myhealth` becomes something like `myhealth-bpn1wm`. Take it from the browser URL when
   you are looking at your hub.
3. At least one connection with **your** credential saved, or the assistant will connect
   successfully and then be able to do nothing. See
   [Connections and credentials](/connections).

## Your connector URL

**You do not have to build this by hand.** Your hub has an **AI Clients** page under
**Connect**, and it prints the exact URL for your hub along with per-client instructions.
Copy it from there — that is the shortest path and it cannot be typed wrong.

The shape is:

```
https://synapse.onedroid.ai/hub/<your-slug>/mcp
```

Substitute the real slug, suffix included. With `myhealth-bpn1wm` that is:

```
https://synapse.onedroid.ai/hub/myhealth-bpn1wm/mcp
```

> **The slug is not optional here, and this is the mistake that costs the most time.** The
> other URL you will see in these docs — `/agent/mcp`, with no slug — is for tokens only.
> There is no hub in that address, so a browser sign-in has nothing to attach to. Getting
> these two backwards is the most common wiring error we see. [Why they differ](/endpoints).

## Add it

In Claude (desktop app or claude.ai), open **Settings → Connectors**, choose to add a custom
connector, and paste the URL above. Other MCP-capable assistants have an equivalent screen,
usually called connectors, integrations, or MCP servers.

A OneDroid consent screen opens in your browser. Approve it and you are connected. Most
clients register themselves automatically — that is standard OAuth with PKCE and dynamic
client registration, and there is nothing for you to copy.

> **If your client asks for a Client ID and Secret, it is not broken and you are not stuck.**
> Some clients want them entered by hand, usually under *Advanced Settings*. The **AI
> Clients** page has a **Generate credentials** control with presets for Claude, ChatGPT and
> a generic option. Generate there, paste into the client. Treat the secret like any other
> password.

> Client UIs move. If the menu names above do not match what you see, look for wherever your
> assistant adds an MCP server and give it the same URL — the OneDroid side is identical
> either way. The **AI Clients** page carries step-by-step instructions for Claude.ai,
> Cursor, Claude Code and ChatGPT, and those track the product rather than this page.

## Confirm it worked

Ask the assistant to list the tools it can now reach. You should see tools named for the
connections on your hub.

If it lists **no** tools, or every call refuses, the connector is fine and the credentials
are not: the hub connected, but your own login for each service has not been supplied.
That is [Connections and credentials](/connections), and it is a separate step from this
one.

## What your assistant can and cannot do

Worth knowing before you grant it anything:

- **It acts as you.** Every call is made with your credential and recorded against your
  name. An agent doing something on your behalf appears in the audit log as you acting
  through an agent — not as an anonymous robot.
- **It only reaches what your hub offers.** The connector cannot invent access. If Slack is
  not on the hub, no amount of asking will reach Slack.
- **It only reaches what *you* have credentialed.** Two people on one hub see the same
  connection list and get their own data through it.
- **You can take it back.** Remove the connector in your assistant, or remove your
  credential in **Connect → Connections**. Removing the credential stops it everywhere at
  once, which is the bigger hammer of the two.

## When it goes wrong

| What you see | What it is |
|---|---|
| `ERR_SCOPE_UNAVAILABLE` | The slug in the URL is not the hub you are signed into. Recheck the suffix |
| Connects, but no tools | The hub has no connections enabled yet |
| Connects, tools listed, every call refuses | You have not saved your credential for that connection |
| Signed in, but it is the wrong hub — or no hub | Almost certainly a second account. Google and email-code sign-in on the *same* address are two different accounts. [More](/troubleshooting#signed-in-but-the-hub-is-missing-or-wrong) |

More in [Troubleshooting](/troubleshooting).
