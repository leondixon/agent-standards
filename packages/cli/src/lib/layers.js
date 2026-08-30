const DEFAULT_EXTENSIONS = {
  typescript: '{ts,tsx}',
  rust: 'rs',
}

export function defaultLayerMap(language) {
  const extension = DEFAULT_EXTENSIONS[language] ?? '*'
  return {
    any: [`**/*.${extension}`],
    backend: [`src/**/*.${extension}`],
    frontend: [`src/**/*.${extension}`],
    schema: ['**/*.prisma'],
    test: [`**/*.{test,spec}.${extension}`],
  }
}

export function resolveGlobs(rule, layerMap) {
  const globs = layerMap[rule.layer]
  if (!globs || globs.length === 0) return undefined
  return globs
}

export function appliesTo(rule, layerMap) {
  return resolveGlobs(rule, layerMap) !== undefined
}
