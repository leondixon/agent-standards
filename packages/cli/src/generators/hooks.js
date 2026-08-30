function hookPath(rule) {
  return `.standards/hooks/${rule.id}.sh`
}

export function generateCursorHooks(rules) {
  const config = {
    version: 1,
    hooks: {
      afterFileEdit: rules.map(rule => ({ command: hookPath(rule) })),
    },
  }
  return `${JSON.stringify(config, undefined, 2)}\n`
}

export function generateClaudeHooks(rules) {
  const config = {
    hooks: {
      PostToolUse: [
        {
          matcher: 'Edit|Write',
          hooks: rules.map(rule => ({
            type: 'command',
            command: hookPath(rule),
            statusMessage: rule.title,
          })),
        },
      ],
    },
  }
  return `${JSON.stringify(config, undefined, 2)}\n`
}
