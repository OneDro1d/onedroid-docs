---
title: Argus — comparing systems
nav: Comparing systems
description: Run one sealed set of checks against several systems, for example an old system and its rewrite, and read check by check whether they gave the same output.
section: Argus
order: 12.5
---

A comparison runs **one sealed set of checks** against several systems and tells you, check by
check, whether the systems gave the same output. Use it when the question is "does B behave like
A?": an old system and its rewrite, or one system at two versions. This is the code modernization
case: the old system is the reference, and the new one has to answer the same checks the same way.

Each system is run by its own execution plane. Each run's outputs are recorded as hashes, and a
table says, for every check and every system: the same as the reference, different, not measured,
or could not run. A comparison can also judge a check on each system alone, and compare load
numbers.

Everything on this page is for the **tester** (an author token). A builder token cannot create,
read or approve a comparison. All the tools are MCP tools, like the ones in the
[Tester guide](/argus-tester-guide).

## What you need first

- **One instance per system, all in one workspace.** A member that belongs to another workspace is
  refused.
- **One of those instances owns the sealed set.** Every comparison tool takes it as `instance_id`.
- **An execution plane on v0.3.57 or later for every member.** An older one cannot record outputs,
  and the run is refused by name.
- **v0.3.58 or later** on a member's execution plane when the set uses `Tolerance` or
  `Not Worse Than`, or when that member names a `target`.

## 1. Write checks that can be compared

A check takes part in a comparison only if it has a `## COMPARE` section. The section says, before
any run, what "the same output" means for that check.

```markdown
## COMPARE
- **Reference**: measured
- **Output**: status, body, header:Content-Type
- **Mask**: $.id; $.items[*].createdAt
- **Unordered**: $.items
- **Repeats**: 5
- **Agreement**: 100%
```

| Key | Meaning | Default | Bounds |
|---|---|---|---|
| **Reference** | `measured`: compare with the reference system's recorded output. `fixed`: the check's own claims are the expected output. `property`: the claims are a property that must hold. | required | one of the three |
| **Output** | Which parts of the response are compared: `status`, `body`, `header:<Name>`. | `status, body` | up to 8 headers |
| **Mask** | Fields whose value is ignored: `$.id`, `$.items[*].createdAt`, `header:Date`. | none | up to 32 |
| **Unordered** | Arrays whose element order does not matter. | order matters | up to 8 |
| **Tolerance** | Numbers that may differ a little: `$.total abs 0.01` or `$.rate rel 0.001`. | exact | up to 16 rules |
| **Repeats** | How many runs of each system the check needs. | 1 | 1 to 20 |
| **Agreement** | The share of a system's runs that must agree, for example `100%` or `95%`. | 100% | 1% to 100% |
| **Not Worse Than** | A band for load numbers against the reference: `p95 20%`, `error_rate 0.5pp`. Needs a `## LOAD` section. | none | `p50`, `p95`, `p99` with `%`; `error_rate` with `pp` |
| **Steps** | For a chain: which `http` steps are compared. | every `http` step | names must exist |

Four rules to know before you write a set:

- **A mask hides a value, never the presence of a field.** A field only one system sends is still
  a difference.
- **A `measured` check needs an output Argus records.** Today that is an HTTP check, or the `http`
  steps of a chain. A check that records no output is listed when you create the comparison, with
  the reason. Such a check can still use `fixed` or `property`.
- **Only responses are recorded, never requests.** Argus cannot tell what is personal data: keep it
  out with `Mask`. The recorded body stays on the execution plane that ran the check.
- **A seed check puts every system in the same starting state.** Give it the exact tag `seed`, and
  an ID that sorts before every other check ID, for example `00-SEED-...`. If a seed check does
  not pass in a run, every other cell of that run reads "Could not run: starting state not
  established."

A build, final or scheduled run ignores `## COMPARE` and judges the check by its `## EXPECT`, as
before. The `scenario-author` skill that ships with Argus has every rule of the section.

## 2. Seal the set

