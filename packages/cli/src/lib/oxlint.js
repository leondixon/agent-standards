const PLUGIN = 'standards'

const NATIVE_PLUGINS = new Set([
  'eslint',
  'react',
  'unicorn',
  'typescript',
  'oxc',
  'import',
  'jsdoc',
  'jest',
  'vitest',
  'jsx-a11y',
  'nextjs',
  'react-perf',
  'promise',
  'node',
  'vue',
])

const ESLINT_PREFIXES = [
  ['ts/', 'typescript/'],
  ['@typescript-eslint/', 'typescript/'],
  ['typescript-eslint/', 'typescript/'],
]

function ruleEntry(severity, options) {
  if (options === undefined) return severity
  return [severity, options]
}

function pluginOf(name) {
  const slash = name.indexOf('/')
  return slash === -1 ? 'eslint' : name.slice(0, slash)
}

export function mapEslintRuleName(name) {
  if (!name) return undefined

  for (const [from, to] of ESLINT_PREFIXES) {
    if (name.startsWith(from)) return `${to}${name.slice(from.length)}`
  }

  return name
}

export function isNativeOxlintRule(name) {
  return NATIVE_PLUGINS.has(pluginOf(name))
}

/**
 * Resolve the oxlint rule that should be emitted for a standard.
 *
 * Own ESLint implementations run as a JS plugin. Mapped ESLint rules become
 * native oxlint rules when the name can be translated (for example
 * `ts/consistent-type-assertions` → `typescript/consistent-type-assertions`).
 * An explicit `oxlint:` block wins.
 */
export function resolveOxlint(rule) {
  if (rule.oxlint?.own || (rule.eslint?.own && !rule.oxlint?.rule)) {
    return {
      own: true,
      name: `${PLUGIN}/${rule.id}`,
      entry: ruleEntry(rule.severity, rule.oxlint?.options ?? rule.eslint?.options),
    }
  }

  const name = rule.oxlint?.rule ?? mapEslintRuleName(rule.eslint?.rule)
  if (!name || !isNativeOxlintRule(name)) return undefined

  return {
    own: false,
    name,
    entry: ruleEntry(rule.severity, rule.oxlint?.options ?? rule.eslint?.options),
  }
}
