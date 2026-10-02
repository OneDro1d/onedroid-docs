---
title: "Example: Documenso (local Docker Compose)"
nav: "Example: Documenso"
description: Documenso v2.19.0 onboarded to Argus on local Docker Compose and registered with a control plane — the patch, the config, four scenarios, planted failures and every problem hit.
section: Argus
order: 36
---

> Contributed by Piotr Podgorni; tested with Argus 0.3.50 on 2026-10-02. Part of
> [Argus onboarding examples](/argus-onboarding-examples). If this page and the general docs
> ([Tester guide](/argus-tester-guide), [Quickstart](/argus-quickstart)) disagree, follow the
> general docs.

## What you end up with

This guide takes Documenso v2.19.0, an open-source document-signing app, from nothing to an Argus
instance whose test runs show on your control plane's web pages. Steps 1 to 6 were run on
2026-10-01 and 2026-10-02 on a MacBook Air (Apple silicon, Docker Desktop) and worked. Where
something was not run, the guide says so.

At the end you have:

- Documenso running in Docker Compose on your machine, at http://localhost:3200
- an Argus instance registered with your Argus control plane, on the **local Docker Compose** tier
- 4 test scenarios in the control plane, each checking the HTTP status and 5 fields of the response
- each run visible on the control plane's Runs page, with Documenso's own log line for the request
  findable by the run's id

This guide adds what is specific to Documenso: a one-line patch, the config, the scenarios, and the
problems we hit.

## Before you start

You need about 45 minutes, most of it the Documenso image build. Check these first:

| Need | Why | How to check |
|---|---|---|
| Docker Desktop, running | Documenso and Argus both run as containers | `docker info` answers |
| bash 4.4 or newer, first on PATH | macOS ships bash 3.2; onboarding stops on it | `bash --version` |
| Claude Code | the two Argus agents run in it | `claude --version` |
| Read access to the Argus execution-plane image | the image is private; your control plane's operator gives you the image and access | `docker login` to its registry, then Step 3 |
| An account on your Argus control plane | onboarding signs you in through a browser | open the control plane and sign in |
| Host ports 3000, 9095, 9765 and 3200 free | Argus's shared Grafana (3000) and Prometheus (9095), the Argus router (9765), and Documenso (3200) | `lsof -nP -iTCP:3000 -iTCP:9095 -iTCP:9765 -iTCP:3200 -sTCP:LISTEN` prints nothing, or only the Argus router on 9765 |

Onboarding also gives the instance's executor one port between 8765 and 8790 on 127.0.0.1. It picks
a free one itself.

On a Mac, install bash and put it first on PATH in every terminal you use for Argus:

```bash
brew install bash
export PATH="/opt/homebrew/bin:$PATH"; exec bash
```

The examples below use one folder, `~/argus-documenso`, with the Documenso source, its compose file
and the two agent folders inside it.

## Step 1 — Run Documenso with the request-ID patch

Documenso must log the request ID that Argus sends, or Argus cannot find the app's log line for a
run. Out of the box, Documenso's API v2 makes up its own ID for every request
(`packages/trpc/server/context.ts:38`). A one-line patch makes it reuse the caller's `X-Request-Id`.

**1a. Get the source and patch it**

```bash
mkdir -p ~/argus-documenso && cd ~/argus-documenso
git clone --depth 1 --branch v2.19.0 https://github.com/documenso/documenso && cd documenso
perl -pi -e 's/requestId: alphaid\(\),/requestId: c.var.requestId ?? alphaid(),/' packages/trpc/server/context.ts
grep -c 'requestId: c.var.requestId ?? alphaid(),' packages/trpc/server/context.ts   # must print 1
```

**1b. Build the image** (about 10 minutes; the image is about 2.2 GB)

```bash
docker build -f docker/Dockerfile -t documenso-local:2.19.0-reqid .
cd ..
```

**1c. Make the settings file** `~/argus-documenso/.env`. It holds generated secrets, so never
commit it.

