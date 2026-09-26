import { ConfigurationError } from '../lib/errors.js'
import { renderValue } from '../lib/toml.js'

export function generateClippyConfig(rules) {
  const settings = {}
  const owners = new Map()

  for (const rule of rules.filter(candidate => candidate.outputs.includes('clippy-config'))) {
    for (const [key, value] of Object.entries(rule.clippy)) {
      if (owners.has(key) && renderValue(settings[key]) !== renderValue(value)) {
        throw new ConfigurationError(
          `clippy.toml \`${key}\` is ${renderValue(settings[key])} in \`${owners.get(key)}\` `
          + `and ${renderValue(value)} in \`${rule.id}\`. Pick one value in the rule source.`,
        )
      }
      settings[key] = value
      owners.set(key, rule.id)
    }
  }

  const lines = Object.keys(settings)
    .sort((a, b) => a.localeCompare(b))
    .map(key => `${key} = ${renderValue(settings[key])}`)
  return `${lines.join('\n')}\n`
}
