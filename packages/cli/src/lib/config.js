import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const CONFIG_DIR = '.standards'
const CONFIG_FILE = 'config.json'
const LOCK_FILE = 'lock.json'

export function configPath(root) {
  return join(root, CONFIG_DIR, CONFIG_FILE)
}

export function lockPath(root) {
  return join(root, CONFIG_DIR, LOCK_FILE)
}

export function readConfig(root) {
  const path = configPath(root)
  if (!existsSync(path)) return undefined

  const config = JSON.parse(readFileSync(path, 'utf8'))

  // Configs written before multi-language support carried a single `language`.
  if (!config.languages && config.language) {
    return { ...config, languages: [config.language] }
  }

  return config
}

export function writeConfig(root, config) {
  const path = configPath(root)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(config, undefined, 2)}\n`)
}

export function readLock(root) {
  const path = lockPath(root)
  if (!existsSync(path)) return { files: {} }
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function writeLock(root, lock) {
  const path = lockPath(root)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(lock, undefined, 2)}\n`)
}

export function hash(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}

function entryHashes(recorded) {
  if (recorded === undefined) return undefined
  if (typeof recorded === 'string') return { local: recorded, source: recorded }
  return recorded
}

export function fileState(root, relativePath, lock, expected) {
  const absolute = join(root, relativePath)
  const recorded = entryHashes(lock.files[relativePath])

  if (!existsSync(absolute)) return recorded ? 'deleted' : 'missing'

  const actual = hash(readFileSync(absolute, 'utf8'))
  const source = hash(expected)

  if (actual === source) return 'current'
  if (!recorded) return 'untracked'

  const locallyEdited = recorded.local !== recorded.source

  // The file still holds what sync last wrote, so upstream changes apply cleanly.
  if (recorded.local === actual && !locallyEdited) return 'stale'

  // A local edit the user chose to keep. Quiet while the source is unchanged,
  // but ask again once upstream moves so the edit can be reconciled.
  if (recorded.local === actual) {
    return recorded.source === source ? 'pinned' : 'drifted'
  }

  return 'drifted'
}

export function lockEntry(localHash, sourceHash) {
  return { local: localHash, source: sourceHash }
}
