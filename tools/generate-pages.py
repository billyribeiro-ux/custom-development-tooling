#!/usr/bin/env python3
"""generate-pages.py — a parallel, study-only port of generate-pages.mjs.

Narrated in Module 6. It does the SAME job as the Node generator (read the
manifest, render Markdown, emit linked HTML pages) so you can compare the two
ecosystems line by line. The Node version is the primary build; this one proves
that "one job, two languages" is a real and ordinary thing.

It uses ONLY the Python standard library (no pip install), and includes a small,
deliberately-simple Markdown renderer covering the subset this course uses.

Run it (writes to site-py/ so it does not clobber the Node build):
    python3 tools/generate-pages.py --out site-py
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MONACO_LANG = {
    "sh": "shell", "bash": "shell", "shell": "shell", "zsh": "shell",
    "js": "javascript", "mjs": "javascript", "cjs": "javascript", "javascript": "javascript",
    "ts": "typescript", "mts": "typescript", "typescript": "typescript",
    "py": "python", "python": "python",
    "json": "json", "jsonc": "json",
    "yml": "yaml", "yaml": "yaml",
    "toml": "ini", "ini": "ini",
    "sql": "sql", "dockerfile": "dockerfile", "docker": "dockerfile",
    "html": "html", "css": "css", "make": "makefile", "makefile": "makefile",
    "text": "plaintext", "txt": "plaintext",
}

CALLOUTS = {
    "NOTE": ("Note", "note"), "TIP": ("Tip", "tip"), "WARNING": ("Warning", "warning"),
    "GOTCHA": ("Gotcha", "gotcha"), "DOGFOOD": ("Dogfooding", "dogfood"),
    "TRY": ("Try it yourself", "try"), "KEY": ("Key takeaways", "key"),
}


def render_inline(text: str) -> str:
    """Render inline Markdown: code, bold, italic, links. (Escapes HTML first.)"""
    # Protect inline code spans before escaping the rest.
    placeholders: list[str] = []

    def stash_code(m: re.Match[str]) -> str:
        placeholders.append(f"<code>{html.escape(m.group(1))}</code>")
        return f"\x00{len(placeholders) - 1}\x00"

    text = re.sub(r"`([^`]+)`", stash_code, text)
    text = html.escape(text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    # Restore the stashed code spans.
    text = re.sub(r"\x00(\d+)\x00", lambda m: placeholders[int(m.group(1))], text)
    return text


def render_code(code: str, infostring: str) -> str:
    """Turn a fenced block into a Monaco block (mirrors the Node renderer)."""
    parts = infostring.strip().split()
    lang_key = (parts[0] if parts else "text").lower()
    lang = MONACO_LANG.get(lang_key, "plaintext")
    title_match = re.search(r"title=(\S+)", infostring)
    filename = title_match.group(1) if title_match else ""
    escaped = html.escape(code)
    fn = html.escape(filename)
    file_pill = f'<span class="code-file">{fn}</span>' if filename else ""
    return f"""<figure class="monaco-block" data-lang="{lang}" data-filename="{fn}">
  <figcaption class="code-caption">
    <span class="code-lang">{html.escape(lang_key)}</span>{file_pill}
    <span class="code-actions">
      <button class="btn-edit" type="button" aria-pressed="false">Edit</button>
      <button class="btn-copy" type="button">Copy</button>
    </span>
  </figcaption>
  <div class="monaco-host"></div>
  <textarea class="code-source" hidden aria-hidden="true">{escaped}</textarea>
  <pre class="code-fallback"><code>{escaped}</code></pre>
