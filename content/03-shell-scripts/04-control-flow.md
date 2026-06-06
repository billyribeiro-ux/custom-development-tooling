# Conditionals, Loops, and case

Now we add decision-making and repetition — the constructs that turn a list of commands into a real program. Bash's syntax here is quirky (those `[[ ]]` and `;;` look odd at first), so we'll explain not just *how* but *why* it looks the way it does.

## if: branching on a command's success

Remember: bash branches on **exit codes** (Module 2), not on "true/false values." An `if` runs its body when the condition *command* exits 0.

```bash title=if-basic.sh
if grep -q "ERROR" log.txt; then
  echo "found errors"
else
  echo "clean"
fi
```

`grep -q` exits 0 if it finds a match, non-zero if not — so the `if` does the right thing. There's nothing special going on: `if` just runs a command and checks its exit code.

## The test command: [[ ... ]]

For comparing values and testing files, bash provides the `[[ ... ]]` construct. It *is* a command (one that exits 0 for true, 1 for false), which is why `if [[ ... ]]` works:

```bash title=tests.sh
name="Ada"
count=5

if [[ "$name" == "Ada" ]]; then echo "hi Ada"; fi      # string equality
if [[ "$name" != "Bob" ]]; then echo "not Bob"; fi      # string inequality
if [[ -z "$name" ]]; then echo "empty"; fi              # -z: empty string?
if [[ -n "$name" ]]; then echo "non-empty"; fi          # -n: non-empty?

if [[ "$count" -gt 3 ]]; then echo "many"; fi           # numeric: -gt -lt -ge -le -eq -ne
if (( count > 3 )); then echo "many"; fi                # (( )) for arithmetic — cleaner
```

> [!GOTCHA]
> String comparison uses `==`/`!=`; numeric comparison uses `-gt`/`-lt`/`-eq` etc. Mixing them is a classic bug: `[[ "$a" == 5 ]]` is *string* comparison, so `"05" == 5` is false. For numbers, prefer the arithmetic form `(( a == 5 ))`, which behaves like math.

File tests are especially common in tooling:

```bash title=file-tests.sh
[[ -f "$path" ]]    # exists and is a regular file
[[ -d "$path" ]]    # exists and is a directory
[[ -e "$path" ]]    # exists (file OR directory)
[[ -x "$path" ]]    # is executable
[[ -r "$path" ]]    # is readable
[[ -s "$path" ]]    # exists and is non-empty
```

> [!TIP]
> Use the modern `[[ ... ]]`, not the older `[ ... ]` (a.k.a. the `test` command). `[[ ]]` is safer: it doesn't word-split unquoted variables and supports `&&`/`||` inside. The old `[ ]` requires careful quoting and is full of footguns. There's almost no reason to use `[ ]` in a bash script.

## Combining conditions

```bash title=combining.sh
if [[ -f "$config" && -r "$config" ]]; then       # AND
  echo "config is readable"
fi

if [[ "$env" == "prod" || "$env" == "staging" ]]; then  # OR
  echo "deployed environment"
fi
```

## Loops: for

The `for` loop iterates over a list of words:

```bash title=for-loops.sh
# Over an explicit list
for env in dev staging prod; do
  echo "deploying to $env"
done

# Over files (globbing from Module 2 — quote the loop variable!)
for file in src/*.js; do
  echo "processing $file"
done

# Over an array
servers=("web1" "web2" "web3")
for s in "${servers[@]}"; do      # "${arr[@]}" expands to each element, safely quoted
  echo "ping $s"
done

# C-style, for counting
for (( i = 0; i < 3; i++ )); do
  echo "attempt $i"
done
```

> [!WARNING]
> Never loop over command output by parsing it naively, like `for line in $(cat file)`. That word-splits on spaces, mangling lines with spaces. To read a file line by line, use a `while read` loop (next section). This is one of the most common shell mistakes.

## Loops: while and reading input

```bash title=while-loops.sh
# Loop while a condition holds
count=0
while (( count < 3 )); do
  echo "count is $count"
  count=$(( count + 1 ))
done

# The correct way to read a file line by line:
while IFS= read -r line; do
  echo "got: $line"
done < input.txt
```

That `while IFS= read -r line` idiom is worth memorizing: `IFS=` prevents trimming whitespace, and `-r` prevents backslash mangling. It reads each line *exactly*, even with spaces and special characters.

## case: cleaner than many ifs

When you're checking one value against several patterns, `case` is far cleaner than a chain of `if`/`elif`:

```bash title=case.sh
case "$1" in
  start)        echo "starting...";;
  stop)         echo "stopping...";;
  restart)      echo "restarting...";;
  -h|--help)    show_help;;            # multiple patterns with |
  *.txt)        echo "a text file";;   # glob patterns work here!
  *)            echo "unknown: $1";;   # * is the default/catch-all
esac
```

The `;;` ends each branch (forgetting it is a common error). `*)` is the catch-all default. `case` even matches glob patterns, which makes it perfect for argument parsing — you'll see exactly this in `clean-cache.sh` later this module.

> [!DOGFOOD]
> `examples/shell/clean-cache.sh` parses its `--force`/`--help` flags with a `case` inside a `while` loop — the standard pattern for hand-rolled argument parsing. We narrate it in detail two lessons from now.

> [!TRY]
> Write a script that loops `for n in 1 2 3 4 5` and uses an `if (( n % 2 == 0 ))` to print whether each number is even or odd. You'll exercise `for`, `if`, and arithmetic all at once.

> [!KEY]
> - `if` branches on a **command's exit code**; `[[ ... ]]` is a command that's true (exit 0) or false.
> - Use `==`/`!=` for **strings**, `-gt`/`-eq` (or `(( ))`) for **numbers** — don't mix them.
> - Prefer modern **`[[ ]]`** over old `[ ]`; file tests like `-f`, `-d`, `-x` are everyday tools.
> - `for` iterates word lists/globs/arrays (`"${arr[@]}"`); read files with **`while IFS= read -r line`**, never `for line in $(cat)`.
> - **`case`** beats long if-chains for matching one value against patterns (and supports globs) — end each branch with `;;`.
