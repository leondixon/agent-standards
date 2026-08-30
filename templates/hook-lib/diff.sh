# Shared helpers for agent-time naming hooks.
# Sourced by standards/*/*/hook.sh — never executed directly.

# Read the edited file path from the hook payload on stdin.
# Emits nothing and returns 1 when there is no usable path.
hook_file_path() {
  local input path
  input=$(cat)
  path=$(jq -r '.file_path // .tool_input.file_path // empty' <<<"$input")
  [[ -z "$path" ]] && return 1
  printf '%s' "$path"
}

# Succeeds when the path is a source file for the given extension list.
# Usage: hook_is_source "$path" "ts tsx" — declaration files are excluded.
hook_is_source() {
  local path="$1" extensions="$2" extension
  [[ "$path" == *.d.ts ]] && return 1
  for extension in $extensions; do
    [[ "$path" == *."$extension" ]] && return 0
  done
  return 1
}

# Print the added lines of the current diff for a file, including untracked files.
hook_added_lines() {
  local path="$1" diff
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 1
  [[ -f "$path" ]] || return 1

  diff=$(git diff HEAD --unified=0 -- "$path" 2>/dev/null || true)
  if [[ -z "$diff" ]] && git ls-files --others --exclude-standard -- "$path" | grep -q .; then
    diff=$(git diff --no-index --unified=0 /dev/null "$path" 2>/dev/null || true)
  fi
  [[ -z "$diff" ]] && return 1

  printf '%s\n' "$diff" | grep -E '^\+' | sed 's/^+//'
}

# Print declared symbol names from added lines on stdin.
hook_declared_names() {
  local added
  added=$(cat)
  {
    printf '%s\n' "$added" \
      | grep -E '^(export[[:space:]]+)?(async[[:space:]]+)?function[[:space:]]+[A-Za-z_][A-Za-z0-9_]*' \
      | sed -E 's/^(export[[:space:]]+)?(async[[:space:]]+)?function[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\3/' || true
    printf '%s\n' "$added" \
      | grep -E '^(export[[:space:]]+)?const[[:space:]]+[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=' \
      | sed -E 's/^(export[[:space:]]+)?const[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\2/' || true
    printf '%s\n' "$added" \
      | grep -E '^(pub[[:space:]]+)?(async[[:space:]]+)?fn[[:space:]]+[a-z_][a-z0-9_]*' \
      | sed -E 's/^(pub[[:space:]]+)?(async[[:space:]]+)?fn[[:space:]]+([a-z_][a-z0-9_]*).*/\3/' || true
  } | awk 'NF' | sort -u
}

# Emit a hook result carrying guidance back to the agent.
hook_report() {
  jq -n --arg context "$1" '{ additional_context: $context }'
}

# Emit an empty result and exit successfully.
hook_pass() {
  echo '{}'
  exit 0
}
