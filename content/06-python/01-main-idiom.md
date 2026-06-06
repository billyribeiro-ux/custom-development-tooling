# Running Python Scripts and the __main__ Idiom

Python is a superb tooling language — readable, batteries-included, and great at text and data wrangling. This module brings everything you know about scripts (inputs, outputs, exit codes, error handling) into Python. We start with how Python scripts run and the one idiom every Python file uses.

## Running a script

```bash title=run-python.sh
python3 script.py              # run it
python3 script.py arg1 arg2    # with arguments
./script.py                    # if it has a shebang + is chmod +x (Module 3.1)
```

A Python file with a shebang and the executable bit runs like any other tool:

```python title=hello.py
#!/usr/bin/env python3
print("Hello from Python")
```

```bash title=make-exec.sh
chmod +x hello.py
./hello.py        # Hello from Python
```

Same shebang and `chmod +x` rules as shell scripts (Module 3.1) — `#!/usr/bin/env python3` finds Python via `PATH`, portably.

## The `if __name__ == "__main__":` idiom

You'll see this at the bottom of nearly every Python script, and it confuses newcomers. Here's what it actually does and why it matters.

```python title=main_idiom.py
#!/usr/bin/env python3

def main():
    print("doing the work")

if __name__ == "__main__":
    main()
```

When Python runs a file, it sets a special variable `__name__`. Its value depends on *how* the file was loaded:

- If you **run the file directly** (`python3 script.py`), `__name__` is the string `"__main__"`.
- If you **import the file** from another module (`import script`), `__name__` is the module's name (`"script"`).

So `if __name__ == "__main__":` means **"only run this when executed directly, not when imported."**

## Why this matters

It lets a file be *both* a runnable script *and* an importable library, without the script's actions firing on import:

```python title=dual_purpose.py
#!/usr/bin/env python3

def slugify(text: str) -> str:
    return text.lower().replace(" ", "-")

def main():
    import sys
    print(slugify(sys.argv[1]))

if __name__ == "__main__":
    main()      # runs ONLY when you do `python3 dual_purpose.py "Hello World"`
```

Now another file can `from dual_purpose import slugify` to reuse the function — *without* triggering `main()`. If you'd put `print(slugify(sys.argv[1]))` at the top level instead, merely importing the file would crash (no `sys.argv[1]`) or print unexpectedly.

> [!GOTCHA]
> Without the `__main__` guard, *any* code at the top level of a module runs the moment it's imported. That's a classic source of surprising side effects: you import a file just to use one function, and suddenly it's parsing arguments or connecting to a database. Always put runnable actions inside `main()` behind the guard.

## Exit codes the Python way

Recall exit codes (Module 2.5). Python gives you a clean pattern: have `main()` *return* an exit code, and convert it at the boundary:

```python title=exit_codes.py
#!/usr/bin/env python3
import sys

def main() -> int:
    if not ok():
        print("something failed", file=sys.stderr)   # errors to stderr (Module 2.4)
        return 1                                       # non-zero = failure
    print("done")
    return 0                                           # success

if __name__ == "__main__":
    raise SystemExit(main())     # turn main()'s return value into the process exit code
```

`raise SystemExit(n)` (or `sys.exit(n)`) sets the process exit code to `n`. By having `main()` *return* the code and raising it only at the very bottom, your logic stays testable (a test can call `main()` and check the return value) while the script still exits correctly.

> [!TIP]
> An *uncaught exception* in Python exits with code 1 automatically and prints a traceback — which is fine for *unexpected* bugs (you want the loud failure). For *expected* errors (bad input, missing file), prefer a clean message to stderr and an explicit `sys.exit(1)`, so users get a friendly error instead of a scary traceback. Same philosophy as Module 5.5.

## Reading arguments (the quick way and the right way)

The raw arguments live in `sys.argv`:

```python title=argv.py
import sys
print(sys.argv)         # ['script.py', 'arg1', 'arg2']  — argv[0] is the script name
first = sys.argv[1] if len(sys.argv) > 1 else None
```

For anything beyond one or two arguments, use `argparse` (Module 4.4) — it gives you flags, help, and validation for free. `sys.argv` is fine for the simplest cases; `argparse` is the grown-up choice.

## A clean script skeleton

Putting it together — the shape most of your Python tooling will take:

```python title=skeleton.py
#!/usr/bin/env python3
"""one-line description of what this script does."""
import argparse
import sys

def do_work(source: str) -> None:
    ...

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source")
    args = parser.parse_args()     # exits with code 2 on bad input (Module 4.4)
    try:
        do_work(args.source)
    except FileNotFoundError as err:
        print(f"error: {err}", file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```

Note the **module docstring** (`"""..."""` at the top) — Python's convention for "what is this file?" Reusing it as `description=__doc__` keeps the help text and the file's purpose in sync (single source of truth, again).

> [!TRY]
> Create a file with a `def main(): print("ran")` and `if __name__ == "__main__": main()`. Run it directly — it prints "ran". Then start `python3`, type `import yourfile`, and notice it does *not* print "ran". You've just seen the `__main__` guard do its job.

> [!KEY]
> - Run scripts with `python3 script.py`, or `./script.py` with a `#!/usr/bin/env python3` shebang + `chmod +x`.
> - **`if __name__ == "__main__":`** means "run only when executed directly, not when imported" — lets a file be both a script and a library.
> - Without the guard, top-level code runs on **import**, causing surprising side effects — always put actions in `main()`.
> - Have `main()` **return an exit code**; `raise SystemExit(main())` applies it. Errors to stderr; let unexpected bugs raise.
> - Use a **module docstring** and reuse it as the argparse `description`.
