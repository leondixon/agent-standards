import { resolveGlobs } from '../lib/layers.js'

const PLUGIN = 'standards'
const PACKAGE = '@leondixon/agent-standards/eslint-plugin'

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
  const all = rules.filter(rule => rule.outputs.includes('eslint'))
  const external = all.filter(rule => rule.eslint.requires)
  const included = all.filter(rule => !rule.eslint.requires)
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

  const externalBlock = external.length === 0
    ? []
    : [
        '',
        '// These map to rules from plugins this package does not bundle. Spread',
        '// `externalStandards` into your config once those plugins are present.',
        'export const externalStandards = [',
        ...external.map((rule) => {
          const globs = resolveGlobs(rule, layerMap)
          if (!globs) return ''
          return `  // requires ${rule.eslint.requires}\n  {\n    files: ${JSON.stringify(globs)},\n    rules: { '${rule.eslint.rule}': ${JSON.stringify(ruleEntry(rule))} },\n  },`
        }).filter(Boolean),
        ']',
      ]

  return [
    `import ${PLUGIN} from '${PACKAGE}'`,
    '',
    'export const standardsConfig = [',
    `  { plugins: { ${PLUGIN} } },`,
    ...blocks,
    ']',
    ...externalBlock,
    '',
    'export default standardsConfig',
    '',
  ].join('\n')
}
