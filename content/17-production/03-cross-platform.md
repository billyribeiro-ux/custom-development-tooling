# Cross-Platform Pitfalls and Portability

Your tooling will run on more machines than you think: your macOS laptop, a teammate's Windows PC, a Linux CI runner, a Docker container. Code that quietly assumes *your* platform breaks on others — the "works on my machine" problem (Module 1.3) in its purest form. This lesson catalogs the common cross-platform pitfalls and how to avoid them.

## The big three platforms

- **macOS** — Unix-like (BSD heritage); what many developers use.
- **Linux** — Unix-like (GNU heritage); what most servers and CI runners use.
- **Windows** — fundamentally different (paths, line endings, shell).

macOS and Linux are *similar* but not identical (BSD vs GNU tools differ in flags). Windows is the *most* different and where the nastiest surprises live. Even if you only target Unix, the macOS/Linux differences will bite you.

## Pitfall 1: path separators

```javascript title=paths.mjs
// BAD: hard-codes the Unix separator — breaks on Windows (which uses \)
const file = dir + '/' + name;

// GOOD: let the path module handle it (Module 5.2 / 6.2)
import { join } from 'node:path';
const file = join(dir, name);          // '/' on Unix, '\' on Windows — automatically
```

> [!GOTCHA]
> **Always use `path.join`/`pathlib.Path`** (Modules 5.2, 6.2), never string concatenation — and beware that Windows *also* accepts `/` in many contexts, so hard-coded separators often "work" until they suddenly don't: a sneaky, intermittent bug. The underlying difference: Windows uses `\` as the path separator, not `/`, so hard-coding `'/'` (or splitting paths on `'/'`) breaks there. Use the path module and it's a non-issue.

## Pitfall 2: line endings (CRLF vs LF)

```text title=line-endings
Unix (macOS/Linux):  lines end with LF        (\n)
Windows:             lines end with CRLF       (\r\n)
```

This causes maddening bugs: a file edited on Windows has `\r\n`, and a Unix tool that splits on `\n` leaves a stray `\r` on every line — which then breaks comparisons, shows as `^M` in output, or makes a shell script fail with a cryptic error.

> [!WARNING]
> A classic disaster: a `.sh` script saved with CRLF line endings fails on Linux with `bad interpreter: /bin/bash^M` — the `\r` got attached to the shebang's interpreter path (Module 3.1). The fix: configure git to normalize line endings via a **`.gitattributes`** file (`* text=auto`, and `*.sh text eol=lf` to force LF on shell scripts), and set your editor to use LF. This one file prevents a whole category of Windows/Unix grief.

```text title=.gitattributes
* text=auto              # normalize text files
*.sh text eol=lf         # shell scripts MUST be LF, even on Windows
*.png binary             # don't touch binary files
```

## Pitfall 3: shell differences

Shell scripts (`.sh`, Module 3) are inherently Unix. They don't run natively on Windows (without WSL or Git Bash). And even among Unix systems, tools differ:

```bash title=bsd-vs-gnu.sh
sed -i 's/a/b/' file       # works on GNU (Linux), FAILS on BSD (macOS) — needs sed -i '' on macOS
date -d '...'              # GNU only; macOS 'date' uses different flags
readlink -f path          # GNU; macOS lacks -f (until recent versions)
```

> [!GOTCHA]
> macOS ships **BSD** versions of `sed`, `date`, `find`, etc.; Linux ships **GNU** versions with different flags. A script using `sed -i 's/x/y/'` works on Linux but errors on macOS (which needs `sed -i '' 's/x/y/'`). This is why "the script works in CI (Linux) but not on my Mac" (or vice versa). For truly portable scripts, stick to POSIX-standard flags, or — often better — **write the tool in Node/Python** (Module 6.5), whose standard libraries behave identically across platforms.

## Pitfall 4: environment and shell built-ins

```bash title=env-differences.sh
# Environment variable names and conventions differ:
echo "$HOME"          # Unix
echo "$USERPROFILE"   # Windows equivalent
# Case sensitivity: Linux filesystems are case-SENSITIVE; macOS/Windows often aren't
```

> [!GOTCHA]
> **Filesystem case-sensitivity** is a subtle killer. Linux treats `File.js` and `file.js` as *different* files; macOS and Windows (by default) treat them as the *same*. So `import './File.js'` when the file is actually `file.js` works on your Mac but **fails on the Linux CI runner** with "module not found." This is a top cause of "passes locally, fails in CI." TypeScript's `forceConsistentCasingInFileNames` (Module 8.3) catches it — which is why that setting is in the course's `tsconfig.json`.

## Strategies for portability

How senior engineers keep tooling portable:

1. **Use cross-platform languages for non-trivial tools.** Node and Python behave (mostly) the same everywhere; their `path`/`pathlib` modules handle separators, their file APIs handle encodings. A Node script beats a bash script for portability (Module 6.5).
2. **Use the path/fs abstractions** — `path.join`, `pathlib.Path`, never raw string paths.
3. **Normalize line endings** with `.gitattributes`.
4. **Test on multiple platforms in CI** — a matrix (Module 15.4) over `ubuntu-latest`, `macos-latest`, `windows-latest` *proves* portability instead of hoping for it.
5. **Containerize** (Module 14) — running tooling inside a container makes the *platform itself* consistent everywhere, sidestepping most of these issues entirely.
6. **Stick to POSIX** when you must write shell — avoid GNU/BSD-specific flags.

> [!TIP]
> The pragmatic rule: **for portable tooling, prefer Node or Python over shell.** Shell scripts are fine for Unix-only glue (Module 6.5), but the moment you need a tool to run on Windows *and* Unix, a Node/Python script with `path`/`pathlib` is far more reliable than fighting shell portability. And when the *environment* must be identical, reach for containers (Module 14) — they make portability moot by shipping the platform.

> [!DOGFOOD]
> This course leans on these strategies: the primary generator is **Node** (`generate-pages.mjs`) using `node:path`'s `join` everywhere (Module 5.7) — so it builds on macOS, Linux, and Windows alike. The `tsconfig.json` sets **`forceConsistentCasingInFileNames`** (Module 8.3) to catch case-sensitivity bugs before CI. The CI runner is Linux (`ubuntu-latest`), and the Node code's platform-independence is what makes "builds on my Mac" and "builds in Linux CI" the same thing.

> [!TRY]
> Audit a shell script you have for portability: does it use `sed -i`, `date -d`, or `readlink -f` (GNU-isms that break on macOS)? Does any code split paths on `'/'`? Then consider: would this be more portable rewritten in Node/Python? That assessment is the cross-platform mindset.

> [!KEY]
> - Tooling runs on macOS, Linux, *and* Windows — code that assumes one platform breaks on others ("works on my machine," Module 1.3).
> - **Path separators**: use `path.join`/`pathlib` (Modules 5.2, 6.2), never hard-coded `'/'`. **Line endings**: normalize with `.gitattributes` (CRLF breaks `.sh` shebangs).
> - **Shell tools differ** (BSD macOS vs GNU Linux — `sed -i`, `date`, `readlink`); **filesystem case-sensitivity** differs (Linux is strict — a top "fails in CI" cause, caught by `forceConsistentCasingInFileNames`).
> - Strategies: **prefer Node/Python over shell** for portable tools, use path/fs abstractions, normalize line endings, **test on a CI matrix** (Module 15.4), and **containerize** (Module 14) to fix the platform itself.