</figure>
"""


def render_markdown(md: str) -> str:
    """A small block-level Markdown renderer for the subset this course uses."""
    lines = md.split("\n")
    out: list[str] = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]

        # Fenced code block.
        fence = re.match(r"^```(.*)$", line)
        if fence:
            info = fence.group(1)
            i += 1
            buf: list[str] = []
            while i < n and not lines[i].startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1  # skip closing fence
            out.append(render_code("\n".join(buf), info))
            continue

        # Callout / blockquote: a run of lines starting with ">".
        if line.startswith(">"):
            buf = []
            while i < n and lines[i].startswith(">"):
                buf.append(re.sub(r"^>\s?", "", lines[i]))
                i += 1
            inner = "\n".join(buf)
            cmatch = re.match(r"^\[!(\w+)\]\s*\n?", inner)
            if cmatch and cmatch.group(1).upper() in CALLOUTS:
                label, cls = CALLOUTS[cmatch.group(1).upper()]
                body = render_markdown(inner[cmatch.end():])
                out.append(
                    f'<aside class="callout callout-{cls}">\n'
                    f'  <p class="callout-title">{label}</p>\n'
                    f'  <div class="callout-body">{body}</div>\n</aside>\n'
                )
            else:
                out.append(f"<blockquote>{render_markdown(inner)}</blockquote>\n")
            continue

        # Heading.
        h = re.match(r"^(#{1,6})\s+(.*)$", line)
        if h:
            level = len(h.group(1))
            text = h.group(2)
            slug = re.sub(r"[^\w]+", "-", text.lower()).strip("-")
            out.append(f'<h{level} id="{slug}">{render_inline(text)}</h{level}>\n')
            i += 1
            continue

        # Horizontal rule.
        if re.match(r"^---+\s*$", line):
            out.append("<hr />\n")
            i += 1
            continue

        # Lists (unordered or ordered).
        if re.match(r"^\s*[-*]\s+", line) or re.match(r"^\s*\d+\.\s+", line):
            ordered = bool(re.match(r"^\s*\d+\.\s+", line))
            tag = "ol" if ordered else "ul"
            items = []
            list_re = re.compile(r"^\s*([-*]\s+|\d+\.\s+)")
            while i < n and list_re.match(lines[i]):
                item = re.sub(r"^\s*(?:[-*]|\d+\.)\s+", "", lines[i])
                items.append(f"<li>{render_inline(item)}</li>")
                i += 1
            out.append(f"<{tag}>\n" + "\n".join(items) + f"\n</{tag}>\n")
            continue

        # Blank line.
        if line.strip() == "":
            i += 1
            continue

        # Paragraph: always consume the current line (guarantees progress, so a
        # line starting with "*" like **bold** can't cause an infinite loop),
        # then gather following lines until a blank line or a real block starter.
        buf = [lines[i]]
        i += 1
        while (
            i < n
            and lines[i].strip() != ""
            and not lines[i].startswith(("#", ">", "```"))
            and not re.match(r"^\s*([-*]\s+|\d+\.\s+)", lines[i])
            and not re.match(r"^---+\s*$", lines[i])
        ):
            buf.append(lines[i])
            i += 1
        out.append(f"<p>{render_inline(' '.join(buf))}</p>\n")

    return "".join(out)


def fill(template: str, mapping: dict[str, object]) -> str:
    return re.sub(r"{{\s*(\w+)\s*}}", lambda m: str(mapping.get(m.group(1), "")), template)


def strip_to_text(md: str) -> str:
    """Strip Markdown down to plain prose (for search summaries + reading time)."""
    md = re.sub(r"```[\s\S]*?```", " ", md)
    md = re.sub(r"`[^`]*`", " ", md)
    md = re.sub(r"^>\s*\[![^\]]+\]\s*", " ", md, flags=re.MULTILINE)
    md = re.sub(r"^[>#]+\s*", " ", md, flags=re.MULTILINE)
    md = re.sub(r"^\s*[-*]\s+", " ", md, flags=re.MULTILINE)
    md = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", md)
    md = re.sub(r"[*_~]+", "", md)
    md = md.replace("|", " ")
    md = re.sub(r"<[^>]+>", " ", md)
    md = re.sub(r"&[a-z]+;", " ", md)
    return re.sub(r"\s+", " ", md).strip()


def reading_time(text: str) -> int:
    words = len(text.split()) if text.strip() else 0
    return max(1, round(words / 200))


def summarize(text: str, n: int = 155) -> str:
    t = text.strip()
    if len(t) <= n:
        return t
    cut = t[:n]
    sp = cut.rfind(" ")
    return (cut[:sp] if sp > 0 else cut).strip() + "…"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the course site (Python port).")
    parser.add_argument("--out", default="site-py", help="output directory")
    args = parser.parse_args()

    out_dir = ROOT / args.out
    course = json.loads((ROOT / "course.json").read_text())
    page_tpl = (ROOT / "templates" / "page.html").read_text()
    index_tpl = (ROOT / "templates" / "index.html").read_text()

    # Flatten lessons and compute prev/next, mirroring the Node generator.
    flat = []
    for mi, mod in enumerate(course["modules"]):
        for li, lesson in enumerate(mod["lessons"]):
            gi = len(flat) + 1
            flat.append({
                **lesson,
                "module": mod,
                "moduleNum": mi,
                "lessonNum": li + 1,
                "globalIndex": gi,
                "contentPath": ROOT / "content" / mod["id"] / f"{li + 1:02d}-{lesson['slug']}.md",
                "outName": f"{gi:03d}-{lesson['slug']}.html",
            })
    total = len(flat)
    repo_url = course.get("repoUrl", "")

    # Lightweight nav data inlined into every page (works offline).
    nav = {
        "modules": [{"n": i, "t": m["title"]} for i, m in enumerate(course["modules"])],
        "lessons": [
            {"i": x["globalIndex"], "o": x["outName"], "t": x["title"], "m": x["moduleNum"]}
            for x in flat
        ],
    }
    nav_json = html.escape(json.dumps(nav, ensure_ascii=False))

    if out_dir.exists():
        shutil.rmtree(out_dir)
    (out_dir / "lessons").mkdir(parents=True)
    shutil.copytree(ROOT / "assets", out_dir / "assets")

    search_entries = []
    for idx, lesson in enumerate(flat):
        prev_l = flat[idx - 1] if idx > 0 else None
        next_l = flat[idx + 1] if idx < total - 1 else None
        if lesson["contentPath"].exists():
            source = lesson["contentPath"].read_text()
        else:
            source = f"# {lesson['title']}\n\n> [!NOTE]\n> This lesson is coming soon."
            print(f"  (!) missing content: {lesson['contentPath']}")
        body = render_markdown(source)
        plain = strip_to_text(source)
        minutes = reading_time(plain)
        description = html.escape(summarize(plain, 155))
        search_entries.append({
            "i": lesson["globalIndex"], "o": lesson["outName"], "t": lesson["title"],
            "m": lesson["module"]["title"], "mn": lesson["moduleNum"], "s": summarize(plain, 600),
        })

        disabled = 'aria-disabled="true" tabindex="-1"'
        mod_title = html.escape(lesson["module"]["title"])
        title = html.escape(lesson["title"])
        breadcrumb = (
            '<a href="../index.html">Home</a> <span class="sep">/</span> '
            f'{mod_title} <span class="sep">/</span> '
            f'<span aria-current="page">{title}</span>'
        )
        if lesson.get("example"):
            ex = html.escape(lesson["example"])
            example_footer = (
                f'<a class="footer-link" href="{repo_url}/blob/main/{lesson["example"]}">'
                f"View the example file: <code>{ex}</code></a>"
            )
        else:
            example_footer = ""
        page = fill(page_tpl, {
            "title": f'Lesson {lesson["globalIndex"]} — {lesson["title"]}',
            "description": description,
            "courseTitle": "Custom Development Tooling",
            "lessonTitle": title,
            "moduleTitle": mod_title,
            "breadcrumb": breadcrumb,
            "progressText": f'Lesson {lesson["globalIndex"]} of {total}',
            "progressPercent": round(lesson["globalIndex"] / total * 100),
            "readingTime": minutes,
            "outName": lesson["outName"],
            "globalIndex": lesson["globalIndex"],
            "total": total,
            "navData": nav_json,
            "body": body,
            "prevAttrs": f'href="{prev_l["outName"]}"' if prev_l else disabled,
            "prevLabel": html.escape(prev_l["title"]) if prev_l else "Start of course",
            "nextAttrs": f'href="{next_l["outName"]}"' if next_l else disabled,
            "nextLabel": html.escape(next_l["title"]) if next_l else "End of course",
            "exampleFooter": example_footer,
            "assets": "../assets",
            "home": "../index.html",
        })
        (out_dir / "lessons" / lesson["outName"]).write_text(page)

    # Index page.
    toc = ""
    for mi, mod in enumerate(course["modules"]):
        lessons = [x for x in flat if x["module"]["id"] == mod["id"]]
        items = "\n".join(
            f'      <li><a href="lessons/{x["outName"]}" data-out="{x["outName"]}">'
            f'<span class="toc-num">{x["globalIndex"]}</span> '
            f'{html.escape(x["title"])}</a></li>'
            for x in lessons
        )
        mt = html.escape(mod["title"])
        blurb = html.escape(mod.get("blurb", ""))
        toc += (
            f'  <section class="toc-module">\n'
            f'    <h2><span class="toc-module-num">Module {mi}</span> {mt}</h2>\n'
            f'    <p class="toc-blurb">{blurb}</p>\n'
            f'    <ol class="toc-lessons">\n{items}\n    </ol>\n  </section>\n'
        )
    index = fill(index_tpl, {
        "title": course["title"],
        "description": html.escape(course.get("subtitle", course["title"])),
        "courseTitle": html.escape(course["title"]),
        "subtitle": html.escape(course.get("subtitle", "")),
        "edition": html.escape(course.get("edition", "")),
        "total": total,
        "toc": toc,
        "navData": nav_json,
        "assets": "assets",
        "firstHref": f'lessons/{flat[0]["outName"]}' if flat else "#",
    })
    (out_dir / "index.html").write_text(index)

    # Search index (full-text search, progressively enhanced over http).
    search_doc = {"title": course["title"], "total": total, "lessons": search_entries}
    (out_dir / "search-index.json").write_text(json.dumps(search_doc, ensure_ascii=False))

    # A friendly 404 page.
    not_found = fill(page_tpl, {
        "title": "Page not found", "description": "Page not found",
        "courseTitle": "Custom Development Tooling", "lessonTitle": "404", "moduleTitle": "",
        "breadcrumb": '<a href="./index.html">Home</a>', "progressText": "",
        "progressPercent": 0, "readingTime": 0, "outName": "", "globalIndex": 0,
        "total": total, "navData": nav_json,
        "body": '<h1>404 — Page not found</h1><p>That lesson doesn\'t exist. '
                '<a href="./index.html">Go to the course home</a>.</p>',
        "prevAttrs": 'aria-disabled="true" tabindex="-1"', "prevLabel": "",
        "nextAttrs": 'href="./index.html"', "nextLabel": "Course home",
        "exampleFooter": "", "assets": "assets", "home": "index.html",
    })
    (out_dir / "404.html").write_text(not_found)
    print(f"Done: {total} lessons + index + search + 404 -> {args.out}/index.html")


if __name__ == "__main__":
    main()
