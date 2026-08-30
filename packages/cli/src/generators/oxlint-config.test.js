import { describe, expect, it } from 'vitest'
import { generateOxlintConfig } from './oxlint-config.js'

const layers = {
  any: ['**/*.{ts,tsx}'],
  test: ['**/*.{test,spec}.{ts,tsx}'],
}

function own(id, extras = {}) {
  return {
    id,
    severity: 'error',
    layer: 'any',
    outputs: ['eslint'],
    eslint: { own: true },
    ...extras,
  }
}

describe('generateOxlintConfig', () => {
  it('given own rules, when generated, then they load through the JS plugin', () => {
    const config = JSON.parse(generateOxlintConfig([
      own('no-null'),
      own('no-banner-comments'),
    ], layers))

    expect(config.jsPlugins).toEqual(['@leondixon/agent-standards/eslint-plugin'])
    expect(config.overrides).toEqual([
      {
        files: ['**/*.{ts,tsx}'],
        rules: {
          'standards/no-banner-comments': 'error',
          'standards/no-null': 'error',
        },
      },
    ])
  })

  it('given a mapped ESLint rule, when generated, then the native oxlint rule is used', () => {
    const config = JSON.parse(generateOxlintConfig([
      {
        id: 'no-type-assertions',
        severity: 'error',
        layer: 'any',
        outputs: ['eslint', 'oxlint'],
        eslint: {
          rule: 'ts/consistent-type-assertions',
          requires: '@antfu/eslint-config',
          options: { assertionStyle: 'never' },
        },
        oxlint: {
          rule: 'typescript/consistent-type-assertions',
          options: { assertionStyle: 'never' },
        },
      },
    ], layers))

    expect(config.jsPlugins).toBeUndefined()
    expect(config.overrides[0].rules).toEqual({
      'typescript/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    })
  })

  it('given rules on different layers, when generated, then each layer is its own override', () => {
    const config = JSON.parse(generateOxlintConfig([
      own('no-null'),
      own('vitest-restore-mocks-config', { layer: 'test' }),
    ], layers))

    expect(config.overrides).toEqual([
      {
        files: ['**/*.{ts,tsx}'],
        rules: { 'standards/no-null': 'error' },
      },
      {
        files: ['**/*.{test,spec}.{ts,tsx}'],
        rules: { 'standards/vitest-restore-mocks-config': 'error' },
      },
    ])
  })

  it('given an unmapped external ESLint rule, when generated, then it is omitted', () => {
    const config = JSON.parse(generateOxlintConfig([
      {
        id: 'fancy',
        severity: 'error',
        layer: 'any',
        outputs: ['eslint'],
        eslint: { rule: 'acme/fancy-rule', requires: 'eslint-plugin-acme' },
      },
    ], layers))

    expect(config.jsPlugins).toBeUndefined()
    expect(config.overrides).toEqual([])
  })
})
