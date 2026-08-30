import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { fileState, hash, lockEntry } from './config.js'

let root

function setup() {
  root = mkdtempSync(join(tmpdir(), 'standards-'))
  mkdirSync(join(root, '.cursor', 'rules'), { recursive: true })
  return root
}

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

const RELATIVE = '.cursor/rules/example.mdc'

describe('fileState', () => {
  it('given no file and no lock entry, when checked, then it is missing', () => {
    setup()
    expect(fileState(root, RELATIVE, { files: {} }, 'new')).toBe('missing')
  })

  it('given a file matching the source, when checked, then it is current', () => {
    setup()
    writeFileSync(join(root, RELATIVE), 'same')
    const lock = { files: { [RELATIVE]: lockEntry(hash('same'), hash('same')) } }
    expect(fileState(root, RELATIVE, lock, 'same')).toBe('current')
  })

  it('given an untouched file and changed source, when checked, then it is stale', () => {
    setup()
    writeFileSync(join(root, RELATIVE), 'old')
    const lock = { files: { [RELATIVE]: lockEntry(hash('old'), hash('old')) } }
    expect(fileState(root, RELATIVE, lock, 'new')).toBe('stale')
  })

  it('given a locally edited file and changed source, when checked, then it is drifted', () => {
    setup()
    writeFileSync(join(root, RELATIVE), 'mine')
    const lock = { files: { [RELATIVE]: lockEntry(hash('old'), hash('old')) } }
    expect(fileState(root, RELATIVE, lock, 'new')).toBe('drifted')
  })

  it('given a file with no lock entry, when checked, then it is untracked', () => {
    setup()
    writeFileSync(join(root, RELATIVE), 'mine')
    expect(fileState(root, RELATIVE, { files: {} }, 'new')).toBe('untracked')
  })

  it('given a locally edited file already matching the new source, when checked, then it is current', () => {
    setup()
    writeFileSync(join(root, RELATIVE), 'new')
    const lock = { files: { [RELATIVE]: lockEntry(hash('old'), hash('old')) } }
    expect(fileState(root, RELATIVE, lock, 'new')).toBe('current')
  })

  it('given a locally edited file and unchanged source, when checked, then it is drifted', () => {
    setup()
    writeFileSync(join(root, RELATIVE), 'mine')
    const lock = { files: { [RELATIVE]: lockEntry(hash('original'), hash('original')) } }
    expect(fileState(root, RELATIVE, lock, 'original')).toBe('drifted')
  })

  it('given a deleted file with a lock entry, when checked, then it is deleted', () => {
    setup()
    const lock = { files: { [RELATIVE]: lockEntry(hash('old'), hash('old')) } }
    expect(fileState(root, RELATIVE, lock, 'new')).toBe('deleted')
  })

  it('given a legacy string lock entry, when checked, then it is read as unedited', () => {
    setup()
    writeFileSync(join(root, RELATIVE), 'old')
    expect(fileState(root, RELATIVE, { files: { [RELATIVE]: hash('old') } }, 'new')).toBe('stale')
  })

  it('given a kept local edit and unchanged source, when checked, then it is pinned', () => {
    setup()
    writeFileSync(join(root, RELATIVE), 'mine')
    const lock = { files: { [RELATIVE]: lockEntry(hash('mine'), hash('theirs')) } }
    expect(fileState(root, RELATIVE, lock, 'theirs')).toBe('pinned')
  })

  it('given a kept local edit and a moved source, when checked, then it is drifted again', () => {
    setup()
    writeFileSync(join(root, RELATIVE), 'mine')
    const lock = { files: { [RELATIVE]: lockEntry(hash('mine'), hash('theirs')) } }
    expect(fileState(root, RELATIVE, lock, 'theirs v2')).toBe('drifted')
  })

  it('given a pinned file edited again, when checked, then it is drifted', () => {
    setup()
    writeFileSync(join(root, RELATIVE), 'mine again')
    const lock = { files: { [RELATIVE]: lockEntry(hash('mine'), hash('theirs')) } }
    expect(fileState(root, RELATIVE, lock, 'theirs')).toBe('drifted')
  })
})
