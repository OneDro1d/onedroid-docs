---
title: Argus tester guide
nav: Tester guide
description: Write a scenario, enroll an execution plane, run it, monitor a live system, and read a red.
section: Argus
order: 32
---

This is for whoever authors and runs Argus scenarios against a system — a person, or the test
agent in a two-agent loop. [What Argus is](/argus) covers the holdout — the separation that
this guide's other half, the [Builder guide](/argus-builder-guide), lives behind.
[Argus quickstart](/argus-quickstart) gets your CLI and tokens working; this page assumes both.
An app gets a tester and a builder session, and you are the first of them: [Set up a tester and a
builder](/argus-session-setup) has the order (tester first: enroll, run once by hand, turn the
schedule on; then the builder is wired with a runner id) and the token table.
If anything on this page refuses you, run `argus doctor --control-plane <url>` (CLI v0.3.45 or
later) before anything else: it names the cause and prints the fix.

## Your workspace

Everything you author and run is scoped to a **workspace** — one per system under test, in the
common case. Your **author token** (`ARGUS_CP_AUTHOR_TOKEN`) is bound to it: `argus cloud-list-workspaces` shows what you can
reach, and `argus cloud-switch-workspace` changes which one later commands act on.

A token bound to one workspace acts only inside that workspace. It cannot onboard or tear down an
instance. For that, use the workspace owner's sign-in or a token that covers all workspaces.

## Enrolling an instance

To see one real app taken through onboarding from start to finish, with its config and scenarios,
read [Onboarding examples](/argus-onboarding-examples).

An **instance** is one execution plane, running next to one system, identified by an
`instance_id`. Standing one up is an operator-level step — it needs somewhere to run the
execution plane (a compose stack, a container namespace, or a cluster namespace next to your
system) and, for a cloud-registered instance, a short-lived **enrollment token**:

```bash
argus cloud-enroll --control-plane "$ARGUS_CP_URL" --instance-id <instance-id>
```

The enrollment token this mints is deliberately short-lived — it authorizes the execution
plane's *first* introduction to the control plane, nothing after. Once the instance is up,
check it the same way every time, because registered and reachable are different claims:

```bash
argus cloud-executor-status --control-plane "$ARGUS_CP_URL" --instance-id <instance-id>
```

`"registered": true` alone is not enough — an instance can register once and then be refused on
every later poll. Want both to be true before you trust anything else about the instance.

### Onboarding notes (v0.3.63 or later)

- **Credential files are created 0600.** On the Docker (compose) path, `deploy/compose/env.<id>`,
  the secrets file and the identity key file used to be readable by every user on the machine. They
  are now created readable by you only, and tightened where they already exist. A kit you onboarded
  earlier is fixed only when it onboards again. Until then run
  `chmod 600 <kit>/deploy/compose/env.*`.
