import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { detectLanguages } from './detect.js'
import { defaultLayerMap } from './layers.js'
import { readConfig, writeConfig } from './config.js'
import { selectRules } from './plan.js'

let root

function project(files) {
  root = mkdtempSync(join(tmpdir(), 'standards-lang-'))
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(root, name), content)
  }
  return root
}

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

describe('detectLanguages', () => {
  it('given only a package.json, when detected, then it is typescript alone', () => {
    project({ 'package.json': '{}' })
    expect(detectLanguages(root)).toEqual(['typescript'])
  })

  it('given only a Cargo.toml, when detected, then it is rust alone', () => {
    project({ 'Cargo.toml': '[package]' })
    expect(detectLanguages(root)).toEqual(['rust'])
  })

  it('given both marker files, when detected, then both languages are returned', () => {
    project({ 'package.json': '{}', 'Cargo.toml': '[package]' })
    expect(detectLanguages(root)).toEqual(['rust', 'typescript'])
  })

  it('given no marker files, when detected, then nothing is returned', () => {
    project({ 'README.md': '# x' })
    expect(detectLanguages(root)).toEqual([])
  })
})

describe('defaultLayerMap', () => {
  it('given two languages, when built, then globs are the union per layer', () => {
    const map = defaultLayerMap(['typescript', 'rust'])
    expect(map.any).toEqual(['**/*.{ts,tsx}', '**/*.rs'])
    expect(map.test).toEqual(['**/*.{test,spec}.{ts,tsx}', 'tests/**/*.rs'])
  })

  it('given a layer only one language defines, when built, then that language supplies it', () => {
    expect(defaultLayerMap(['typescript', 'rust']).schema).toEqual(['**/*.prisma'])
  })

  it('given a single language, when built, then its own map is returned unchanged', () => {
    expect(defaultLayerMap(['rust'])).toEqual(defaultLayerMap('rust'))
  })
})

describe('selectRules', () => {
  const rules = [
    { id: 'core-a', language: 'core', preset: 'base', presets: ['base'], layer: 'any' },
    { id: 'ts-a', language: 'typescript', preset: 'base', presets: ['base'], layer: 'any' },
    { id: 'rs-a', language: 'rust', preset: 'base', presets: ['base'], layer: 'any' },
  ]
  const layers = { any: ['**/*'] }

  it('given one language, when selected, then core plus that language is installed', () => {
    const selected = selectRules(rules, { languages: ['typescript'], presets: ['base'], layers })
    expect(selected.map(rule => rule.id)).toEqual(['core-a', 'ts-a'])
  })

  it('given two languages, when selected, then both language trees are installed', () => {
    const selected = selectRules(rules, { languages: ['rust', 'typescript'], presets: ['base'], layers })
    expect(selected.map(rule => rule.id)).toEqual(['core-a', 'ts-a', 'rs-a'])
  })
})

describe('readConfig', () => {
  it('given a config written before multi-language, when read, then language becomes languages', () => {
    project({})
    mkdirSync(join(root, '.standards'), { recursive: true })
    writeFileSync(
      join(root, '.standards', 'config.json'),
      JSON.stringify({ language: 'typescript', presets: ['base'] }),
    )
    expect(readConfig(root).languages).toEqual(['typescript'])
  })

  it('given a multi-language config, when read, then languages is preserved', () => {
    project({})
    writeConfig(root, { languages: ['rust', 'typescript'], presets: ['base'] })
    expect(readConfig(root).languages).toEqual(['rust', 'typescript'])
  })
})
