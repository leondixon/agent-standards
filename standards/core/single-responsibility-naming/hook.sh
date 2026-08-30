#!/usr/bin/env bash
set -euo pipefail
source "${STANDARDS_HOOK_LIB:-.standards/hook-lib/diff.sh}"

file_path=$(hook_file_path) || hook_pass
hook_is_source "$file_path" "${STANDARDS_SOURCE_EXTENSIONS:-ts tsx rs}" || hook_pass

added=$(hook_added_lines "$file_path") || hook_pass
names=$(printf '%s\n' "$added" | hook_declared_names)

QUERY='^(has|is|get|check|should|can)([A-Z_]|$)'
EFFECT='(Refresh|Update|Store|Seed|Clear|Delete|Create|Sync|Send|_refresh|_update|_store|_seed|_clear|_delete|_create|_sync|_send)'
BRANCH='(IfDue|IfNeeded|IfMissing|WhenStale|IfStale|_if_due|_if_needed|_when_stale)'

flagged=()
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  if [[ "$name" =~ $BRANCH ]]; then
    flagged+=("\`$name\` encodes a branch — keep the condition at the call site")
  elif [[ "$name" =~ $QUERY ]] && [[ "$name" =~ $EFFECT ]]; then
    flagged+=("\`$name\` both answers a question and implies an effect — split it")
  fi
done <<<"$names"

[[ ${#flagged[@]} -eq 0 ]] && hook_pass

list=$(printf '%s\n' "${flagged[@]}" | sed 's/^/- /')
hook_report "Single-responsibility naming issues in ${file_path}:
${list}
Query/check collaborators stay separate from mutate/refresh ones (hasRecentX + refreshX,
with the due-branch in the caller)."
