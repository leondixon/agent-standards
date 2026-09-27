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

describe('markdown block', () => {
  const block = wrapRegion('## Coding Standards\n\n- Use `?`.', 'AGENTS.md')

  it('given an AGENTS.md, when replaced, then the block is appended in HTML comment markers', () => {
    expect(replaceRegion('# Project\n', block, 'AGENTS.md')).toBe([
      '# Project',
      '',
      '<!-- >>> standards (managed by `standards sync`) -->',
      '## Coding Standards',
      '',
      '- Use `?`.',
      '<!-- <<< standards -->',
      '',
    ].join('\n'))
  })

  it('given a block between project sections, when removed, then the sections are rejoined', () => {
    expect(removeRegion(`# Project\n\n${block}\n## Notes\n`, 'AGENTS.md')).toBe('# Project\n\n## Notes\n')
  })
})
