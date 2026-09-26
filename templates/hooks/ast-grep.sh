#!/usr/bin/env bash
# Scans each edited Rust file with the project's ast-grep standards.
set -euo pipefail
source "${STANDARDS_HOOK_LIB:-.standards/hook-lib/diff.sh}"

input=$(cat)
file_path=$(jq -r '.tool_input.file_path // .file_path // empty' <<<"$input")
[[ -n "$file_path" && -f "$file_path" ]] || hook_pass
hook_is_source "$file_path" "rs" || hook_pass

# Claude Code reads a blocking PostToolUse result from stderr with exit 2;
# Cursor's afterFileEdit only takes additional_context on stdout.
report() {
  if jq -e '.tool_input' >/dev/null 2>&1 <<<"$input"; then
    printf '%s\n' "$1" >&2
    exit 2
  fi
  hook_report "$1"
  exit 0
}

if ! command -v ast-grep >/dev/null 2>&1; then
  report "ast-grep is not installed, so Rust standards cannot be checked. Install it with: cargo install ast-grep --locked"
fi

findings=$(ast-grep scan -c .standards/sgconfig.yml --error --color never "$file_path" 2>&1) && hook_pass

report "Rust standards violations in ${file_path} — fix these before continuing:
${findings}"
