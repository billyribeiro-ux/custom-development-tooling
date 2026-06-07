# Supply-Chain Security: Trusting Your Dependencies

Every `npm install`, every `uses: some/action@v3`, every `FROM node:22` is an act of *trust*: you are running other people's code, on your machine and your CI, with your credentials. The software supply chain is now the highest-leverage *attack* surface in the industry — and defending it is squarely principal-level work. Module 9.3 covered *your* secrets; this lesson covers trusting *everyone else's code*.

## The threat model: you are running strangers' code

A modern app has *hundreds to thousands* of transitive dependencies (Module 8.4). You wrote maybe 1% of the code you ship. The other 99% is a trust chain stretching to thousands of maintainers you've never met — any of whom (or anyone who compromises them) can run code in your build. The attacker's insight: **why hack the well-defended app when you can hack a sleepy dependency it pulls in?**

```text title=the-supply-chain-attack-surface
your code (1%)
  └── direct deps (you chose these)
        └── transitive deps (you didn't — hundreds of them)
              └── a maintainer's compromised account / a malicious new owner
                    └── runs in YOUR build, with YOUR tokens, on YOUR CI
```

## The named attack classes (know your enemy)

- **Typosquatting** — a malicious package named `crossenv` (vs `cross-env`) or `lodahs` (vs `lodash`). You typo; you're owned.
- **Dependency confusion** — you have an internal package `@acme/auth`; an attacker publishes a *higher version* of `@acme/auth` to the *public* registry, and your installer prefers the public one. (This broke into Apple, Microsoft, and dozens more in 2021.)
- **Malicious install scripts** — a package's `postinstall` runs arbitrary code *the moment you `npm install`* — before you've run a line of the app (Module 5.4's injection, weaponized).
- **Account/maintainer takeover** — a legit popular package gets a malicious update because a maintainer's credentials leaked, or an exhausted maintainer handed the keys to a "helpful" stranger.
- **Build-system compromise** — the attacker poisons the *build*, not the source — so the published artifact contains a backdoor the source doesn't (defeated only by reproducible builds, Module 19.1).

> [!WARNING]
> The **xz/liblzma backdoor (CVE-2024-3094, 2024)** is the case study every engineer should know. An attacker spent *years* as a "helpful" contributor, gained maintainer trust on a tiny but ubiquitous compression library, and slipped a backdoor into the *release tarball's build scripts* (not the git source) that targeted SSH. It was caught by luck — a Microsoft engineer noticed SSH was 500ms slower. It demonstrated every theme here: trust transitivity, the maintainer-takeover vector, build-vs-source divergence, and that the most dangerous dependency is the *boring, unwatched* one everyone depends on.

## Defense in depth

No single control is enough; you layer them (the same "defense in depth" as database constraints, Module 13.2):

### 1. Pin everything by content, not by tag
Tags are mutable; hashes are not (Module 8.4, 1.4). A lockfile pins versions *and integrity hashes*. Pin GitHub Actions to a **commit SHA**, not a moving tag — `@v4` can be re-pointed at malicious code; a SHA cannot:

```yaml title=pin-by-digest.yml
# RISKY: a tag can be moved to point at new (possibly malicious) code
- uses: actions/checkout@v4
# SAFER: a commit SHA is immutable content-addressing (Module 19.1)
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
```

Pin base images by digest too: `FROM node:22-slim@sha256:...` (Module 14.2).

### 2. Don't run install scripts you don't need
Most packages don't *need* a postinstall. Disabling them removes the "owned the instant you install" vector:

```bash title=no-install-scripts.sh
npm ci --ignore-scripts        # then run only the build steps you actually need
```

### 3. Least-privilege CI (this is the big one)
A compromised dependency in CI is only as dangerous as the *credentials CI hands it*. So starve it (Module 15.4):

```yaml title=least-privilege-ci.yml
permissions:
  contents: read          # default the WHOLE workflow to read-only
# ...and never expose secrets to PRs from forks (Module 15.4)
```

Use **OIDC** for deploys (Module 15.6) — short-lived, scoped, keyless tokens minted per-run — instead of long-lived secrets a leaked dependency could exfiltrate. The goal: even if malicious code runs, it finds nothing worth stealing and can't do anything privileged.

### 4. Provenance: prove where an artifact came from
The frontier (2024–2026) is **provenance** and **SLSA** (Supply-chain Levels for Software Artifacts). The idea: an artifact carries a *signed, tamper-proof statement* of exactly which source commit and build process produced it. **Sigstore** (cosign) makes signing keyless and ubiquitous; npm publishes provenance attestations; SLSA levels grade how tamper-resistant your build is.

```bash title=provenance.sh
npm publish --provenance     # attaches a signed statement: "built from THIS commit, in THIS CI run"
# consumers (and you) can later verify the published bytes match a trusted build
```

This is reproducible builds (Module 19.1) turned into a *verifiable supply-chain claim*: not just "I can rebuild this identically," but "here is cryptographic proof of where it came from."

### 5. Generate and consume an SBOM
A **Software Bill of Materials** is a machine-readable list of *everything* in your artifact (CycloneDX/SPDX formats). When the next xz happens, an SBOM lets you answer in *seconds* — "do we ship the vulnerable version anywhere?" — instead of days of frantic grepping. You can't defend what you can't enumerate (Module 9.5's "validate what you can't see," at fleet scale).

### 6. Automate the update treadmill
Stale dependencies accumulate known CVEs. Tools like **Dependabot** / **Renovate** open PRs for updates automatically; combined with your CI gates (Module 15.2), they keep you current *safely* — the update is only merged if the whole test suite stays green.

> [!TIP]
> The single highest-leverage supply-chain defense is the one this whole course has preached: **minimize dependencies** (Modules 1, 5.2, 6.4). Every dependency you *don't* add is an attack surface you don't have, a CVE you'll never patch, a maintainer you don't have to trust. This course's generator uses *one* npm dependency (`marked`) and its Python port uses *zero* — not asceticism, but security. The cheapest dependency to secure is the one you never installed.

> [!DOGFOOD]
> This course's posture reflects the lesson: near-zero dependencies (Modules 5.2/6.4); CI defaults to `permissions: contents: read` and widens narrowly only for deploy (Module 15.4); deploys use OIDC (`id-token: write`, no stored secret, Module 15.6); `.env` is gitignored and secrets come from a store, never the repo (Module 9.3). Pinning Actions by SHA and adding `--provenance` on publish would be the next steps for a higher SLSA level.

> [!TRY]
> Audit a project: run `npm audit` (known CVEs), then look at how many *transitive* dependencies you have (`npm ls --all | wc -l` — often shocking). Check whether your CI's `permissions:` are least-privilege and whether your Actions are pinned to tags or SHAs. Each finding is a real, rankable supply-chain risk — and fixing them is concrete principal-level security work.

> [!KEY]
> - You ship ~1% your code and ~99% strangers'; the **supply chain is the prime attack surface** — attackers hack the sleepy *dependency*, not the hardened app.
> - Know the classes: **typosquatting, dependency confusion, malicious install scripts, maintainer takeover, build compromise** — and the **xz backdoor** as the canonical case.
> - Defend in depth: **pin by digest/SHA** (not tags), `--ignore-scripts`, **least-privilege CI + OIDC** (starve the credentials), **provenance/SLSA + Sigstore**, **SBOMs**, and automated updates (Dependabot/Renovate).
> - **Reproducible builds (Module 19.1) + provenance** turn "I can rebuild this" into "here's cryptographic proof of where it came from."
> - The cheapest defense is **fewer dependencies** — every one you don't add is an attack surface, a CVE, and a maintainer you never have to trust.
