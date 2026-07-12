# Fork Maintenance Rules

This file contains instructions specific to Mathieu's fork. Read
`AGENTS.md` first and follow both files. Do not copy these rules into upstream
branches or contribute them upstream.

## Branches and remotes

- `upstream` must refer to `https://github.com/earendil-works/pi.git`.
- `origin` is Mathieu's fork at `https://github.com/OrbitalHustler/pi.git`.
- `main` mirrors `upstream/main`. Do not add fork-specific commits to `main`.
- `mathieu` is the stable, tested fork history. It advances from upstream
  release tags, not arbitrary `upstream/main` commits.
- Preserve unrelated work from other sessions. Before synchronizing, inspect the
  current branch, worktree, remotes, and commits unique to `mathieu`.

## Synchronizing upstream

Use this workflow unless the user requests a different history strategy:

1. Require a clean worktree or explicitly review and preserve each local change.
2. Synchronize the fork with `gh repo sync OrbitalHustler/pi -b main`.
3. Fetch `origin/main`, `upstream/main`, and upstream release tags. Verify
   `origin/main` and `upstream/main` resolve to the same commit.
4. Fast-forward local `main` to `origin/main` without putting fork commits on it.
5. Create a temporary `mathieu-update-<version>` branch from `mathieu` and merge
   the chosen upstream release tag into it. Do not update from unreleased main.
6. Update and re-audit curated extensions only when necessary for compatibility.
7. Review conflicts only in fork-owned files. Stop and ask before discarding
   intentional work or resolving conflicts in unfamiliar files.
8. Run `npm run check` with full output plus the documented build and interactive
   smoke tests. Do not advance `mathieu` while any compatibility check fails.
9. Fast-forward `mathieu` to the tested update branch, push normally, and create
   a permanent tag such as `0.80.6-mathieu.3`. Never force-push `mathieu`.
10. Report the upstream release, meaningful changes, extension audit result,
   validation result, resulting fork commits, and release tag.

Use `mise exec -- npm run setup:mathieu` for fresh-host installation. It installs
the tag's locked dependencies with lifecycle scripts disabled, refreshes the
live model catalogs, builds the fork, and links it globally. Release tags pin
code and dependencies, but intentionally do not pin the resulting model catalog.

Generated model catalogs and lockfiles can change substantially upstream. Do not
preserve stale generated output merely because it is locally modified. Determine
its origin and whether newer upstream generation supersedes it before deciding.

## Extensions and dependencies

- Read `docs/agent-setup.md` before adding, removing, or updating an extension.
  It is the detailed setup record and extension ledger.
- The curated baseline includes `@hypabolic/pi-hypa@0.1.10`. Changing it or
  adding another extension requires exact dependency pins, audit documentation,
  and a new tested release tag.
- Pin every direct dependency and Pi package to an exact version. Do not use
  ranges such as `^`, `~`, tags, or unversioned package references.
- Treat an extension update as a new security review. Do not assume approval of
  one version applies to another version.
- Before approving an extension artifact, inspect its source and published
  package contents, dependency and lifecycle-script changes, filesystem and
  network access, telemetry, secret handling, native binaries, policy mutability,
  and fail-open behavior.
- Install or hydrate npm dependencies with `--ignore-scripts` unless the user
  explicitly authorizes lifecycle scripts after review.
- When an extension uses a native enforcement binary, verify that the pinned
  binary is present and functional; document any fallback that disables
  enforcement.
- Update the installed-extension table and decision log in
  `docs/agent-setup.md` whenever an extension is added, removed, updated, or
  re-audited.
- Remember that ignored local metadata such as `.pi/npm/package.json` can still
  be inspected by repository checks. Keep its direct dependencies exactly
  pinned too.

## Fork documentation

Keep `docs/agent-setup.md` accurate when branch workflow, toolchain pins,
installation scope, extension configuration, or audit conclusions change. Keep
this file operational and concise; put research details and historical rationale
in the setup document.
