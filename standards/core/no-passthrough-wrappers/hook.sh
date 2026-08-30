#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // .tool_input.file_path // empty')

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

added_local_helpers=$(
  printf '%s\n' "$diff_output" \
    | grep -E '^\+(async[[:space:]]+)?function[[:space:]]+[A-Za-z_][A-Za-z0-9_]*[[:space:]]*\(' \
    | grep -vE '^\+export[[:space:]]+' \
    | sed -E 's/^\+(async[[:space:]]+)?function[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\2/' \
    || true
)

added_local_const_helpers=$(
  printf '%s\n' "$diff_output" \
    | grep -E '^\+const[[:space:]]+[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=[[:space:]]*(async[[:space:]]*)?\(' \
    | sed -E 's/^\+const[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\1/' \
    || true
)

added_exported_helpers=$(
  {
    printf '%s\n' "$diff_output" \
      | grep -E '^\+export[[:space:]]+(default[[:space:]]+)?(async[[:space:]]+)?function[[:space:]]+[A-Za-z_][A-Za-z0-9_]*[[:space:]]*\(' \
      | sed -E 's/^\+export[[:space:]]+(default[[:space:]]+)?(async[[:space:]]+)?function[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\3/' || true
    printf '%s\n' "$diff_output" \
      | grep -E '^\+export[[:space:]]+const[[:space:]]+[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=[[:space:]]*(async[[:space:]]*)?\(' \
      | sed -E 's/^\+export[[:space:]]+const[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\1/' || true
  } | awk 'NF' | sort -u
)

local_helper_names=$(printf '%s\n%s\n' "$added_local_helpers" "$added_local_const_helpers" | awk 'NF' | sort -u)

single_use_helpers=()

while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  occurrence_count=$(
    rg -o --pcre2 "(?<![A-Za-z0-9_])${name}(?![A-Za-z0-9_])" "$file_path" 2>/dev/null \
      | wc -l \
      | tr -d ' '
  )
  if [[ "$occurrence_count" -le 2 ]]; then
    single_use_helpers+=("$name (same-file)")
  fi
done <<<"$local_helper_names"

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
search_roots=()
if [[ -n "$repo_root" ]]; then
  while IFS= read -r app_root; do
    [[ -z "$app_root" ]] && continue
    search_roots+=("$app_root")
  done < <(
    find "$repo_root/apps" -mindepth 2 -maxdepth 2 -type d \( -name src -o -name app \) 2>/dev/null | sort
  )
  if [[ -d "$repo_root/packages" ]]; then
    search_roots+=("$repo_root/packages")
  fi
fi

while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  if [[ ${#search_roots[@]} -eq 0 ]]; then
    continue
  fi

  matching_files=$(
    rg -l --glob '*.ts' --glob '*.tsx' --glob '!**/*.d.ts' --glob '!**/node_modules/**' \
      --pcre2 "(?<![A-Za-z0-9_])${name}(?![A-Za-z0-9_])" \
      "${search_roots[@]}" 2>/dev/null \
      | grep -vE '\.(test|spec)\.(ts|tsx)$' \
      || true
  )

  file_count=$(printf '%s\n' "$matching_files" | awk 'NF' | wc -l | tr -d ' ')
  # Definition file + at most one consumer file => single-use export.
  if [[ "$file_count" -le 2 ]]; then
    single_use_helpers+=("$name (exported, <=1 consumer)")
  fi
done <<<"$added_exported_helpers"

if [[ ${#single_use_helpers[@]} -eq 0 ]]; then
  echo '{}'
  exit 0
fi

helpers_list=$(
  for item in "${single_use_helpers[@]}"; do
    printf -- '- `%s`\n' "$item"
  done
)

jq -n --arg file "$file_path" --arg helpers "$helpers_list" '{
  additional_context: (
    "Single-use helper(s) newly added in \($file):\n"
    + $helpers
    + "\nReview the call site against `.cursor/rules/narrative-code-structure.mdc`. "
    + "Keep sequencing, decisions, and side effects visible there so it reads "
    + "top-to-bottom as a story. Inline pass-through and middle-layer wrappers "
    + "that merely rename, reorder, or group calls — including exported helpers "
    + "with only one consumer. Keep a named collaborator only when it is reused, "
    + "represents an independently meaningful domain operation, or contains "
    + "non-trivial logic that deserves isolated tests."
  )
}'
exit 0
