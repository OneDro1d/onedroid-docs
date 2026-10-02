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
If anything on this page refuses you, run `argus doctor --control-plane <url>` (CLI v0.3.45 or
later) before anything else: it names the cause and prints the fix.

## Your workspace

Everything you author and run is scoped to a **workspace** — one per system under test, in the
common case. Your author token is bound to it: `argus cloud-list-workspaces` shows what you can
reach, and `argus cloud-switch-workspace` changes which one later commands act on.

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
are exposed:

| Tier | Storage class it uses |
|---|---|
| `k3d`, `kind`, `minikube` | `argus-rwx`, a shared class you install first (preflight says how) |
| `aks` | `azurefile-csi` |
| `managed` (any other cluster) | `local-path`, unless you pass `--storage-class` |

On any other managed cluster, pass `--storage-class <a class your cluster has>` in step 3.
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

The two generated tokens are the execution plane's own local credentials. They go only into
the Secret it renders. Your control plane's operator gives you the execution-plane image.

Three render options decide what else lands in your cluster:

| Option | Default | What it does |
|---|---|---|
| `--obs <mode>` | `bundled` | Where the execution plane's logs and metrics go. `none` renders no observability objects at all, for a cluster that already has its own. |
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
**Update** on the Environments page, and the execution plane changes its own Deployment's image.
It can change that Deployment and nothing else in the namespace. Before it changes anything, it
checks that the cluster can pull the new image. The copy-paste update command on that page is
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

Author with the dedicated tools, not by hand-editing files on disk: `propose-scenario` turns
plain English into a draft, `validate-scenario --file <draft.md>` checks its shape before
anything is written, and `write-scenario --file <draft.md> --path <ID>-<slug>.md` validates
again and commits it to the catalog — the catalog, not a local folder, is the source of truth
for what your scenario set *is*.

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

When a step in a chain fails on its claims, it carries `failed_claims` (v0.3.49 or later):
each claim that did not hold, as written, with the value the system showed on the step's last
attempt. Only an author sees it. A numeric claim may compare against a value an earlier step
saved (`body has messages > ${saved.n}`), and `save` accepts a regex for a text body. The
`scenario-author` skill that ships with Argus has the details.

For a run on an enrolled instance, the `author_get_report` MCP tool reads that run's full report
from the execution plane: every scenario's status, and on a fail both the expected and the
observed value. It takes `instance_id` and `run_id`, and it needs an author token. It works for
runs that are still in progress or finished but not final; a **final** run has its own sealed
document, which `author_get_reveal` reads. An execution plane on v0.3.39 or older does not have
it and answers `unknown relayed verb "get_full_report"`: update the execution plane first.

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

To stop a schedule without losing it, call `author_set_schedule` again with `interval: "off"`
(keep `mode: "monitor"` on that call too):

```json
{
  "instance_id": "<instance-id>",
  "interval": "off",
  "mode": "monitor"
}
```

## Reading a red

Triage one scenario at a time, saga first:

```bash
argus get-sagas --correlation-id <correlation-id>
argus tail-logs --correlation-id <correlation-id>
argus get-dashboard-url
argus get-report
```

`get-sagas` and `tail-logs` both refuse outright without `--correlation-id` — there is no
"show me everything" mode, deliberately: triage is scoped to one scenario's own trail, not a
grep across the whole run.

Read `failure.observed` before changing anything. A red is the system telling you something —
never weaken an assertion to make it go green; the only honest reason to drop a check is proof
that it measures the harness rather than your system, and that proof belongs recorded in the
scenario itself.

**A green can be a skip.** `ok` reads the same whether a check ran or was silently skipped —
look at how long it took. A scenario that "passed" with no measurable duration didn't check
anything.

## Related

- [What Argus is](/argus) — the holdout, the two planes, the two modes
- [Builder guide](/argus-builder-guide) — the other side of the holdout
