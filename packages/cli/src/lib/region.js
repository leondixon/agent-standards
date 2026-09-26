import { ConfigurationError } from './errors.js'

export const STANDARDS_REGION = 'standards'

const START = '# >>> standards (managed by `standards sync`)'
const END = '# <<< standards'

export function regionKey(path, region) {
  return region ? `${path}#${region}` : path
}

function bounds(lines, path) {
  const start = lines.indexOf(START)
  const end = lines.indexOf(END)

  if (start === -1 && end === -1) return undefined
  if (start === -1 || end < start) {
    throw new ConfigurationError(
      `${path} has a broken standards block: keep both \`${START}\` and \`${END}\`, in that order, or delete both.`,
    )
  }
  return { start, end }
}

export function wrapRegion(body) {
  return `${START}\n${body}\n${END}\n`
}

/** The managed block, markers included, or undefined when the file has none. */
export function extractRegion(text, path) {
  const lines = text.split('\n')
  const found = bounds(lines, path)
  if (!found) return undefined
  return `${lines.slice(found.start, found.end + 1).join('\n')}\n`
}

export function removeRegion(text, path) {
  const lines = text.split('\n')
  const found = bounds(lines, path)
  if (!found) return text
  return [...lines.slice(0, found.start), ...lines.slice(found.end + 1)].join('\n')
}

/**
 * Replace the managed block in place, or append it. Appending keeps the block
 * last, so no hand-written key can fall into the block's final TOML table.
 */
export function replaceRegion(text, block, path) {
  const lines = text.split('\n')
  const found = bounds(lines, path)

  if (found) {
    const after = lines.slice(found.end + 1).join('\n')
    return `${lines.slice(0, found.start).join('\n')}${found.start > 0 ? '\n' : ''}${block}${after}`
  }

  const trimmed = text.replace(/\n+$/, '')
  return trimmed === '' ? block : `${trimmed}\n\n${block}`
}
