#!/usr/bin/env bash
# Scans each edited Rust file with the project's ast-grep standards. Exit 2
# puts the findings in front of Claude right after its edit.
set -euo pipefail
source "${STANDARDS_HOOK_LIB:-.standards/hook-lib/diff.sh}"

file_path=$(hook_file_path) || hook_pass
[[ -f "$file_path" ]] || hook_pass
hook_is_source "$file_path" "rs" || hook_pass

if ! command -v ast-grep >/dev/null 2>&1; then
  echo "ast-grep is not installed, so Rust standards cannot be checked. Install it with: cargo install ast-grep --locked" >&2
  exit 2
fi

findings=$(ast-grep scan -c .standards/sgconfig.yml --error --color never "$file_path" 2>&1) && hook_pass

printf 'Rust standards violations in %s — fix these before continuing:\n%s\n' "$file_path" "$findings" >&2
exit 2
