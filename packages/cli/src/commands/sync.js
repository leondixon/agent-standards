import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { buildArtefacts, planRetired, planSync, summarise } from '../lib/plan.js'
import { CONFIG_DIR, basePath, hash, lockEntry, readBase, readConfig, readLock, writeBase, writeLock } from '../lib/config.js'
import { buildConflict, clearConflicts, writeConflicts } from '../lib/conflicts.js'
import { removeRegion, replaceRegion, regionKey } from '../lib/region.js'
import { loadStandards, invalidRules } from '../lib/rules.js'
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

export function writeArtefact(root, artefact) {
  const absolute = join(root, artefact.path)
  mkdirSync(dirname(absolute), { recursive: true })

  const existing = existsSync(absolute) ? readFileSync(absolute, 'utf8') : ''
  const content = artefact.region
    ? replaceRegion(existing, artefact.content, artefact.path, artefact.region)
    : artefact.content

  writeFileSync(absolute, content)
  if (artefact.executable) chmodSync(absolute, 0o755)
}

function removeEmptyParents(root, relativePath) {
  let directory = dirname(join(root, relativePath))
  while (directory.startsWith(`${root}/`) && readdirSync(directory).length === 0) {
    rmSync(directory, { recursive: true })
    directory = dirname(directory)
  }
}

function removeArtefact(root, entry) {
  const absolute = join(root, entry.path)
  const remaining = entry.region ? removeRegion(readFileSync(absolute, 'utf8'), entry.path, entry.region) : ''

  if (remaining === '') {
    rmSync(absolute)
    removeEmptyParents(root, entry.path)
  }
  else {
    writeFileSync(absolute, remaining)
  }
}

function forget(root, lock, entry) {
  delete lock.files[entry.key]
  const base = basePath(root, entry.key)
  if (existsSync(base)) {
    rmSync(base)
    removeEmptyParents(root, join(CONFIG_DIR, 'base', entry.key))
  }
}

/**
 * Claude Code skips AGENTS.md in a project that has a CLAUDE.md, unless the
 * CLAUDE.md imports it, so the standards would silently never load.
 */
function claudeMdHidingAgentsMd(root) {
  return ['CLAUDE.md', join('.claude', 'CLAUDE.md')]
    .filter(path => existsSync(join(root, path)))
    .find(path => !readFileSync(join(root, path), 'utf8').includes('@AGENTS.md'))
}

function readManifest(root) {
  const path = join(root, 'Cargo.toml')
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined
}

function regionLabel(entry) {
  return entry.region ? `${entry.path} › ${entry.region}` : entry.path
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
  const artefacts = buildArtefacts(rules, {
    ...config,
    sourcePath: sourceRoot,
    cargoManifest: readManifest(targetRoot),
  })
  const plan = planSync(targetRoot, artefacts, lock)
  const retired = planRetired(targetRoot, artefacts, lock)
  const counts = summarise(plan)
  const removable = retired.filter(entry => entry.state !== 'gone')

  line()
  line(`  ${style.bold(config.languages.join(' + '))} ${style.dim('·')} ${config.presets.join(', ')}`)
  line()

  const hidingFile = claudeMdHidingAgentsMd(targetRoot)
  if (hidingFile) {
    line(style.yellow(`  ${hidingFile} does not import AGENTS.md, so Claude Code will not read the standards.`))
    line(style.yellow(`  Add a line with ${style.bold('@AGENTS.md')} to ${hidingFile}.`))
    line()
  }

  for (const entry of plan) {
    if (entry.state === 'current') continue
    line(`  ${STATE_MARK[entry.state]} ${regionLabel(entry)}`)
  }
  for (const entry of retired) {
    line(`  ${STATE_MARK[entry.state]} ${regionLabel(entry)}`)
  }

  const outstanding = counts.missing + counts.stale + counts.drifted + counts.untracked + counts.deleted + retired.length

  if (outstanding === 0) {
    const pinnedNote = counts.pinned > 0 ? style.dim(` · ${counts.pinned} pinned`) : ''
    line(`  ${style.green('✓')} ${counts.current} artefacts up to date${pinnedNote}`)
    line()
    return 0
  }

  if (!write) {
    line()
    const pinnedNote = counts.pinned > 0 ? ` · ${counts.pinned} pinned` : ''
    const retiredNote = removable.length > 0 ? ` · ${removable.length} retired` : ''
    line(`  ${counts.missing} new · ${counts.stale} stale · ${counts.drifted + counts.untracked} drifted · ${counts.current} current${retiredNote}${pinnedNote}`)
    line()
    return 1
  }

  const conflicts = []

  for (const entry of plan) {
    if (WRITE_STATES.has(entry.state)) {
      const key = regionKey(entry.path, entry.region)
      writeArtefact(targetRoot, entry)
      writeBase(targetRoot, key, entry.content)
      lock.files[key] = lockEntry(hash(entry.content), hash(entry.content))
      continue
    }

    if (entry.state !== 'drifted' && entry.state !== 'untracked') continue

    conflicts.push(buildConflict(targetRoot, entry, readBase(targetRoot, regionKey(entry.path, entry.region))))
  }

  for (const entry of retired) {
    if (entry.state === 'retired') removeArtefact(targetRoot, entry)
    forget(targetRoot, lock, entry)
  }

  writeLock(targetRoot, lock)
  writeConflicts(targetRoot, conflicts)

  const written = counts.missing + counts.stale + counts.deleted
  const removed = retired.filter(entry => entry.state === 'retired')
  const kept = retired.filter(entry => entry.state === 'kept')

  line()
  if (written > 0) line(`  ${style.green('✓')} synced ${written} artefact(s)`)
  if (removed.length > 0) line(`  ${style.green('✓')} removed ${removed.length} artefact(s) sync no longer generates`)
  for (const entry of kept) {
    line(`  ${style.yellow('?')} ${regionLabel(entry)} is no longer generated but was edited — left in place`)
  }

  if (conflicts.length === 0) {
    if (written === 0 && retired.length === 0) line(`  ${style.green('✓')} nothing to do`)
    line()
    return 0
  }

  line()
  line(`  ${style.yellow(`${conflicts.length} conflict(s)`)} — these rules changed upstream and locally:`)
  line()
  for (const conflict of conflicts) line(`    ${style.yellow('!')} ${conflict.rule}`)
  line()
  line(`  Ask your agent to resolve the standards conflicts — AGENTS.md explains how —`)
  line(`  or merge by hand and run ${style.bold('standards resolve <rule>')}.`)
  line()
  line(style.dim(`  Details: ${CONFIG_DIR}/conflicts.json`))
  line()

  return 2
}
