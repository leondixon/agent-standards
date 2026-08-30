#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // .tool_input.file_path // empty')

if [[ -z "$file_path" || ( "$file_path" != *.ts && "$file_path" != *.tsx ) ]]; then
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
added_lines=$(printf '%s\n' "$diff_output" | grep -E '^\+[^+].*await[[:space:]]+prisma\.' || true)

if [[ -z "$added_lines" ]]; then
  echo '{}'
  exit 0
fi

jq -n --arg file "$file_path" '{
  additional_context: (
    "New Prisma await line(s) in the Git diff for \($file) (added lines only; unchanged code was not scanned). "
    + "Assess whether this operation participates in a read-modify-write flow, "
    + "multiple dependent writes, or an invariant that concurrent requests could violate. "
    + "Use a transaction or appropriate database-level concurrency control when required; "
    + "briefly confirm if a transaction is not needed."
  )
}'
exit 0
