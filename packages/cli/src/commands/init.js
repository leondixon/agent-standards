import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { detectLanguages, detectPresets, isWorkspace } from '../lib/detect.js'
import { defaultLayerMap } from '../lib/layers.js'
import { readConfig, writeConfig } from '../lib/config.js'
import { confirm } from '../lib/prompt.js'
import { syncCommand } from './sync.js'
import { line, style } from '../lib/ui.js'

function loadPresets(sourceRoot, languages) {
  const merged = {}

  for (const language of languages) {
    const path = join(sourceRoot, 'standards', language, 'presets.json')
    if (!existsSync(path)) continue

    for (const [name, config] of Object.entries(JSON.parse(readFileSync(path, 'utf8')))) {
      const existing = merged[name]
      merged[name] = existing
        ? {
            ...existing,
            languages: [...existing.languages, language],
            dependencies: [...new Set([...(existing.dependencies ?? []), ...(config.dependencies ?? [])])],
          }
        : { ...config, languages: [language] }
    }
  }

  return merged
}

function inferLayers(targetRoot, languages) {
  const layers = defaultLayerMap(languages)
  if (!languages.includes('typescript') || !isWorkspace(targetRoot)) return layers

  return {
    ...layers,
    backend: [...new Set([...layers.backend, '{apps,packages}/*/src/**/*.{ts,tsx}'])],
    frontend: [...new Set([...layers.frontend, '{apps,packages}/*/{app,src,components}/**/*.{ts,tsx}'])],
  }
}

export async function initCommand(sourceRoot, targetRoot) {
  const existing = readConfig(targetRoot)
  if (existing) {
    line(style.yellow('  .standards/config.json already exists — running sync instead.'))
    return syncCommand(sourceRoot, targetRoot, { write: true })
  }

  const languages = detectLanguages(targetRoot)
  if (languages.length === 0) {
    line(style.red('  Could not detect a language (no package.json or Cargo.toml).'))
    return 1
  }

  const presets = loadPresets(sourceRoot, languages)
  const { detected, available, uncovered } = detectPresets(targetRoot, presets)

  line()
  line(`  ${style.bold(languages.join(' + '))}${isWorkspace(targetRoot) ? style.dim(' · workspace') : ''}`)
  line()
  line('  detected')
  for (const preset of detected) {
    const from = languages.length > 1 ? style.dim(` [${preset.languages.join(', ')}]`) : ''
    line(`    ${style.green('✓')} ${preset.name.padEnd(18)} ${style.dim(preset.reason)}${from}`)
  }

  if (available.length > 0) {
    line()
    line('  available')
    for (const preset of available) {
      line(`    ${style.dim('□')} ${style.dim(preset.name)}`)
    }
  }

  if (uncovered.length > 0) {
    line()
    line('  no rules yet')
    for (const name of uncovered.slice(0, 8)) line(`    ${style.dim(`· ${name}`)}`)
  }

  const layers = inferLayers(targetRoot, languages)

  line()
  line('  layers')
  for (const [layer, globs] of Object.entries(layers)) {
    if (globs.length === 0) continue
    line(`    ${layer.padEnd(10)} ${style.dim(globs.join(', '))}`)
  }
  line()

  if (!await confirm('  Write this configuration?')) {
    line('  Cancelled.')
    return 1
  }

  writeConfig(targetRoot, {
    languages,
    presets: detected.map(preset => preset.name),
    layers,
    modules: [],
    sourceRoot: 'src',
  })

  return syncCommand(sourceRoot, targetRoot, { write: true })
}
