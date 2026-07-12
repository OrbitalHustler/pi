# Pi Agent Setup

This document records how we build and configure our fork of the Pi coding
agent. Its single goal is to state exactly which extensions we have added or
written ourselves, so anyone reading the repo knows what diverges from upstream.

> [!NOTE]
> Keep the [Installed extensions](#installed-extensions) table current: it is the
> ledger of what diverges from upstream. Update it whenever we add or remove one.

## Repository origin

We track upstream rather than vendor a copy. The agent lives in the
[earendil-works/pi](https://github.com/earendil-works/pi) monorepo, and the
coding agent itself is the `packages/coding-agent` package.

Branch roles:

- `main` mirrors `earendil-works/pi:main` without fork-specific commits.
- `mathieu` is the stable, tested fork history. It advances only from upstream
  release tags after extension compatibility is verified.

To test and integrate an upstream release:

```bash
gh repo sync OrbitalHustler/pi -b main
git fetch origin main
git fetch upstream main --tags
git branch -f main origin/main   # run while mathieu is checked out
git switch -c mathieu-update-0.80.6 mathieu
git merge v0.80.6
npm run check
# Run the build and interactive smoke tests below.
git switch mathieu
git merge --ff-only mathieu-update-0.80.6
git tag 0.80.6-mathieu.5
git push origin mathieu 0.80.6-mathieu.5
```

Before synchronizing, inspect the worktree and the commits unique to `mathieu`.
Do not discard local changes without reviewing them. Verify that `origin/main`
and `upstream/main` resolve to the same commit, but merge only a selected release
tag into a temporary update branch. Keep `mathieu` on its previous known-good
state until the combined Pi and extension build passes. Never rebase or
force-push `mathieu`; its commits and release tags preserve reproducible historic
combinations. See [`MY-AGENTS.md`](../MY-AGENTS.md) for the complete procedure.

## Toolchain

We pin the Node.js version so every machine and CI run builds against the same
runtime. The repo declares `engines.node` as `>=22.19.0` and uses npm
workspaces, so we stay on npm rather than switching to pnpm or yarn.

| Tool | Version | Pinned by | Notes |
|------|---------|-----------|-------|
| Node.js | `22.19.0` | `mise.toml` | Satisfies `engines.node >= 22.19.0`. |
| npm | `10.9.3` | bundled with Node | No separate pin; comes with the Node release. |

The pin lives in [`mise.toml`](../mise.toml):

```toml
[tools]
node = "22.19.0"
```

### CachyOS host requirements

Install the host tools from the signed CachyOS/Arch repositories, then let mise
install the repository's exact Node version:

```bash
sudo pacman -S --needed git mise
mise install
```

No additional host packages are required. Hypa ships a platform-specific native
binary through its pinned npm dependency. If a future
release adds OS-level enforcement, document its CachyOS packages and a concrete
verification command here. Add separate subsections for other operating systems
rather than assuming the CachyOS result transfers.

Web Access works without additional host packages. Install these optional tools
to enable video frame extraction and YouTube stream discovery:

```bash
sudo pacman -S --needed ffmpeg yt-dlp
```

## Running pi

There are two distinct ways to run pi, and they are for different jobs. Do not
confuse the development harness with the command you use for real work.

### Development harness (this repo only)

Use this when hacking on pi's own source. It runs pi straight from TypeScript, so
edits take effect with no build step.

```bash
mise exec -- ./pi-test.sh   # runs packages/coding-agent/src/cli.ts via tsx
```

`mise exec` forces the repo's pinned Node `22.19.0`. `pi-test.sh` accepts a
`--no-env` flag that unsets all provider API keys for a clean test run. This
harness only makes sense inside this checkout.

### Global command (any directory)

Use this for real work in other projects. It links our fork as a global `pi` so
the command works anywhere, using the system Node.

```bash
npm run build                                # build with latest model catalogs
npm link --workspace=packages/coding-agent   # symlink our build as global `pi`
pi --version                                 # now runs from any directory
```

After editing Pi's source later, run `npm run build` again to refresh the global
command and model catalogs. The system Node only needs to satisfy
`engines.node >= 22.19.0`, so mise is not involved here.

> [!NOTE]
> To run stock upstream pi instead of our fork, install the published package:
> `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`. That bypasses
> our changes, so prefer the `npm link` route above.

### Fresh clone on another host

Clone the fork, select the personal branch, install the pinned toolchain and
dependencies without lifecycle scripts, build, and link it globally:

```bash
git clone git@github.com:OrbitalHustler/pi.git ~/workspace/pi-agent
cd ~/workspace/pi-agent
git switch mathieu
mise install
mise exec -- npm run setup:mathieu
readlink -f "$(command -v pi)"
pi --version
```

The resolved command must point into
`~/workspace/pi-agent/packages/coding-agent/dist/cli.js`. The curated Hypa
extension loads automatically in every working directory. Credentials,
sessions, trust decisions, and optional user configuration remain under
`~/.pi/agent`.

After pulling or merging new fork code, rerun:

```bash
mise exec -- npm run setup:mathieu
```

`setup:mathieu` installs the tag's exact lockfile with lifecycle scripts
disabled, refreshes model catalogs from live provider metadata, builds the fork,
restores the tracked catalog sources, and links the compiled output as the global
`pi`. It requires a clean worktree so that restoration cannot discard unrelated
work. Release tags therefore reproduce Pi code and dependency versions, but
intentionally do not reproduce model catalogs: two builds of the same tag at
different times can expose different current models, prices, or limits. A
catalog service outage can also block the build.

### Where extensions live

Pi reads settings from two scopes, and the scope decides where an extension
applies. This matters because an extension installed in one scope does nothing in
the other.

| Scope | Location | Applies to | Use for |
|-------|----------|------------|---------|
| Global user | `~/.pi/agent/` | every Pi installation using that agent directory | Credentials, sessions, and optional personal overrides |
| Project | `.pi/` | only that repository | Repo-specific or team-shared resources |

Hypa and Web Access are built into the fork and load independently of user or
project settings. Run `pi -ne` to disable them and all discovered extensions for
recovery. Project and global resources still work normally.

## Installed extensions

The extensions we have actually added to this setup. Pi auto-discovers
extensions placed in `~/.pi/agent/extensions/` (global) or `.pi/extensions/`
(project-local).

| Extension | Source | Version | Why we added it |
|-----------|--------|---------|-----------------|
| Hypa | [`@hypabolic/pi-hypa`](https://github.com/Hypabolic/Hypa/tree/v0.1.10/packages/pi-hypa) | `0.1.10` | Compresses noisy local tool output before it reaches the model context. |
| Web Access | [`pi-web-access`](https://github.com/nicobailon/pi-web-access/tree/v0.13.0) | `0.13.0` | Adds web search, URL and PDF extraction, repository cloning, and optional video analysis. |

Landstrip was removed after audit; see the evaluation and decision log below.

## Extensions we wrote

Extensions authored in this repo rather than installed from npm.

| Extension | Path | What it does |
|-----------|------|--------------|
| _none yet_ | — | — |

## Candidate extensions (researched, not installed)

We are considering three extensions, one for each layer of a stack that composes
cleanly: a policy layer decides allow, ask, or deny; an enforcement layer
sandboxes what actually runs; and a classifier layer auto-approves obviously safe
commands so the human is not prompted for `ls`. None are installed yet. We will
evaluate them one at a time and record the verdict in each subsection below.

| Layer | Candidate | Version | One-line summary |
|-------|-----------|---------|------------------|
| Policy | [`@gotgenes/pi-permission-system`](https://pi.dev/packages/@gotgenes/pi-permission-system) | 17.0.0 | Static allow/ask/deny rules for what the agent may do. |
| Enforcement | [`pi-landstrip`](https://pi.dev/packages/pi-landstrip) | 0.16.29 | Kernel-level sandbox that hard-limits files and network. |
| Classifier | [`pi-auto-mode`](https://github.com/r4vi/pi-auto-mode) | 0.1.2 | LLM auto-approves safe commands, like Claude Code auto mode. |

### Policy: @gotgenes/pi-permission-system

A rule-based permission gate. It matches each tool call against wildcard
allow, ask, or deny rules covering bash commands, tool access, MCP servers,
skills, and file paths. Rules compose across global and project layers with
most-restrictive-wins, and anything it cannot parse falls through to ask, so it
fails closed. This is the layer that encodes our standing policy, such as "always
ask before `git push`" or "never touch `.env`".

**Verdict:** _to evaluate._

### Enforcement: pi-landstrip

A real security boundary rather than a policy. It uses the Linux Landlock kernel
feature to sandbox bash commands at the syscall level, routes network access
through an allowlist proxy, and restricts reads and writes to a filesystem
allowlist. Because it enforces at the kernel when a command actually runs, it
still holds even if a policy rule is wrong or a classifier is fooled. It accepts
a policy in Anthropic's JSON format. Our kernel supports Landlock, so it applies
here.

**Verdict (0.16.29 audited 2026-07-11): not installed.** We compared the
published 0.16.29 tarball with both the
published 0.16.16 artifact and GitHub tag 0.16.29, reviewed every source change,
and separately reviewed the `@landstrip/landstrip@0.16.23` npm wrapper and Linux
source changes since 0.16.16. The npm artifact matches the GitHub tag. There are
no lifecycle scripts, telemetry, new external endpoints, dynamic code, or
unexpected published files. The changes improve dynamic `denyWrite` glob
enforcement, live permission queries, Unix-socket denial, and large-environment
handling. We still rejected it for this release because its stale
`@earendil-works/pi-coding-agent@^0.74.2` peer range installs a duplicate old Pi
package with known advisories. Three additional caveats remain:

1. If the native `landstrip` binary is missing or not runnable, the extension
   silently falls back to fully unsandboxed bash with only a warning. The
   guarantee is only as strong as that binary being present and working.
2. The full parent environment, including API keys, is written into a temporary
   file under a private temporary directory and loaded by every sandboxed
   command. A command can read those secrets; the proxy is the only barrier to
   exfiltration. Treat env-resident secrets as readable by the agent.
3. Interactive filesystem approvals are deliberately breadth-first. Approving
   one blocked path can grant its broader project root or first-level home
   subtree, such as all of `~/.cargo`. Read the displayed scope before approving.

The compiled `@landstrip/landstrip` binary does the actual enforcement and ships
without source in the npm tarball. Its published SHA-256 on Linux x64 is recorded
in the decision log, but full assurance requires reproducing the build from the
matching [`landstrip` tag](https://github.com/landstrip/landstrip/tree/0.16.23).

### Classifier: pi-auto-mode

The extension that started this whole effort: it reproduces Claude Code "auto
mode". A two-stage tool-call classifier uses an LLM to judge whether a command is
safe, auto-approving the obvious read-only ones so we are not prompted for every
`ls` or `git status`. It is early software at version 0.1.2, and an LLM judge
costs tokens and latency on every call and can be wrong, so we would only run it
on top of the kernel sandbox, never as the sole gate.

A heuristic alternative exists if we want to avoid the LLM cost:
[`pi-permission-layers`](https://pi.dev/packages/pi-permission-layers) (v1.3.0)
classifies commands into five fixed levels by pattern, auto-allowing read-only
commands such as `cat`, `ls`, and `git status` with no model call. We will weigh
it against `pi-auto-mode` when we reach the classifier layer.

**Verdict:** _to evaluate._

### How the layers interact

Pi dispatches a `tool_call` event to every extension in load order. Each handler
can return a block, and the first handler that blocks short-circuits the rest, so
the chain behaves like a logical AND: a command must pass every gate to run. See
`emitToolCall` in `packages/coding-agent/src/core/extensions/runner.ts`.

Load order therefore matters for cost and user experience. Put a cheap policy or
classifier gate first so an obvious deny or an obvious allow resolves before a
more expensive interactive prompt or LLM call fires.

> [!IMPORTANT]
> This release has no kernel sandbox. Do not treat a policy or classifier
> extension as an enforcement boundary.

> [!WARNING]
> An LLM classifier such as `pi-auto-mode` costs tokens and latency on every
> command and can be wrong. Never make it the sole gate.

## Decision log

A running record of why the setup looks the way it does.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-28 | Pin Node to `22.19.0` via `mise.toml`; stay on npm. | Matches `engines.node`; upstream uses npm workspaces, so switching package managers would fight every rebase. |
| 2026-06-28 | No extensions installed yet. | Still evaluating the policy, enforcement, and classifier layers. |
| 2026-06-28 | Audited `pi-landstrip` 0.16.16; approved for install as defense-in-depth. | Broker code fails closed, no phone-home, no install scripts. Caveats: silent fail-open if the native binary is absent, and env secrets reach commands unstripped. |
| 2026-06-28 | Installed `pi-landstrip`, pinned to 0.16.16; verified the native binary runs (`landstrip 0.16.16`). | Install the exact npm artifact we audited; pin so every clone is identical; verifying the binary runs rules out the silent fail-open caveat on this machine. |
| 2026-07-11 | Moved `pi-landstrip` from project settings into the fork-curated extension registry. | Every build of `mathieu` now carries the reviewed extension set in every working directory while normal user state remains outside Git. |
| 2026-07-11 | Audited and pinned `pi-landstrip@0.16.29` with `@landstrip/landstrip@0.16.23`. | Published extension source matches GitHub tag 0.16.29; no malware indicators or lifecycle scripts found. Linux x64 binary SHA-256: `6bf62e09e14537f56218ce97a8b865ed74212e9645b972f66f0967b42ffa18f2`. Accepted caveat: approvals can widen to a displayed directory scope. |
| 2026-07-11 | Removed Landstrip from `0.80.6-mathieu.1`. | Its stale Pi `^0.74.2` peer range installs a duplicate old Pi package with known advisories. A security control with unresolved packaging and fail-open concerns is not suitable for the curated baseline. |
| 2026-07-11 | Audited and added `@hypabolic/pi-hypa@0.1.10`. | The extension has an unrestricted Pi peer, zero reported npm advisories, no network telemetry in its TypeScript wrapper, and a local native CLI. Its release workflow stamps package and CLI versions after checkout, so the npm artifact is not byte-identical to tag `v0.1.10`; the generated delta was reviewed. Linux x64 binary SHA-256: `d4517903f584bd27efce6b18dd556d12a6481172541b389cf8b79e74f765a899`. Hypa also installs a private TUI `0.79.10` because of its narrow `^0.79.8` dependency; compatibility is covered by the fork smoke test. |
| 2026-07-11 | Added curated package metadata in `0.80.6-mathieu.4`. | Pi now identifies the built-in extension as `@hypabolic/pi-hypa` instead of the unhelpful internal directory name `extensions`. |
| 2026-07-12 | Audited and added hardened `pi-web-access@0.13.0`. | The npm artifact matches Git tag `v0.13.0`, declares unrestricted Pi peers, has no lifecycle scripts, and produced no npm advisories. Browser-cookie extraction remains opt-in, and URL fetching includes private-address and redirect checks. The upstream curator loaded executable Markdown code from jsDelivr without integrity protection and allowed remote Markdown images. Every fork build now verifies the reviewed curator SHA-256 `ba2f190acc088e4ccb5337870e4dde43172945bba1d3c4cc25204935f701d71d`, embeds pinned `marked@18.0.5` from its verified browser bundle, removes remote fonts and images, and refuses unknown source or renderer hashes. |
| 2026-06-28 | Deferred OneCLI credential isolation. | Worth it only for unattended loops, and it conflicts with landstrip over the proxy env var. Revisit when running pi unattended; chosen design would be OneCLI-owns-network plus landstrip-owns-filesystem. |
