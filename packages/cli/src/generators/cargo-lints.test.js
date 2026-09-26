import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ConfigurationError } from '../lib/errors.js'
import { generateCargoLints } from './cargo-lints.js'

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', '__fixtures__', 'cargo')

function manifest(name) {
  return readFileSync(join(fixtures, `${name}.toml`), 'utf8')
}

function lintRule(id, lints) {
  return { id, outputs: ['cargo-lints'], lints }
}

const strict = lintRule('strict-clippy', {
  clippy: { pedantic: { level: 'warn', priority: -1 } },
  rust: { unsafe_code: 'forbid' },
})
const bevy = lintRule('bevy-lints', { bevy: { panicking_methods: 'deny', pedantic: 'warn' } })

describe('generateCargoLints', () => {
  it('given a package manifest, when generated, then package lint tables sit inside the markers', () => {
    expect(generateCargoLints([strict, bevy], manifest('package'))).toBe([
      '# >>> standards (managed by `standards sync`)',
      '[lints.rust]',
      'unsafe_code = "forbid"',
      '',
      '[lints.clippy]',
      'pedantic = { level = "warn", priority = -1 }',
      '',
      '[package.metadata.bevy_lint]',
      'panicking_methods = "deny"',
      'pedantic = "warn"',
      '# <<< standards',
      '',
    ].join('\n'))
  })

  it('given a virtual workspace, when generated, then lints go to the workspace without a package opt-in', () => {
    const block = generateCargoLints([strict, bevy], manifest('virtual-workspace'))
    expect(block).toContain('[workspace.lints.rust]')
    expect(block).toContain('[workspace.lints.clippy]')
    expect(block).toContain('[workspace.metadata.bevy_lint]')
    expect(block).not.toContain('[lints]')
  })

  it('given a workspace root that is also a package, when generated, then the root opts into workspace lints', () => {
    const block = generateCargoLints([strict], manifest('workspace-with-package'))
    expect(block).toContain('[workspace.lints.clippy]')
    expect(block).toContain('[lints]\nworkspace = true')
  })

  it('given a hand-written lint table, when generated, then it fails naming the table', () => {
    expect(() => generateCargoLints([strict], manifest('hand-written-lints')))
      .toThrow(new ConfigurationError(
        'Cargo.toml already defines `[lints.clippy]`, which the standards block manages. '
        + 'Move those settings into a rule, or delete them, then sync again.',
      ))
  })

  it('given lints assigned inline under a parent table, when generated, then it still counts as a duplicate', () => {
    expect(() => generateCargoLints([strict], manifest('inline-lints-key'))).toThrow(/\[lints\.clippy\]/)
  })

  it('given an existing standards block, when generated, then the block itself is not a duplicate', () => {
    const first = generateCargoLints([strict], manifest('package'))
    expect(generateCargoLints([strict], `${manifest('package')}\n${first}`)).toBe(first)
  })

  it('given two rules setting one lint to different levels, when generated, then it names both rules', () => {
    const loose = lintRule('loose', { clippy: { unwrap_used: 'warn' } })
    const tight = lintRule('tight', { clippy: { unwrap_used: 'deny' } })
    expect(() => generateCargoLints([loose, tight], manifest('package')))
      .toThrow('`clippy::unwrap_used` is set to warn by `loose` and to deny by `tight`. Pick one level in the rule source.')
  })

  it('given two rules agreeing on a lint, when generated, then it is written once', () => {
    const one = lintRule('one', { clippy: { unwrap_used: 'deny' } })
    const two = lintRule('two', { clippy: { unwrap_used: 'deny' } })
    expect(generateCargoLints([one, two], manifest('package')).match(/unwrap_used/g)).toHaveLength(1)
  })
})
