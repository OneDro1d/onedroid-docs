---
title: Claim witness daily use — checks, records, sharing and verifying
nav: Daily use
description: Which check to run for which claim, copy-paste examples with the answers they give, keeping and sharing records, verifying offline, and what each refusal means.
section: Claim witness
order: 44.6
---

Every example below was run against the live service. The tool arguments are what your agent
sends to `claim_check`; you normally just ask your agent in words and it builds them.

## Pick a check

| The claim | Use |
| --- | --- |
| "These two files are the same" | `match.exact` |
| "The file contains this line" (the line comes from the claim, not from the file) | `quote.in-source` |
| "The tests pass" / "this test fails" | `tests.pass`, if the log is Jest `--json`, `go test -json`, JUnit XML or pytest output; otherwise `judge.supports` |
| "This code does X", "the report says Y" | `judge.supports` |
| "The page is up" | `page.live` |

Ask for one claim per check. There is no batch call: ten claims are ten checks.

## Examples

`content_b64` is the file's bytes in standard base64. Over MCP the tool computes the `sha256`.

### A quote is in a file

```json
{"method": "quote.in-source",
 "params": {"quote": "return sum(i.price for i in items)"},
 "evidence": [{"slot": "source", "kind": "object", "media_type": "text/x-python", "name": "billing.py", "content_b64": "…"}]}
```

`SUPPORTED`, finding `quote-found`, 1 credit. The same check with a quote that is not in the file
answers `NOT_SUPPORTED`, finding `quote-absent`. The match is exact (letter case kept), so quote
the claim word for word.

### The tests pass

```json
{"method": "tests.pass",
 "evidence": [{"slot": "log", "kind": "object", "media_type": "text/plain", "name": "pytest.txt", "content_b64": "…"}]}
```

| Log ends with | Answer |
| --- | --- |
| `===== 5 passed in 0.31s =====` | `SUPPORTED`, `tests-passed` |
| `===== 1 failed, 4 passed in 0.40s =====` | `NOT_SUPPORTED`, `tests-failed` |
| `Tests: 5 passed, 5 total` (npm/vitest text) | `CANNOT_WITNESS`, `unreadable`: not a format this method reads |

Add `"params": {"expect_commit": "<git sha>"}` to also require the log to name that commit.

### Language models judge a sentence

```json
{"method": "judge.supports",
 "statement": "The function total() adds up the price of every item it is given.",
 "evidence": [{"slot": "evidence", "kind": "object", "media_type": "text/x-python", "name": "billing.py", "content_b64": "…"}],
 "options": {"allow_provider": true, "models": {"count": 1}}}
```

`SUPPORTED`, `judged-supports`, 11 credits, about 2 seconds.

- **`allow_provider: true` is required on a private check**, because the evidence is sent, through
  OpenRouter, to one or more AI models the witness has selected: commercial, publicly available or
  open-weight models, run by their makers or by hosting providers. The models in use and their prices
  are in `claim_price`. Without it: `422 provider-not-allowed`, nothing charged.
- `models` is one of two shapes. `{"count": n}` (1 to 5) asks the top n models of the ranked list
  (`claim_price`), rank 1 first. `{"ids": ["vendor/model", ...]}` (1 to 5, no repeats) asks exactly those
  models: listed ones, or any plain OpenRouter model id, with `max_credits_per_run` (1 to 1,000, default 50)
  capping each unlisted run. `require` (default: all) is how many must agree. A decision model answers with
  probabilities and no quotes; a chat model quotes the evidence and the witness checks each quote.
  `claim_price` lists the models.
- 1 to 5 evidence files, up to about 200,000 tokens. The statement is at most 4,000 characters.
- Evidence that looks like instructions to a model ("ignore previous instructions", `system:` at
  the start of a line, chat tokens) is not sent to any model: the answer is `CANNOT_WITNESS`,
  reason `possible-injection`, and only the 1-credit check is charged.
- `NOT_SUPPORTED` comes from `judged-contradicted`; `judged-silent` (the evidence does not say)
  gives `CANNOT_WITNESS`.

### A page is live

```json
{"method": "page.live", "params": {"url": "https://example.org/"},
 "evidence": [{"slot": "page", "kind": "url", "url": "https://example.org/", "capture": "page"}]}
```

`SUPPORTED`, `live`, about 6 seconds. Free within the first 50 fresh observations a day, 5 credits after.

## Retries are free; long checks come back later

- Give each check an `idempotency_key` (any string up to 128 characters). Repeating the same
  check with the same key answers the same record and is charged once. The same key with
  different content inside 24 hours is refused (`409 idempotency-conflict`).
- Repeating a check over files (same claim, files, method, visibility, label and key) inside
  24 hours, even under a new idempotency key, gives back the same record: the answer has
  `"replayed": true` and price 0, and is not charged again. To get a new record, change the
  `label`. Judged checks and checks over a web page always run again.
- A check that takes longer than `options.wait` seconds (default 10, at most 60) answers
  `{"job_id": "…", "pending": true}` instead. Ask `claim_job` with that `job_id` until its state
  is `done` (the answer is in it) or `failed`.

## Keep, share, delete

A record is held for 24 hours, then only its fingerprint and seal stay with OneDroid. To keep it:

1. **Keep**: `claim_keep` with `record_id`, `envelope` and, for a private record, `disclosure`
   (all three come from the check's answer). The answer includes its page,
   `https://onedroid.ai/evidence/r/<record_id>`. Keeping twice is harmless.
2. **List**: `claim_records` lists your kept private records.
3. **Share**: `claim_share_create` with `record_id` and `days` gives a link and a token **once**.
   Whoever has it can read the private record. `claim_share_list` shows your shares (never the
   tokens); `claim_share_revoke` with `record_id` and `share_id` (the `token_id`) ends one.
4. **Delete**: `claim_delete` deletes a private record's stored data and key. The signed envelope
   (fingerprints only) and its seal stay and still verify, and copies people already took stay
   with them. A public record is taken down instead, with `claim_takedown`.

### Public records need your consent

A public check (`options.visibility: "public"`), a public observation and keeping a public record
need your confirmation of this sentence: "I confirm the claim and evidence use only public
information, or information I am legally allowed to publish."

- Over MCP, pass `"consent": true` to `claim_check`, `claim_observe` or `claim_keep`, and only after
  you have confirmed it.
- Over HTTP, send `"consent": true` and
  `"consent_text_sha256": "a432fa62d8c782026ae715666ced72580edd19de6bea14f6db415242aef08bcb"`
  (the sha256 of that sentence) in the request body.

Without it the answer is `422 consent-required`, and nothing is charged. A private record needs no
consent.

To keep the evidence files too, pass `keep_evidence_days` (1 to 3,650) with the files to `claim_keep`.
That is charged per MB per month.

## Verify a record offline

Anyone can check a record without an account and without trusting OneDroid's servers.

1. Download the proof bundle: `claim_record` with `record_id` and `part: "bundle"` (a tar file), or
   `GET https://evidence.onedroid.ai/api/witness/records/<record_id>/bundle`.
2. Get the verifier, which is Python 3 standard library plus, if installed, `cryptography`:

   ```bash
   git clone -b v1/claim-witness https://github.com/OneDro1d/onedroid-witness
   mkdir bundle
   tar -xf bundle.tar -C bundle
   python3 onedroid-witness/claim_witness/verify.py --bundle bundle
   ```

3. Read the result. Every line is `PASS`, `FAIL` or `SKIP` with its name, and the last line is
   `RESULT: PASS` or `RESULT: FAIL`.

For a **private** record, add the disclosure from the check's answer (saved as JSON) and each
evidence file, to check the commitments and re-run the method:

```bash
python3 onedroid-witness/claim_witness/verify.py --bundle bundle \
  --disclosure disclosure.json --evidence a.txt --evidence b.txt
```

That adds `PASS claim-commitment`, `PASS body-commitment` and `PASS method-rerun`. Give each file
with its own `--evidence`; a folder is not accepted.

Once the seal is anchored (within about an hour), add `--rpc https://sepolia.base.org` to check the
anchor transaction on the public chain too. Before that, the seal line is
`SKIP seal: pending`, and the time of the record is not yet proven.

## Plain HTTP

The REST API takes the same checks. Two rules MCP handles for you:

- every file carries its `sha256` (64 lowercase hex) next to `content_b64`, or the check is
  `422 invalid-evidence`;
- the claim object has exactly five fields: `method`, `method_major`, `params`, `assertion`,
  `statement`.

```bash
cat > check.json <<'EOF'
{"claim": {"method": "match.exact", "method_major": 1, "params": {}, "assertion": true, "statement": null},
 "evidence": [
  {"slot": "submitted", "kind": "object", "media_type": "text/plain", "name": "a.txt",
   "sha256": "<sha256 of a.txt>", "content_b64": "<base64 of a.txt>"},
  {"slot": "target", "kind": "object", "media_type": "text/plain", "name": "b.txt",
   "sha256": "<sha256 of b.txt>", "content_b64": "<base64 of b.txt>"}],
 "options": {"visibility": "private"}}
EOF
curl -sS -X POST https://evidence.onedroid.ai/api/witness/checks \
  -H "Authorization: Bearer $ONEDROID_CLAIM_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d @check.json
```

A 202 answer has a `job_id`: poll `GET https://evidence.onedroid.ai/api/witness/checks/<job_id>`. The full REST reference is
https://evidence.onedroid.ai/docs/claim-witness.

## When a check is refused

A refusal is not a record and charges nothing.

| Answer | Meaning | What to do |
| --- | --- | --- |
| `401 unauthorized` | No key, or not a valid one | See [Set up](/claim-witness-setup#4-connect-your-agent) |
| `402 insufficient_credits` (`available`, `needed`) | Credits cannot cover the check | Add credits. To get credits, email michal@onedroid.ai. |
| `402 key_spend_limit` | This key is over its own spend limit | Raise it or use another key |
| `403 scope` | The key has no claim scope | Change the key's scope |
| `409 idempotency-conflict` | Same idempotency key, different check | Use a new key for a new check |
| `422 provider-not-allowed` | Judged private check without `allow_provider` | Add `"allow_provider": true` if the evidence may go to model providers |
| `422 invalid-evidence` | A file is missing a field, for example `sha256` over HTTP | Read `detail` |
| `422 personal-data` | A public check holds personal data | Make it private |
| `422 consent-required` | A public check, observation or keep without your consent | See [Public records need your consent](#public-records-need-your-consent) |
| `429` with `Retry-After` | Too many requests a minute, or too many credits this hour | Wait that many seconds, resend with the same idempotency key |

Over MCP each refusal is a tool error with `status` and `code`.
