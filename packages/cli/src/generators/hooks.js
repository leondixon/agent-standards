/**
 * `edit` hooks run after every file edit; `stop` hooks run when the agent
 * finishes its turn. Each is `{ command, title }`.
 */
export function generateCursorHooks({ edit = [], stop = [] }) {
  const hooks = {}
  if (edit.length > 0) hooks.afterFileEdit = edit.map(hook => ({ command: hook.command }))
  if (stop.length > 0) hooks.stop = stop.map(hook => ({ command: hook.command }))
  return `${JSON.stringify({ version: 1, hooks }, undefined, 2)}\n`
}

export function generateClaudeHooks({ edit = [], stop = [] }) {
  const hooks = {}
  const entry = hook => ({ type: 'command', command: hook.command, statusMessage: hook.title })

  if (edit.length > 0) hooks.PostToolUse = [{ matcher: 'Edit|Write', hooks: edit.map(entry) }]
  if (stop.length > 0) hooks.Stop = [{ hooks: stop.map(entry) }]
  return `${JSON.stringify({ hooks }, undefined, 2)}\n`
}
