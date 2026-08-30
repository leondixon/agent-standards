#!/usr/bin/env bash
set -euo pipefail
source "${STANDARDS_HOOK_LIB:-.standards/hook-lib/diff.sh}"

file_path=$(hook_file_path) || hook_pass
hook_is_source "$file_path" "${STANDARDS_SOURCE_EXTENSIONS:-ts tsx rs}" || hook_pass

added=$(hook_added_lines "$file_path") || hook_pass

names=$(
  {
    printf '%s\n' "$added" | hook_declared_names
    basename "$file_path" | sed -E 's/\.(test|spec)\..*$//; s/\.[^.]+$//'
  } | awk 'NF' | sort -u
)

flagged=()
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  if [[ "$name" =~ ^find[A-Z] || "$name" =~ ^find[-_] ]]; then
    flagged+=("$name")
  fi
done <<<"$names"

[[ ${#flagged[@]} -eq 0 ]] && hook_pass

list=$(printf '%s\n' "${flagged[@]}" | sed 's/^/- `/; s/$/`/')
hook_report "Prefer get over find for domain query names in ${file_path}:
${list}
Domain queries that load or return data use get (getAccounts, get_accounts), not find.
ORM and std client methods (findMany, findFirst, Iterator::find) are fine."
