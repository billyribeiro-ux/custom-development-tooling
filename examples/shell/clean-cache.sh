#!/usr/bin/env bash
# =============================================================================
# clean-cache.sh — safely remove build caches and generated artifacts.
#
# This is the script narrated in Module 3, "clean-cache.sh Narrated". It is a
# real, runnable example of a production-grade shell script: it is safe by
# default (dry-run), explicit about what it touches, and gives a clear summary.
#
# Usage:
#   ./clean-cache.sh            # dry run: show what WOULD be deleted
#   ./clean-cache.sh --force    # actually delete
#   ./clean-cache.sh --help
# =============================================================================

# The safety preamble. We explain each flag in Module 3:
#   -e          exit immediately if any command fails
#   -u          treat use of an unset variable as an error
#   -o pipefail a pipeline fails if ANY stage fails, not just the last
set -euo pipefail

# A stable, readable program name for messages (works even via a symlink).
readonly PROG="${0##*/}"

# Defaults. ${VAR:-default} means "VAR if set, otherwise this default".
FORCE=false

usage() {
  cat <<EOF
$PROG — remove build caches and generated artifacts

Usage:
  $PROG [--force] [--help]

Options:
  --force   Actually delete (default is a safe dry run)
  --help    Show this help and exit
EOF
}

# --- Parse arguments ---------------------------------------------------------
# A simple, dependency-free loop. (Module 4 covers getopts for richer CLIs.)
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=true ;;
    -h | --help) usage; exit 0 ;;
    *)
      echo "$PROG: unknown option: $1" >&2
      usage >&2
      exit 64 # EX_USAGE: the conventional "bad command line" exit code
      ;;
  esac
  shift
done

# --- The list of cache locations to clean ------------------------------------
# An array keeps the data separate from the logic, so adding a path is trivial.
readonly TARGETS=(
  "node_modules/.cache"
  ".cache"
  "dist"
  "build"
  "site"
  "coverage"
  ".pytest_cache"
  "__pycache__"
)

# --- Do the work -------------------------------------------------------------
deleted_count=0
freed_human="0"

log() { printf '%s %s\n' "[$PROG]" "$*"; }

for target in "${TARGETS[@]}"; do
  # Skip anything that does not exist; -e tests "exists" (file or directory).
  [[ -e "$target" ]] || continue

  # Compute size for the summary (du -sh = summarized, human-readable).
  size="$(du -sh "$target" 2>/dev/null | cut -f1)"

  if [[ "$FORCE" == true ]]; then
    rm -rf -- "$target" # the -- stops a path that starts with "-" being read as a flag
    log "removed   $target ($size)"
  else
    log "would rm  $target ($size)"
  fi
  deleted_count=$((deleted_count + 1))
done

# --- Summary -----------------------------------------------------------------
if [[ "$deleted_count" -eq 0 ]]; then
  log "nothing to clean — already tidy ✨"
elif [[ "$FORCE" == true ]]; then
  log "done: removed $deleted_count item(s)"
else
  log "dry run: $deleted_count item(s) would be removed. Re-run with --force to delete."
fi
