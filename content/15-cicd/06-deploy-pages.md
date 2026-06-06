# Deploying the Static Site to GitHub Pages

The final step of CI/CD is **CD** — actually shipping. For a static site like this course, the destination is **GitHub Pages**: free hosting for static files, deployed automatically from CI. This lesson covers how the deploy half of the pipeline (Module 15.5) works, and the general principles of automated deployment that apply far beyond Pages.

## What "deploy" means for a static site

Recall the source-vs-artifact distinction (Module 1.3): your *source* is the Markdown, manifest, and generator; the *artifact* is the built `site/` directory of HTML. "Deploying" a static site means: **take the built artifact and put it somewhere the public can reach it over HTTP.** No server process, no runtime — just static files served by a CDN.

```text title=static-deploy
source (committed) ──build──> site/ (artifact) ──deploy──> hosting (public URL)
   Markdown, generator           HTML files          GitHub Pages / Netlify / etc.
```

This is the simplest kind of deployment, which is part of why static sites are so popular: nothing to run, nothing to crash, trivially cacheable, essentially free to host.

## GitHub Pages: free static hosting

**GitHub Pages** serves static files straight from a GitHub repository over HTTPS, free. The modern way to deploy to it is *from a CI workflow* (Module 15.3) using official actions — you build in CI, then publish the artifact.

The deploy uses three pieces (you saw them in Module 15.5):

```yaml title=pages-deploy.yaml
# In the BUILD job: package the built site as a Pages artifact
- uses: actions/upload-pages-artifact@v3
  with:
    path: site                         # the built directory to publish

# In the DEPLOY job: publish that artifact to Pages
- uses: actions/deploy-pages@v4
```

`upload-pages-artifact` packages your `site/` directory; `deploy-pages` publishes it to the Pages CDN and returns the live URL. Between them, your built site goes from a CI runner to a public HTTPS address automatically.

## The permissions and environment

Deploying to Pages needs specific permissions and an environment (Module 15.4, 15.5):

```yaml title=pages-permissions.yaml
permissions:
  pages: write          # permission to publish to Pages
  id-token: write       # for OIDC: proves the deploy is genuinely from this workflow

environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}    # the live URL, shown in the UI
```

- **`pages: write`** — allows publishing (granted *narrowly* to the deploy job, Module 15.4's least privilege).
- **`id-token: write`** — enables OIDC, a modern, keyless authentication: the deploy proves its identity cryptographically instead of using a stored secret. More secure than a long-lived token (Module 9.3 — no secret to leak).
- **`environment`** — names the deployment target and surfaces the live `url` in GitHub's UI, so you can click straight to the deployed site.

## Deploy only on main, only after success

The deploy job's guards (Module 15.5) encode the core CD safety rules:

```yaml title=deploy-guards.yaml
deploy:
  needs: build                              # only after the build job SUCCEEDS
  if: github.ref == 'refs/heads/main'       # only on the main branch
```

- **`needs: build`** — you *never* deploy a build that didn't pass all the gates (lint, type-check, tests). Passing CI is a precondition for shipping (Module 15.2).
- **`if: ... main`** — only the main branch deploys. Pull requests run all the checks but never publish — so experimental PR code can't accidentally reach production. This is the "gate PRs, deploy main" pattern (Module 15.2) completed.

Together: *code reaches production only by passing every check and landing on main.* That's continuous deployment done safely.

## The base path gotcha

A practical wrinkle specific to project Pages sites:

> [!GOTCHA]
> GitHub Pages serves a *project* site under a sub-path: `https://username.github.io/repo-name/`, not the root `/`. So absolute links like `/assets/styles.css` break — they resolve to `username.github.io/assets/...`, missing the `/repo-name/` prefix. The fixes: use **relative links** (which is why this course's generator emits `../assets/...` relative paths, Module 5.7 — so it works at *any* base path, including `file://`), or set a **base path** at build time (the generator's `--base` flag exists for exactly this). This base-path issue trips up nearly everyone deploying a project site; relative links sidestep it entirely.

## Beyond Pages: the universal deploy pattern

GitHub Pages is one target, but the *pattern* is universal. Other static hosts (Netlify, Vercel, Cloudflare Pages, S3+CloudFront) work the same way: CI builds the artifact, then a deploy step publishes it. And the *principles* apply to *any* deployment, even non-static:

1. **Build once, deploy the artifact** — don't rebuild in production; ship the exact thing CI tested (Module 1.3, 14.3).
2. **Deploy only what passed CI** (`needs:` the checks) — never ship unverified code.
3. **Deploy only from the right branch** (`if: main`) — production comes from main, not arbitrary branches.
4. **Use keyless auth (OIDC) or a secret store** for credentials (Module 9.3) — never inline secrets.
5. **Automate it** — a push to main deploys, with zero manual steps (Module 1.1).

> [!NOTE]
> More advanced deployments add stages you'll meet later in your career: deploying to *staging* first, running *smoke tests* against the deployed site, *blue-green* or *canary* rollouts (deploy to a fraction of traffic first), and automatic *rollback* if health checks fail (Module 14.4's health checks, at the deploy level). The static-site deploy here is the simplest case, but the shape — build, verify, ship-on-success, automate — scales all the way up to large production systems.

> [!DOGFOOD]
> This course deploys to GitHub Pages via the `deploy` job in `.github/workflows/ci.yml` (Module 15.5): after the build job uploads the `site/` artifact, the deploy job (`needs: build`, `if: main`, with `pages: write`/`id-token: write` and a `github-pages` environment) publishes it with `actions/deploy-pages@v4`. And because the generator emits *relative* links (Module 5.7), the site works both at the Pages sub-path *and* when you open it locally via `file://` — the base-path gotcha, designed around from the start.

> [!TRY]
> Look at the course's `deploy` job and identify the five universal principles in it: build-then-deploy-the-artifact (upload/deploy actions), deploy-only-what-passed (`needs: build`), right-branch-only (`if: main`), keyless auth (`id-token: write`), and automation (no manual step). Then check `tools/generate-pages.mjs` — confirm its links are relative (`../assets`), the base-path fix.

> [!KEY]
> - For a static site, **deploy = publish the built artifact** (the `site/` HTML) to a host over HTTP — no server, trivially cacheable, often free.
> - **GitHub Pages** publishes from CI via `upload-pages-artifact` + `deploy-pages`, using `pages: write` and keyless **OIDC** (`id-token: write`) — no stored secret.
> - Deploy **only after CI passes** (`needs: build`) and **only from main** (`if:`) — code ships solely by passing every gate and landing on main.
> - **Base-path gotcha**: project Pages live under `/repo-name/` — use **relative links** (as the course generator does) or a `--base` flag.
> - The pattern is universal: **build once, deploy the artifact, only what passed, only from the right branch, with safe auth, automated** — it scales from static sites to large systems.
