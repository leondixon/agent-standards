#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
file_path=$(jq -r '.file_path // .tool_input.file_path // empty' <<<"$input")

if [[ -z "$file_path" || ( "$file_path" != *.ts && "$file_path" != *.tsx ) || "$file_path" == *.d.ts ]]; then
  echo '{}'
  exit 0
fi

if [[ ! -f "$file_path" ]]; then
  echo '{}'
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo '{}'
  exit 0
fi

diff_output=$(git diff HEAD --unified=0 -- "$file_path" || true)
if [[ -z "$diff_output" && -f "$file_path" ]] && \
  git ls-files --others --exclude-standard -- "$file_path" | grep -q .; then
  diff_output=$(git diff --no-index --unified=0 /dev/null "$file_path" || true)
fi

if [[ -z "$diff_output" ]]; then
  echo '{}'
  exit 0
fi

added_names=$(
  {
    printf '%s\n' "$diff_output" \
      | grep -E '^\+(export[[:space:]]+)?(async[[:space:]]+)?function[[:space:]]+[A-Za-z_][A-Za-z0-9_]*' \
      | sed -E 's/^\+(export[[:space:]]+)?(async[[:space:]]+)?function[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\3/' || true
    printf '%s\n' "$diff_output" \
      | grep -E '^\+(export[[:space:]]+)?const[[:space:]]+[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=' \
      | sed -E 's/^\+(export[[:space:]]+)?const[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\2/' || true
    printf '%s\n' "$diff_output" \
      | grep -E '^\+describe\(' \
      | sed -E "s/^\+describe\(['\"]([^'\"]+)['\"].*/\1/" || true
    printf '%s\n' "$diff_output" \
      | grep -E '^\+[[:space:]]*operationId:[[:space:]]*['\"][A-Za-z_][A-Za-z0-9_]*['\"]' \
      | sed -E "s/^\+[[:space:]]*operationId:[[:space:]]*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"].*/\1/" || true
  } | awk 'NF' | sort -u
)

flagged_names=()
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  # Camel/Pascal: By followed by an uppercase letter (ByCustomerId, findById).
  # snake/kebab: _by_ / -by- segment.
  if [[ "$name" =~ By[A-Z] || "$name" =~ by[A-Z] || "$name" =~ _by_ || "$name" =~ -by- ]]; then
    flagged_names+=("$name")
  fi
done <<<"$added_names"

if [[ ${#flagged_names[@]} -eq 0 ]]; then
  echo '{}'
  exit 0
fi

names_list=$(printf '%s\n' "${flagged_names[@]}" | sed 's/^/- `/; s/$/`/')

jq -n --arg file "$file_path" --arg names "$names_list" '{
  additional_context: (
    "Avoid By* qualifiers in names for \($file):\n"
    + $names
    + "\nLookup keys (customerId, userId, id, bureau, …) are interface details — keep them "
    + "on the path/schema/parameter/arguments, not in collaborator, handler, describe, or "
    + "operationId names. Prefer getFinancialAccounts over getFinancialAccountsByCustomerId "
    + "(and likewise avoid *ByUserId*, *ById*, find_by_*, etc.)."
  )
}'
exit 0