```bash
P="$(openssl rand -hex 16)"
DB="postgresql://documenso"     # database user documenso; its password is $P
cat > ~/argus-documenso/.env <<EOF
POSTGRES_USER=documenso
POSTGRES_PASSWORD=$P
NEXTAUTH_SECRET=$(openssl rand -hex 32)
NEXT_PRIVATE_ENCRYPTION_KEY=$(openssl rand -hex 32)
NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY=$(openssl rand -hex 32)
NEXT_PRIVATE_DATABASE_URL=$DB:$P@database:5432/documenso
EOF
```

**1d. Save the compose file** as `~/argus-documenso/compose.yml`. Use this one rather than
Documenso's own `docker/production/compose.yml`: that file needs SMTP settings and a signing
certificate mounted from the host, and fails on Docker Desktop.

```yaml
name: documenso-production

services:
  database:
    image: postgres:15
    environment:
      POSTGRES_USER: ${POSTGRES_USER:?set in .env}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set in .env}
      POSTGRES_DB: documenso
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d documenso']
      interval: 5s
      timeout: 5s
      retries: 10
    volumes:
      - database:/var/lib/postgresql/data

  # catches Documenso's emails (the signup link): http://localhost:8025
  mailpit:
    image: axllent/mailpit:latest
    ports:
      - 8025:8025

  documenso:
    image: documenso-local:2.19.0-reqid
    depends_on:
      database:
        condition: service_healthy
    environment:
      PORT: 3100
      NEXT_PUBLIC_WEBAPP_URL: http://localhost:3100
      NEXT_PRIVATE_INTERNAL_WEBAPP_URL: http://localhost:3100
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:?set in .env}
      NEXT_PRIVATE_ENCRYPTION_KEY: ${NEXT_PRIVATE_ENCRYPTION_KEY:?set in .env}
      NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY: ${NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY:?set in .env}
      NEXT_PRIVATE_DATABASE_URL: ${NEXT_PRIVATE_DATABASE_URL:?set in .env}
      NEXT_PRIVATE_DIRECT_DATABASE_URL: ${NEXT_PRIVATE_DATABASE_URL:?set in .env}
      NEXT_PUBLIC_UPLOAD_TRANSPORT: database
      NEXT_PRIVATE_SMTP_TRANSPORT: smtp-auth
      NEXT_PRIVATE_SMTP_HOST: mailpit
      NEXT_PRIVATE_SMTP_PORT: 1025
      NEXT_PRIVATE_SMTP_UNSAFE_IGNORE_TLS: "true"
      NEXT_PRIVATE_SMTP_FROM_NAME: Documenso local
      NEXT_PRIVATE_SMTP_FROM_ADDRESS: documenso@localhost
    ports:
      - 3200:3100   # host 3200; on our machine host 3100 was taken (see Troubleshooting)

volumes:
  database:
```

The project name `documenso-production` and its network `documenso-production_default` are what
Argus's config points at in Step 2. Keep them.

**1e. Start it and check**

```bash
cd ~/argus-documenso && docker compose up -d
curl -s localhost:3200/api/health      # "database":{"status":"ok"}; a certificate warning is expected
```

Documenso listens on 3100 inside its container and on 3200 on your machine. Argus reaches it from
inside the network as `documenso:3100`; you use http://localhost:3200 in the browser.

## Step 2 — Prepare the agent folders, config and scenarios

Argus needs two things from Documenso: a read-only database user and an API token. Then you write
one config file and four scenario files.

**2a. Read-only database user** for Argus. Pick a password and keep it for 2d.

```bash
cd ~/argus-documenso
docker compose exec database psql -U documenso -d documenso \
  -c "CREATE ROLE argus_ro LOGIN PASSWORD '<pick one>'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO argus_ro;"
```

**2b. API token.** Sign up in Documenso, confirm the email in Mailpit at http://localhost:8025, sign
in, then open Settings → API Tokens and create a token. Argus sends it as
`Authorization: Bearer <token>`, which Documenso accepts.

Check both before going on. Without the token the API answers 401; with it, 200:

```bash
curl -s -o /dev/null -w '%{http_code}\n' localhost:3200/api/v2/document                                    # 401
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer <token>" localhost:3200/api/v2/document # 200
```

