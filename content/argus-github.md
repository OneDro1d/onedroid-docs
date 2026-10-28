---
title: Argus on GitHub — a check on every successful deployment
nav: GitHub app
description: Install the Argus GitHub app, link a repository and an environment, and every successful deployment runs your Argus checks and puts the verdict on the commit. What it needs, what it shows, and the silent mismatch to avoid.
section: Argus
order: 10.8
---

With the Argus GitHub app, every successful deployment of your system runs your Argus checks
against it, and the verdict appears on the deployed commit as a check named **Argus /** followed by
the environment name.

> **First, the requirement: GitHub must know about your deployments.**
> Argus checks are live tests: they run against a running copy of your system. So a run starts
> when GitHub reports that a **deployment to a named environment succeeded** (for example `dev`
> or `staging`), not when code is pushed or a pull request is opened. Pushed code that is not
> deployed yet would be tested in its old version.
> If nothing you use records deployments in GitHub (GitHub Actions `environment:`, GitHub's
> Deployments API, or a tool that calls it), nothing will start a run. Set that up first.

If your system is deployed by a platform outside GitHub, add a step to your pipeline that waits
until the platform reports the new version live, then records a successful deployment for that
commit and environment through GitHub's Deployments API. That recorded deployment is what starts
the run.

## What you get

1. Your pipeline deploys commit `abc123` to environment `dev`, and GitHub records the deployment
   as `success`.
2. Argus starts a run of your checks against the instance you linked to that environment, on your
   own executor, inside your own infrastructure. Nothing runs on GitHub.
3. A check named **Argus / dev** appears on commit `abc123`, `in progress` at first, then:

| The run | The check on GitHub |
|---|---|
| every check passed | success |
| a check failed or could not be checked, or the run reports a degraded system | failure |
| the executor was lost, or there were no checks to run (no verdict) | neutral |
| every check was not applicable (the verdict `not_applicable`: nothing was verified, so it is neither a pass nor a failure) | neutral |
| the run was cancelled | cancelled |
| no result 3 hours after the deployment | timed out, saying there is no verdict |

The check shows the verdict, the counts and a link to the run's report in Argus. It never shows a
check's name, a failure reason or anything your system answered, because everyone who can see the
commit can read a check, and that is usually more people than may read the report.

These start nothing: a push, a pull request, a merge, a deployment that failed or is still running,
a deployment to an environment that is not linked.

## Install the app

For the Argus that OneDroid hosts, the app is **onedroid-argus**:

- The app's page: <https://github.com/apps/onedroid-argus>
- Install it: <https://github.com/apps/onedroid-argus/installations/new>

Pick the organization or user that owns the repository, then choose all repositories or only the
ones you will link. On an organization only an owner can install; anyone else gets a "request"
button that asks the owners. Any GitHub account can install it.

Installing starts nothing and reads no code. The app asks for three repository permissions and
nothing else: **Checks: read and write**, **Deployments: read** and **Metadata: read**. It never
reads code, and nothing runs until a workspace owner links a repository in Argus.

## Link a repository (the workspace owner)

You need: the app installed on the GitHub account that owns the repository, **push or admin
access** to the repository on GitHub, and an Argus instance in your workspace to run the checks.

1. In Argus open **Settings > GitHub**.
2. Choose the instance that should run, type the repository as `owner/repo`, the environment name
   exactly as GitHub shows it on your deployments, and the installation number. The installation
   number is at the end of the address of the app's page under your GitHub account's
   **Settings > Applications > Configure**.

   ⚠ **The environment name must match exactly, character for character and case included.**
   Argus compares the name GitHub sends with each deployment against the linked name as they are,
   with no case folding: `Dev` is not `dev`, and `staging-eu` is not `staging_eu`. **A mismatch
   fails silently.** The deployment starts no run, no check appears on the commit and Argus shows
   nothing. Copy the name from the repository's **Deployments** page on GitHub (or from the
   `environment:` your pipeline sets), and after your first deployment check that a check named
   `Argus / ` followed by the environment name appeared on the commit.
3. Press **Connect with GitHub**. GitHub asks you to authorize the Argus app. Argus uses that answer
   once, to check that you may use the installation and that you have push or admin access to the
   repository, and does not keep it.
4. You come back to the same page and the link is listed.

Only the workspace owner, signed in on the website, can add or remove a link. Everyone in the
workspace can see the list. A link runs all the instance's build checks. Removing a link stops new
runs; runs already started finish.

If GitHub later removes the repository from the installation, or the installation is suspended or
uninstalled, its links stop starting runs (removed repositories lose their links). A person who
later loses access to the repository does not remove the link; the owner does.

## If no check appears

| You see | Likely cause | What to do |
|---|---|---|
| A deployment succeeded, no **Argus /** check on the commit | the environment name in the link differs from the one GitHub sent, even in case | copy the name from the repository's **Deployments** page and link it again |
| Nothing at all after a merge | nothing recorded a deployment in GitHub | record one (GitHub Actions `environment:` or the Deployments API) once the new version is live |
| The check stays `in progress`, then times out after 3 hours | the run gave no verdict in time | open the run in Argus from the check's link |
| **Settings > GitHub** says GitHub is not set up | the Argus you use has the app switched off | ask whoever runs your Argus |

## Limits, said plainly

- The installation number is typed in; Argus does not list your installations.
- A link runs all build checks of the instance; choosing a layer, a tag or one check is not offered
  on the screen.
- GitHub does not redeliver a failed webhook delivery by itself, so Argus does not rely on it. Once
  Argus has recorded a successful deployment, it starts the run, opens the check and concludes it
  itself, even through a restart.
- GitHub's **Re-run** button on the check does nothing yet.
