import { resolveGlobs } from '../lib/layers.js'
import { resolveOxlint } from '../lib/oxlint.js'

const PACKAGE = '@leondixon/agent-standards/eslint-plugin'

function groupKey(globs) {
  return globs.join(',')
}

export function generateOxlintConfig(rules, layerMap) {
  const all = rules.filter(rule =>
    rule.outputs.includes('eslint') || rule.outputs.includes('oxlint'))

  const groups = new Map()
  let needsJsPlugin = false

  for (const rule of all) {
    const oxlint = resolveOxlint(rule)
    if (!oxlint) continue

    const globs = resolveGlobs(rule, layerMap)
    if (!globs) continue

    if (oxlint.own) needsJsPlugin = true

    const key = groupKey(globs)
    const group = groups.get(key) ?? { files: globs, rules: {} }
    group.rules[oxlint.name] = oxlint.entry
    groups.set(key, group)
  }

  const overrides = [...groups.values()].map((group) => {
    const rules = Object.fromEntries(
      Object.entries(group.rules).sort(([a], [b]) => a.localeCompare(b)),
    )
    return { files: group.files, rules }
  })

  const config = {
    $schema: '../node_modules/oxlint/configuration_schema.json',
  }

  if (needsJsPlugin) {
    config.jsPlugins = [PACKAGE]
  }

  config.overrides = overrides

  return `${JSON.stringify(config, undefined, 2)}\n`
}