**2c. Two agent folders**, separate and not inside each other:

```bash
mkdir -p ~/argus-documenso/product-agent ~/argus-documenso/test-agent/scenarios
```

**2d. Secrets for Argus** in `~/argus-documenso/product-agent/.env`. Never commit this file. It has
two lines, each written as `NAME=value`:

| Name | Value |
|---|---|
| `DOCUMENSO_RO_PASSWORD` | the `argus_ro` password you picked in 2a |
| `DOCUMENSO_API_TOKEN` | the API token you created in 2b |

**2e. The config** `~/argus-documenso/product-agent/argus-config.yaml`:

```yaml
project:
  name: documenso
targets:
  http:
    base_url: http://documenso:3100/api/v2   # Argus uses only scheme://host:port; the /api/v2 path is in each scenario
  database:
    type: postgres
    jdbc_url: jdbc:postgresql://database:5432/documenso
    username: argus_ro
    password: ${DOCUMENSO_RO_PASSWORD}
  auth:
    type: bearer
    bearer_token: ${DOCUMENSO_API_TOKEN}
deploy:
  compose_project: documenso-production
  network: documenso-production_default
observability:
  loki:
    log_format: json
    correlation_field: requestId     # Documenso's field; carries X-Request-Id thanks to the Step 1 patch
    level_field: level               # pino numbers: 30 info, 40 warn, 50 error, 60 fatal
    error_match: "40|50|60"
    saga_event_field: event_type
    saga_event_value: saga
  grafana:
    public_url:
      compose: http://localhost:3000
```

Every address is written as the Argus executor sees it from inside Documenso's Docker network:
`documenso` and `database` are the compose service names. Never `localhost`.

Argus keeps only the scheme, host and port of `base_url` and takes the path from each scenario.
From v0.3.51, `validate-config` warns when `base_url` carries a path, and names the cure. You can
also write `base_url: http://documenso:3100` and lose nothing.

**2f. Four scenarios** in `~/argus-documenso/test-agent/scenarios/`. Each is a read-only GET that
needs no IDs. Here is `RT-GET-document.md`:

```markdown
# Scenario: GET /document

## Metadata
- **ID**: RT-GET-document
- **Layer**: HTTP Ingestion
- **Tags**: http

## TRIGGER
GET `${INGESTION_URL}/api/v2/document`
X-Request-Id: ${correlation_id}

## VERIFY
N/A — the HTTP Ingestion layer judges the response directly.

## EXPECT
### Runnable
- status=200

## TIMEOUT
30s

## CLEANUP
N/A — a GET creates nothing.
```

Make the other three by changing the title, the ID and the path: `RT-GET-envelope`
(`/api/v2/envelope`), `RT-GET-folder` (`/api/v2/folder`) and `RT-GET-template`
(`/api/v2/template`).

Two lines in every scenario matter:

- the path starts with `/api/v2`, because Argus drops the path part of `base_url`. The
  `${INGESTION_URL}` in front of it stands for the scheme, host and port that Argus takes from
  `base_url`.
- `X-Request-Id: ${correlation_id}` is what puts the run's ID into Documenso's log. Argus itself
  sends only `X-Correlation-Id`, and there is no config setting to rename it. Argus fills
  `${correlation_id}` with the scenario's correlation id in every header line it sends.

The scenarios check only the status for now. Step 6 adds the response checks.

## Step 3 — Check this machine

Run these in the bash terminal from "Before you start". They change nothing.

```bash
bash --version | head -1                                  # 4.4 or newer
docker info >/dev/null && echo "Docker is running"
docker compose version                                    # version 2
curl --version | head -1
claude --version
docker manifest inspect <execution-plane-image> >/dev/null && echo "the Argus image can be read"
```

Every one must succeed before you go on. `kubectl` and `k3d` are not needed on this tier: they are for
the Kubernetes tiers only.

## Step 4 — Onboard as a registered instance

