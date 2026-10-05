---
title: Support
nav: Support
description: How to get help with OneDroid Synapse, OneDroid Engram, OneDroid Argus and the Dark Factory kits — who answers, where, how fast, and what to put in a report so it is answered first time.
section: Reference
order: 13
---

Support for every OneDroid product comes from the people who build it. There is no ticket
portal and no bot. This page says where to write, what to include, and what to try first.

## Where to write

| What you need | Where | Who answers |
|---|---|---|
| Something is broken, a question the docs did not answer, a feature you need | Email [michal@onedroid.ai](mailto:michal@onedroid.ai?subject=OneDroid%20support) | The team that builds the product. We reply within one business day. |
| A problem in the Dark Factory kits (skills, agents, hooks) | [Open an issue](https://github.com/OneDro1d/dark-factory/issues) on the kits repository | The maintainers, in the open |
| A mistake in these docs | [Open an issue](https://github.com/OneDro1d/onedroid-docs/issues) on the docs repository, or email | The docs maintainers |
| A security vulnerability | Email [michal@onedroid.ai](mailto:michal@onedroid.ai?subject=OneDroid%20security%20disclosure) with "security disclosure" in the subject. Do not open a public issue for it. | Handled first, before anything else in the queue |
| Running OneDroid on your own infrastructure, SSO, procurement | See [Enterprise](https://onedroid.ai/enterprise) on onedroid.ai, or email | Same team |

If your mail client does not open from the links, the address is **michal@onedroid.ai**.

## Before you write

Most problems people hit are in [Troubleshooting](/troubleshooting). Two things settle the
majority of them:

1. The curl probe from [the quickstart](/quickstart#4-prove-it-works-before-wiring-anything-else).
   It tells *the token is wrong* apart from *the client is not sending the header*, which look
   identical from inside an agent.
2. The endpoint you are using. `/agent/mcp` takes a personal access token and no hub slug.
   `/hub/<slug>/mcp` is for browser sign-in, and the slug selects the hub. They are not
   interchangeable.

## What to put in a report

Every Synapse response carries an `X-Correlation-Id` header. Quote it: it lets us find the
exact request in the hub's audit log without asking you for anything else.

- **Product**: Synapse, Engram, Argus, or a kit, and the version if you have one.
- **The correlation id** from the response, or the time in UTC if you do not have it.
- **The hub slug** (for `/hub/<slug>/mcp`), or that you used `/agent/mcp`.
- **The tool or page**, and what you expected to happen.
- **The exact error**, pasted, not paraphrased. Remove any token first: a personal access
  token or an OAuth bearer token in an email is a token we will have to revoke.
- **The client**: Claude (web, desktop, or Claude Code), ChatGPT, or something else, and how it
  is connected (the directory listing, a custom connector, or a config file).

## What we will not ask for

Your credentials for a connected service. Synapse holds those on your behalf; nothing in a
support exchange needs them, and we will not ask you to send one.

## Terms and privacy

The [terms of service](https://onedroid.ai/terms) and the [privacy policy](https://onedroid.ai/privacy)
are on onedroid.ai.
