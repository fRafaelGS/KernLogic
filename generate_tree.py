#!/usr/bin/env python3
"""
generate_tree.py  —  repo-aware directory-tree printer
• Prints an ASCII or Markdown tree of the current working directory.
• Skips noisy folders by default (.git, node_modules, venv, __pycache__, dist, build).
• Accepts wildcard-style patterns to include/exclude additional paths.
• Optionally writes the tree to README_TREE.md (or a file you specify).
--------------------------------------------------------------------
Usage
-----
$ python generate_tree.py                    # pretty-prints to stdout
$ python generate_tree.py --markdown         # prints GitHub-ready markdown bullets
$ python generate_tree.py -o tree.md         # saves to arbitrary file
$ python generate_tree.py -i "*.spec.js"     # ignore extra pattern(s)
$ python generate_tree.py -d 3               # max depth = 3
"""

import argparse
import fnmatch
import os
import pathlib
import sys
from typing import Iterable, List

# -------- default ignores ----------------------------------------------------
DEFAULT_IGNORES = {
    ".git", ".hg", ".idea", ".vscode", "__pycache__", ".mypy_cache",
    "node_modules", "dist", "build", "venv", ".venv", ".env",
    ".pytest_cache", ".parcel-cache", ".next", ".turbo", ".pnpm-store", "*.png",
    "*.jpg", "*.jpeg", "*.gif", "*.svg", "*.ico", "*.webp", "*.mp4", "*.mp3",
    "*.pdf", "*.doc", "*.docx", "*.xls", "*.xlsx", "*.ppt", "*.pptx",
    "*.zip", "*.tar", "*.gz", "*.bz2", "*.rar", "*.7z", "*.iso", "*.deb",
    "*.rpm", "*.msi", "*.exe", "*.app", "*.dmg", "*.pkg", "*.deb",
    "*.rpm", "*.msi", "*.exe", "*.app", "*.dmg", "*.pkg", "*.deb",
    "*.rpm", "*.msi", "*.exe", "*.app", "*.dmg", "*.pkg", "*.deb",
    "*.rpm", "*.msi", "*.exe", "*.app", "*.dmg", "*.pkg", "*.deb",
}

# -----------------------------------------------------------------------------
def should_skip(name: str, extra_patterns: Iterable[str]) -> bool:
    if name in DEFAULT_IGNORES:        # built-ins like node_modules, .git …
        return True
    return any(fnmatch.fnmatch(name, pat) for pat in extra_patterns)


def walk(
    root: pathlib.Path,
    prefix: str = "",
    max_depth: int | None = None,
    ignore_patterns: Iterable[str] = ()
) -> List[str]:
    """Recursively yield lines of tree text."""
    if max_depth is not None and max_depth < 0:
        return []

    entries = sorted(
        [p for p in root.iterdir() if not should_skip(p.name, ignore_patterns)],
        key=lambda p: (p.is_file(), p.name.lower()),
    )
    last_index = len(entries) - 1
    lines: List[str] = []

    for idx, path in enumerate(entries):
        connector = "└── " if idx == last_index else "├── "
        lines.append(f"{prefix}{connector}{path.name}")

        if path.is_dir():
            extension = "    " if idx == last_index else "│   "
            new_prefix = f"{prefix}{extension}"
            new_depth = None if max_depth is None else max_depth - 1
            lines.extend(
                walk(path, new_prefix, new_depth, ignore_patterns)
            )
    return lines


def main(argv: List[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Generate an ASCII or Markdown tree of the current directory."
    )
    parser.add_argument(
        "-o", "--output", metavar="FILE",
        help="Write tree to FILE (default: stdout only)."
    )
    parser.add_argument(
        "--markdown", action="store_true",
        help="Emit GitHub-compatible markdown bullets instead of ASCII art."
    )
    parser.add_argument(
        "-i", "--ignore", action="append", default=[],
        help="Extra ignore pattern (glob). Repeatable."
    )
    parser.add_argument(
        "-d", "--depth", type=int, metavar="N",
        help="Limit recursion depth to N."
    )
    args = parser.parse_args(argv)

    root = pathlib.Path.cwd()
    lines = walk(root,
             max_depth=args.depth,
             ignore_patterns=args.ignore)  # only user-supplied extras

    if args.markdown:
        md_lines = ["- " + line.replace("├── ", "").replace("└── ", "").replace("│   ", "  ").lstrip()
                    for line in lines]
        lines = md_lines

    text = "\n".join(lines)

    # Write to console
    print(text)

    # Write to file if requested
    if args.output:
        out_path = pathlib.Path(args.output)
        out_path.write_text(text + "\n", encoding="utf-8")
        print(f"\n✅  Tree written to {out_path}")

if __name__ == "__main__":
    main()