A comparison names a sealed certification set. Write the checks into a draft certification set and
seal it, the way [Ledger and certificates](/argus-ledger#for-ai-agents-certify-a-build) describes.
A sealed set is frozen: a change means a new draft, a new seal and a new comparison.

## 3. Create the comparison

`author_create_comparison`:

```json
{
  "instance_id": "<owner instance>",
  "title": "orders v1 against v2",
  "members": [
    { "name": "old", "instance_id": "orders-v1", "role": "reference" },
    { "name": "new", "instance_id": "orders-v2", "role": "candidate" }
  ]
}
```

| Argument | Required | Meaning |
|---|---|---|
| `instance_id` | yes | the instance that owns the sealed set |
| `title` | yes | at most 140 characters; only you see it |
| `members` | yes | 2 to 8 systems |
| `commitment_id` | no | which sealed set. Left out, the instance's only sealed set is used; with several, the call is refused and lists them |

Each member has:

- `name`: lower-case letters, digits, `-` and dots, starting with a letter, at most 32 characters.
  A version is a fine name, for example `otrs-6.0.30`.
- `instance_id`: the instance that tests that system.
- `role`: `reference` or `candidate`. A set with a `measured` check needs exactly one reference.
- `target` (optional, v0.3.58 or later): a named connection target from that execution plane's
  `argus-config.yaml`. Two members may share one instance when their targets differ.
- `artifact_digest` (optional): the digest of the build you mean to compare. The execution plane
  refuses a run it can prove is of another digest.

The answer gives the `comparison_id`, the checks that are compared, and the checks that are not
with the reason for each. A refusal says what is wrong and that nothing was stored.

## 4. Run it

`author_run_comparison` with `instance_id` and `comparison_id`. It is the only way a comparison
run is queued; `author_request_run` refuses the `compare` mode.

- **The reference runs first, and it runs at least twice.** The extra runs are control runs: the
  reference against itself. That is how Argus finds a check whose own output varies.
- **Candidates are queued only after every reference and control run has landed.** This happens by
  itself when the last results arrive, or when you call the tool again.
- **Each system runs as many times as the largest `Repeats` in the set**, at most 20. Every run is
  a whole run of the set.
- **The call is safe to repeat.** It queues only the runs still missing. A run that failed is
  replaced only when you call the tool again.

The answer lists what was queued, what was already queued, and what is waiting and why.

## 5. Read the result

`author_get_comparison` with `instance_id` and `comparison_id`. `author_list_comparisons` lists an
instance's comparisons (`limit` from 1 to 50, default 20).

### The verdict

The verdict is never green on a gap.

| Verdict | Meaning |
|---|---|
| `same` | no difference, no gap, nothing approved |
| `same_with_approved_differences` | no unapproved difference, no gap, and at least one difference you approved |
| `differences` | at least one difference is not approved, or a load number is worse than its band allows |
| `incomplete` | no unapproved difference, but something could not be judged |

`incomplete` covers: a run that has not finished, a cell that is noise, not measured or could not
run, a check with fewer usable runs than its `Repeats`, a claim the number of runs cannot support,
a reference that ran only once, and a seed check that did not hold.

### The cells

Each cell is one check on one system.

| In the answer | On the page | Meaning |
|---|---|---|
| `identical` | Same | the output equals the reference's in every part the check compares, or the claim held often enough |
| `differs` | Differs | the output does not equal the reference's, and the cell says in which part |
| `differs`, approved | Approved | it differs, and you approved the difference |
| `noise` | Noise | the reference differed from its own control run, so a difference cannot be told from the reference's own variation |
| `not_measured` | Not measured | nothing was recorded for this check. A missing record is never read as the same |
| `could_not_run` | Could not run | the run did not finish the check. This says nothing about the system |

Every cell carries one plain sentence, for example "Agreed in 5 of 5 runs (n = 5)." It also says
what its number of runs can support: 5 runs cannot support a claim of 99% agreement, which needs
299 runs with no disagreement.

**Noise** means the fix is in the check, not in a system: mask the field that changes and seal a
new set. A noise cell cannot be approved.

### One check's recorded outputs

The table holds hashes only. To see what differs, call `author_get_comparison_output` with the
`check` and two run ids, `a` and `b`. The cell names the runs behind it. You get both outputs and
their difference. The control plane keeps no response body: it reads each one from the execution
plane that ran the check and shows it only if it matches the recorded hash. A masked field shows
as `<masked>`. An execution plane keeps the outputs of its newest 20 comparison runs; after that
only the hashes remain.

## 6. Approve a difference

An approval accepts **one** difference you have looked at: one check, one system, with a reason.

1. Read the comparison. A cell that differs shows a `reference_hash` and a `member_hash`.
2. Look at the difference with `author_get_comparison_output`.
3. Call `author_approve_difference` with the `check`, the `member`, the two hashes exactly as you
   read them, and a `reason` of 1 to 500 characters.

What an approval changes: the cell reads Approved, and the verdict becomes
`same_with_approved_differences` once no other difference is left and there is no gap.

What it does not do:

- It does not turn a gap green. Noise, a cell that was not measured or could not run, a seed check
  and a load number that is worse cannot be approved.
- It covers one cell. The same difference on another system needs its own approval.
- It does not hide the next difference. The approval is tied to the two outputs you looked at. If
  either changes, the approval stops counting and the cell differs again.

`author_revoke_approval` withdraws an approval. It stays listed as revoked, with who withdrew it
and when.

Who approved is always the signed-in author, never something you type.

## What is written to the ledger

When your workspace certifies on a chain, a comparison is recorded there too. The chain carries
hashes only: no title, no system name, no reason and no approver. The records are permanent. The
`anchoring` block of `author_get_comparison` lists them, and the **Proof** page shows them. See
[Ledger and certificates](/argus-ledger) for how to look at a record.

An approval or a revocation can take up to 20 seconds to answer when the comparison is written to
a chain.

## In the Argus app

Open **Proof**, then **Comparisons**. The list shows each comparison with its verdict in words.
Open one: the verdict is at the top with every gap named first, then the table, with checks as
rows and systems as columns, the reference first. Press a cell to see the two recorded outputs,
the difference and the approvals, and to approve or revoke with a reason. Reading the outputs from
the execution planes can take up to 90 seconds.

## Limits

- A comparison has at most 8 systems, and a check at most 20 repeats.
- A response body over 1 MiB is not recorded.
- A mask, `Unordered` or `Tolerance` on a body that is not one JSON value means the output is not
  recorded, and the cell says so.
- Long token-shaped text is replaced before hashing, so two different long hex ids can read as the
  same. Mask such a field if it matters.
- A load number that is worse than its band cannot be approved.

## Related

- [Tester guide](/argus-tester-guide): writing and running scenarios
- [Ledger and certificates](/argus-ledger): sealing a set, and what a chain record proves
- [What Argus is](/argus)
