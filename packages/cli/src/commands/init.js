import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { detectLanguage, detectPresets, isWorkspace } from '../lib/detect.js'
import { defaultLayerMap } from '../lib/layers.js'
import { readConfig, writeConfig } from '../lib/config.js'
import { confirm } from '../lib/prompt.js'
import { syncCommand } from './sync.js'
import { line, style } from '../lib/ui.js'

function loadPresets(sourceRoot, language) {
  const path = join(sourceRoot, 'standards', language, 'presets.json')
  if (!existsSync(path)) return {}
  return JSON.parse(readFileSync(path, 'utf8'))
}

function inferLayers(targetRoot, language) {
  const layers = defaultLayerMap(language)
  if (language !== 'typescript' || !isWorkspace(targetRoot)) return layers

  return {
    ...layers,
    backend: ['{apps,packages}/*/src/**/*.{ts,tsx}'],
    frontend: ['{apps,packages}/*/{app,src,components}/**/*.{ts,tsx}'],
  }
}

export async function initCommand(sourceRoot, targetRoot) {
  const existing = readConfig(targetRoot)
  if (existing) {
    line(style.yellow('  .standards/config.json already exists — running sync instead.'))
    return syncCommand(sourceRoot, targetRoot, { write: true })
  }

  const language = detectLanguage(targetRoot)
  if (!language) {
    line(style.red('  Could not detect a language (no package.json or Cargo.toml).'))
    return 1
  }

  const presets = loadPresets(sourceRoot, language)
  const { detected, available, uncovered } = detectPresets(targetRoot, presets)

  line()
  line(`  ${style.bold(language)}${isWorkspace(targetRoot) ? style.dim(' · workspace') : ''}`)
  line()
  line('  detected')
  for (const preset of detected) {
    line(`    ${style.green('✓')} ${preset.name.padEnd(18)} ${style.dim(preset.reason)}`)
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

  const layers = inferLayers(targetRoot, language)

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
    language,
    presets: detected.map(preset => preset.name),
    layers,
    modules: [],
    sourceRoot: 'src',
  })

  return syncCommand(sourceRoot, targetRoot, { write: true })
}
