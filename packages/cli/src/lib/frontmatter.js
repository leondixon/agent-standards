const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/

function parseScalar(raw) {
  const value = raw.trim()
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === '') return ''
  if (/^-?\d+$/.test(value)) return Number(value)
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim()
    if (inner === '') return []
    return inner.split(',').map(entry => parseScalar(entry))
  }
  if (value.startsWith('{') && value.endsWith('}')) {
    return parseInlineMap(value.slice(1, -1))
  }
  if (
    (value.startsWith("'") && value.endsWith("'"))
    || (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function splitTopLevel(source) {
  const parts = []
  let depth = 0
  let current = ''
  for (const char of source) {
    if (char === '[' || char === '{') depth += 1
    if (char === ']' || char === '}') depth -= 1
    if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current.trim() !== '') parts.push(current)
  return parts
}

function parseInlineMap(source) {
  const map = {}
  for (const entry of splitTopLevel(source)) {
    const separator = entry.indexOf(':')
    if (separator === -1) continue
    map[entry.slice(0, separator).trim()] = parseScalar(entry.slice(separator + 1))
  }
  return map
}

function indentOf(line) {
  return line.length - line.trimStart().length
}

function parseBlock(lines, start, indent) {
  const map = {}
  let index = start

  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      index += 1
      continue
    }
    if (indentOf(line) < indent) break

    const separator = line.indexOf(':')
    if (separator === -1) {
      index += 1
      continue
    }

    const key = line.slice(0, separator).trim()
    const rest = line.slice(separator + 1).trim()

    if (rest !== '') {
      map[key] = parseScalar(rest)
      index += 1
      continue
    }

    const next = lines[index + 1]
    if (next && next.trimStart().startsWith('- ')) {
      const items = []
      index += 1
      while (index < lines.length && lines[index].trimStart().startsWith('- ')) {
        items.push(parseScalar(lines[index].trimStart().slice(2)))
        index += 1
      }
      map[key] = items
      continue
    }

    const nested = parseBlock(lines, index + 1, indent + 1)
    map[key] = nested.map
    index = nested.index
  }

  return { map, index }
}

export function parseFrontmatter(source) {
  const match = source.match(FRONTMATTER)
  if (!match) {
    return { data: {}, body: source.trim() }
  }
  const { map } = parseBlock(match[1].split('\n'), 0, 0)
  return { data: map, body: source.slice(match[0].length).trim() }
}
