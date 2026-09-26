import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RUST_ROOT = dirname(fileURLToPath(import.meta.url))
const AST_GREP = join(RUST_ROOT, '..', '..', 'node_modules', '.bin', 'ast-grep')

function ruleDirectories() {
  return readdirSync(RUST_ROOT, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(preset => readdirSync(join(RUST_ROOT, preset.name)).map(rule => join(RUST_ROOT, preset.name, rule)))
    .filter(directory => existsSync(join(directory, 'rule.yml')))
}

function fixtures(directory, kind) {
  const path = join(directory, '__fixtures__', kind)
  return readdirSync(path).filter(name => name.endsWith('.rs')).map(name => join(path, name))
}

function matches(directory, fixture) {
  const result = spawnSync(AST_GREP, ['scan', '--rule', join(directory, 'rule.yml'), '--json=compact', fixture], {
    encoding: 'utf8',
  })
  if (result.error) throw result.error
  if (result.stdout.trim() === '') throw new Error(`ast-grep printed nothing:\n${result.stderr}`)
  return JSON.parse(result.stdout)
}

describe.each(ruleDirectories().map(directory => [directory.slice(RUST_ROOT.length + 1), directory]))('%s', (_, directory) => {
  it.each(fixtures(directory, 'invalid'))('flags %s', (fixture) => {
    expect(matches(directory, fixture).length).toBeGreaterThan(0)
  })

  it.each(fixtures(directory, 'valid'))('accepts %s', (fixture) => {
    expect(matches(directory, fixture)).toEqual([])
  })
})
