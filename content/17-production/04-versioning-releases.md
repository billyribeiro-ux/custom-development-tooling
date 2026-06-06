# Versioning, Releasing, and Changelogs

The last production pattern: how software is *versioned* and *released*. Every package you've installed has a version (Module 8.2); every dependency range relies on versions meaning something (Module 8.4). This lesson explains **semantic versioning**, the release process, and changelogs — the conventions that let an entire ecosystem manage change safely.

## Why versions need rules

When you depend on `marked@^12.0.0` (Module 8.2), you're trusting that any `12.x` release won't break your code. That trust only works if version *numbers* follow agreed rules about what kinds of change each part signals. Those rules are **Semantic Versioning** (semver) — the convention nearly all modern packages follow.

## Semantic Versioning (semver)

A version is three numbers: **MAJOR.MINOR.PATCH** (e.g. `2.4.1`). Each communicates the *kind* of change since the last release:

```text title=semver
   2  .  4  .  1
   │     │     │
   │     │     └── PATCH: backwards-compatible BUG FIXES (safe to upgrade)
   │     └──────── MINOR: backwards-compatible NEW FEATURES (safe to upgrade)
   └────────────── MAJOR: BREAKING CHANGES (upgrade carefully — may break you)
```

The rules, from the consumer's perspective:

- **PATCH** (`2.4.1` → `2.4.2`): bug fixes only, no API changes. Always safe to take.
- **MINOR** (`2.4.1` → `2.5.0`): new features added, but existing code still works. Safe to take.
- **MAJOR** (`2.4.1` → `3.0.0`): *breaking* changes — something that worked before may not. Upgrade deliberately, read the migration guide.

This is *exactly* what version ranges encode (Module 8.2): `^2.4.1` means "any `2.x` ≥ 2.4.1" — i.e. accept minor and patch updates (safe by semver's promise) but *not* the next major (which could break you). Semver is the contract that makes ranges and lockfiles (Module 8.4) work.

> [!NOTE]
> Semver is a *promise*, and the whole dependency ecosystem (Module 8) runs on it. When you publish a package, bumping the right number is a commitment to your users: a patch *won't* break them, a major *might*. Breaking that promise (shipping a breaking change as a minor) breaks everyone who trusted your range — one of the most damaging things a maintainer can do. Take versioning seriously: it's a contract.

## Pre-release and zero versions

```text title=special-versions
1.0.0-beta.1     a PRE-RELEASE (testing before the real 1.0.0; unstable)
1.0.0-rc.2       release candidate
0.x.y            "0" major = "anything may change" — semver rules relaxed pre-1.0
```

A `0.x` version signals "early, unstable — I might break things in any release." Reaching `1.0.0` is a statement: "this is stable; I'll honor semver now." Pre-release tags (`-beta`, `-rc`) let people test upcoming versions without affecting normal range resolution.

## The release process

Releasing a version is a small pipeline of its own (and a great use of the automation in this course):

```text title=release-steps
1. Decide the version bump (patch/minor/major) based on what changed
2. Update the version number (package.json / pyproject.toml — Modules 8.2, 10.2)
3. Update the CHANGELOG (what changed, for humans)
4. Commit, then TAG the commit (git tag v2.5.0)
5. Push the tag — which can TRIGGER CI to build & publish (Module 15.2)
```

The **git tag** is key: it marks a specific commit as "this is version 2.5.0," creating an immutable reference. Pushing a tag is a common CI trigger (Module 15.2's "on tag/release") — so tagging can *automatically* build and publish the release (to npm, a container registry, GitHub Releases). Releasing becomes "bump, changelog, tag, push" — the rest is automated.

```bash title=tag-and-release.sh
# Bump version in package.json, update CHANGELOG, commit, then:
git tag v2.5.0
git push origin v2.5.0          # pushing the tag triggers the release workflow
```

> [!TIP]
> Read the version from a *single source* (Module 4.5) — `package.json`/`pyproject.toml` — and have your tooling and `--version` flag read *that*, rather than hard-coding it anywhere. Then a release is one bump in one place, and nothing can disagree about the version. Tools like `npm version 2.5.0` even do the bump-commit-tag in one step. One source of truth, again.

## Changelogs: versions for humans

A version number tells a *machine* what kind of change happened; a **changelog** tells a *human what actually changed*. It's a file (conventionally `CHANGELOG.md`) listing, per version, what was added, changed, fixed, and removed:

```markdown title=CHANGELOG.md
# Changelog

## [2.5.0] - 2026-06-06
### Added
- `--watch` flag to rebuild on file changes

### Fixed
- Prev/Next links now correct on the last lesson

## [2.4.1] - 2026-05-20
### Fixed
- Crash when course.json has a trailing comma
```

The widely-followed format ("Keep a Changelog") groups entries under **Added / Changed / Deprecated / Removed / Fixed / Security**. A good changelog lets a user deciding whether to upgrade see *exactly* what they'd get — and helps anyone debugging "when did this behavior change?"

> [!WARNING]
> `git log` is **not** a changelog. Commit messages are for *developers* (often terse, implementation-focused, noisy); a changelog is for *users* (curated, feature-focused, readable). "fix bug" or "wip" commits don't help a user understand a release. Write the changelog deliberately, summarizing user-facing changes — it's documentation, not a raw history dump. (Tools can *help* generate it from structured commits, but a human curates the result.)

## Conventional commits (a helpful convention)

Many teams structure commit messages so versioning and changelogs can be *partly automated*:

```text title=conventional-commits
feat: add --watch flag           → suggests a MINOR bump
fix: correct last-page nav        → suggests a PATCH bump
feat!: drop Node 18 support       → the ! marks a BREAKING change → MAJOR bump
```

With this convention, tooling can read the commits since the last release, *infer* the right semver bump, and *generate* a draft changelog (`feat:` → Added, `fix:` → Fixed). It connects everything in this lesson: structured commits → automated version bump → generated changelog → tag → CI release. The automation you've learned applies to the release process itself.

> [!DOGFOOD]
> This course's `package.json` (`"version": "1.0.0"`, Module 8.2) and `pyproject.toml` (`version = "1.0.0"`, Module 10.2) carry the version. A `--version` flag (Module 4.5) would read from there — a single source of truth. Releasing a new edition would mean: bump those, update a changelog, tag (`git tag v1.1.0`), and push — and a release workflow (Module 15.2's "on tag" trigger) could build and publish automatically.

> [!TRY]
> For a change you might make to a project, decide the semver bump: a bug fix (patch), a new optional flag (minor), or removing a flag people use (major). Then write the one changelog line you'd add under the right heading. That judgment — "what kind of change is this?" — is the core versioning skill.

> [!KEY]
> - **Semantic Versioning** (`MAJOR.MINOR.PATCH`) encodes the *kind* of change: **patch** = safe bug fix, **minor** = safe new feature, **major** = breaking. It's the contract that makes ranges and lockfiles (Module 8) work.
> - A `0.x` version means "unstable, anything may change"; reaching `1.0.0` promises semver stability. Bumping the right number is a **promise to your users**.
> - **Release** = decide the bump → update version (single source, Module 4.5) → update changelog → **git tag** → push (which can **trigger CI** to publish, Module 15.2).
> - A **changelog** documents changes *for humans* (curated, user-facing) — not `git log` (for developers). Follow Added/Changed/Fixed/etc.
> - **Conventional commits** (`feat:`/`fix:`/`!`) let tooling **automate** the version bump and changelog — applying this course's automation to releasing itself.
