import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildArtefacts } from './plan.js'
import { findSourceRoot } from './source-root.js'

const layers = { any: ['**/*.{ts,tsx}'] }

function selected(rule) {
  return {
    presets: ['base'],
    language: 'typescript',
    layer: 'any',
    outputs: ['eslint'],
    ...rule,
  }
}

describe('buildArtefacts', () => {
  it('given ESLint rules, when planned, then both lint configs are written', () => {
    const artefacts = buildArtefacts(
      [
        selected({
          id: 'no-null',
          title: 'No null',
          severity: 'error',
          body: 'Use undefined.',
          eslint: { own: true },
        }),
      ],
      {
        languages: ['typescript'],
        presets: ['base'],
        layers,
        sourcePath: findSourceRoot(),
      },
    )

    expect(artefacts.map(entry => entry.path)).toEqual(expect.arrayContaining([
      '.standards/eslint.config.js',
      '.standards/.oxlintrc.json',
    ]))

    const oxlint = JSON.parse(
      artefacts.find(entry => entry.path === '.standards/.oxlintrc.json').content,
    )
    expect(oxlint.jsPlugins).toEqual(['@leondixon/agent-standards/eslint-plugin'])
    expect(oxlint.overrides[0].rules['standards/no-null']).toBe('error')
  })

  it('given Rust rules, when planned, then the lint block, clippy.toml, ast-grep rules and gate are written', () => {
    const rust = rule => selected({ language: 'rust', severity: 'error', body: 'x', ...rule })
    const artefacts = buildArtefacts(
      [
        rust({ id: 'error-handling', title: 'Error handling', outputs: ['cargo-lints', 'clippy-config'], lints: { clippy: { unwrap_used: 'deny' } }, clippy: { 'allow-unwrap-in-tests': true } }),
        rust({ id: 'no-todo-macro', title: 'No todo macro', outputs: ['ast-grep'], astGrepPath: join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'ast-grep', 'no-todo-macro.yml') }),
      ],
      {
        languages: ['rust'],
        presets: ['base', 'bevy'],
        layers: { any: ['**/*.rs'] },
        sourcePath: findSourceRoot(),
        cargoManifest: '[package]\nname = "game"\n',
      },
    )
    const byPath = Object.fromEntries(artefacts.map(entry => [entry.path, entry]))

    expect(byPath['Cargo.toml'].region).toBe('standards')
    expect(byPath['clippy.toml'].content).toBe('allow-unwrap-in-tests = true\n')
    expect(byPath['.standards/sgconfig.yml'].content).toBe('ruleDirs:\n  - ast-grep/rules\n')
    expect(byPath['.standards/ast-grep/rules/no-todo-macro.yml']).toBeDefined()
    expect(byPath['.standards/hooks/rust-gate.sh'].content).toContain('bevy_lint=true')

    const claude = JSON.parse(byPath['.standards/claude-hooks.json'].content)
    expect(claude.hooks.PostToolUse[0].hooks.map(hook => hook.command)).toEqual(['.standards/hooks/ast-grep.sh'])
    expect(claude.hooks.Stop[0].hooks.map(hook => hook.command)).toEqual(['.standards/hooks/rust-gate.sh'])

    const cursor = JSON.parse(byPath['.cursor/hooks.json'].content)
    expect(cursor.hooks.afterFileEdit).toEqual([{ command: '.standards/hooks/ast-grep.sh' }])
    expect(cursor.hooks.stop).toEqual([{ command: '.standards/hooks/rust-gate.sh' }])
  })

  it('given Rust lint rules and no Cargo.toml, when planned, then it fails fast', () => {
    expect(() => buildArtefacts(
      [selected({ id: 'x', language: 'rust', outputs: ['cargo-lints'], lints: { rust: { unsafe_code: 'forbid' } } })],
      { languages: ['rust'], presets: ['base'], layers: { any: ['**/*.rs'] }, sourcePath: findSourceRoot() },
    )).toThrow('no Cargo.toml')
  })

  it('given one id in two language trees, when planned, then each gets its own rule file', () => {
    const rule = language => selected({ id: 'no-banner-comments', title: 'No banner comments', language, severity: 'error', body: 'x', outputs: ['mdc'] })
    const artefacts = buildArtefacts(
      [rule('typescript'), rule('rust')],
      { languages: ['rust', 'typescript'], presets: ['base'], layers: { any: ['**/*'] }, sourcePath: findSourceRoot() },
    )

    expect(artefacts.map(entry => entry.path).filter(path => path.startsWith('.cursor/rules/'))).toEqual([
      '.cursor/rules/no-banner-comments-typescript.mdc',
      '.cursor/rules/no-banner-comments-rust.mdc',
    ])
  })
})
