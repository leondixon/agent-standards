import { resolveGlobs } from '../lib/layers.js'

const PLUGIN = 'standards'

function ruleName(rule) {
  return rule.eslint.own ? `${PLUGIN}/${rule.id}` : rule.eslint.rule
}

function ruleEntry(rule) {
  const options = rule.eslint.options
  if (options === undefined) return rule.severity
  return [rule.severity, options]
}

function groupKey(globs) {
  return globs ? globs.join(',') : '*'
}

export function generateEslintConfig(rules, layerMap) {
  const included = rules.filter(rule => rule.outputs.includes('eslint'))
  const groups = new Map()

  for (const rule of included) {
    const globs = resolveGlobs(rule, layerMap)
    if (!globs) continue
    const key = groupKey(globs)
    const group = groups.get(key) ?? { files: globs, rules: {} }
    group.rules[ruleName(rule)] = ruleEntry(rule)
    groups.set(key, group)
  }

  const blocks = [...groups.values()].map((group) => {
    const entries = Object.entries(group.rules)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, entry]) => `      '${name}': ${JSON.stringify(entry)},`)
      .join('\n')

    return `  {\n    files: ${JSON.stringify(group.files)},\n    rules: {\n${entries}\n    },\n  },`
  })

  return [
    "import standards from '@agent-standards/eslint-plugin'",
    '',
    'export const standardsConfig = [',
    `  { plugins: { ${PLUGIN}: standards } },`,
    ...blocks,
    ']',
    '',
    'export default standardsConfig',
    '',
  ].join('\n')
}
