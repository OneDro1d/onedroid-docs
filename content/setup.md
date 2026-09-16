---
title: Set up your hub
nav: Set up your hub
description: Sign in, choose where your data lives, and create the hub your agents will connect to.
section: Start here
order: 2
---

Onboarding is two screens. Only the first carries any weight.

## 1. Sign in

Go to [synapse.onedroid.ai](https://synapse.onedroid.ai) and click **Sign in**. Two ways in:

- **Continue with Google**
- **An email address** — you get a one-time code, or a sign-in link, by email

![The Synapse sign-in screen: the OneDroid logo, the word Synapse, and a single Sign in button](/img/setup/sign-in.png)

> **There is no Microsoft sign-in.** The button was offered briefly and never worked for
> anyone; it has been removed. If you tried it and failed, that was the product, not you.

> **Use the same method every time.** Sign-in is handled by Clerk, and Google and email
> sign-ins on the *same address* are still two different accounts. If you end up signed in
> with no hub, or the wrong one, this is almost always why.

## 2. Choose where your data is stored

Both options are fully supported. Pick based on whether you need to own the database. You
can change it later under **Manage → Database**.

| | OneDroid Managed | Bring your own database |
|---|---|---|
| Setup | One click, nothing to configure | Paste a connection string and password |
| Where tables live | OneDroid's infrastructure | Your Postgres 15+ — Supabase, Neon, anything |
| Best for | Getting started, evaluating, teams with no data-residency constraint | Anyone who needs to own the data |
| If you leave | Export | The data simply stays where it already was |

![The storage-choice step: two cards, OneDroid Managed and Bring Your Own Database, with Managed selected](/img/setup/choose-storage.png)

> **The one mistake everybody makes.** Leave the literal `[YOUR-PASSWORD]` placeholder in
> the connection string exactly as it appears. **Do not substitute your real password.**
> Synapse splices the password in from the separate field at connection time, which is why
> it is never stored in the URI. Pasting the real password into the string is the single
> most common failure in this flow, and it presents as *"credentials look right but TEST
> CONNECTION fails"*.

From Supabase, take **Connect → Transaction pooler → URI**, not the direct connection.
Click **Test connection** and wait for it to succeed before clicking **Next** — a bad
string then surfaces here rather than after your hub exists.

## 3. Create your hub

A hub is your workspace: it holds your connections, your team and your permissions. Give it
a name and click **Create hub**.

![The hub-name step: a Hub Name field reading "Acme Docs" and a slug field reading "acme-docs"](/img/setup/name-your-hub.png)

**The hub you create is yours, and you administer it.** Nobody provisions it for you and
there is nobody to ask: sign-up, hub, tokens and upstream connections are all self-service.
The **Admin** section in the left nav is not decorative — it is yours. The one thing that
changes this is being *invited* into a hub somebody else created; then you hold whatever
role they granted you. See [step 4](#4-find-your-way-around).

> **Your slug will not be what you typed.** Synapse appends a short unique suffix, so
> `team-dev-1` becomes something like `team-dev-1-dj8p87`. Take the real slug from the
> browser URL or the Hub Details panel before you bookmark or share a link.

The slug matters for OAuth clients, which select the hub by path. Token clients never need
it — see [Endpoints and authentication](/endpoints).

## 4. Find your way around

You land on the dashboard. A fresh hub shows 1 member and zero connections — that is
expected, not a failure. (The group count reads higher than 1: it includes system "Owners"
groups shared across the managed tenancy, not just this hub's own.) The left nav splits
four ways:

![The dashboard of a fresh hub: stat cards for Members, Groups, Connections and API Tokens, a Getting Started checklist, and a Hub Details panel showing the name, slug and created date](/img/setup/dashboard.png)

- **Overview** — status and the getting-started checklist
- **Connect** — connections, AI clients, tools, packs
- **Manage** — members, groups, API tokens, database
- **Admin** — tool toggles, sharing, invites, activity logs, reporting

> **A fresh hub has zero connections. That is expected, not a failure.** Upstream services
> are enabled under **Connect → Connections**, and adding them is an **admin** gesture — so
> which situation you are in decides whether this is yours to do.
>
> - **You created this hub.** Then you administer it, and enabling upstreams is the next
>   step of your own setup. Nothing to wait for.
> - **You were invited into someone else's hub.** Then it is not yours to fix. You will hold
>   a perfectly valid token, see no tools, and have every reason to blame the token. Ask
>   whoever owns the hub.
>
> Enabling a connection is only half the job: each member then supplies their own credential
> for it. See [Connections and credentials](/connections), which is where most first-time
> setups actually stall.
