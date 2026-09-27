import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { hash, lockEntry, readLock, writeBase, writeConfig, writeLock } from './config.js'
import { readConflicts } from './conflicts.js'
import { findSourceRoot } from './source-root.js'
import { syncCommand } from '../commands/sync.js'

let source
let target

function project() {
  source = mkdtempSync(join(tmpdir(), 'standards-source-'))
  cpSync(join(findSourceRoot(), 'templates'), join(source, 'templates'), { recursive: true })

  const directory = join(source, 'standards', 'core', 'prefer-get-over-find')
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, 'rule.md'), [
    '---',
    'id: prefer-get-over-find',
    'title: Prefer get over find',
    'layer: any',
    'presets: [base]',
    'severity: warn',
    'outputs: [agents-md, hook]',
    '---',
    '',
    'Name domain queries get, not find.',
    '',
  ].join('\n'))
  writeFileSync(join(directory, 'hook.sh'), '#!/usr/bin/env bash\nexit 0\n')

  target = mkdtempSync(join(tmpdir(), 'standards-claude-'))
  writeConfig(target, { languages: ['typescript'], presets: ['base'], layers: { any: ['**/*.ts'] } })
}

function file(path) {
  return readFileSync(join(target, path), 'utf8')
}

function write(path, content) {
  mkdirSync(dirname(join(target, path)), { recursive: true })
  writeFileSync(join(target, path), content)
}

function tracked(path, content) {
  write(path, content)
  writeBase(target, path, content)
  return lockEntry(hash(content), hash(content))
}

function sync() {
  return syncCommand(source, target, { write: true })
}

afterEach(() => {
  for (const directory of [source, target]) {
    if (directory) rmSync(directory, { recursive: true, force: true })
  }
})

describe('sync', () => {
  it('given a project, when synced, then rules go to AGENTS.md and only hooks to .claude', async () => {
    project()
    expect(await sync()).toBe(0)

    expect(file('AGENTS.md')).toContain([
      '<!-- >>> standards:prefer-get-over-find -->',
      '### Prefer get over find',
      '',
      '_Applies to `**/*.ts`_',
      '',
      'Name domain queries get, not find.',
      '<!-- <<< standards:prefer-get-over-find -->',
    ].join('\n'))
    expect(file('AGENTS.md')).toContain('### Resolving standards conflicts')
    expect(JSON.parse(file('.claude/settings.json')).hooks.PostToolUse[0].hooks[0].command)
      .toBe('cd "$CLAUDE_PROJECT_DIR" && .standards/hooks/prefer-get-over-find.sh')
    expect(existsSync(join(target, '.claude/rules'))).toBe(false)
    expect(existsSync(join(target, '.claude/skills'))).toBe(false)
  })

  it('given an AGENTS.md the project wrote, when synced, then the blocks follow it and it is kept', async () => {
    project()
    write('AGENTS.md', '# Project\n\nRun `npm test` before pushing.\n')

    await sync()

    expect(file('AGENTS.md')).toMatch(/^# Project\n\nRun `npm test` before pushing\.\n\n<!-- >>> standards:intro -->\n## Coding standards/)
  })

  it('given a local edit to one rule, when synced, then only that rule conflicts', async () => {
    project()
    await sync()
    write('AGENTS.md', file('AGENTS.md').replace('Name domain queries get, not find.', 'Name domain queries get, not find. Except in the legacy module.'))

    expect(await sync()).toBe(2)

    expect(readConflicts(target).conflicts.map(conflict => [conflict.rule, conflict.region]))
      .toEqual([['prefer-get-over-find', 'prefer-get-over-find']])
    expect(readConflicts(target).conflicts[0].mine).not.toContain('## Coding standards')
    expect(file('AGENTS.md')).toContain('Except in the legacy module.')
  })

  it('given project settings, when synced, then they survive and only the standards hooks are tracked', async () => {
    project()
    write('.claude/settings.json', '{ "permissions": { "allow": ["Bash(npm test)"] } }\n')

    await sync()

    expect(JSON.parse(file('.claude/settings.json')).permissions).toEqual({ allow: ['Bash(npm test)'] })
    expect(readLock(target).files['.claude/settings.json#standards']).toBeDefined()

    write('.claude/settings.json', file('.claude/settings.json').replace('npm test', 'npm run lint'))
    expect(await syncCommand(source, target, { write: false })).toBe(0)
  })

  it('given files from an earlier layout, when synced, then untouched ones are removed and edited ones kept', async () => {
    project()
    writeLock(target, {
      files: {
        '.cursor/rules/prefer-get-over-find.mdc': tracked('.cursor/rules/prefer-get-over-find.mdc', 'rule'),
        '.claude/rules/prefer-get-over-find.md': tracked('.claude/rules/prefer-get-over-find.md', 'rule'),
        '.cursor/hooks.json': tracked('.cursor/hooks.json', '{}\n'),
        '.standards/AGENTS.md': tracked('.standards/AGENTS.md', 'summary'),
      },
    })
    write('.cursor/hooks.json', '{ "edited": true }\n')

    expect(await sync()).toBe(0)

    expect(existsSync(join(target, '.cursor/rules'))).toBe(false)
    expect(existsSync(join(target, '.claude/rules'))).toBe(false)
    expect(existsSync(join(target, '.standards/AGENTS.md'))).toBe(false)
    expect(file('.cursor/hooks.json')).toBe('{ "edited": true }\n')

    const lock = readLock(target)
    expect(Object.keys(lock.files).filter(path => path.startsWith('.cursor') || path === '.standards/AGENTS.md')).toEqual([])
    expect(existsSync(join(target, '.standards/base/.cursor'))).toBe(false)
  })

  it('given a retired artefact, when checked, then it counts as out of date', async () => {
    project()
    await sync()
    const lock = readLock(target)
    lock.files['.cursor/hooks.json'] = tracked('.cursor/hooks.json', '{}\n')
    writeLock(target, lock)

    expect(await syncCommand(source, target, { write: false })).toBe(1)
  })
})
