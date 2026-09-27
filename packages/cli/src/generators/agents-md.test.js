import { describe, expect, it } from 'vitest'
import { generateAgentsRule } from './agents-md.js'

const layers = { any: ['**/*.ts'] }

describe('generateAgentsRule', () => {
  it('given a rule body with headings, when generated, then they nest under the rule and code is untouched', () => {
    const rule = {
      id: 'no-null',
      title: 'No null',
      layer: 'any',
      language: 'typescript',
      eslint: { own: true },
      body: 'Use `undefined`.\n\n## Bad\n\n```sh\n# not a heading\n```',
    }

    expect(generateAgentsRule(rule, { layers })).toBe([
      '### No null',
      '',
      '_Applies to `**/*.ts` · enforced by `standards/no-null`_',
      '',
      'Use `undefined`.',
      '',
      '#### Bad',
      '',
      '```sh',
      '# not a heading',
      '```',
    ].join('\n'))
  })

  it('given a core rule and two languages, when generated, then each expression gets its own heading', () => {
    const rule = {
      id: 'prefer-get-over-find',
      title: 'Prefer get',
      layer: 'any',
      language: 'core',
      body: 'Use get.',
      expressions: { rust: { body: 'get_accounts' }, typescript: { body: 'getAccounts' } },
    }

    expect(generateAgentsRule(rule, { layers, languages: ['typescript', 'rust'] }))
      .toContain('#### In TypeScript\n\ngetAccounts\n\n#### In Rust\n\nget_accounts')
  })

  it('given a rule two languages define, when qualified, then the title names the language', () => {
    const rule = { id: 'no-banner-comments', title: 'No banner comments', layer: 'any', language: 'rust', body: 'x' }
    expect(generateAgentsRule(rule, { layers, qualified: true })).toMatch(/^### No banner comments \(Rust\)/)
  })
})
