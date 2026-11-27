---
title: Claim witness — a signed answer to "is this claim backed by this evidence?"
nav: What the claim witness is
description: Your agent sends one claim and its evidence; the claim witness runs a fixed check and returns a signed record, SUPPORTED, NOT_SUPPORTED or CANNOT_WITNESS, that anyone can verify offline.
section: Claim witness
order: 44
---

Agents say things like "the tests pass", "the file says X", or "this page is live". The claim
witness checks one such claim against the evidence your agent sends, with a fixed method, and
returns a **signed record** of what it found. Your agent reaches it as an MCP server or as a plain
HTTP API.

- [Set up](/claim-witness-setup): account, credits, key, and connecting your agent. About 10 minutes.
- [Daily use](/claim-witness-daily-use): which check to use, examples, keeping and sharing records,
  verifying them offline, and what each refusal means.

> **Preview.** The claim witness runs on OneDroid's development environment
> (`claims-dev.onedroid.ai`, `app.onedroid.ai`). Records are signed with the development key
> `witness:onedroid-dev:2026a`. There is no production service yet.

## The three answers

| Outcome | Meaning |
| --- | --- |
| `SUPPORTED` | The method found what the claim says, in the evidence you sent. |
| `NOT_SUPPORTED` | The method found the opposite: the quote is absent, a test failed, the files differ. |
| `CANNOT_WITNESS` | The method could not decide, for example a test log in a format it cannot read. This is **not** a negative finding. |

Every answer also carries a `finding` and a `reason` (for example `tests-failed`, `unreadable`)
and one plain sentence saying what was checked.

## What it proves, and what it does not

The witness checks **the bytes you send**. It never reads your repository, your machine or your
accounts. So it catches a claim that does not match its evidence: the quoted line is not in the
file, the test log shows a failure, the language models say the evidence does not support the
sentence. It cannot tell whether the evidence itself is genuine: a test log your agent made up
will be read like a real one. Each record says this in its `limits` field.

## The checks

Nine of the ten methods are plain code. One, `judge.supports`, asks language models.

| Method | Checks | Evidence |
| --- | --- | --- |
| `match.exact` | two files are byte-identical | two files |
| `quote.in-source` | a quoted passage is in a file | one file and the quote |
| `tests.pass` | a test log reports at least one test and no failures (Jest `--json`, `go test -json`, JUnit XML, or pytest's summary line) | the log |
| `judge.supports` | one to five language models read the evidence and judge one sentence | 1 to 5 files |
| `page.live` | a web page answers | its address |
| `match.text` | a file's text is on a web page | a file and the page |
| `match.screenshot` | a screenshot is consistent with a web page (private checks only) | an image and the page |
| `post.by-author` | a Bluesky post was published by a handle | the post's address |
| `record.valid` | an earlier record is validly signed and sealed | its id and the key list |
| `record.disclose` | publishes an earlier private record unchanged | its id and disclosure |

`claim_methods` (or `GET https://app.onedroid.ai/bff/v1/witness/methods`, no key needed) lists
every method with its slots, parameters and limits.

## Signed, sealed, and kept only if you ask

- **Signed at once.** Every check returns a record signed by the witness key, in the in-toto/DSSE format.
- **Sealed within about an hour.** The record's fingerprint goes into a batch. The batch closes every
  hour and is anchored on Base Sepolia (a public chain) and on OneDroid's own chain. Until then the
  seal reads `pending`. Only the fingerprint goes on a chain, never content. This happens for every
  check and cannot be turned off.
- **Kept only when you ask.** The witness holds the answer, encrypted, for 24 hours so that a retry
  gets the same answer. After that, only the record's fingerprint and its seal stay with OneDroid.
  Your agent holds the record. To keep it with OneDroid (to share it or list it later), call
  `claim_keep`. Evidence files are stored only if you ask for that as well.
- **Private by default.** A private record shows anyone only fingerprints. You can share it with a
  link, or publish it later. A public record is readable and searchable by anyone.

## Price

Credits pay for checks. 1 credit is US$0.001. To get credits, email michal@onedroid.ai.

| What | Credits |
| --- | --- |
| A check with no model over files you send (`match.exact`, `quote.in-source`, `tests.pass`, …) | 1 |
| A check with no model over a page or an observation (`page.live`, `match.text` on a url or an observation id) | only its fresh observations: 0 when it reuses an observation |
| `judge.supports` | 1, plus each model's credits per run: 10 for each model on today's list (11 with one model, 51 with five); a model not on the list costs what OpenRouter charges for the run plus 2, never more than `max_credits_per_run` |
| A page observation | 5, and the first 50 fresh observations a day are free |
| Stored evidence files | 1 per MB per month |

`claim_price` (or `GET https://app.onedroid.ai/bff/v1/witness/price`) gives the current list and
the models a judged check can use.
