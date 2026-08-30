import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { hash, lockEntry, readConfig, readLock, writeBase, writeLock } from '../lib/config.js'
import { clearConflicts, readConflicts, writeConflicts } from '../lib/conflicts.js'
import { line, style } from '../lib/ui.js'

function matching(conflicts, rules) {
  if (rules.length === 0) return conflicts
  const wanted = new Set(rules)
  return conflicts.filter(conflict => wanted.has(conflict.rule) || wanted.has(conflict.path))
}

export function resolveCommand(targetRoot, rules) {
  if (!readConfig(targetRoot)) {
    line(style.yellow('  No .standards/config.json found.'))
    return 1
  }

  const record = readConflicts(targetRoot)
  if (!record || record.conflicts.length === 0) {
    line(`  ${style.green('✓')} no conflicts to resolve`)
    return 0
  }

  const selected = matching(record.conflicts, rules)
  if (selected.length === 0) {
    line(style.red(`  No conflict matches ${rules.join(', ')}.`))
    line(style.dim(`  Outstanding: ${record.conflicts.map(conflict => conflict.rule).join(', ')}`))
    return 1
  }

  const lock = readLock(targetRoot)
  const resolved = []

  for (const conflict of selected) {
    const absolute = join(targetRoot, conflict.path)
    if (!existsSync(absolute)) {
      line(style.red(`  ${conflict.rule}: ${conflict.path} does not exist — write the merged file first.`))
      return 1
    }

    const merged = readFileSync(absolute, 'utf8')

    // Record the merged file against the upstream text it was reconciled with,
    // so this rule stays quiet until it changes again.
    lock.files[conflict.path] = lockEntry(hash(merged), hash(conflict.theirs))
    writeBase(targetRoot, conflict.path, conflict.theirs)
    resolved.push(conflict)
  }

  writeLock(targetRoot, lock)

  const remaining = record.conflicts.filter(conflict => !resolved.includes(conflict))
  if (remaining.length === 0) clearConflicts(targetRoot)
  else writeConflicts(targetRoot, remaining)

  for (const conflict of resolved) {
    line(`  ${style.green('✓')} resolved ${conflict.rule}`)
  }

  if (remaining.length > 0) {
    line()
    line(`  ${style.yellow(`${remaining.length} still outstanding:`)} ${remaining.map(conflict => conflict.rule).join(', ')}`)
  }

  return 0
}
