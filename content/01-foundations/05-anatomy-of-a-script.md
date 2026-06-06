# Anatomy of a Good Script

Every script — in any language — has the same skeleton. Learn the skeleton once and you can read and write tooling in Bash, Node, Python, or anything else, because they're all variations on the same four parts.

## The four parts of every script

```text title=the-skeleton
1. INPUTS       what it reads: arguments, env vars, files, stdin
2. SIDE EFFECTS what it changes: files, databases, network, processes
3. OUTPUTS      what it produces: files, stdout, an exit code
4. FAILURE      what happens when something goes wrong
```

A beginner thinks about part 2 (do the thing). A senior engineer thinks about all four — and spends *most* of their attention on parts 1 and 4, because that's where scripts break in the real world.

## A worked example: the same script, four lenses

Here's a small script that resizes... actually, let's keep it concrete and real — a script that copies a file to a backup location. Watch how each part shows up:

```bash title=backup.sh
#!/usr/bin/env bash
set -euo pipefail

# 1. INPUTS: an argument (the file) and an env var (the backup dir, with default)
src="${1:?usage: backup.sh <file>}"     # :? = error if missing
backup_dir="${BACKUP_DIR:-./backups}"   # :- = default if unset

# 4. FAILURE (guard clause): fail early with a clear message
if [[ ! -f "$src" ]]; then
  echo "backup.sh: no such file: $src" >&2   # errors go to stderr
  exit 1
fi

# 2. SIDE EFFECT: create the dir (idempotently) and copy
mkdir -p "$backup_dir"
dest="$backup_dir/$(basename "$src").$(date +%Y%m%d)"
cp "$src" "$dest"

# 3. OUTPUT: a result on stdout, and an exit code of 0 (success) by default
echo "backed up $src -> $dest"
```

Let's narrate the design decisions, because *these* are the lessons:

- **Inputs are explicit and validated.** `${1:?...}` refuses to run without a filename and prints how to use it. `${BACKUP_DIR:-./backups}` makes the destination configurable but gives a sane default. (We cover this `${...}` syntax fully in Module 3.)
- **It fails early and loudly.** The guard clause checks the file exists *before* doing anything, and writes the error to `stderr` (Module 2) so it doesn't pollute the normal output.
- **Side effects are idempotent.** `mkdir -p` won't error if `backups/` already exists.
- **Output is useful.** It prints what it did, and exits 0 on success so other tools know it worked.

## The principal-engineer mindset: design the failure first

Here's the single biggest mindset shift. Most people write the happy path and bolt on error handling later (or never). Senior engineers ask, *up front*:

- What if the input is missing or malformed?
- What if the file/network/database isn't there?
- What if the script is interrupted halfway?
- How will the *caller* know it failed? (Hint: a non-zero exit code.)

Designing the failure modes first makes the happy path fall out naturally, and produces tooling people can actually rely on in automation, where no human is watching.

> [!WARNING]
> A script that fails *silently* — does nothing useful but exits 0 — is the most dangerous kind, because automation built on top of it assumes success. Always make failure visible: a message on `stderr` and a non-zero exit code. We'll hammer exit codes in Module 2.

## Pure-ish vs effectful: keep them separate

A function that only computes (input → output, no side effects) is **pure**, and pure code is easy to test and reason about. Side effects (writing files, hitting the network) are where bugs and surprises live. A good pattern, in any language:

> Compute the *what* purely; do the *doing* in one clearly-marked place.

```javascript title=separation.mjs
// PURE: easy to test, no surprises — just data in, data out
function planRenames(files) {
  return files.map((name) => ({ from: name, to: name.toLowerCase() }));
}

// EFFECTFUL: the only part that touches the disk, kept small and obvious
async function applyRenames(plan) {
  for (const { from, to } of plan) await rename(from, to);
}
```

This separation lets you unit-test `planRenames` without a filesystem, and even add a `--dry-run` flag trivially (just *print* the plan instead of applying it). You'll see this exact shape throughout the course.

> [!TIP]
> A `--dry-run` flag — "show me what you *would* do without doing it" — is a hallmark of trustworthy tooling. It falls out almost for free when you separate planning from doing. The course's `clean-cache.sh` is dry-run by default.

## A reusable checklist

When you write or review a script, run down this list:

1. Are inputs explicit, documented, and validated?
2. Are side effects idempotent and minimal?
3. Is there useful output and a correct exit code?
4. Does it fail early, loudly, and to `stderr`?
5. Is the pure logic separated from the effects?

> [!TRY]
> Take the `backup.sh` above and mentally trace what happens if you run `backup.sh` with no arguments. Then with a filename that doesn't exist. Then twice in a row with a valid file. For each, identify which of the four parts handled the situation.

> [!KEY]
> - Every script has four parts: **inputs, side effects, outputs, and failure**.
> - Beginners focus on side effects; seniors spend most attention on **inputs and failure**.
> - **Design the failure first** — the happy path then falls out naturally.
> - Make failure **visible**: a message to `stderr` and a **non-zero exit code**. Silent failure is the most dangerous.
> - **Separate pure computation from side effects** — it makes testing and `--dry-run` easy.
