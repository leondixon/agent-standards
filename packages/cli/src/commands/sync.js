import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { buildArtefacts, planSync, summarise } from '../lib/plan.js'
import { hash, lockEntry, readConfig, readLock, writeLock } from '../lib/config.js'
import { loadStandards, invalidRules } from '../lib/rules.js'
import { choose, isInteractive } from '../lib/prompt.js'
import { STATE_MARK, line, style } from '../lib/ui.js'

const WRITE_STATES = new Set(['missing', 'stale', 'deleted'])

function unifiedDiff(current, next) {
  const currentLines = current.split('\n')
  const nextLines = next.split('\n')
  const output = []

  for (let index = 0; index < Math.max(currentLines.length, nextLines.length); index += 1) {
    const mine = currentLines[index]
    const theirs = nextLines[index]
    if (mine === theirs) continue
    if (mine !== undefined) output.push(style.red(`    - ${mine}`))
    if (theirs !== undefined) output.push(style.green(`    + ${theirs}`))
  }

  return output.slice(0, 24).join('\n')
}

function writeArtefact(root, artefact) {
  const absolute = join(root, artefact.path)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, artefact.content)
  if (artefact.executable) chmodSync(absolute, 0o755)
}

export async function syncCommand(sourceRoot, targetRoot, { write }) {
  const config = readConfig(targetRoot)
  if (!config) {
    line(style.yellow('No .standards/config.json found.'))
    line(`Run ${style.bold('standards init')} first.`)
    return 1
  }

  const rules = loadStandards(sourceRoot)
  const invalid = invalidRules(rules)
  if (invalid.length > 0) {
    line(style.red(`${invalid.length} invalid rule(s) in the source:`))
    for (const rule of invalid) line(`  ${rule.id}: ${rule.problems.join('; ')}`)
    return 1
  }

  const lock = readLock(targetRoot)
  const artefacts = buildArtefacts(rules, { ...config, sourcePath: sourceRoot })
  const plan = planSync(targetRoot, artefacts, lock)
  const counts = summarise(plan)

  line()
  line(`  ${style.bold(config.language)} ${style.dim('·')} ${config.presets.join(', ')}`)
  line()

  for (const entry of plan) {
    if (entry.state === 'current') continue
    line(`  ${STATE_MARK[entry.state]} ${entry.path}`)
  }

  const outstanding = counts.missing + counts.stale + counts.drifted + counts.untracked + counts.deleted

  if (outstanding === 0) {
    const pinnedNote = counts.pinned > 0 ? style.dim(` · ${counts.pinned} pinned`) : ''
    line(`  ${style.green('✓')} ${counts.current} artefacts up to date${pinnedNote}`)
    line()
    return 0
  }

  if (!write) {
    line()
    const pinnedNote = counts.pinned > 0 ? ` · ${counts.pinned} pinned` : ''
    line(`  ${counts.missing} new · ${counts.stale} stale · ${counts.drifted + counts.untracked} drifted · ${counts.current} current${pinnedNote}`)
    line()
    return 1
  }

  for (const entry of plan) {
    if (WRITE_STATES.has(entry.state)) {
      writeArtefact(targetRoot, entry)
      lock.files[entry.path] = lockEntry(hash(entry.content), hash(entry.content))
      continue
    }

    if (entry.state !== 'drifted' && entry.state !== 'untracked') continue

    const current = readFileSync(join(targetRoot, entry.path), 'utf8')
    line()
    line(`  ${style.yellow('!')} ${entry.path} has local changes`)
    line()
    line(unifiedDiff(current, entry.content))
    line()

    const action = await choose('    keep mine / take theirs / skip?', [
      { key: 'k', value: 'keep' },
      { key: 't', value: 'theirs' },
      { key: 's', value: 'skip' },
    ], isInteractive() ? 'skip' : 'keep')

    if (action === 'theirs') {
      writeArtefact(targetRoot, entry)
      lock.files[entry.path] = lockEntry(hash(entry.content), hash(entry.content))
    }
    else if (action === 'keep') {
      lock.files[entry.path] = lockEntry(hash(current), hash(entry.content))
    }
  }

  writeLock(targetRoot, lock)

  line()
  line(`  ${style.green('✓')} synced ${counts.missing + counts.stale} artefact(s)`)
  line()
  return 0
}
