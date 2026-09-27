import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readLock, writeConfig } from './config.js'
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
    'outputs: [claude-rule, agents-md, hook]',
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

function sync() {
  return syncCommand(source, target, { write: true })
}

afterEach(() => {
  for (const directory of [source, target]) {
    if (directory) rmSync(directory, { recursive: true, force: true })
  }
})

describe('Claude Code artefacts', () => {
  it('given a project, when synced, then rules, skill and hooks land where Claude Code reads them', async () => {
    project()
    expect(await sync()).toBe(0)

    expect(file('.claude/rules/prefer-get-over-find.md')).toMatch(/^---\npaths:\n {2}- "\*\*\/\*\.ts"\n---/)
    expect(existsSync(join(target, '.claude/skills/resolve-standards-conflicts/SKILL.md'))).toBe(true)
    expect(JSON.parse(file('.claude/settings.json')).hooks.PostToolUse[0].hooks[0].command)
      .toBe('cd "$CLAUDE_PROJECT_DIR" && .standards/hooks/prefer-get-over-find.sh')
    expect(existsSync(join(target, '.cursor'))).toBe(false)
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

  it('given no CLAUDE.md, when synced, then the summary goes to a block in AGENTS.md', async () => {
    project()
    write('AGENTS.md', '# Project\n')

    await sync()

    expect(file('AGENTS.md')).toMatch(/^# Project\n\n<!-- >>> standards[^\n]*-->\n## Coding Standards\n\n- Name domain queries get, not find\.\n<!-- <<< standards -->\n$/)
  })

  it('given a CLAUDE.md, when synced, then the summary goes there, because Claude would skip AGENTS.md', async () => {
    project()
    write('CLAUDE.md', '# Project\n')

    await sync()

    expect(file('CLAUDE.md')).toContain('## Coding Standards')
    expect(existsSync(join(target, 'AGENTS.md'))).toBe(false)
  })
})