Onboarding runs from a **kit**: the onboarding scripts and compose files that ship inside the Argus
image. `argus init` extracts them. Run it from the image, then run the kit's onboarding script for
the compose tier:

```bash
ID="documenso-<you>-compose"     # unique across all users of your control plane; see below
KIT="$HOME/argus-kits/$ID"
mkdir -p "$KIT"
docker run --rm -v "$KIT":/out <execution-plane-image> init /out
cd "$KIT"
bash onboarding/onboard.sh --tier compose \
  --product-dir "$HOME/argus-documenso/product-agent" \
  --test-dir "$HOME/argus-documenso/test-agent" \
  --instance-id "$ID" \
  --control-plane <your-argus-control-plane-url> \
  --image <execution-plane-image>
```

Put your own initials in the ID; ours was `documenso-pp-compose`. Use lowercase letters, digits and
hyphens, and keep it to 22 characters or fewer: when a name is taken, onboarding proposes the same
name with `-v1` added. A browser window opens part way through: sign in to your control plane with
your usual account.

Onboarding registers the instance with the control plane, starts the executor as the compose project
`argus-inst-<ID>` inside Documenso's network, starts the shared Grafana and Prometheus (compose
project `argus-obs`), starts the router (compose project `argus-router`, on 127.0.0.1:9765),
imports your scenarios, and connects the two agent folders.

It ends with a headline. Ours, shortened:

```
ALL SET — ARGUS MCP IS UP AND RUNNING.
DOCUMENSO-PRODUCTION AS SUT IS ONBOARDED AND READY TO BE TESTED.
Control plane:  <your-argus-control-plane-url>
Grafana:        http://localhost:3000   dashboard: present | datasource: present
Instance:       documenso-pp-compose    (executor REGISTERED; polling for cloud runs)
Scenarios:      imported 4 of 4
TEST agent:     cd "/Users/<you>/argus-documenso/test-agent" && claude      # 16 tools
PRODUCT agent:  cd "/Users/<you>/argus-documenso/product-agent" && claude   # 6 tools
```

How to read the result:

- **ALL SET**: go on to Step 5.
- **PARTIALLY SET**: the reason is printed next to it.
- **Exit 3**: the instance *is* registered, but something was not ready yet. Do not tear it down;
  wait a few minutes and look at the Environments page of your control plane.
- **A different instance name** (for example `-v1` added): the name was taken. Use the printed name
  from then on.

Onboarding adds its own entries to `.mcp.json` and `.claude/settings.local.json` in both folders and
keeps what was there. Add both files to `.gitignore`: `.mcp.json` holds a token for the router.

## Step 5 — Run the scenarios and find them on the web

You run scenarios from the **test agent**, a Claude Code session in the test folder. Runs go through
the control plane, so they show on its Runs page.

```bash
cd ~/argus-documenso/test-agent && claude
```

Give it this prompt, with your own instance name:

> Instance is `documenso-<you>-compose`. Use `author__get_executor_status` to confirm the executor
> is healthy. Then list the catalog with `author__list_scenarios`. Then request a run of each of
> RT-GET-document, RT-GET-envelope, RT-GET-folder and RT-GET-template with `author__request_run`,
> one at a time, waiting for each with `author__get_run_status` before starting the next. Give me
> the run id and result of each.

Run them **one at a time**. An instance runs one run at a time. A second `author__request_run` is not
lost: it waits in the queue until the first run ends. A run started directly on the instance while
another is in progress is refused as busy. Waiting for each run keeps each run id matched to its
result.

All four should pass. Then open your control plane and find the four runs on the Runs page under
your instance.

**Check that Documenso logged the run.** The run's correlation ID starts with `tr-<run id>`. Count
Documenso's log lines that carry it:

```bash
docker logs documenso-production-documenso-1 2>&1 | grep -c "tr-<run id>"     # 1 or more
```

`0` means the Step 1 patch is not in the running image.

**Do not be misled by `assertions_enforced_count: 0`.** That number counts only checks on the
response *contents*. The status check is applied but never counted. You can see it work in Step 6.
From v0.3.51 the report also carries `observed_status`, the HTTP status the app returned.

