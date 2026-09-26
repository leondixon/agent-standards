#!/usr/bin/env bash
# Runs the full Rust gate when the agent stops. A failure sends the agent back
# to work with the failing output instead of letting it finish.
set -uo pipefail

bevy_lint=__BEVY_LINT__
input=$(cat)

# Cursor sends { status, loop_count } and continues only on a followup_message;
# Claude Code blocks the stop on exit 2 and reads stderr.
is_cursor() {
  jq -e '.hook_event_name != "Stop"' >/dev/null 2>&1 <<<"$input"
}

if is_cursor && [[ "$(jq -r '.status' <<<"$input")" != "completed" ]]; then
  exit 0
fi

# Root Cargo.toml needs its own pathspec: `**/` requires a leading directory.
changed=$(git status --porcelain -- '*.rs' 'Cargo.toml' '**/Cargo.toml' 2>/dev/null)
[[ -z "$changed" ]] && exit 0

fail() {
  local message="Rust gate failed — fix this before finishing:
$1"
  if is_cursor; then
    jq -n --arg message "$message" '{ followup_message: $message }'
    exit 0
  fi
  printf '%s\n' "$message" >&2
  exit 2
}

# Takes the tool as one word-split string, e.g. require 'cargo nextest' '…'.
require() {
  local tool="$1" install="$2"
  # shellcheck disable=SC2086
  $tool --version >/dev/null 2>&1 && return 0
  fail "\`${tool}\` is not installed. Install it with: ${install}"
}

step() {
  local output
  output=$("$@" 2>&1) && return 0
  fail "\`$*\` failed:
$(tail -n 200 <<<"$output")"
}

require 'cargo fmt' 'rustup component add rustfmt'
step cargo fmt --all --check

require 'cargo clippy' 'rustup component add clippy'
step cargo clippy --workspace --all-targets -- -D warnings

require 'ast-grep' 'cargo install ast-grep --locked'
step ast-grep scan -c .standards/sgconfig.yml --error --color never

if [[ "$bevy_lint" == true ]]; then
  require 'bevy' 'cargo install --git https://github.com/TheBevyFlock/bevy_cli --tag cli-v0.1.0-alpha.2 --locked bevy_cli'
  require 'bevy_lint' 'bevy lint install v0.6.0'

  # bevy_lint cannot take `-D warnings`, and RUSTFLAGS would override Bevy's
  # .cargo/config.toml, so warnings are read from the JSON diagnostics instead.
  stderr_file=$(mktemp)
  json=$(bevy lint -- --workspace --all-targets --message-format=json 2>"$stderr_file")
  status=$?
  stderr_output=$(<"$stderr_file")
  rm -f "$stderr_file"
  diagnostics=$(jq -rR 'fromjson? | select(.reason == "compiler-message" and (.message.level == "warning" or .message.level == "error")) | .message.rendered' <<<"$json")
  if [[ $status -ne 0 || -n "$diagnostics" ]]; then
    fail "\`bevy lint\` reported problems:
$(tail -n 200 <<<"${diagnostics:-$stderr_output}")"
  fi
fi

require 'cargo nextest' 'cargo install cargo-nextest --locked'
step cargo nextest run --workspace --no-tests=warn

require 'cargo machete' 'cargo install cargo-machete --locked'
step cargo machete

require 'typos' 'cargo install typos-cli --locked'
step typos

exit 0
