import { ConfigurationError } from '../lib/errors.js'
import { STANDARDS_REGION, removeRegion, wrapRegion } from '../lib/region.js'
import { renderTable, tomlPaths } from '../lib/toml.js'

const CARGO_TOOLS = ['rust', 'clippy']

function describeLint(tool, name) {
  return tool === 'rust' ? name : `${tool}::${name}`
}

function levelOf(setting) {
  return typeof setting === 'object' ? JSON.stringify(setting) : setting
}

export function mergeLints(rules) {
  const merged = { rust: {}, clippy: {}, bevy: {} }
  const owners = new Map()

  for (const rule of rules) {
    for (const [tool, entries] of Object.entries(rule.lints)) {
      for (const [name, setting] of Object.entries(entries)) {
        const key = `${tool}::${name}`
        const owner = owners.get(key)
        if (owner && levelOf(merged[tool][name]) !== levelOf(setting)) {
          throw new ConfigurationError(
            `\`${describeLint(tool, name)}\` is set to ${levelOf(merged[tool][name])} by \`${owner}\` `
            + `and to ${levelOf(setting)} by \`${rule.id}\`. Pick one level in the rule source.`,
          )
        }
        merged[tool][name] = setting
        owners.set(key, rule.id)
      }
    }
  }

  return merged
}

function startsWith(path, prefix) {
  return prefix.every((segment, index) => path[index] === segment)
}

/**
 * A table the block would define clashes with the manifest when the manifest
 * already has that table, assigns it as a key (`lints = { … }`), or defines
 * something inside it. Parent tables such as `[workspace]` are fine.
 */
function clashes(table, manifest) {
  return manifest.tables.some(path => startsWith(path, table))
    || manifest.keys.some(path => startsWith(path, table) || startsWith(table, path))
}

function manifestShape(manifest) {
  const defines = segment => [...manifest.tables, ...manifest.keys].some(path => path[0] === segment)
  return { workspace: defines('workspace'), package: defines('package') }
}

export function generateCargoLints(rules, manifestText) {
  const included = rules.filter(rule => rule.outputs.includes('cargo-lints'))
  const lints = mergeLints(included)
  const manifest = tomlPaths(removeRegion(manifestText, 'Cargo.toml', STANDARDS_REGION))
  const shape = manifestShape(manifest)
  const prefix = shape.workspace ? 'workspace.' : ''
  const tables = []

  for (const tool of CARGO_TOOLS) {
    if (Object.keys(lints[tool]).length > 0) {
      tables.push({ header: `${prefix}lints.${tool}`, entries: lints[tool] })
    }
  }

  const hasCargoLints = tables.length > 0
  if (shape.workspace && shape.package && hasCargoLints) {
    tables.push({ header: 'lints', entries: { workspace: true } })
  }

  if (Object.keys(lints.bevy).length > 0) {
    const levels = Object.fromEntries(
      Object.entries(lints.bevy).map(([name, setting]) => [name, typeof setting === 'object' ? setting.level : setting]),
    )
    tables.push({ header: `${shape.workspace ? 'workspace' : 'package'}.metadata.bevy_lint`, entries: levels })
  }

  for (const { header } of tables) {
    if (clashes(header.split('.'), manifest)) {
      throw new ConfigurationError(
        `Cargo.toml already defines \`[${header}]\`, which the standards block manages. `
        + 'Move those settings into a rule, or delete them, then sync again.',
      )
    }
  }

  return wrapRegion(tables.map(({ header, entries }) => renderTable(header, entries)).join('\n\n'), 'Cargo.toml')
}