## Step 6 — Add response checks, and prove each check can fail

A status-only scenario passes as long as the endpoint answers 200. Documenso's API description says
all four endpoints always return `data`, `count`, `currentPage`, `perPage` and `totalPages`, so check
those too.

**6a. Add five checks to each scenario.** Under `### Runnable`, after `status=200`:

```markdown
- body has data
- body has count matching ^[0-9]+$
- body has currentPage matching ^[1-9][0-9]*$
- body has perPage matching ^[1-9][0-9]*$
- body has totalPages matching ^[0-9]+$
```

These are plain HTTP scenarios. They support these content checks:

| Check | Example | Meaning |
|---|---|---|
| field exists | `body has data` | the field is in the JSON response |
| field matches a pattern | `body has count matching ^[0-9]+$` | the value matches the regular expression |
| field contains text | `body has status containing ok` | the value contains the text |
| field equals a value | `body has currentPage equals 1` | see the warning below |

Use a pattern for numbers: `^[0-9]+$` is a whole number (0 or more), `^[1-9][0-9]*$` is 1 or more.
Number comparisons (`>`, `>=`, `<`, `<=`) are refused for plain HTTP scenarios; a chain step or an
MCP scenario can use them.

⚠️ **`equals` on Argus 0.3.50 and earlier**: it is accepted, but checked as "contains", so
`currentPage equals 1` also passes on 10. Use a pattern instead (`^1$`). From v0.3.51, `equals` is
an exact match.

Give the test agent this prompt:

> For each of the 4 scenarios, add the five bullets above under `### Runnable` after `status=200`.
> Validate each with `author__validate_scenario`, write with `author__write_scenario`, then re-run
> all 4 with `author__request_run`, one at a time. Report pass/fail and `assertions_enforced_count`
> per scenario. Then sync the local files in scenarios/ with the catalog.

Expect all four to pass with `assertions_enforced_count` 5.

**6b. Prove the checks can fail.** A check you have never seen fail may be checking nothing. Plant
one wrong expectation of each kind, watch it fail, then delete it:

> Create three temporary copies of RT-GET-document: **RT-GET-document-planted-status** with
> `status=404` instead of `status=200`; **RT-GET-document-planted-pattern** with the extra bullet
> `- body has count matching ^-`; **RT-GET-document-planted-field** with the extra bullet
> `- body has no_such_field`. Run each, show that all three FAIL with their failure messages, then
> delete all three with `author__delete_scenario`.

What ours said:

| Planted scenario | Result | Failure message |
|---|---|---|
| planted-status | failed | expected `status=404`, observed "responder returned status 200 (codes=[200])" |
| planted-pattern | failed | "status matched but the response body did not satisfy the scenario's body assertion" |
| planted-field | failed | the same message as planted-pattern |

A failed content check does not say *which* check failed. Plant one wrong check per scenario so you
know which one it was.

## Troubleshooting

Every row below happened during our run, on 2026-10-01 or 2026-10-02, with Argus 0.3.50.

| What you see | Cause | Fix |
|---|---|---|
| Onboarding fails early with a bash syntax error | macOS's own bash 3.2 ran the script | `export PATH="/opt/homebrew/bin:$PATH"; exec bash`, then run it again. From v0.3.51 onboarding checks the bash version first and prints this fix. |
| `docker pull` of the Argus image answers 403 | your registry account cannot read the private image yet | ask your control plane's operator for read access |
| A raw Docker error that port 3000 or 9095 is taken | another Grafana or Prometheus stack is running (in our case an old stack from another tool and an earlier Argus project) | find it with `lsof -nP -iTCP:3000 -iTCP:9095 -sTCP:LISTEN` and stop it with `docker compose -p <project> stop` |
| The agents fail with "unrecognized router token" | an older router from another tool holds 127.0.0.1:9765 | stop that container; onboarding starts its own router as the compose project `argus-router`. From v0.3.51 onboarding says when another process answers on that port. |
| A container named `argus-router` clashes during onboarding | that router was started by hand with `docker run` | `docker rm -f argus-router`; onboarding starts a fresh one |
| Every scenario returns 404 | the scenario path lacks `/api/v2`: Argus keeps only scheme://host:port of `base_url` | start each path with `${INGESTION_URL}/api/v2/` |
| Documenso will not start on host port 3100 | something else held host port 3100 (on our machine, the Loki of an earlier Argus project; a registered compose instance does not publish its own Loki on the host) | publish Documenso on 3200 (`3200:3100`), as in Step 1 |
| Documenso's own compose file fails | it needs SMTP settings and a certificate mounted from the host | use the compose file from Step 1 |
| The log check in Step 5 prints 0 | the running image lacks the request-ID patch | rebuild the image from Step 1 and run `docker compose up -d` again |
| The test agent says status was "never checked" | it read `assertions_enforced_count: 0` | that count leaves out the status check; the planted-status scenario in Step 6 proves the check works |
| The validator refuses `>=`, `>`, `<` or `<=` | number comparisons do not work in plain HTTP scenarios | use a pattern instead, as in Step 6 |

