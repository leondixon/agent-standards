import { hash, lockEntry, readConfig, readLock, readTracked, writeBase, writeLock } from '../lib/config.js'
import { clearConflicts, readConflicts, writeConflicts } from '../lib/conflicts.js'
import { regionKey } from '../lib/region.js'
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
    const merged = readTracked(targetRoot, conflict.path, conflict.region)
    if (merged === undefined) {
      const what = conflict.region ? `the ${conflict.region} block in ${conflict.path}` : conflict.path
      line(style.red(`  ${conflict.rule}: ${what} does not exist — write the merged ${conflict.region ? 'block' : 'file'} first.`))
      return 1
    }

    // Record the merged file against the upstream text it was reconciled with,
    // so this rule stays quiet until it changes again.
    const key = regionKey(conflict.path, conflict.region)
    lock.files[key] = lockEntry(hash(merged), hash(conflict.theirs))
    writeBase(targetRoot, key, conflict.theirs)
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
