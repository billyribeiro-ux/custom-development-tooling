# Choosing Node vs Python vs Bash

You now know three tooling languages. A senior engineer's real skill isn't mastery of one — it's *choosing the right one for each task*. This lesson gives you a clear framework so you pick deliberately instead of defaulting to whatever you know best.

## The honest truth first

For most tasks, **any** of the three will work. Don't agonize. But each has a sweet spot, and matching the task to the tool makes scripts shorter, clearer, and more maintainable. Here's how to think about it.

## The quick decision guide

| If the task is mostly... | Reach for... | Because... |
| --- | --- | --- |
| Running and chaining other commands | **Bash** | gluing programs is what shells *are* |
| File/text transformation, JSON, build logic | **Node** | great async I/O, JSON is native, one runtime |
| Data wrangling, math, scientific work, rich CLIs | **Python** | best stdlib for data, `argparse`, readability |
| Already in a JS/TS project | **Node** | one toolchain, share code with the app |
| Already in a Python project | **Python** | one toolchain, share code with the app |

## Bash: the glue

Bash shines when your script is *mostly orchestration* — running other programs in sequence and reacting to their exit codes:

```bash title=bash-sweet-spot.sh
#!/usr/bin/env bash
set -euo pipefail
docker build -t app .
docker push app
kubectl rollout restart deployment/app
```

This is trivial in bash and awkward in Node/Python (you'd be wrapping every line in `subprocess`/`child_process`). When the script is "run this, then that, then that," bash is the natural fit.

**Bash's limits** (you've seen them): no real data structures beyond arrays, error-prone quoting (Module 2.6), no `--long` flags built in (Module 4.2), painful for anything involving JSON or arithmetic. The moment you're parsing JSON or building nested data in bash, *stop* — you've outgrown it.

> [!GOTCHA]
> The classic anti-pattern: a bash script that grows to 300 lines, parsing JSON with `grep`/`sed`, building fake data structures with delimited strings. That's a script begging to be rewritten in Node or Python. Recognizing "this has outgrown bash" is a key skill — usually the signal is *manipulating structured data* or *needing real error handling*.

## Node: the all-rounder for JS shops

Node is excellent when you're transforming files, working with JSON (it's literally JavaScript objects), or already in a JS/TS codebase:

```javascript title=node-sweet-spot.mjs
import { readFile, writeFile } from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
pkg.version = bumpVersion(pkg.version);          // real data manipulation
await writeFile('package.json', JSON.stringify(pkg, null, 2) + '\n');
```

JSON in, manipulate, JSON out — clean and native. And if your *app* is JS/TS, your tooling in Node can share types and utilities with it, and your team needs only one runtime. This is often the deciding factor: **use the language your project already uses** unless there's a strong reason not to.

## Python: data, science, and ergonomic CLIs

Python wins for data-heavy work and when you want the nicest CLI experience:

```python title=python-sweet-spot.py
import csv, statistics
from pathlib import Path

rows = list(csv.DictReader(Path("metrics.csv").read_text().splitlines()))
latencies = [float(r["latency_ms"]) for r in rows]
print(f"p50={statistics.median(latencies):.1f}ms  mean={statistics.mean(latencies):.1f}ms")
```

CSV parsing, statistics, and readable data manipulation are built in and pleasant. Python's `argparse` (Module 4.4) also gives the richest CLI for free. And for anything touching data science, ML, or scientific computing, Python's ecosystem is unmatched.

## The decisive factors, in order

When genuinely unsure, ask these in order:

1. **What's the project already using?** A JS app → Node tooling. A Python app → Python tooling. Consistency beats theoretical fit; one toolchain is simpler for everyone.
2. **What's the task's nature?** Pure orchestration → Bash. Structured data/files → Node or Python. Data analysis → Python.
3. **Who maintains it?** Use what the team knows. The "best" language nobody on the team can debug is the wrong choice.
4. **How long/complex?** Tiny glue (< ~30 lines, just running commands) → Bash is fine. Anything substantial → a real language with real error handling and argument parsing.

> [!TIP]
> A principal-engineer heuristic: **start in bash, graduate when it hurts.** Many tools begin as a handful of shell commands. That's fine. When the script starts needing JSON, nested data, real argument parsing, or careful error handling, *that's the signal* to rewrite it in Node or Python. Don't force bash to do a real language's job, and don't reach for Node to run three commands.

## Mixing languages is normal

A real project happily uses all three: bash for the bootstrap and glue, Node/TS for build scripts, Python for a data generator, all tied together by a `Makefile` (Module 11) that doesn't care what language each target is written in. The `Makefile` is the *uniform interface*; behind each target, use whatever fits.

> [!DOGFOOD]
> This very repo demonstrates the mix: `clean-cache.sh` (bash glue), `generate-pages.mjs` and `seed-database.mjs` (Node), `generate-pages.py` (Python), all exposed through one `Makefile`. Each task uses the language that fits it best, and `make` hides the differences. You'll build that `Makefile` in Module 11.

> [!TRY]
> Look at three tooling tasks you do (or can imagine): "deploy by running 3 commands," "rewrite all the version numbers in package.json," "summarize a CSV of timings." Assign each to bash, Node, or Python using the guide above, and justify it in one sentence. That reasoning *is* the skill.

> [!KEY]
> - All three work for most tasks — but each has a sweet spot: **Bash** = glue/orchestration, **Node** = files/JSON/JS projects, **Python** = data/science/rich CLIs.
> - The **biggest deciding factor is usually what the project already uses** — consistency and one toolchain win.
> - Bash's limits (quoting, no JSON, no long flags) signal when a tool has **outgrown** it — usually when manipulating structured data.
> - Heuristic: **start in bash, graduate to Node/Python when it hurts.** Don't force bash to do a real language's job.
> - Real projects **mix all three**, unified behind a `Makefile` (Module 11) — pick per task, hide the difference.
