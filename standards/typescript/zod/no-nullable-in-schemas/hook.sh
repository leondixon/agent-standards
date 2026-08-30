#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
file_path=$(jq -r '.file_path // .tool_input.file_path // empty' <<<"$input")

if [[ -z "$file_path" || "$file_path" != *.ts || "$file_path" == *.d.ts ]]; then
  echo '{}'
  exit 0
fi

new_text=$(jq -r '[.edits[]?.new_string // empty] | join("\n")' <<<"$input")
if [[ -z "$new_text" ]] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  diff_output=$(git diff HEAD --unified=0 -- "$file_path" || true)
  if [[ -z "$diff_output" && -f "$file_path" ]] && \
    git ls-files --others --exclude-standard -- "$file_path" | grep -q .; then
    diff_output=$(git diff --no-index --unified=0 /dev/null "$file_path" || true)
  fi
  new_text=$(printf '%s\n' "$diff_output" | grep -E '^\+' | grep -vE '^\+\+\+' || true)
fi

apis=()
if grep -Eq '\.nullable\(' <<<"$new_text"; then
  apis+=('nullable()')
fi
if grep -Eq '\.nullish\(' <<<"$new_text"; then
  apis+=('nullish()')
fi

if ((${#apis[@]} == 0)); then
  echo '{}'
  exit 0
fi

joined=$(printf '%s, ' "${apis[@]}")
joined=${joined%, }

jq -n --arg file "$file_path" --arg apis "$joined" '{
  additional_context: (
    "Zod `\($apis)` used in \($file). `.nullable()` / `.nullish()` are only for ingesting external/API data where null is meaningful. Internal models and domain schemas must use `.optional()` (undefined), not null. If this schema is internal, replace with `.optional()`; if it is an ingest/boundary schema, keep and map null → undefined at the boundary."
  )
}'
exit 0
