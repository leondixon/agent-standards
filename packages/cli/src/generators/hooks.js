import { serialiseHooks } from '../lib/region.js'

function handler(hook) {
  return {
    type: 'command',
    command: `cd "$CLAUDE_PROJECT_DIR" && ${hook.command}`,
    statusMessage: hook.title,
  }
}

/**
 * The standards-owned entries for `.claude/settings.json`. `edit` hooks run
 * after every Edit or Write; `stop` hooks run when Claude finishes its turn.
 * Each is `{ command, title }`, with `command` relative to the project root.
 */
export function generateClaudeHooks({ edit = [], stop = [] }) {
  const hooks = {}
  if (edit.length > 0) hooks.PostToolUse = [{ matcher: 'Edit|Write', hooks: edit.map(handler) }]
  if (stop.length > 0) hooks.Stop = [{ hooks: stop.map(handler) }]
  return serialiseHooks(hooks)
}
