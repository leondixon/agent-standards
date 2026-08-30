import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { CONFIG_DIR } from './config.js'

const CONFLICTS_FILE = 'conflicts.json'

export function conflictsPath(root) {
  return join(root, CONFIG_DIR, CONFLICTS_FILE)
}

export function readConflicts(root) {
  const path = conflictsPath(root)
  if (!existsSync(path)) return undefined
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function clearConflicts(root) {
  const path = conflictsPath(root)
  if (existsSync(path)) rmSync(path)
}

/**
 * Record every unresolved conflict so an agent can pick them up without
 * re-running sync. `base` is the upstream text this file was last reconciled
 * against, which is what makes the merge three-way rather than a guess.
 */
export function writeConflicts(root, conflicts) {
  const path = conflictsPath(root)

  if (conflicts.length === 0) {
    clearConflicts(root)
    return
  }

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify({ conflicts }, undefined, 2)}\n`)
}

export function buildConflict(root, entry, baseText) {
  return {
    rule: entry.rule,
    path: entry.path,
    state: entry.state,
    mine: readFileSync(join(root, entry.path), 'utf8'),
    theirs: entry.content,
    base: baseText,
  }
}