One thing we have **not** tested: in Step 1, `NEXT_PUBLIC_WEBAPP_URL` says port 3100, but Documenso
is on 3200 on your machine. We created our API token while Documenso was still on 3100. If a link
from Documenso or Mailpit opens `localhost:3100`, change it to 3200 in the address bar.

## Removing it again

Teardown removes Argus's instance from your machine and from the control plane, with the instance's
scenarios and run history. It leaves Documenso running. Save any scenario you want to keep first. We
have **not** run it for this instance yet.

Run it from the kit that onboarded the instance:

```bash
cd ~/argus-kits/<ID>
bash onboarding/teardown.sh --tier compose --instance-id <ID> \
  --control-plane <your-argus-control-plane-url> --no-sign-in
```

It removes the executor project `argus-inst-<ID>` with its volumes, the registration, and the
instance's keys and tokens. On 0.3.50 it leaves files behind in the kit folder `~/argus-kits/<ID>`,
including the kit's copy of your app's secrets. From v0.3.51 teardown removes those too, and the kit
folder itself when nothing else uses it.

The shared Grafana and Prometheus (compose project `argus-obs`) stay, because other instances on the
machine may use them, and they read files from the kit of the instance that started them. After the
last Argus instance on the machine is torn down, and only then, remove them:

```bash
docker rm -f argus-obs-grafana-1 argus-obs-prometheus-1
docker volume rm argus-obs_obs-grafana-data argus-obs_obs-prometheus-data
docker network rm argus-obs-net
```

Then delete the kit folder by hand if it is still there.

Stop Documenso when you no longer need it:

```bash
cd ~/argus-documenso && docker compose down        # add -v to delete its database too
```

## Reference run, 2026-10-02

Instance `documenso-pp-compose`, Argus 0.3.50 (image `sha256:31f99200b14c…`), MacBook Air with Apple
silicon and Docker Desktop. Every run below went through the control plane and is on the Runs page
of the control plane we used.

| Run id | Scenario | Result | Content checks enforced |
|---|---|---|---|
| 20261002T102414259 | RT-GET-document-planted-field | failed, as planted | 6 |
| 20261002T102405000 | RT-GET-document-planted-pattern | failed, as planted | 6 |
| 20261002T102333246 | RT-GET-template | passed | 5 |
| 20261002T102323801 | RT-GET-folder | passed | 5 |
| 20261002T102315092 | RT-GET-envelope | passed | 5 |
| 20261002T102305593 | RT-GET-document | passed | 5 |
| 20261002T101900823 | RT-GET-document-planted-status | failed, as planted (got 200) | 0 |
| 20261002T101108352 | RT-GET-template, status only | passed | 0 |
| 20261002T101100262 | RT-GET-folder, status only | passed | 0 |
| 20261002T101048801 | RT-GET-envelope, status only | passed | 0 |
| 20261002T101007186 | RT-GET-document, status only | passed | 0 |

Documenso's own log held 1 line with the ID of run `20261002T102305593`
(`docker logs documenso-production-documenso-1 | grep -c`).
