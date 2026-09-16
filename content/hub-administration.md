---
title: Administer a hub — members, groups, sharing
nav: Members, groups & sharing
description: Who can reach your hub, what role they hold, and how a role actually resolves — invites, groups, and grants.
section: Start here
order: 6
---

A hub has an owner and, usually, other people. This page is the **Manage** and part of the
**Admin** section of the nav: who is on the hub, what they can do, and how that is decided.
All of it is admin-only — on a hub you created, that is you.

Everything here controls *permission to use tools*. It does not give anyone a credential:
each member still supplies their own on the [Connections page](/connections). Access and
credentials are two separate gates, and both have to pass.

## How a role is decided

Synapse resolves a person's role on a hub, then every tool checks against it. There are
three canonical roles, from least to most:

| Role | Can |
|---|---|
| **Reader** | read-only — list and read, no tool that writes |
| **User** | use tools, per the group permissions that apply to them |
| **Admin** | all of the above, plus manage members, groups and connections |

> You will also see **Owner** on the Members page. It is a legacy label that **maps to
> Admin** — treat it as Admin with the additional fact that it created the hub.

A person can hold a role two ways: directly, as a **member** of the hub, or indirectly,
because they are in a **group** that has been **granted** a role on the hub. **The highest
role across all of those wins.** So someone can be a plain member and still act as an admin
because a group they belong to holds an admin grant — which is why the Groups and Sharing
pages matter even when the Members list looks modest.

## Members

**Manage → Members** lists everyone directly on the hub, their role, and when they joined.
Change a role from the dropdown; remove someone with the ✕.

![The Members page: one row for the hub owner with a role dropdown and a remove action](/img/hub-administration/members.png)

### Inviting someone

**Invite member** opens a short form: the person's **email**, and the **role** they land
with (Reader / User / Admin). It creates a trackable invite link you share with them; they
accept it, sign in, and appear on the Members list.

![The Invite Member dialog: an email field and a role dropdown defaulting to "User — use tools per group permissions"](/img/hub-administration/invite-member.png)

Pending invites live under **Admin → Invites** until they are accepted. Inviting the same
person again, or before they accept, does not create a second membership.

## Groups

**Admin → Groups** is how you manage permission for more than one person at a time. A group
is a named set of people; grant the group a role on the hub (see Sharing below) and every
member of it inherits that role.

![The Create Group dialog](/img/hub-administration/create-group.png)

> **Two kinds of group show up here, and the difference is worth knowing.** A **hub group**
> belongs to this hub. A **tenancy-wide** group (badged as such) is shared across every hub
> in your tenancy — the same group can therefore hold a role on several hubs at once, so a
> change to it reaches wider than this one page implies. The system **Owners** group cannot
> be deleted.

## Sharing — grant a group a role

**Admin → Sharing** is where a group actually gets its power on this hub. **Grant a group**
takes a group and a role (**Admin — manage the Hub**, **User — use tools**, or **Reader —
read-only**); its members then resolve to at least that role here.

![The Grant a Group dialog: a group dropdown, a role dropdown, and the note "You cannot grant a role greater than or equal to your own"](/img/hub-administration/grant-group.png)

> **You cannot grant a role greater than or equal to your own.** An admin cannot mint another
> admin or an owner through this screen — that ceiling is deliberate, so sharing can widen
> access but never escalate past the person doing the sharing.

The Sharing table shows every group grant on the hub, who granted it and when. Revoke a
grant to remove that group's inherited role; the people in it keep any role they hold by
another path (direct membership, or another group).

## Doing all of this from an agent

Every gesture on these pages has an MCP equivalent, so an agent or a script can administer a
hub without the web UI — `synapse__invite_member`, the `synapse_*` group and grant tools,
and the membership listings. The tools and who may call each one are in
[The MCP tools your hub exposes](/mcp-tools). The same role resolution applies: an agent
acts as the user whose token it carries, with that user's role.

## Related

- [Connections and credentials](/connections) — the *other* gate every member passes
- [Tools and governance](/tools-and-governance) — narrowing what a hub exposes, and the audit trail
- [The MCP tools your hub exposes](/mcp-tools) — the same actions, over MCP
