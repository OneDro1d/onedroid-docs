---
title: The Engram web app
nav: The web app
description: Every screen in the Engram web app — libraries, namespaces, objects, links, search, tokens, sharing and settings — and what each one does.
section: Engram
order: 22
---

The web app at **https://engram.onedroid.ai** is where a person does by hand what an agent does
through the [MCP tools](/engram-tools): create libraries and namespaces, add and remove objects,
mint tokens, share with a team, and choose where the data lives. Both work on the same
libraries, namespaces and objects.

> **How these screenshots were made.** A demo account with a library called *Acme Research*,
> driven on 2026-09-15 against the same web-app release that runs in production. Token values
> are masked. On the API Tokens screenshots the hostname is shown as `engram.onedroid.ai`, which
> is what production displays there — the page prints its own address. Nothing else is edited.

## Signing in

![The Engram sign-in page, with Continue with Google and an email address field](/img/engram-web-app/sign-in.png)

Sign in with Google or with an email address. It is the same OneDroid account you use for
Synapse, so there is nothing separate to register.

## Your first visit

A new account starts with one library, **Personal** — *"Your private namespace library"*. The
dashboard shows the selected library's name and description, and counts of its namespaces, API
tokens and members.

![The dashboard for the Acme Research library, showing counts for namespaces, API tokens and members, and a Search card](/img/engram-web-app/dashboard.png)

If Engram asks you to set up before showing the dashboard, it is two steps and you can change
both later:

1. **Database** — *OneDroid Managed*, or *Bring Your Own DB* (see [Database](#database)).
2. **Embedding provider** — the model that makes semantic search work. The API key is optional:
   *Skip &amp; Finish* leaves it unset, and a library without its own credential still gets
   semantic search from the platform's managed embedding.

![Welcome to Engram: step 1 of 2, choosing OneDroid Managed or Bring Your Own DB](/img/engram-web-app/onboarding.png)

## Finding your way around

The sidebar has four groups: **Overview** (Dashboard), **Knowledge** (Namespaces, Canvas,
Embedding), **Access** (API Tokens, Members, Sharing) and **Settings** (Credentials, GitHub Sync,
Database). The search box at the top searches every library you can reach.

Most pages act on **one library at a time**. Pick it from the switcher at the top of the sidebar;
the number beside each library is its namespace count.

![The library switcher open, listing All Libraries, Acme Research and Personal, with Create Library at the bottom](/img/engram-web-app/library-switcher.png)

*All Libraries* shows everything together, but anything that creates something needs a single
library selected — the Namespaces page says *"Select a library to create or manage."*

## Libraries

**Create Library** is at the bottom of the switcher. A library needs only a name; the
description is optional.

![The Create Library page with a name, a description and an Embedding Provider section](/img/engram-web-app/create-library.png)

The **Embedding Provider** section is optional. Leave the API key empty and the library uses the
platform's managed embedding — our test library with no credential was searchable by meaning
straight away. Keys you do enter are encrypted at rest, and you can add or change them later on
the [Embedding](#embedding-and-credentials) page.

## Namespaces

A namespace is a subject area inside a library, and it is what you write into.

![The Namespaces page listing product-decisions with object and chunk counts](/img/engram-web-app/namespaces.png)

**Create** asks for a name and an optional description. Names use letters, numbers, dots,
hyphens and underscores.

![The Create Namespace dialog with the name product-decisions](/img/engram-web-app/create-namespace.png)

The bin icon on a row deletes the namespace — *"All objects will become inaccessible."* A filter
box appears once a library has more than five namespaces.

## Inside a namespace

Click a namespace to open it.

![A namespace page showing its counts, the Sharing box, three objects and two external links](/img/engram-web-app/namespace.png)

From top to bottom:

- **Move to Library**, **Re-embed** and **Add Object**. *Move to Library* appears only when you
  have more than one library.
- **Counts** — objects, chunks, external links, and how many access groups the library is
  shared with.
- **Sharing** — who else can reach this library and with what role. It is read-only here;
  change it on the [Sharing](#sharing) page.
- **Objects**, newest first, each with its format (`markdown`) and source (`direct` for
  something you added, or the tool it was imported from).
- **External links** — web pages Engram fetches into this namespace on a schedule.

### Adding an object

![The Add Object dialog with a title and markdown content](/img/engram-web-app/add-object.png)

Give it a title and paste markdown. Engram splits it into chunks and indexes it, and it is
searchable straight away.

- Objects added here get the kind `document`. To set a different kind — `decision`, `note`,
  anything you like — write with [`engram_write`](/engram-tools#objects).
- **Content added in the web app does not pass through an AI model.** A tool call does: the text
  travels through whatever model your client uses. For sensitive material, use the web app.
- The bin icon on an object deletes it, its chunks and its embeddings. *"This action cannot be
  undone."*

### Re-embed

Re-creates embeddings for chunks that are missing them — typically after you add or change the
library's embedding credential. It does not re-chunk or change any content.

### Moving a namespace

![The Move to Library dialog with a target library dropdown](/img/engram-web-app/move-namespace.png)

Pick the target library and **Move**. Moving has one known side effect on library tokens — see
[Known issues](/engram-usage#known-issues).

## External links

**Register Link** makes Engram fetch a web page into the namespace and re-fetch it on a
schedule, converted to markdown and searchable like any other object.

![The Register External Link dialog with a URL and a 1 hour fetch interval](/img/engram-web-app/register-link.png)

- **Only `https://` URLs.** Internal and private addresses are refused when the fetch runs.
- **Interval:** 5 minutes, 15 minutes, 1 hour (the default), 6 hours or 24 hours.

Each link then gets a card showing its **status**, when it was **last fetched**, its interval,
its **failure count**, and whether the fetched object exists yet. A new link starts `pending`
and becomes `active`. A link in `failed` or `disabled` shows the error and a **Re-enable**
button; re-enabling resets the failure counter.

**Deleting a link also deletes the object it created**, with its chunks, embeddings and history.
Agents can register links with [`engram_register_link`](/engram-tools#objects), but there is no
tool to remove one — the bin on the link card is the only way.

## Search

The search box at the top of every page, or the Search card on the dashboard, finds objects
whose **title or content contains your words**, across every library you can reach. Filter to
one library with the dropdown; click a result to open its namespace.

![The Search page returning one result for postgres, with its library and namespace](/img/engram-web-app/search.png)

This is a word match, not semantic search. Search by meaning — with scores — is what
[`engram_search`](/engram-usage#searching-it-back) does for an agent.

## Canvas

A read-only map of your libraries, their namespaces and their objects.

![The Canvas showing the Acme Research library, its product-decisions namespace and three objects, with a legend](/img/engram-web-app/canvas.png)

- **Solid lines** are links someone made with [`engram_link`](/engram-tools#graph). **Dashed
  lines** are `auto:similar` — Engram draws those itself between objects with closely related
  content.
- Colours mark libraries that are **mine**, **shared with me** and **shared by me**.
- A namespace shows up to 20 objects, then a *"+N more"* tile.
- Click a namespace or object to open it. *Refresh* reloads the map.

## API tokens

Tokens are how an agent or script reaches Engram without a browser.

![The Create Library Token dialog: the token is scoped to Acme Research only, with a name and a 30 day expiry](/img/engram-web-app/create-library-token.png)

![The API Tokens page after creating a token: the new token in a banner, three library tokens in a table, the full-access token section and the MCP connection URLs](/img/engram-web-app/tokens.png)

There are two kinds, and the page recommends the first for good reason:

| | Reaches | Use it for |
|---|---|---|
| **Library token** | one library | anything shared: a teammate's client, a CI pipeline, an agent you want bounded |
| **Full-access token** | every library you own — *"equivalent to being logged in"* | a single client of your own that genuinely needs everything |

- **Expiry**: 7, 30 (the default), 60 or 90 days. *Never expires* exists for headless agents;
  rotate such a token at least every 90 days. You can mint at most five never-expiring tokens
  in any 24 hours.
- **The token is shown once in the banner** — but you can reveal it again later from the table
  with the eye icon.
- **The bin revokes it.** A revoked token is refused on its very next request.
- The **Full-Access Token** section offers *Create Admin Token* only while you have none.
- **Connect to MCP Client** shows the two addresses to give your client:
  `https://engram.onedroid.ai/mcp`, and the legacy `https://engram.onedroid.ai/mcp/sse`. Send
  the token as `Authorization: Bearer engram_…`, or append `?token=…` to the URL.

For wiring a client up, see [Using Engram](/engram-usage#connect).

## Sharing

Sharing works through **access groups**: named sets of people, by email. You grant a group
`read` or `read-write` on a library, and everyone in it gets that access.

![The Sharing page: acme-engineering granted read-write on Acme Research, with teammate@example.com as a member](/img/engram-web-app/sharing.png)

1. **New Access Group** — a name and an optional description. You become its owner.
2. Expand the group and **add members by email**.
3. Under **Share this library**, pick the group and a role, and **Grant access**.

- Only the library's **owner** sees the grant form. Anyone else sees *"Only the library owner
  can change sharing."*
- The bin on a grant revokes it; the bin on a group deletes it and every grant it had.
- Engram access groups are **not** Synapse groups. Membership of one grants nothing in the
  other.

**Members** is the direct way in: it lists who belongs to the library and adds one person by
their account's user ID (`user_…`). Access groups by email are usually easier, because you
rarely know someone's user ID.

![The Add Member dialog asking for a Clerk user ID and a role](/img/engram-web-app/members-add.png)

## Embedding and credentials

You do not have to configure anything for semantic search to work. These two pages are for
using **your own** embedding provider.

**Credentials** stores API keys, once, for reuse by any of your libraries. Providers: OpenAI,
Google AI, OpenRouter, or *Custom / Local (Ollama)* with your own base URL. **Test Connection**
checks the key against a model before you save. Keys are encrypted at rest.

![The Add Credential dialog with a name, OpenAI as provider, an API key and a test model](/img/engram-web-app/add-credential.png)

**Embedding** assigns one credential, a model and its vector dimensions to the selected library.
Until you add a credential it says so:

![The Embedding page for Acme Research: no credentials yet, with a link to the Credentials page](/img/engram-web-app/embedding.png)

After changing a library's embedding model, use **Re-embed** on each namespace.

## GitHub Sync

Pushes a namespace's objects to a GitHub repository you own, for your own copy of the data:
repository URL, a personal access token, a branch, and a push strategy — on every commit, in
periodic batches, or manually.

> **Known issue (2026-09-15):** the page currently lists *"No namespaces"* even when the
> selected library has some, so there is nothing to connect. Tracked; this note goes when it is
> fixed.

## Database

Shows where your content lives: **managed** by OneDroid, or **BYOD** — a Postgres you own.

![The Database page showing Mode: managed and a Switch to BYOD button](/img/engram-web-app/database.png)

**Switch to BYOD** opens the connection form:

![The BYOD form with instructions for getting a Supabase transaction pooler connection string, and fields for the connection string and database password](/img/engram-web-app/database-byod.png)

1. Get a connection string from Supabase (or Neon, or any PostgreSQL 15+): your project →
   **Connect** → **Transaction pooler** → type **URI**.
2. Paste it, and type the database password separately — it replaces `[YOUR-PASSWORD]` in the
   string.
3. **Test Connection**. It reports `Connected (pgvector OK)`, or `Connected (pgvector missing!)`
   if the extension is not available.
4. Once the test succeeds, a button appears to register (or update) your database.

What moves and what does not is on [What Engram is](/engram#bring-your-own-database).

## Related

- [Using Engram](/engram-usage) — connect a client, write, search, and read the results
- [Engram tool reference](/engram-tools) — all 45 tools
- [What Engram is](/engram)
