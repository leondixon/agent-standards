import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cargoDependencies, detectDependencies, detectPresets } from './detect.js'

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

describe('cargoDependencies', () => {
  it('given plain and inline-table dependencies, when read, then names and versions are returned', () => {
    expect(cargoDependencies([
      '[package]',
      'name = "game"',
      'version = "0.1.0"',
      '',
      '[dependencies]',
      'bevy = { version = "0.18", default-features = false }',
      'thiserror = "2"',
      'local = { path = "../local" }',
    ].join('\n'))).toEqual(new Map([
      ['bevy', '0.18'],
      ['thiserror', '2'],
      ['local', '*'],
    ]))
  })

  it('given dev and workspace dependencies, when read, then both are included', () => {
    expect([...cargoDependencies([
      '[workspace.dependencies]',
      'bevy = "0.18"',
      '',
      '[dev-dependencies]',
      'proptest = "1"',
    ].join('\n')).keys()]).toEqual(['bevy', 'proptest'])
  })

  it('given the table form, when read, then the table name is the dependency', () => {
    expect(cargoDependencies([
      '[dependencies.bevy]',
      'version = "0.18"',
      'features = ["dynamic_linking"]',
      '',
      '[dev-dependencies.insta]',
      'features = ["yaml"]',
    ].join('\n'))).toEqual(new Map([['bevy', '0.18'], ['insta', '*']]))
  })

  it('given keys outside dependency tables, when read, then they are ignored', () => {
    expect(cargoDependencies([
      '[package]',
      'name = "game"',
      '[features]',
      'default = ["bevy/dynamic_linking"]',
      '[lints.clippy]',
      'pedantic = "warn"',
    ].join('\n'))).toEqual(new Map())
  })
})

describe('detectPresets', () => {
  it('given a Cargo.toml depending on bevy, when detected, then the bevy preset is on', () => {
    root = mkdtempSync(join(tmpdir(), 'standards-detect-'))
    writeFileSync(join(root, 'Cargo.toml'), '[package]\nname = "game"\n\n[dependencies]\nbevy = "0.18"\n')

    expect(detectDependencies(root).get('bevy')).toBe('0.18')
    const { detected } = detectPresets(root, {
      base: { always: true },
      bevy: { dependencies: ['bevy'] },
    })
    expect(detected.map(preset => preset.name)).toEqual(['base', 'bevy'])
  })
})
