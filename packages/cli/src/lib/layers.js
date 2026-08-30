const LANGUAGE_LAYERS = {
  typescript: {
    any: ['**/*.{ts,tsx}'],
    backend: ['src/**/*.{ts,tsx}'],
    frontend: ['src/**/*.{ts,tsx}'],
    schema: ['**/*.prisma'],
    test: ['**/*.{test,spec}.{ts,tsx}'],
  },
  rust: {
    any: ['**/*.rs'],
    backend: ['src/**/*.rs'],
    frontend: [],
    schema: [],
    test: ['tests/**/*.rs'],
  },
}

export function defaultLayerMap(languages) {
  const list = Array.isArray(languages) ? languages : [languages]
  const known = list.map(language => LANGUAGE_LAYERS[language]).filter(Boolean)

  if (known.length === 0) return { any: ['**/*'] }
  if (known.length === 1) return known[0]

  const merged = {}
  for (const layer of new Set(known.flatMap(map => Object.keys(map)))) {
    merged[layer] = [...new Set(known.flatMap(map => map[layer] ?? []))]
  }
  return merged
}

export function resolveGlobs(rule, layerMap) {
  const globs = layerMap[rule.layer]
  if (!globs || globs.length === 0) return undefined
  return globs
}

export function appliesTo(rule, layerMap) {
  return resolveGlobs(rule, layerMap) !== undefined
}
