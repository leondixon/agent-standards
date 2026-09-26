import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { authoringProblems, loadStandards } from './rules.js'

let root

function rule(frontmatter, files = {}) {
  root = mkdtempSync(join(tmpdir(), 'standards-rules-'))
  const directory = join(root, 'standards', 'rust', 'base', 'example')
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, 'rule.md'), [
    '---',
    'id: example',
    'title: Example',
    'layer: any',
    'presets: [base]',
    'severity: error',
    ...frontmatter,
    '---',
    '',
    'Body.',
  ].join('\n'))
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(directory, name, '..'), { recursive: true })
    writeFileSync(join(directory, name), content)
  }
  return loadStandards(root)[0]
}

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

describe('rule validation', () => {
  it('given a cargo-lints output without a lints block, when loaded, then it is invalid', () => {
    expect(rule(['outputs: [cargo-lints]']).problems)
      .toEqual(['declares the `cargo-lints` output but has no `lints:` block'])
  })

  it('given well-formed lints, when loaded, then it is valid', () => {
    expect(rule([
      'outputs: [cargo-lints]',
      'lints:',
      '  rust: { unsafe_code: forbid }',
      '  clippy: { pedantic: { level: warn, priority: -1 }, unwrap_used: deny }',
      '  bevy: { panicking_methods: deny }',
    ]).problems).toEqual([])
  })

  it('given an unknown tool or level, when loaded, then each is reported', () => {
    expect(rule([
      'outputs: [cargo-lints]',
      'lints:',
      '  rustc: { unsafe_code: forbid }',
      '  clippy: { unwrap_used: error }',
    ]).problems).toEqual([
      'unknown lint tool `rustc` (expected rust, clippy or bevy)',
      '`lints.clippy.unwrap_used` has unknown level `error`',
    ])
  })

  it('given a bevy lint with a priority, when loaded, then it is rejected', () => {
    expect(rule([
      'outputs: [cargo-lints]',
      'lints:',
      '  bevy: { pedantic: { level: warn, priority: -1 } }',
    ]).problems).toEqual(['`lints.bevy.pedantic` only supports `level`'])
  })

  it('given a clippy-config output without a clippy block, when loaded, then it is invalid', () => {
    expect(rule(['outputs: [clippy-config]']).problems)
      .toEqual(['declares the `clippy-config` output but has no `clippy:` block'])
  })

  it('given an ast-grep output without rule.yml, when loaded, then it is invalid', () => {
    expect(rule(['outputs: [ast-grep]']).problems)
      .toEqual(['declares the `ast-grep` output but has no `rule.yml`'])
  })

  it('given a rule.yml without fixtures, when authoring, then fixtures are required', () => {
    const loaded = rule(['outputs: [ast-grep]'], { 'rule.yml': 'id: example\n' })
    expect(authoringProblems([loaded])[0].problems).toEqual(['ast-grep `rule.yml` requires `__fixtures__/`'])
  })

  it('given a rule.yml with fixtures, when authoring, then it passes', () => {
    const loaded = rule(['outputs: [ast-grep]'], {
      'rule.yml': 'id: example\n',
      '__fixtures__/valid/ok.rs': 'fn main() {}\n',
    })
    expect(authoringProblems([loaded])).toEqual([])
  })
})