- **A workspace-bound token is refused with a plain message.** The first refused call says that
  such a token cannot onboard or tear down. Use the owner's sign-in or a token that covers all
  workspaces. See [Your workspace](#your-workspace).
- **Docker has no address range left (v0.3.64 or later).** Each Docker (compose) instance has its
  own network. At about the 31st on one machine, Docker answers "all predefined address pools have
  been fully subnetted". Onboarding now names that as the cause. It is not a problem with your
  system or your files. To free a range, run `docker network prune` (it removes networks no
  container uses), or give Docker a wider `default-address-pools` in its `daemon.json`, restart
  Docker and onboard again.

### Installing into a Kubernetes cluster

You do not need Docker for this. The execution plane runs as a pod in its own namespace, in
any cluster that can reach your system, and it talks to the control plane **outbound only**
over HTTPS. Nothing has to reach into your cluster. It does not have to run next to your
system either: an execution plane in one cluster can test an app hosted somewhere else, as
long as it can reach that app's endpoints.

You need `kubectl` access to create a namespace in that cluster, and the `argus` CLI.

**1. Check the cluster first.** This creates nothing, and it names the fix for anything missing:

```bash
argus preflight --tier <tier> --kube-context <your-kube-context> --control-plane "$ARGUS_CP_URL"
```

The tier picks the storage class for the results volume and how the observability services
are exposed. `argus preflight --tier` takes `aks`, `k3d` or `managed`; `argus render-k8s --tier`
takes those and `eks` and `gke` (`argus preflight --help` and `argus render-k8s --help` list them):

| Tier | Use it for | Storage class it uses |
|---|---|---|
| `k3d` | a local k3d cluster. Use it for kind and minikube too: it renders identically | `argus-rwx`, a shared class you install first (preflight says how) |
| `aks` | Azure Kubernetes Service | `azurefile-csi` |
| `managed` | any other cluster, including one you run yourself (k3s, kubeadm) | `local-path`, unless you pass `--storage-class` |
| `eks`, `gke` | Amazon EKS and Google GKE (`render-k8s` only) | the same as `managed` |

`kind`, `minikube` and `k3s` are **not** tiers. `render-k8s` refuses them before it writes
anything, and `preflight` reports the tier as blocking. The refusal says which tier to use
instead: `k3d` for kind and minikube, `managed` for k3s.

On a `managed` cluster, pass `--storage-class <a class your cluster has>` in step 3.
`kubectl get storageclass` lists them. ⚠️ Passing `--storage-class` on its own requests
ReadWriteMany. Most cloud block-storage classes only support ReadWriteOnce, so with one of
those also pass `--results-access-mode ReadWriteOnce`, or the volume never binds. ReadWriteOnce
limits the execution plane to one replica. That works, but the pod doesn't survive losing its
node.

Always pass a tier. An empty tier, or a class your cluster doesn't have, leaves the volume
unbound, and the pod waits for it forever.

**2. Mint the enrollment token.** From here to step 5 you have 15 minutes before the token
expires. If it does, nothing breaks: mint a new one and start again from here.

```bash
argus cloud-enroll --control-plane "$ARGUS_CP_URL" --instance-id <instance-id> --token-dir <a-private-dir>
```

The instance id becomes the namespace `argus-inst-<instance-id>`, so it must be a valid
Kubernetes name. `<system>-<tier>` works well.

**3. Render the manifests.** Run this as a small script, so the token goes from its file into
the environment and never appears on a command line:

```bash
#!/bin/sh
set -eu
export ARGUS_ENROLLMENT_TOKEN="$(cat <a-private-dir>/<instance-id>.enrollment)"
export ARGUS_RUNNER_TOKEN="$(python3 -c 'import secrets;print(secrets.token_hex(32))')"
export ARGUS_EXECUTOR_SECRET="$(python3 -c 'import secrets;print(secrets.token_hex(32))')"
export ARGUS_CP_URL=<your-argus-control-plane-url>
export ARGUS_WORKSPACE_ID=<your-workspace-id>

argus render-k8s --config <your-kit>/argus-config.yaml \
  --instance-id <instance-id> --sut-namespace <your-system-namespace> \
  --image <execution-plane-image> --tier <tier> --kube-context <your-kube-context> \
  --replicas 1 --out <out-dir>
```

On a `managed` cluster, add `--storage-class <class>`, plus `--results-access-mode ReadWriteOnce`
if that class needs it. `--kube-context` is recorded on the instance, so later updates target the
right cluster.

`ARGUS_RUNNER_TOKEN` and `ARGUS_EXECUTOR_SECRET` are the execution plane's own two local secrets,
not a person's token (see [the token table](/argus-session-setup#the-tokens)). They go only into
the Secret it renders.

Your control plane's operator gives you the execution-plane image. Name it by its release tag,
**`v<version>-slim`**, where `<version>` is the version your control plane recommends (the
**Environments** page (under **Settings**) shows it, and so does `min_recommended_version` in the
`author_get_executor_status` MCP tool). Never use the plain `:slim` tag: it moves, so an instance
installed from it has a version nobody can state, and the version checks and the Update button
cannot rank it.

These render options decide what else lands in your cluster:

| Option | Default | What it does |
|---|---|---|
| `--obs <mode>` | `bundled` | Where the execution plane's logs and metrics go: `bundled`, `adopt`, `export`, `shared` or `none`. `none` renders no observability objects at all, for an environment that already has its own; pair it with [your own dashboard link](#your-own-dashboard-link-v0352-or-later). On the Docker (compose) path `--obs none` also starts no shared observability stack (v0.3.52 or later), and from v0.3.62 it starts no Loki, promtail or Pushgateway for the instance either, and onboarding does not ask for `observability.grafana.public_url`. Pass the same `--obs` to `argus preflight`. |
| `--obs-storage-class <name>` | the tier's default | The storage class for the volumes that keep the execution plane's logs and metrics (v0.3.62 or later). See [Storage for logs and metrics](#storage-for-logs-and-metrics-v0362-or-later). |
| `--podmonitor auto\|on\|off` | `auto` | The PodMonitor object in `obs.yaml`. `auto` includes it only if the cluster has the Prometheus Operator's PodMonitor type (it checks, read-only, through `--kube-context`). Use `off` on a cluster without the Prometheus Operator, where `kubectl create` would otherwise fail on that object. |
| `--collect-sut-logs` | off | Also collect your system's own pod logs. Off by default, because those logs may carry user or agent content. When you turn it on, the render names the namespace it will read. |

**4. Create the objects. Use `create`, never `apply`:**

```bash
kubectl --context <your-kube-context> create -f <out-dir>/executor.yaml -f <out-dir>/obs.yaml
```

`executor.yaml` contains a Secret. `kubectl apply` copies a Secret's data into an annotation on
the object, so anyone who can read the object sees the value a second time.

⚠️ `executor.yaml` holds that Secret's values in plain text, and the render says so when it
writes the file. **Delete `executor.yaml` once `kubectl create` has succeeded, and never commit it.**

**5. Confirm it enrolled:**

```bash
argus cloud-executor-status --control-plane "$ARGUS_CP_URL" --instance-id <instance-id>
```

You want `"registered": true` **and** `"poll_accepted": true`. Once both are true, load your
scenarios and run them once by hand before you put them on a schedule.

**Adding a credential later.** When a new scenario needs a value the execution plane doesn't
have yet, set one key on its Secret without re-rendering. The value is read from standard input
only, never from a flag:

```bash
printf '%s' "$VALUE" | argus secrets set --key DB_PASSWORD --namespace argus-inst-<instance-id> \
  --kube-context <your-kube-context> --restart
argus secrets list --namespace argus-inst-<instance-id> --kube-context <your-kube-context>
```

If your kubeconfig is not the default one (for example `~/.config/argus/<app>.kubeconfig`), add
`--kubeconfig <path>` to both commands (v0.3.47 or later). It goes to every `kubectl` call they
make, and to the restart command they print. `export KUBECONFIG=...` does not last between an
agent's separate shell calls.

`secrets list` prints key names only. The execution plane reads its Secret when its pod starts,
so a new value does nothing until the pod restarts: `--restart` does that for you, and without it
the command prints the restart to run. ⚠️ The value is a **copy**. If your system rotates the
original, the copy goes stale without any warning: run `secrets set` again after every rotation.

**Updating.** A person always decides when an execution plane updates. On Kubernetes you press
**Update** on the **Settings → Environments** page, and the execution plane changes its own Deployment's image.
It can change that Deployment and nothing else in the namespace. Before it changes anything, it
checks that the cluster can pull the new image. The image it moves to is the recommended
`v<version>-slim` release. The copy-paste update command on that page is
for compose (Docker) installs only.

**Picking up a newer kit.** Update changes the image and nothing else. To bring the rest of a
Kubernetes instance up to date (config, environment, access rules), run `argus upgrade` with
the same flags and environment you rendered with (v0.3.48 or later):

```bash
argus upgrade --instance <instance-id> --config <argus-config.yaml> --tier <tier> \
  --sut-namespace <your-system-namespace> --kube-context <your-kube-context>
```

That is a dry run. It writes nothing and shows, object by object, what would change. Read it,
then add `--apply`: it creates what the newer kit adds and patches only the objects that differ.
It never removes anything, never touches a Secret's value, and leaves the executor image alone.
A change that restarts the executor pod is announced with a `=> POD RESTART:` line. With one
replica the executor has no pod while it rolls, and a run in flight is cut.

### Storage for logs and metrics (v0.3.62 or later)

On Kubernetes, the Loki that holds the execution plane's logs keeps them on a volume called
`loki-data` (5Gi), and each Pushgateway saves its metrics to a volume called `pushgateway-data`
(1Gi). A pod that is deleted or recreated no longer takes the logs and metrics with it. The
Docker (compose) Loki has a named volume too. Run reports in the control plane were never
affected: they do not live in the pod.

- **The class.** On `--tier aks` the volumes use `managed-csi`. On every other tier they use your
  cluster's default storage class. `--obs-storage-class <name>` picks another one. It is a
  separate flag from `--storage-class`, which is the results volume. The flag works on
  `onboard.sh`, `argus up`, `argus render-k8s` and `argus render-obs-shared`. On the Docker tier
  there are no storage classes, and onboarding says the flag is ignored.
- **A class that is missing.** Onboarding refuses before it applies anything when the class you
  named is not in the cluster, or when the cluster has no default class. It lists the classes the
  cluster does have.
- **An instance you already run.** Run `onboard.sh` again, or `argus upgrade --apply`, to add the
  volumes. `argus update` does not add them. The change from the old in-pod storage loses the
  logs and metrics held in the pod at that moment, once.
- **A shared Loki that already exists** is not changed by onboarding again, and onboarding prints
  a note. To move it onto a volume, delete its Deployment and onboard again. That drops every
  tenant's logs once.
- **You cannot change a volume's class or size after it is bound.** Onboarding again with a
  different class is refused, and the message names both classes and the two ways out. The
  Pushgateway saves about once a minute, so a node crash can lose up to a minute of metrics.
- **Teardown** of an instance never deletes anything outside the instance's own namespace.

## Configuring what your environment shows

Three optional blocks in `argus-config.yaml` change what the Argus app shows for your
environment. They need an execution plane on v0.3.52 or later: an older one ignores them, and the
Argus app shows nothing for them (one implicit test target, no summary numbers).
`observability.dashboard_link` sits under `observability:`. `test_targets` and `summary_metrics`
are **top-level** keys, beside `targets:`. Never put either inside `targets:`: that block is
checked strictly, and an older execution plane would refuse the whole config. A fourth setting,
the Pushgateway retention, is the last subsection and needs v0.3.53.

### Your own dashboard link (v0.3.52 or later)

If your environment already has dashboards (Grafana, Zabbix, Datadog, an internal page), say where
a run's dashboard lives. The control plane then renders a link for every run, past runs included,
with no re-run:

```yaml
observability:
  dashboard_link:
    template: "https://grafana.lab.example/d/shop?var-run={run_id}&from={from}&to={to}"
    label: "Open in Grafana"        # optional; default "Open dashboard"
```

The template may use `{run_id}`, `{correlation_id}` (the run's prefix, `tr-<run_id>`), `{instance}`,
`{target}`, `{from}` and `{to}` (epoch milliseconds: the run's start minus 5 minutes, and its finish
plus 5 minutes). Anything else in braces, a credential in the URL (`user:pass@host`), a `${VAR}`,
or a URL that is not `http` or `https` is refused when the config loads: a link is shown to
people, so it never carries a secret. With a template declared, a missing per-tier `public_url`
is no longer a warning. With neither a template nor a link from the run itself, the Argus app says
no dashboard is linked for that environment.

### Several test targets (v0.3.52 or later)

One instance can test more than one thing in the same environment, for example a live system and
its lab copy. Name them, and every run is stamped with the targets it tested:

```yaml
test_targets:
  - name: live                      # lower-case, unique; "unassigned" is reserved
    label: shop live
    namespace: shop                 # never used to dial anything; a load run reads its environment from it
    match: { scenario_prefixes: [NHB-], tags: [heartbeat] }
    load_test: never                # optional (v0.3.60 or later): never put this target under load
  - name: lab
    label: shop lab
    namespace: shop-lab
    match: { scenario_prefixes: [NLB-], tags: [lab] }
    dashboard_link_template: ""     # optional per-target override of the link above
```

At most 8 targets, each with a non-empty `match`. A check belongs to the first target (in file
order) whose `scenario_prefixes` match its id; failing that, to the first whose `tags` intersect
its tags; otherwise it is `unassigned`. Targets come from your declaration and the ids of the
checks that ran, never from anything your system says. A run is stamped when it ends; changing the
declaration later does not re-stamp past runs. With no `test_targets` there is one implicit target,
as before. This is not the connection `targets:` block (http, database, message_broker).

**A target that must never be loaded (v0.3.60 or later).** Add `load_test: never` to the entry of
a system you must not load, for example a live message bus. It is a guard, not a label:

- `argus validate-config` reports an error for a load check that belongs to that target. A load
  check is an AMQP Load check, or any check with a `## LOAD` section.
- The executor refuses to fire such a check, before it opens any connection. The check ends
  `error`, and its `Observed` line says `refused before firing` and `Nothing was sent.`
- The Capacity page says "<target> is not load tested, by declaration." instead of "not measured
  yet", and the Overview no longer lists the target as a gap.
- `never` is the only accepted value. Any other value is refused by name.

⚠️ **Upgrade the executor before you add the key.** An executor at v0.3.59 or older refuses the
whole config with `unknown key "load_test" under test_targets`. Take the key out again before you
roll an executor back.

**A target's own namespace (v0.3.60 or later).** A load run records the environment it ran
against. When its load checks belong to targets that declare a `namespace`, it reads that
namespace, not only the instance's one namespace. With no `namespace` declared, nothing changes.
With load checks in more than one namespace, nothing is read, and the reason says why: run one
target's load checks per run. The executor needs the same read Role in each target's namespace
that it has in the instance's namespace. Argus does not grant it. Render it with `argus
render-k8s --sut-namespace <that namespace> --emit-sut-access-role` and apply it yourself.

**A target that runs in no cluster (v0.3.63 or later).** Add `outside_cluster: true` to the entry of
a system that runs in no cluster, for example a hosted service:

```yaml
test_targets:
  - name: hosted
    label: hosted API
    outside_cluster: true           # optional (v0.3.63 or later); cannot be combined with namespace
    match: { scenario_prefixes: [HOS-] }
```

A run whose checks all belong to such targets asks Kubernetes nothing and says so. Before, it
reported `environment.captured: false` with a `forbidden` error. It cannot be combined with
`namespace` on the same target. ⚠️ **Upgrade the executor before you add the key.** An executor older
than v0.3.63 refuses the whole config.

### Summary numbers from your environment's own metrics (v0.3.52 or later)

A few named numbers, such as agents connected now or broker headroom, can reach the Argus app from
the metrics your environment already has. The executor reads them on its own clock and reports the
latest value of each. It never sends a series:

```yaml
summary_metrics:
  every: 5m                          # 1m to 60m; default 5m
  source:
    type: prometheus                 # or metrics_endpoint
    url: http://prometheus.example:9090   # no credential and no query string in the URL
    credential: ${METRICS_CREDENTIAL}     # optional: a ${VAR} for user:password, never a literal
  readings:                          # 1 to 12
    - name: agents_connected         # ^[a-z][a-z0-9_]{0,39}$, unique
      unit: agents
      query: sum(connected_agents)
      comfortable_limit: 400         # optional display aid, never a gate
```

A `prometheus` query must return one number. A `metrics_endpoint` query is a series name with an
optional `{label="value"}` matcher; matching samples are summed. A reading that could not be read
is reported as an error with no value, never as `0`, so "no agents" cannot be mistaken for "could
not ask". A value older than three intervals is marked stale. Only an author sees these numbers;
a builder token cannot read them. `argus validate-config` refuses a mistyped key inside the block
by name.

### How long a run's metrics are kept (v0.3.53 or later)

Every run pushes its `argus_*` metrics to the Pushgateway as its own group. The Pushgateway never
forgets a group by itself, so it grew without bound. From v0.3.53 the executor deletes its own
instance's older run groups after a retention window. It never deletes another instance's groups
or the run it just pushed. Prometheus keeps what it already scraped.

```yaml
observability:
  pushgateway:
    url: http://pushgateway:9091
    group_retention: 15m             # optional; a Go duration, 1m to 720h; 0 keeps every group for ever
```

Leave it out and the window is `15m`. A negative, unparseable or out-of-range value, or a
mistyped key under `observability.pushgateway`, is refused when the config loads. Keep the value
well above your Prometheus scrape interval. An older executor ignores the key and keeps every
group.

## Writing a scenario

A scenario is one Markdown file, one contract, in a fixed shape:

```markdown
# Scenario: <one line — what healthy looks like>

## Metadata
- **ID**: HTTP-001
- **Layer**: HTTP Ingestion
- **Tags**: http, smoke

## TRIGGER
GET `<the endpoint, from your execution plane's network vantage>`

## VERIFY
N/A — the HTTP layer judges the response directly.

## EXPECT

### Runnable
- status=200
- body contains ready

## TIMEOUT
10s

## CLEANUP
N/A — read-only.
```

**Probe the endpoint yourself before writing its `EXPECT`.** Write down what you actually got,
from the vantage your execution plane has — not your laptop's. A scenario that asserts against
what you assumed the response would be, rather than what it is, is the most common kind of red
that turns out to be the scenario's fault, not the system's.

Every scenario declares a **layer** — HTTP ingestion, message flow, database state, external
delivery, error paths, rate limiting, or permissions — and only the layers your scenarios
actually use need a target configured. An HTTP-and-database system with no message bus is a
complete, ordinary thing to test.

In an HTTP body check, `equals` is exact from v0.3.51: `currentPage equals 1` no longer passes on
`10`, and an operator Argus does not know fails the check instead of passing it. On v0.3.50 and
earlier `equals` was checked as "contains".

**Values a check uses (v0.3.62 or later).**

- **`${INGESTION_URL}` in a chain `http` step.** A step whose `url` starts with `${INGESTION_URL}`
  takes the scheme, host and port of `targets.http.base_url`. The path of `base_url` is not
  added. The marker wins over an environment variable of the same name. Any other `${NAME}` in a
  chain `url` that has no value fails the step at preflight and names it. A chain cannot pick a
  named `http_targets` entry, so for another host write the full url.
- **`check_env` declares the names a check needs.** A password that appears only inside a check
  (an HTTP body, a step header) is not in any field Argus scans for secrets. List its name in a
  **top-level** list in `argus-config.yaml`, beside `targets:` and never under it:

  ```yaml
  check_env:
    - SOME_PASSWORD        # the check writes ${SOME_PASSWORD}; the value stays in your .env
  ```

  Names only, never values: an entry that is not a variable name is refused without being printed
  back. Names that would change how the executor itself runs are refused too (`ARGUS_*`, `LD_*`,
  `KUBERNETES_*`, `PATH`, the proxy variables and others). You can list up to 64. The names reach
  the executor with the credentials, and `argus secrets set --key SOME_PASSWORD` rotates a value
  later. A value you declare is removed from recorded outputs the way a credential is. A name that
  is missing or empty in your `.env` stops onboarding and fails `validate-config`. ⚠️ `check_env`
  decides what is **delivered**, not what a check may use: any name set in the executor's
  environment is substituted into a check, declared or not. An executor older than v0.3.62
  ignores the key, so update the executor first, or `${SOME_PASSWORD}` reaches your system as
  literal text.
- **A value filled into a chain spec is data.** A quote, a backslash or a newline in it arrives
  byte for byte and cannot add a key to the request.

Author with the dedicated tools, not by hand-editing files on disk: `propose-scenario` turns
plain English into a draft, `validate-scenario --file <draft.md>` checks its shape before
anything is written, and `write-scenario --file <draft.md> --path <ID>-<slug>.md` validates
again and commits it to the catalog — the catalog, not a local folder, is the source of truth
for what your scenario set *is*.

`argus validate-config --scenarios <dir>` also reports every rule the scenario writers enforce
(v0.3.59 or later). It used to apply two of them, so it said `valid: true` for a file the
control plane then refused on write, for example `## TIMEOUT 60s` on an HTTP Ingestion check,
where the ceiling is 30 s. Each such problem is now a warning that names the file and the line
and says a scenario write will refuse the file. `valid` does not change, and a problem that is
already an error is not repeated as a warning.

```bash
argus list-scenarios
argus read-scenario --scenario HTTP-001
```

`read-scenario` and `list-scenarios` are author-scoped — they refuse with `not permitted for
the product scope` on a runner token, naming exactly which token they need
(`ARGUS_EXECUTOR_SECRET`, formerly `ARGUS_AUTHOR_TOKEN`). That refusal is the holdout enforcing itself on the tester's own tools,
not just the builder's.

## Running

```bash
argus run --config <your-argus-config.yaml>
```

or, against an already-enrolled instance, request a run and poll its status until it's
terminal. However you run it, the report tells you what was actually checked:

```bash
argus get-report
```

Each scenario in the report carries `assertions_enforced` — what was actually checked, not
just what you intended — and, on a fail, `failure.observed`: the real value that didn't match.
**Check `assertions_enforced` after any change to a scenario.** It is how you know a re-run
actually picked up your edit rather than replaying a stale copy.

A status-only check shows `assertions_enforced` count `0`, which is not "nothing was checked".
From v0.3.51 the report also carries `observed_status`, the HTTP status the system returned (when
several requests fired it also carries `observed_status_codes`, each distinct code once), for
both the tester and the builder. And when an HTTP check fails on a body bullet, the tester's report
names which one in `failure.failed_body_check` (v0.3.52 or later): the bullet's number and its text
as you wrote it. If several bullets would fail, it names the first. A builder's report never
carries it, because the bullet holds the expected value.

When a step in a chain fails on its claims, it carries `failed_claims` (v0.3.49 or later):
each claim that did not hold, as written, with the value the system showed on the step's last
attempt. Only an author sees it. A numeric claim may compare against a value an earlier step
saved (`body has messages > ${saved.n}`), and `save` accepts a regex for a text body. From v0.3.54
a failed numeric claim that compares against a saved value shows the number the field held in
`failed_claims[].observed`. Before, it showed the placeholder, and a saved `5` could turn an
observed `15` into `1${saved.acks}`. The verdict was always right. Every other saved value is
still hidden from reports, and a claim that is not numeric (such as `contains ${saved.token}`)
still shows the placeholder. The `scenario-author` skill that ships with Argus has the details.

### Connections that must fail (v0.3.64 or later)

`- step <name>: unreachable` is a claim for a connection that must not work, such as a
NetworkPolicy deny or a closed port. It passes only when no HTTP response arrived because the
connection could not be made: a connect timeout, a refused connection, a reset at the connect, or no
route. It sends one request, waits at most 5 seconds and never polls.

Any HTTP status fails it. A 403, 404 or 503 means the network let the request through. A DNS "no such
host" fails it too, and so does any failure after a connection was made, including a reset inside an
https target's TLS handshake. Rules:

- It stands alone on its step. It is refused when combined with another claim on the same step.
- It is an `http`-step claim only.
- It is judged only after an earlier positive step of the same chain passed. Otherwise the step reads
  `not-measured`, so a dead target cannot pass every negative check. A chain with no positive step
  before it is refused when written.
- It needs an executor at v0.3.64 or later, because the executor judges it. Update the executor
  first.

A failed claim shows in `failed_claims`, for example `http status 403`.

### Checks from a CALM architecture (v0.3.64 or later)

`argus calm import` turns a FINOS CALM architecture into chain checks:

```bash
argus calm import <architecture.json> --bind <node-id>=<url>[,<transport>] ... --out <dir>
```

- `--bind` is required. Give one for each node, to say where it lives. A transport
  (`streamable-http` or `http-sse`) makes the node an MCP server. With none, it is a plain HTTP
  service. A URL never carries a credential.
- It writes one check for each connection that must work, and one for each connection that must not
  (it ends in `unreachable`). For an `mcp-guardrail` control it writes allow and deny checks.
- It also writes `calm-import.json`, which lists each check and the CALM ids it covers, and
  `UNMAPPED.md`, which lists every relationship, flow, control and node that did not become a check,
  with the reason.
- It never guesses a tool name, endpoint or transport. A guardrail check needs
  `--control-arg mcp-guardrail.tool=<tool name>`.
- It runs locally, needs no token, sends nothing and never overwrites a file.

`argus calm --help` lists every flag. The checks that end in `unreachable` need an executor at
v0.3.64 or later.

For a run on an enrolled instance, the `author_get_report` MCP tool reads that run's full report
from the execution plane: every scenario's status, and on a fail both the expected and the
observed value. It takes `instance_id` and `run_id`, and it needs an author token. It works for
runs that are still in progress or finished but not final; a **final** run has its own sealed
document, which `author_get_reveal` reads. An execution plane on v0.3.39 or older does not have
it and answers `unknown relayed verb "get_full_report"`: update the execution plane first.

**Say what a hand-started run is for (v0.3.53 or later).** `author_request_run` takes three
optional arguments:

| Argument | Meaning |
|---|---|
| `intent` | `"experiment"` (the default for a run you start by hand) or `"certification"`. `certification` is implied by, and the only value allowed with, mode `final`, `rehearsal` or `scheduled`, and is refused with mode `build`. `"monitor"` is refused: monitor runs come only from a schedule. |
| `expect` | `"fail"` or `"pass"`. Only with intent `experiment`. `"fail"` marks a deliberate test: the run is shown as deliberate when it fails and as an unexpected pass when it passes. |
| `note` | why you are running it, in your own words, at most 500 characters. You see it on the run page and in `author_get_run_status`. It is never shown to a builder and never put in an alert. |

A deliberate failing test is no longer shown as a problem.

A scenario's `## TIMEOUT` is enforced while it runs: each request (each step, in a chain) that
takes longer than the timeout fails, and the failure names the timeout. A check that passed
before this was enforced, but answers slower than its `## TIMEOUT`, turns red after the update.
Set the value the scenario really needs.

## Monitor schedules

Once a hand-run is green — or every red in it is one you've read and decided to keep — turn on
a schedule so your system is tested continuously without you driving it. There is no CLI
command for this; it is the `author_set_schedule` MCP tool, called with the instance's id, an
interval, and `mode: "monitor"`:

| Argument | Required | Meaning |
|---|---|---|
| `instance_id` | yes | the instance the schedule runs against |
| `interval` | yes | a Go duration string, **15 minutes minimum** (e.g. `"30m"`, `"2h"`), or the literal `"off"` to stop this named schedule without losing it |
| `mode` | **yes** | set to `"monitor"` for a recurring run — always include it explicitly |
| `name` | no (default `"default"`) | lets you run several named schedules on one instance at once |
| `layer` / `tag` / `scenario_ref` | no | filter which scenarios this named schedule runs — at most one of the three |

**Always set `mode` to `"monitor"` on every schedule you create.** A schedule with no `mode`
given, or with a `mode` other than `"monitor"`, will not run your tests on its own — it will
sit there, due, and never fire. `mode: "monitor"` re-runs your reviewed scenario set — what you
want for "keep watching a live system stay healthy":

```json
{
  "instance_id": "<instance-id>",
  "interval": "30m",
  "mode": "monitor"
}
```

Confirm the first tick actually fired before walking away — a schedule that exists is not a
schedule that runs: `author_get_run_status` (with neither `run_id` nor `run_request_id`) shows
the schedule, and after one interval has passed its `last_requested_at` should be set and
`last_skip_reason` absent.

A scheduled run never carries an [AMQP load](#load-testing) scenario: the control plane does
not queue one for a `scheduled`, `final` or `rehearsal` run.

To stop a schedule without losing it, call `author_set_schedule` again with `interval: "off"`
(keep `mode: "monitor"` on that call too):

```json
{
  "instance_id": "<instance-id>",
  "interval": "off",
  "mode": "monitor"
}
```

## Load testing

A scenario declares a load in a `## LOAD` section. Two kinds exist. A scenario on an ordinary
layer (HTTP and the others) holds `**Users**`, `**Ramp Seconds**`, `**Duration Seconds**`,
`**Target P95 Ms**` and `**Max Error Rate**`. A scenario on the **AMQP Load** layer (v0.3.52 or
later) drives sessions against a message broker, and is described below.

### Load numbers taken before v0.3.52

⚠️ **From v0.3.37 to v0.3.51, every JMeter template ignored the declared `**Duration Seconds**`.**
Each user sent one pass and left, so a load that said "50 users for 120 seconds" was not that load.
Load numbers taken with those versions (since 2026-09-15) are not measured: **re-run them on
v0.3.52 or later.** From v0.3.52 a scenario with a declared duration holds its users for that
long; a scenario with no duration still runs once and ends.

### Connections and the load record (v0.3.63 or later)

**Each simulated user keeps its connection open.** Before v0.3.63, every request opened a new
connection. A long load run could use up the node's outbound ports, and requests then failed with
status 0. A check with a `## LOAD` section now reuses one connection per user. A check without one is
unchanged.

**The load record says why requests failed.** The `load` record in the report gains two fields. They
never change the verdict, the percentiles or `error_rate`.

- `errors`: the requests that got no HTTP status, grouped by reason. At most 8 reasons, and the
  rest are summed under `other`. A URL in a reason is cut to its scheme and host, and credentials
  are removed. It is absent when there were none.
- `timeline`: buckets of `started`, `answered` and `failed` requests, at most 120 buckets. It is
  absent below two samples.

The `load target breached` sentence names the top reason.

### AMQP load: allow a broker first (v0.3.52 or later)

Argus runs AMQP load only against a broker you have marked as one that may take it. It is off by
default. Declare the broker as a **named** entry under `targets.message_broker_targets` (the plain
`message_broker` slot can never be a load target), then list it under the **top-level**
`load_allowed_targets` key, beside `targets:`:

```yaml
load_allowed_targets:
  shop-lab:                # a name under targets.message_broker_targets
    max_sessions: 1000        # optional ceiling for one step; default 2000, at most 10000
```

List a lab or a dedicated test broker, never a live one. A listed entry whose `url` or
`management_url` has a `prod`, `production`, `prd` or `shared` segment is refused when the config
loads. Like `test_targets`, the key goes beside `targets:` and not inside it.

**A least-privilege load login (v0.3.53 or later).** Each session declares and binds its own queue,
publishes to an exchange, and reads from its queue. On the broker's entry under
`targets.message_broker_targets`, `exchanges.load` names the exchange (default `amq.direct`; it must
already exist) and `queues.load` sets the prefix of the per-session queue names (default
`argus-load`). The login needs configure, write and read on queues that match `^<prefix>-`, and
write and read on the exchange. If your load login is limited to a name pattern such as
`^perf\..*`, choose names inside it:

```yaml
targets:
  message_broker_targets:
    shop-lab:
      exchanges:
        load: perf.x
      queues:
        load: perf.argus
```

Without them every session is refused at setup with `403 ACCESS_REFUSED` and the run reports
`setup_failed` for the step. Existing configs keep working: with no `queues.load` the prefix stays
`argus-load`. `queues.load` only takes effect with a v0.3.53 or later executor, so update the
executor before you add it.

A load scenario then names that broker with `**Target**: <name>`, uses the layer `AMQP Load`, and
declares its profile in `## LOAD`: `**Steps**` (session counts, one run each, at most 12 steps of 1
to 2000 sessions), `**Step Duration Seconds**`, and the thresholds `**Target P95 Ms**` and
`**Max Error Rate**`; the rest is optional (`Ramp Seconds`, `Settle Seconds`, `Rate Per Session`,
`Message Size`, `Queue Type`, `Confirm`, `Ack`, `Prefetch`, `Min Delivered Ratio`,
`Must Sustain`). Its `### Runnable` claims are only `broker is not blocked` and
`every step is measured`; a `status=` bullet is refused, because there is no HTTP response. It
cannot share a scenario with another layer. `argus validate-config` and `validate-scenario` tell
you what is missing.

### What is refused

- **A target you did not allow.** The run ends with status `error` (not `failed`: it says nothing
  about your system) and an `Observed` line that starts `refused before firing` and ends `Nothing
  was sent.` The check runs before anything dials the broker. `validate-config` reports the same
  problem earlier. A step above the entry's `max_sessions` is refused the same way.
- **An execution plane older than 0.3.52.** The control plane does not queue the run for it. (A
  source build whose version it cannot rank is not refused; an older execution plane would
  refuse the layer by name anyway.)
- **Certification, scheduled and rehearsal runs.** The control plane does not queue a set holding
  an AMQP load scenario for a `final`, `scheduled` or `rehearsal` run, and the scenario cannot be
  written into a certification set: no load ramp sits under a certified verdict.

### Where the results show

The run's results include one record per step: sessions, the rates offered, sent, confirmed and
delivered, the delivered ratio, publish-to-confirm and publish-to-deliver quantiles, errors by
class, and any time the broker blocked. They are stored and shown like any run's:

- **`author_get_run_status`** returns them in the run's `load_ramp`, one entry per load scenario.
- **Grafana** has them as the `argus_load_step_*` series, labelled by scenario and step.
- A builder never sees them: the builder's tools carry no load fields.

The verdict follows the steps. The run is `failed` if the broker blocked a publisher, a session
could not be set up (the ramp stops there and later steps read `not_run`), no step was
comfortable, or a `Must Sustain` step was not. It is `degraded` if everything held but the broker
restarted during a step. Otherwise it `passed`: a ramp that crosses your limit at its top step has
**measured** the limit, which is not a failure. A step is comfortable only when its p95, its error
rate and its delivered ratio meet what you declared, nothing was blocked, and the load generator
was not the limit. Above about 1000 messages a second, `validate-scenario` warns that the
execution plane's pod, not the broker, may be what is measured; such a step is flagged
`generator_limited` and is never comfortable. A step the broker blocked is not flagged
`generator_limited` (v0.3.59 or later): a block stalls the publishers, so a blocked step used to
read as if the load generator had been too slow. Steps stored before then keep the flag they were
stored with.

**A blocked broker (v0.3.55 or later).** When the broker blocks publishers, for example with a
memory or disk alarm, the step reads `blocked` with the broker's reason, and the run fails with
`blocked by broker: <reason>` and a line saying the broker held the publisher blocked at step N
of M and the ramp stopped there. On v0.3.54 and older, a blocked broker could read as `error`,
"jmeter run error: … backstop …", as if Argus had broken. If the executor had to stop JMeter, a
note follows the broker's answer. The note should not appear from v0.3.56, which ends a blocked
step when the step ends: if you still see it, report the run id. The session queues of a blocked
step are removed when they expire, not at teardown.

Argus latencies read about 1 ms higher than RabbitMQ PerfTest at low load, because JMeter
schedules its threads inside the executor pod. Compare throughput directly, and compare latency
against Argus's own baseline.

⚠️ **A load result is only as good as the environment it names.** Write down, next to the numbers,
the environment (which cluster, whether it is the live system or a lab copy), its resources
(replicas, CPU and memory requests and limits, the broker's own limits), the load (rate, sessions,
message size, duration) and the build under test. Two results from differently sized environments
are not comparable.

## Reading a red

Triage one scenario at a time, saga first:

```bash
argus get-sagas --correlation-id <correlation-id>
argus tail-logs --correlation-id <correlation-id>
argus get-dashboard-url
argus get-report
```

`get-sagas` and `tail-logs` (the `get_sagas` and `get_tail_logs` tools) both refuse outright
without `--correlation-id` — there is no "show me everything" mode, deliberately: triage is scoped
to one scenario's own trail, not a grep across the whole run.

From v0.3.52 the id must be a **whole** correlation id, exactly as `get-report` shows it:
`tr-<run_id>-<scenario_id>-<8 hex>`. A prefix, a fragment or a pattern (`tr-`, for instance) is
refused, naming the shape it expects. Earlier versions took any text and matched it as a
substring, so a fragment could read every run in the window. This holds for every role.

Read `failure.observed` before changing anything. A red is the system telling you something —
never weaken an assertion to make it go green; the only honest reason to drop a check is proof
that it measures the harness rather than your system, and that proof belongs recorded in the
scenario itself.

**A green can be a skip.** `ok` reads the same whether a check ran or was silently skipped —
look at how long it took. A scenario that "passed" with no measurable duration didn't check
anything.

## What the Argus app shows

From v0.3.53 the Argus app has five places in its sidebar, each named by the question it answers.
**Environments**, **API Tokens**, **My workspaces** and **Onboarding & setup** are in the
**Settings** menu at the top right. The workspace switcher is at the top of the sidebar. The app
has a light and a dark theme and a phone layout, and a search box that finds run ids, commitment
ids and transaction hashes.

| Place | Question | What it shows |
|---|---|---|
| **Overview** | Is it OK? | One verdict and a tile per system. Health comes from **monitor** runs only: a run you start by hand never turns it red, a monitor that stopped firing turns it amber (late), and a system no monitor has measured reads "not measured", never green. Also **Needs a person**, the capacity card and the latest certified release. |
| **Capacity** | How much load can it take? | The measured limit of the latest completed load run for each system and target. |
| **Runs** | What happened? | Every run, on a timeline and in a table. |
| **Checks** | What is tested? | Your scenarios. |
| **Proof** | Can I prove it? | Certified releases first, then every anchor. See [Ledger and certificates](/argus-ledger). |

- **Needs a person** lists what Argus works out by itself and also what you file. File an item with
  `author_file_attention` (`instance_id`, `severity` of `high`, `med` or `low`, `title`, `body`,
  `next_step`, and optionally `owner`, `ref` and an in-app `link`). Close it with
  `author_close_attention` and the `item_id` the first call returned. Items show to the authors of
  the workspace only. A builder never sees them.
- **One run drawer.** A run id, a bar on the timeline or a table row opens the run beside the page,
  on Runs and Overview.
- **Older runs.** The Runs timeline reaches runs older than the newest 500, and takes a date range.
  Runs has an **Anchored** column and filter. Runs, Checks and Trends can be filtered by test target.
- **Environments** shows one card per declared test target. A target's health comes from its
  scheduled monitor runs only.
- **Capacity details.** A run's page shows a **Load steps** table. A value the step did not measure
  reads "not measured", never 0. The Capacity page shows the largest step that was comfortable with
  every smaller step comfortable too, with the date and the version it was measured on.
- **A runner id** is minted from **Settings → Environments**.

## Related

- [What Argus is](/argus) — the holdout, the two planes, the two modes
- [Set up a tester and a builder](/argus-session-setup) — the order, and the tokens each holds
- [Builder guide](/argus-builder-guide) — the other side of the holdout
- [Comparing systems](/argus-compare): one sealed set of checks against an old system and its rewrite
