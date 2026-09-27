import { describe, expect, it } from 'vitest'
import { generateClaudeRule } from './claude-rule.js'

const rule = { id: 'no-null', title: 'No null', layer: 'any', body: 'Use `undefined`.' }

describe('generateClaudeRule', () => {
  it('given a layer with globs, when generated, then paths scopes the rule', () => {
    expect(generateClaudeRule(rule, { any: ['**/*.{ts,tsx}', '**/*.rs'] })).toBe([
      '---',
      'paths:',
      '  - "**/*.{ts,tsx}"',
      '  - "**/*.rs"',
      '---',
      '',
      '# No null',
      '',
      'Use `undefined`.',
      '',
    ].join('\n'))
  })

  it('given a core rule and two languages, when generated, then each expression gets a heading', () => {
    const core = { ...rule, expressions: { rust: { body: 'Rust idiom.' }, typescript: { body: 'TS idiom.' } } }
    expect(generateClaudeRule(core, { any: ['**/*'] }, ['typescript', 'rust']))
      .toContain('## In TypeScript\n\nTS idiom.\n\n## In Rust\n\nRust idiom.')
  })
})
