import { describe, expect, it } from 'vitest'
import { isNativeOxlintRule, mapEslintRuleName, resolveOxlint } from './oxlint.js'

describe('mapEslintRuleName', () => {
  it('given an antfu ts/ rule, when mapped, then it becomes typescript/', () => {
    expect(mapEslintRuleName('ts/consistent-type-assertions')).toBe(
      'typescript/consistent-type-assertions',
    )
  })

  it('given a scoped typescript-eslint rule, when mapped, then the prefix is rewritten', () => {
    expect(mapEslintRuleName('@typescript-eslint/consistent-type-assertions')).toBe(
      'typescript/consistent-type-assertions',
    )
  })

  it('given an already-native name, when mapped, then it is left alone', () => {
    expect(mapEslintRuleName('typescript/no-explicit-any')).toBe('typescript/no-explicit-any')
  })
})

describe('isNativeOxlintRule', () => {
  it('given a typescript plugin rule, when checked, then it is native', () => {
    expect(isNativeOxlintRule('typescript/consistent-type-assertions')).toBe(true)
  })

  it('given an unknown plugin, when checked, then it is not native', () => {
    expect(isNativeOxlintRule('made-up/some-rule')).toBe(false)
  })
})

describe('resolveOxlint', () => {
  it('given an own ESLint implementation, when resolved, then it uses the JS plugin name', () => {
    expect(resolveOxlint({
      id: 'no-null',
      severity: 'error',
      eslint: { own: true },
    })).toEqual({
      own: true,
      name: 'standards/no-null',
      entry: 'error',
    })
  })

  it('given an own rule with options, when resolved, then options are kept', () => {
    expect(resolveOxlint({
      id: 'no-cross-module-deep-import',
      severity: 'error',
      eslint: { own: true, options: { modules: ['billing'] } },
    })).toEqual({
      own: true,
      name: 'standards/no-cross-module-deep-import',
      entry: ['error', { modules: ['billing'] }],
    })
  })

  it('given a mapped ESLint rule, when resolved, then it becomes the native oxlint rule', () => {
    expect(resolveOxlint({
      id: 'no-type-assertions',
      severity: 'error',
      eslint: {
        rule: 'ts/consistent-type-assertions',
        requires: '@antfu/eslint-config',
        options: { assertionStyle: 'never' },
      },
    })).toEqual({
      own: false,
      name: 'typescript/consistent-type-assertions',
      entry: ['error', { assertionStyle: 'never' }],
    })
  })

  it('given an explicit oxlint block, when resolved, then it wins over eslint', () => {
    expect(resolveOxlint({
      id: 'no-type-assertions',
      severity: 'warn',
      eslint: { rule: 'ts/consistent-type-assertions', options: { assertionStyle: 'as' } },
      oxlint: { rule: 'typescript/consistent-type-assertions', options: { assertionStyle: 'never' } },
    })).toEqual({
      own: false,
      name: 'typescript/consistent-type-assertions',
      entry: ['warn', { assertionStyle: 'never' }],
    })
  })

  it('given a required plugin with no oxlint mapping, when resolved, then it is omitted', () => {
    expect(resolveOxlint({
      id: 'custom-external',
      severity: 'error',
      eslint: { rule: 'acme/fancy-rule', requires: 'eslint-plugin-acme' },
    })).toBeUndefined()
  })
})
