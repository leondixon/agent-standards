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

module_name=$(basename "$file_path" | sed -E 's/\.(test|spec)\.(ts|tsx)$//; s/\.(ts|tsx)$//')
is_new_module=0
if git ls-files --others --exclude-standard -- "$file_path" | grep -q .; then
  is_new_module=1
elif git diff HEAD --diff-filter=A --name-only -- "$file_path" | grep -q .; then
  is_new_module=1
fi

added_names=$(
  {
    printf '%s\n' "$diff_output" \
      | grep -E '^\+(export[[:space:]]+(default[[:space:]]+)?)?(async[[:space:]]+)?function[[:space:]]+[A-Za-z_][A-Za-z0-9_]*' \
      | sed -E 's/^\+(export[[:space:]]+(default[[:space:]]+)?)?(async[[:space:]]+)?function[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\4/' || true
    printf '%s\n' "$diff_output" \
      | grep -E '^\+(export[[:space:]]+)?const[[:space:]]+[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=' \
      | sed -E 's/^\+(export[[:space:]]+)?const[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\2/' || true
    printf '%s\n' "$diff_output" \
      | grep -E '^\+(export[[:space:]]+)?type[[:space:]]+[A-Za-z_][A-Za-z0-9_]*' \
      | sed -E 's/^\+(export[[:space:]]+)?type[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\2/' || true
    printf '%s\n' "$diff_output" \
      | grep -E '^\+(export[[:space:]]+)?interface[[:space:]]+[A-Za-z_][A-Za-z0-9_]*' \
      | sed -E 's/^\+(export[[:space:]]+)?interface[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\2/' || true
    printf '%s\n' "$diff_output" \
      | grep -E '^\+describe\(' \
      | sed -E "s/^\+describe\(['\"]([^'\"]+)['\"].*/\1/" || true
    if [[ "$is_new_module" -eq 1 ]]; then
      printf '%s\n' "$module_name"
    fi
  } | awk 'NF' | sort -u
)

is_exception() {
  local name="$1"
  case "$name" in
    signInWith*|signUpWith*|passWithNoTests|renderWithProvider|*SchemaWithRefinements|*Without*|*-without-*|*-with-provider|*-with-no-tests)
      return 0
      ;;
  esac
  if [[ "$name" =~ ^(format|merge|combine|compare|connect|disconnect)With[A-Z] ]]; then
    return 0
  fi
  if [[ "$name" =~ ^(format|merge|combine|compare|connect|disconnect)-with- ]]; then
    return 0
  fi
  return 1
}

flagged_names=()
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  if is_exception "$name"; then
    continue
  fi
  if [[ "$name" =~ With[A-Z] || "$name" =~ _with_ || "$name" =~ -with- ]]; then
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
    "Avoid `*With*` composite names in \($file):\n"
    + $names
    + "\nDo not name types/functions/modules `*With*` when that only means "
    + "\"entity + Prisma include\" (`CampaignWithPartner`, `getUserWithRoles`, "
    + "`userWithRolesInclude`). Prefer inferred `include` return types, a real "
    + "domain name (`AuthorizedUser`), split query vs projection, or inline "
    + "handler mapping (`.cursor/rules/no-with-composite-names.mdc`)."
  )
}'
exit 0
