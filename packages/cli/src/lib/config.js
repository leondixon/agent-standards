import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { extractRegion, regionKey } from './region.js'

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

const BASE_DIR = 'base'

export function basePath(root, relativePath) {
  return join(root, CONFIG_DIR, BASE_DIR, relativePath)
}

/**
 * The upstream text a file was last reconciled against. Kept so a later
 * conflict can be merged three-way instead of guessing which side changed.
 */
export function readBase(root, relativePath) {
  const path = basePath(root, relativePath)
  if (!existsSync(path)) return undefined
  return readFileSync(path, 'utf8')
}

export function writeBase(root, relativePath, content) {
  const path = basePath(root, relativePath)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

export function hash(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}

function entryHashes(recorded) {
  if (recorded === undefined) return undefined
  if (typeof recorded === 'string') return { local: recorded, source: recorded }
  return recorded
}

/**
 * The text sync owns at a path: the whole file, or only the managed block when
 * `region` is set. Undefined when the file or its block does not exist.
 */
export function readTracked(root, relativePath, region) {
  const absolute = join(root, relativePath)
  if (!existsSync(absolute)) return undefined

  const text = readFileSync(absolute, 'utf8')
  return region ? extractRegion(text, relativePath) : text
}

export function fileState(root, relativePath, lock, expected, region) {
  const recorded = entryHashes(lock.files[regionKey(relativePath, region)])
  const tracked = readTracked(root, relativePath, region)

  if (tracked === undefined) return recorded ? 'deleted' : 'missing'

  const actual = hash(tracked)
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
