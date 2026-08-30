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

export function defaultLayerMap(language) {
  return LANGUAGE_LAYERS[language] ?? { any: ['**/*'] }
}

export function resolveGlobs(rule, layerMap) {
  const globs = layerMap[rule.layer]
  if (!globs || globs.length === 0) return undefined
  return globs
}

export function appliesTo(rule, layerMap) {
  return resolveGlobs(rule, layerMap) !== undefined
}
