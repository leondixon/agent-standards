import { ConfigurationError } from './errors.js'

export const STANDARDS_REGION = 'standards'

const HOOK_DIRECTORY = '.standards/hooks/'

const MARKERS = {
  toml: { start: '# >>> standards (managed by `standards sync`)', end: '# <<< standards' },
  md: { start: '<!-- >>> standards (managed by `standards sync`) -->', end: '<!-- <<< standards -->' },
}

export function regionKey(path, region) {
  return region ? `${path}#${region}` : path
}

function extension(path) {
  return path.slice(path.lastIndexOf('.') + 1)
}

function markersFor(path) {
  const markers = MARKERS[extension(path)]
  if (!markers) throw new Error(`No standards block markers for ${path}`)
  return markers
}

function bounds(lines, path) {
  const { start: startMarker, end: endMarker } = markersFor(path)
  const start = lines.indexOf(startMarker)
  const end = lines.indexOf(endMarker)

  if (start === -1 && end === -1) return undefined
  if (start === -1 || end < start) {
    throw new ConfigurationError(
      `${path} has a broken standards block: keep both \`${startMarker}\` and \`${endMarker}\`, in that order, or delete both.`,
    )
  }
  return { start, end }
}

function parseSettings(text, path) {
  if (text.trim() === '') return {}
  try {
    return JSON.parse(text)
  }
  catch (error) {
    throw new ConfigurationError(`${path} is not valid JSON, so its standards hooks cannot be updated: ${error.message}`)
  }
}

function isStandardsHook(hook) {
  return typeof hook.command === 'string' && hook.command.includes(HOOK_DIRECTORY)
}

function sortedKeys(object) {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)))
}

/**
 * In `.claude/settings.json` sync owns individual hooks, not a span of text:
 * every hook whose command runs a script from `.standards/hooks/`. Anything
 * else in the file, including other hooks in the same matcher group, is the
 * project's.
 */
function ownedHooks(settings) {
  const owned = {}
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
    const kept = groups
      .map(group => ({ ...group, hooks: (group.hooks ?? []).filter(isStandardsHook) }))
      .filter(group => group.hooks.length > 0)
    if (kept.length > 0) owned[event] = kept
  }
  return owned
}

function withoutOwnedHooks(settings) {
  const hooks = {}
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
    const kept = groups
      .map(group => ({ ...group, hooks: (group.hooks ?? []).filter(hook => !isStandardsHook(hook)) }))
      .filter(group => group.hooks.length > 0)
    if (kept.length > 0) hooks[event] = kept
  }

  const { hooks: _, ...rest } = settings
  return Object.keys(hooks).length > 0 ? { ...rest, hooks } : rest
}

function serialise(value) {
  return `${JSON.stringify(value, undefined, 2)}\n`
}

/** The standards-owned hooks as sync would write them, for hashing and diffing. */
export function serialiseHooks(hooks) {
  return serialise(sortedKeys(hooks))
}

/** The managed block, markers included, or undefined when the file has none. */
export function extractRegion(text, path) {
  if (extension(path) === 'json') {
    const owned = ownedHooks(parseSettings(text, path))
    return Object.keys(owned).length > 0 ? serialiseHooks(owned) : undefined
  }

  const lines = text.split('\n')
  const found = bounds(lines, path)
  if (!found) return undefined
  return `${lines.slice(found.start, found.end + 1).join('\n')}\n`
}

export function removeRegion(text, path) {
  if (extension(path) === 'json') {
    const remaining = withoutOwnedHooks(parseSettings(text, path))
    return Object.keys(remaining).length > 0 ? serialise(remaining) : ''
  }

  const lines = text.split('\n')
  const found = bounds(lines, path)
  if (!found) return text
  const before = lines.slice(0, found.start).join('\n').replace(/\n+$/, '')
  const after = lines.slice(found.end + 1).join('\n').replace(/^\n+/, '')
  const joined = [before, after].filter(part => part !== '').join('\n\n')
  return joined === '' ? '' : joined.replace(/\n*$/, '\n')
}

/**
 * Replace the managed block in place, or append it. Appending keeps the block
 * last, so no hand-written key can fall into the block's final TOML table.
 */
export function replaceRegion(text, block, path) {
  if (extension(path) === 'json') {
    const settings = withoutOwnedHooks(parseSettings(text, path))
    const hooks = { ...settings.hooks }
    for (const [event, groups] of Object.entries(JSON.parse(block))) {
      hooks[event] = [...(hooks[event] ?? []), ...groups]
    }
    return serialise({ ...settings, hooks })
  }

  const lines = text.split('\n')
  const found = bounds(lines, path)

  if (found) {
    const after = lines.slice(found.end + 1).join('\n')
    return `${lines.slice(0, found.start).join('\n')}${found.start > 0 ? '\n' : ''}${block}${after}`
  }

  const trimmed = text.replace(/\n+$/, '')
  return trimmed === '' ? block : `${trimmed}\n\n${block}`
}

export function wrapRegion(body, path) {
  const { start, end } = markersFor(path)
  return `${start}\n${body}\n${end}\n`
}
