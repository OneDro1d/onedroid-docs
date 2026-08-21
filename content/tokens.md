---
title: Personal access tokens
nav: Tokens
description: What a token is, what it isn't, and how it behaves when your role changes.
section: Reference
order: 5
---

## Scope

**One user, one hub.** Create a separate token per hub you need to reach. Five per user per
hub.

## Permissions

A token **inherits your current role in its hub**. It does not freeze your permissions at
creation time — downgrade the role and the token loses that access immediately, with nothing
to re-issue.

The same applies to leaving a hub: a token bound to a hub you are no longer a member of
stops resolving. See [Endpoints and authentication](/endpoints) for why.

## Custody

Stored as a hash plus an encrypted copy so **Reveal** can work.

- **Rotate** invalidates the old token and keeps the remaining lifetime.
- **Revoke** kills it with no replacement.

Treat it like a password: password manager or secret store, never chat, git, or a shared
doc. If one leaks, **Revoke** is immediate.

## Choosing an expiry

Prefer a bounded lifetime for anything that is not on a rotation schedule. A token named
`ci-nightly` with no expiry is a credential nobody will ever think about again, which is
precisely the kind that turns up in an incident.

## What a token is not

It is not a service account. It carries your identity, your role, and your audit trail. If
you want an agent to have *less* access than you do, change what the hub exposes — tool
toggles under **Admin**, or a group with a narrower role — rather than reaching for a
different token.
