---
title: Connections and credentials
nav: Connections and credentials
description: Why a connection can be on and still refuse you, and how to give each upstream your own credential.
section: Start here
order: 5
---

This is where most people get stuck, and it is almost always the same misunderstanding.

**A connection is hub-level and shared. A credential is yours and is never shared.**

Enabling Slack on your hub says *this hub offers Slack*. It does not say *you can call
Slack*. Those are two separate facts with two separate switches, and a row can pass one
while failing the other.

## The two switches on every row

The Connections page shows one row per connection, with two independent states:

| Switch | Who controls it | What it means |
|---|---|---|
| **On / Off** | admin | Does this hub offer the connection at all |
| **My credential** | you | Have *you* given it your login |

An admin turning a connection on gives you nothing to call with. You still have to supply
your own credential. Every member of a hub sees the same connection list and each one
resolves it to their own credential at call time — which is why the audit log can name a
person rather than "the agent".

> On a hub you created, you are the admin **and** the user. You do both steps yourself.
> There is nobody to wait for.

## Why there are several copies of the same service

Three Engram rows, six Supabase rows, and no obvious way to tell which is yours — this is
the single most common question about this screen, and the list is not broken.

Each row is an **alias**: a named instance of a catalogue definition. One definition can
back many aliases. The canonical case is one Atlassian definition added twice as
`atlassian-pww` and `atlassian-eso` — same software, two separate sites, two separate
credentials, independently switchable.

So the name is the only thing that tells them apart, and **aliases are named by whoever
created them**. `engram`, `engram-prod` and `engram-work-pww` are three aliases in front of
the same Engram service, and your credential for one is a different stored row from your
credential for another. Connecting `engram` does not connect `engram-prod`.

> **If you are not sure which alias is yours, ask the person who created the hub rather
> than guessing.** Picking the wrong one is not dangerous — you simply cannot credential a
> service you have no login for — but a tool call that "worked" against the wrong alias
> went to a different system with a different audit trail.

On a hub **you** created, the right move is to add the alias yourself and name it something
you will recognise.

## How you connect depends on the kind

Clicking **Connect** does a different thing for each kind of connection. If nothing appears
to happen, the kind is usually why.

### Token connections — an inline field, not a popup

Engram, Supabase and most third-party MCP servers take a token. There is **no OAuth popup**.
A password field appears in the row, labelled *Paste API token*. Paste it and click
**Connect**; the credential is saved and verified in one step.

If you clicked Connect expecting a popup and saw nothing move, look for the field in the row
you just expanded. That is the whole flow.

### OAuth connections — a popup you may have blocked

Slack, Monday, Notion, Miro, GitHub and Betterstack open a real OAuth popup, 600×700, and
report back when the consent screen finishes.

**If nothing happens at all, your browser blocked the popup.** Allow popups for
`synapse.onedroid.ai` and click Connect again.

### Google Workspace — you may need to supply your own Google app

Google opens a popup, but only once the hub has a Google OAuth app to connect *through*.

**On `synapse.onedroid.ai` there is no platform-wide Google app**, so you supply your own.
The Connect button stays disabled until you do, with the tooltip *"Save your own Google app
below first — this hub has no Google app to connect through."* Trying anyway returns:

```
No Google app is configured for this hub. Open Add app and save your own Google
OAuth client ID and secret first.
```

Expand **Use your own Google app** on the same page and save three fields:

| Field | Notes |
|---|---|
| Name / alias | optional, defaults to `default`, lowercase `[a-z0-9_-]` |
| Client ID | required |
| Client secret | required |

Both come from a Google Cloud OAuth client you create. The page carries a setup walkthrough
covering which APIs to enable, the Internal-vs-External consent screen choice, and the exact
redirect URI to register — the redirect URI is computed for you, so copy it from that panel
rather than typing it.

> Treat the client secret like any other password: paste it into the form and nowhere else.
> Never send one over Slack or email — a leaked secret has to be rotated in Google Cloud
> Console, and the leak is not undone by deleting the message.

If you save more than one Google app, clicking Connect first asks which one to use.

### Atlassian — a form, and the button says "Add workspace"

Atlassian does not use OAuth here and does not have a Connect button. It has **Add
workspace**, which opens a form with four required fields:

| Field | Example |
|---|---|
| Workspace Name | `My Company` |
| Site URL | `https://mycompany.atlassian.net` |
| Email | `you@company.com` |
| API Token | from [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |

The email must be the account the API token belongs to. You can add several workspaces.

### Microsoft 365 — a full-page redirect, and it may be unavailable

Microsoft redirects the whole page rather than opening a popup, so expect to leave the app
and come back.

Unlike Google there is **no bring-your-own-app option**, so Microsoft needs a platform app
before anyone can connect. Where that is absent the button is disabled and says so. If you
see that, it is a deployment-level gap and no amount of clicking will fix it.

## Reading the status an agent sees

Ask a hub for its connections through MCP and each row carries an `auth_status` naming the
**first blocking problem**, plus a single `ready` you can branch on. There are six values:

| `auth_status` | Meaning | Who fixes it |
|---|---|---|
| `ready` | Everything passes. The only value where `ready: true` | — |
| `mount_disabled` | The hub has the connection but it is switched off | an admin |
| `needs_credential` | Switched on, but *you* have not supplied a credential | you |
| `upstream_unreachable` | Your credential is stored, but the upstream is not answering | nobody — wait, or report it |
| `not_configured` | The platform has no app for this service, so no user action can connect it | the deployment |
| `unknown` | The status could not be determined. **Not a synonym for "broken"** | — |

`unknown` is deliberate: where the check itself failed, the API withholds the fact rather
than asserting its opposite. Treat it as *no answer*, not as a negative one.

> **These six values come from the MCP tools, not from the screen.** The Connections page
> derives its own simpler connected / needs-credential display. Do not expect the wording
> above to appear in the UI.

## The field called `connected` means two different things

This trips up agents and the humans reading their output, so it is worth stating flatly.

| Where you read it | What it means |
|---|---|
| `synapse__list_connections_catalogue`, `synapse__list_hub_connections` | **You** hold a credential for this connection on this hub |
| `router_list_upstreams` | The **gateway's** shared transport to that upstream is up. Nothing about you |

So `router_list_upstreams` can report `connected: true` while a real call returns *"You
haven't connected your credentials"* — both are correct, about different things. Branch on
`ready`, or on `auth_status`, never on a bare `connected`.

One more that looks wrong and is not: for connections that authenticate per user, the
gateway keeps no shared connection of its own, so `router_list_upstreams` shows
`connected: false` as a matter of course. That is normal and is not an outage.

## When a call says you have no credentials

The message is:

```
You haven't connected your credentials for '<name>'. Please add your token via the
My Connections tab.
```

> **The tab it names no longer exists.** "My Connections" was the old UI. Go to
> **Connect → Connections** and use the **My credential** control on that connection's row.
> We are fixing the message.

Note the name in the quotes. If it is an alias you did not expect — `engram` when you
credentialed `engram-prod` — you connected a different row, not a broken one.

## Related

- [Set up your hub](/setup) — getting as far as this screen
- [Troubleshooting](/troubleshooting) — the failures and how to tell them apart
- [Endpoints and authentication](/endpoints) — how your client reaches the hub at all
