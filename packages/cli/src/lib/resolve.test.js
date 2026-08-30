import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { fileState, hash, lockEntry, readBase, writeBase, writeConfig, writeLock } from './config.js'
import { readConflicts, writeConflicts } from './conflicts.js'
import { resolveCommand } from '../commands/resolve.js'

let root
const RULE_PATH = '.cursor/rules/no-null.mdc'

const BASE = 'rule v1'
const MINE = 'rule v1\n- project exception'
const THEIRS = 'rule v2'
const MERGED = 'rule v2\n- project exception'

function project() {
  root = mkdtempSync(join(tmpdir(), 'standards-resolve-'))
  mkdirSync(join(root, '.cursor', 'rules'), { recursive: true })
  writeConfig(root, { languages: ['typescript'], presets: ['base'], layers: { any: ['**/*'] } })
  return root
}

function conflictState() {
  writeFileSync(join(root, RULE_PATH), MINE)
  writeBase(root, RULE_PATH, BASE)
  writeLock(root, { files: { [RULE_PATH]: lockEntry(hash(MINE), hash(BASE)) } })
  writeConflicts(root, [
    { rule: 'no-null', path: RULE_PATH, state: 'drifted', mine: MINE, theirs: THEIRS, base: BASE },
  ])
}

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

describe('resolve', () => {
  it('given a merged file, when resolved, then the rule reads as current against upstream', () => {
    project()
    conflictState()
    writeFileSync(join(root, RULE_PATH), MERGED)

    expect(resolveCommand(root, ['no-null'])).toBe(0)

    const lock = JSON.parse(readFileSync(join(root, '.standards', 'lock.json'), 'utf8'))
    expect(lock.files[RULE_PATH]).toEqual(lockEntry(hash(MERGED), hash(THEIRS)))
    expect(fileState(root, RULE_PATH, lock, THEIRS)).toBe('pinned')
  })

  it('given a resolved rule, when upstream is unchanged, then it never re-prompts', () => {
    project()
    conflictState()
    writeFileSync(join(root, RULE_PATH), MERGED)
    resolveCommand(root, ['no-null'])

    const lock = JSON.parse(readFileSync(join(root, '.standards', 'lock.json'), 'utf8'))
    for (let run = 0; run < 3; run += 1) {
      expect(fileState(root, RULE_PATH, lock, THEIRS)).toBe('pinned')
    }
  })

  it('given a resolved rule, when upstream changes again, then it conflicts once more', () => {
    project()
    conflictState()
    writeFileSync(join(root, RULE_PATH), MERGED)
    resolveCommand(root, ['no-null'])

    const lock = JSON.parse(readFileSync(join(root, '.standards', 'lock.json'), 'utf8'))
    expect(fileState(root, RULE_PATH, lock, 'rule v3')).toBe('drifted')
  })

  it('given a resolution, when recorded, then base advances to the merged-against text', () => {
    project()
    conflictState()
    writeFileSync(join(root, RULE_PATH), MERGED)
    resolveCommand(root, ['no-null'])

    expect(readBase(root, RULE_PATH)).toBe(THEIRS)
  })

  it('given several conflicts, when one is resolved, then the rest stay outstanding', () => {
    project()
    conflictState()
    writeConflicts(root, [
      { rule: 'no-null', path: RULE_PATH, state: 'drifted', mine: MINE, theirs: THEIRS, base: BASE },
      { rule: 'no-banner-comments', path: '.cursor/rules/no-banner-comments.mdc', state: 'drifted', mine: 'a', theirs: 'b', base: 'a' },
    ])
    writeFileSync(join(root, RULE_PATH), MERGED)

    expect(resolveCommand(root, ['no-null'])).toBe(0)
    expect(readConflicts(root).conflicts.map(conflict => conflict.rule)).toEqual(['no-banner-comments'])
  })

  it('given every conflict resolved, when recorded, then the conflicts file is removed', () => {
    project()
    conflictState()
    writeFileSync(join(root, RULE_PATH), MERGED)

    resolveCommand(root, [])
    expect(readConflicts(root)).toBeUndefined()
  })

  it('given an unknown rule name, when resolving, then it reports rather than silently passing', () => {
    project()
    conflictState()
    expect(resolveCommand(root, ['does-not-exist'])).toBe(1)
    expect(readConflicts(root).conflicts).toHaveLength(1)
  })

  it('given no conflicts recorded, when resolving, then it succeeds with nothing to do', () => {
    project()
    expect(resolveCommand(root, [])).toBe(0)
  })
})
