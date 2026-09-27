import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { fileState, readBase, readLock, writeConfig } from './config.js'
import { readConflicts } from './conflicts.js'
import { extractRegion } from './region.js'
import { findSourceRoot } from './source-root.js'
import { resolveCommand } from '../commands/resolve.js'
import { syncCommand } from '../commands/sync.js'

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'cargo')
const KEY = 'Cargo.toml#standards'

let source
let target

function rustRule(level) {
  return [
    '---',
    'id: error-handling',
    'title: Error handling',
    'layer: any',
    'presets: [base]',
    'severity: error',
    'outputs: [cargo-lints]',
    'lints:',
    `  clippy: { unwrap_used: ${level} }`,
    '---',
    '',
    'Propagate errors with `?`.',
    '',
  ].join('\n')
}

function upstream(level) {
  const directory = join(source, 'standards', 'rust', 'base', 'error-handling')
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, 'rule.md'), rustRule(level))
}

function project(manifest) {
  source = mkdtempSync(join(tmpdir(), 'standards-source-'))
  cpSync(join(findSourceRoot(), 'templates'), join(source, 'templates'), { recursive: true })
  upstream('deny')

  target = mkdtempSync(join(tmpdir(), 'standards-cargo-'))
  writeFileSync(join(target, 'Cargo.toml'), readFileSync(join(fixtures, `${manifest}.toml`), 'utf8'))
  writeConfig(target, { languages: ['rust'], presets: ['base'], layers: { any: ['**/*.rs'] } })
}

function manifest() {
  return readFileSync(join(target, 'Cargo.toml'), 'utf8')
}

function editManifest(edit) {
  writeFileSync(join(target, 'Cargo.toml'), edit(manifest()))
}

function sync() {
  return syncCommand(source, target, { write: true })
}

afterEach(() => {
  for (const directory of [source, target]) {
    if (directory) rmSync(directory, { recursive: true, force: true })
  }
})

describe('Cargo.toml standards block', () => {
  it('given a manifest without a block, when synced, then the block is appended after the hand-written content', async () => {
    project('package')
    const original = manifest()

    expect(await sync()).toBe(0)

    expect(manifest().startsWith(original)).toBe(true)
    expect(manifest().trimEnd().endsWith('# <<< standards')).toBe(true)
    expect(extractRegion(manifest(), 'Cargo.toml')).toContain('[lints.clippy]\nunwrap_used = "deny"')
    expect(readLock(target).files[KEY]).toBeDefined()
    expect(readLock(target).files['Cargo.toml']).toBeUndefined()
    expect(readBase(target, KEY)).toBe(extractRegion(manifest(), 'Cargo.toml'))
  })

  it('given edits outside the block, when upstream changes, then the block updates and the edits survive', async () => {
    project('package')
    await sync()
    editManifest(text => text.replace('[dependencies]', '[dependencies]\nserde = "1"'))
    upstream('warn')

    expect(await sync()).toBe(0)

    expect(manifest()).toContain('serde = "1"')
    expect(extractRegion(manifest(), 'Cargo.toml')).toContain('unwrap_used = "warn"')
    expect(readConflicts(target)).toBeUndefined()
  })

  it('given only edits outside the block, when checked, then the block reads as current', async () => {
    project('package')
    await sync()
    editManifest(text => `${text.replace('[dependencies]', '[dependencies]\nserde = "1"')}`)

    expect(await syncCommand(source, target, { write: false })).toBe(0)
  })

  it('given a local edit inside the block that was resolved, when synced again, then it stays pinned', async () => {
    project('package')
    await sync()
    editManifest(text => text.replace('unwrap_used = "deny"', 'unwrap_used = "forbid"'))

    expect(await sync()).toBe(2)
    expect(resolveCommand(target, ['Cargo.toml'])).toBe(0)

    const block = extractRegion(manifest(), 'Cargo.toml')
    expect(await sync()).toBe(0)
    expect(extractRegion(manifest(), 'Cargo.toml')).toBe(block)
    expect(fileState(target, 'Cargo.toml', readLock(target), readBase(target, KEY), 'standards')).toBe('pinned')
  })

  it('given edits inside the block and upstream, when synced, then the conflict carries only the block', async () => {
    project('package')
    await sync()
    const base = extractRegion(manifest(), 'Cargo.toml')
    editManifest(text => text.replace('unwrap_used = "deny"', 'unwrap_used = "forbid"'))
    upstream('warn')

    expect(await sync()).toBe(2)

    const [conflict] = readConflicts(target).conflicts
    expect(conflict).toMatchObject({ path: 'Cargo.toml', region: 'standards', state: 'drifted', base })
    expect(conflict.mine).toBe(extractRegion(manifest(), 'Cargo.toml'))
    expect(conflict.mine).not.toContain('[package]')
    expect(conflict.theirs).toContain('unwrap_used = "warn"')
    expect(extractRegion(manifest(), 'Cargo.toml')).toContain('unwrap_used = "forbid"')
  })

  it('given a workspace root that is also a package, when synced, then the root opts into workspace lints', async () => {
    project('workspace-with-package')
    await sync()

    const block = extractRegion(manifest(), 'Cargo.toml')
    expect(block).toContain('[workspace.lints.clippy]')
    expect(block).toContain('[lints]\nworkspace = true')
  })

  it('given a hand-written lint table, when synced, then it fails without touching the manifest', async () => {
    project('hand-written-lints')
    const original = manifest()

    await expect(sync()).rejects.toThrow('Cargo.toml already defines `[lints.clippy]`')
    expect(manifest()).toBe(original)
  })
})
