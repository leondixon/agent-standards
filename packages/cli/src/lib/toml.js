const HEADER = /^\s*\[\s*([^[\]]+?)\s*\](?:\s*#.*)?$/
const KEY = /^\s*((?:[\w-]+|"[^"]*"|'[^']*')(?:\s*\.\s*(?:[\w-]+|"[^"]*"|'[^']*'))*)\s*=/

function splitKey(key) {
  const segments = []
  let current = ''
  let quote

  for (const char of key) {
    if (quote) {
      if (char === quote) quote = undefined
      else current += char
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (char === '.') {
      segments.push(current.trim())
      current = ''
    }
    else current += char
  }

  segments.push(current.trim())
  return segments
}

/**
 * Every table header and key path a TOML document defines, read line by line.
 * Enough to find tables and dependency names in a Cargo manifest without
 * pulling in a TOML parser; multi-line values are not interpreted.
 */
export function tomlPaths(text) {
  const tables = []
  const keys = []
  let table = []
  let multiline

  for (const line of text.split('\n')) {
    if (multiline) {
      if (line.includes(multiline)) multiline = undefined
      continue
    }

    const header = line.match(HEADER)
    if (header && !line.trimStart().startsWith('[[')) {
      table = splitKey(header[1])
      tables.push(table)
      continue
    }
    if (line.trimStart().startsWith('[[')) {
      table = []
      continue
    }

    const key = line.match(KEY)
    if (!key) continue
    keys.push([...table, ...splitKey(key[1])])

    const value = line.slice(key[0].length)
    const opener = ['"""', "'''"].find(quotes => value.includes(quotes))
    if (opener && value.split(opener).length === 2) multiline = opener
  }

  return { tables, keys }
}

function renderKey(key) {
  return /^[\w-]+$/.test(key) ? key : JSON.stringify(key)
}

export function renderValue(value) {
  if (Array.isArray(value)) return `[${value.map(renderValue).join(', ')}]`
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value).map(([key, entry]) => `${renderKey(key)} = ${renderValue(entry)}`)
    return `{ ${entries.join(', ')} }`
  }
  if (typeof value === 'string') return JSON.stringify(value)
  return String(value)
}

export function renderTable(header, entries) {
  const lines = Object.entries(entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${renderKey(key)} = ${renderValue(value)}`)
  return [`[${header}]`, ...lines].join('\n')
}
