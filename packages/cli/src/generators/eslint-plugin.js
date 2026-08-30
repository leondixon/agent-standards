function importName(id) {
  return id.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
}

function relativePath(rule) {
  return `../../standards/${rule.language}/${rule.preset}/${rule.id}/rule.js`
}

export function generateEslintPlugin(rules) {
  const owned = rules
    .filter(rule => rule.eslint?.own && rule.implementationPath)
    .sort((a, b) => a.id.localeCompare(b.id))

  const imports = owned.map(rule => `import ${importName(rule.id)} from '${relativePath(rule)}'`)
  const entries = owned.map(rule => `    '${rule.id}': ${importName(rule.id)},`)

  return [
    ...imports,
    '',
    'const plugin = {',
    "  meta: { name: 'standards' },",
    '  rules: {',
    ...entries,
    '  },',
    '}',
    '',
    'export default plugin',
    '',
  ].join('\n')
}
