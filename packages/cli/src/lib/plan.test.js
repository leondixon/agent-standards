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
})
