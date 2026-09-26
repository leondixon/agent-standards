import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from './frontmatter.js'

function parse(frontmatter) {
  return parseFrontmatter(`---\n${frontmatter}\n---\nbody`).data
}

describe('parseFrontmatter', () => {
  it('given inline lint maps, when parsed, then nested levels and negative priorities survive', () => {
    expect(parse([
      'lints:',
      '  rust:   { unsafe_code: forbid }',
      '  clippy: { pedantic: { level: warn, priority: -1 }, unwrap_used: deny }',
      '  bevy:   { panicking_methods: deny }   # → metadata.bevy_lint',
    ].join('\n'))).toEqual({
      lints: {
        rust: { unsafe_code: 'forbid' },
        clippy: { pedantic: { level: 'warn', priority: -1 }, unwrap_used: 'deny' },
        bevy: { panicking_methods: 'deny' },
      },
    })
  })

  it('given block maps nested two deep, when parsed, then siblings stay at their own level', () => {
    expect(parse([
      'lints:',
      '  clippy:',
      '    pedantic:',
      '      level: warn',
      '      priority: -1',
      '  rust:',
      '    unsafe_code: forbid',
      'clippy:',
      '  allow-unwrap-in-tests: true',
    ].join('\n'))).toEqual({
      lints: {
        clippy: { pedantic: { level: 'warn', priority: -1 } },
        rust: { unsafe_code: 'forbid' },
      },
      clippy: { 'allow-unwrap-in-tests': true },
    })
  })

  it('given a quoted value containing a hash, when parsed, then it is not read as a comment', () => {
    expect(parse("rust: { unexpected_cfgs: { level: warn, check-cfg: ['cfg(bevy_lint)'] } }  # why"))
      .toEqual({ rust: { unexpected_cfgs: { level: 'warn', 'check-cfg': ['cfg(bevy_lint)'] } } })
    expect(parse("title: 'Issue #12'")).toEqual({ title: 'Issue #12' })
  })

  it('given a whole-line comment, when parsed, then it is skipped', () => {
    expect(parse('# note\nid: x')).toEqual({ id: 'x' })
  })
})
