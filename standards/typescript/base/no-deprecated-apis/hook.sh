#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
file_path=$(jq -r '.file_path // .tool_input.file_path // empty' <<<"$input")

if [[ -z "$file_path" || ( "$file_path" != *.ts && "$file_path" != *.tsx ) || "$file_path" == *.d.ts ]]; then
  echo '{}'
  exit 0
fi

script_dir=$(cd "$(dirname "$0")" && pwd)
findings_json=$(node "$script_dir/lib/ts-deprecated-diagnostics.mjs" "$file_path" 2>/dev/null || echo '[]')

if [[ -z "$findings_json" || "$findings_json" == '[]' ]]; then
  echo '{}'
  exit 0
fi

jq -n --arg file "$file_path" --argjson findings "$findings_json" '{
  additional_context: (
    "Deprecated API usage in \($file). TypeScript reports @deprecated APIs — fix these before continuing:\n"
    + ($findings | map("- line \(.line):\(.column): \(.message)\n  `\(.snippet)`") | join("\n"))
  )
}'
exit 0
