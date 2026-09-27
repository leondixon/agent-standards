import { describe, expect, it } from 'vitest'
import { ConfigurationError } from './errors.js'
import { extractRegion, removeRegion, replaceRegion, serialiseHooks, wrapRegion } from './region.js'

const SETTINGS = '.claude/settings.json'

const standardsHook = {
  type: 'command',
  command: 'cd "$CLAUDE_PROJECT_DIR" && .standards/hooks/ast-grep.sh',
  statusMessage: 'ast-grep standards',
}
const projectHook = { type: 'command', command: 'npx prettier --write "$FILE"' }
const owned = serialiseHooks({ PostToolUse: [{ matcher: 'Edit|Write', hooks: [standardsHook] }] })

function settings(value) {
  return `${JSON.stringify(value, undefined, 2)}\n`
}

describe('settings.json hooks', () => {
  it('given no settings file, when replaced, then only the standards hooks are written', () => {
    expect(JSON.parse(replaceRegion('', owned, SETTINGS))).toEqual({
      hooks: { PostToolUse: [{ matcher: 'Edit|Write', hooks: [standardsHook] }] },
    })
  })

  it('given project settings and hooks, when replaced, then they are kept beside the standards hooks', () => {
    const text = settings({
      permissions: { allow: ['Bash(npm test)'] },
      hooks: { PostToolUse: [{ matcher: 'Edit|Write', hooks: [projectHook] }] },
    })

    expect(JSON.parse(replaceRegion(text, owned, SETTINGS))).toEqual({
      permissions: { allow: ['Bash(npm test)'] },
      hooks: {
        PostToolUse: [
          { matcher: 'Edit|Write', hooks: [projectHook] },
          { matcher: 'Edit|Write', hooks: [standardsHook] },
        ],
      },
    })
  })

  it('given written hooks, when extracted, then the result hashes the same as what was written', () => {
    const text = replaceRegion(settings({ hooks: { Stop: [{ hooks: [projectHook] }] } }), owned, SETTINGS)
    expect(extractRegion(text, SETTINGS)).toBe(owned)
  })

  it('given a standards hook sharing a group with a project hook, when extracted, then only the standards hook counts', () => {
    const text = settings({ hooks: { PostToolUse: [{ matcher: 'Edit|Write', hooks: [projectHook, standardsHook] }] } })
    expect(extractRegion(text, SETTINGS)).toBe(owned)
  })

  it('given updated standards hooks, when replaced, then the old ones are not duplicated', () => {
    const once = replaceRegion('', owned, SETTINGS)
    expect(replaceRegion(once, owned, SETTINGS)).toBe(once)
  })

  it('given only standards hooks, when removed, then nothing is left', () => {
    expect(removeRegion(replaceRegion('', owned, SETTINGS), SETTINGS)).toBe('')
  })

  it('given project settings, when the standards hooks are removed, then the project settings remain', () => {
    const text = replaceRegion(settings({ model: 'opus' }), owned, SETTINGS)
    expect(JSON.parse(removeRegion(text, SETTINGS))).toEqual({ model: 'opus' })
  })

  it('given no standards hooks, when extracted, then there is no region', () => {
    expect(extractRegion(settings({ hooks: { Stop: [{ hooks: [projectHook] }] } }), SETTINGS)).toBeUndefined()
  })

  it('given invalid JSON, when read, then it fails naming the file', () => {
    expect(() => extractRegion('{ nope', SETTINGS)).toThrow(ConfigurationError)
    expect(() => extractRegion('{ nope', SETTINGS)).toThrow(/\.claude\/settings\.json is not valid JSON/)
  })
})

describe('markdown blocks', () => {
  const rule = id => wrapRegion(`### ${id}`, 'AGENTS.md', id)

  it('given an AGENTS.md, when a block is added, then it is appended in named HTML comment markers', () => {
    expect(replaceRegion('# Project\n', rule('no-null'), 'AGENTS.md', 'no-null')).toBe([
      '# Project',
      '',
      '<!-- >>> standards:no-null -->',
      '### no-null',
      '<!-- <<< standards:no-null -->',
      '',
    ].join('\n'))
  })

  it('given existing blocks and a project section after them, when a block is added, then it joins the other blocks', () => {
    const text = `# Project\n\n${rule('a')}\n## Notes\n`
    expect(replaceRegion(text, rule('b'), 'AGENTS.md', 'b'))
      .toBe(`# Project\n\n${rule('a')}\n${rule('b')}\n## Notes\n`)
  })

  it('given two blocks, when one is extracted or removed, then the other is untouched', () => {
    const text = `${rule('a')}\n${rule('b')}`
    expect(extractRegion(text, 'AGENTS.md', 'b')).toBe(rule('b'))
    expect(removeRegion(text, 'AGENTS.md', 'a')).toBe(rule('b'))
  })

  it('given a block between project sections, when removed, then the sections are rejoined', () => {
    expect(removeRegion(`# Project\n\n${rule('a')}\n## Notes\n`, 'AGENTS.md', 'a')).toBe('# Project\n\n## Notes\n')
  })

  it('given a start marker without its end, when read, then it fails naming both markers', () => {
    expect(() => extractRegion('<!-- >>> standards:a -->\n', 'AGENTS.md', 'a')).toThrow(/<!-- <<< standards:a -->/)
  })
})
