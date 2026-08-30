import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  }
  catch {
    return undefined
  }
}

function packageJsonPaths(root) {
  const paths = []
  const rootManifest = join(root, 'package.json')
  if (existsSync(rootManifest)) paths.push(rootManifest)

  for (const container of ['packages', 'apps', 'libs']) {
    const containerPath = join(root, container)
    if (!existsSync(containerPath)) continue
    for (const entry of readdirSync(containerPath)) {
      const manifest = join(containerPath, entry, 'package.json')
      if (existsSync(manifest) && statSync(manifest).isFile()) paths.push(manifest)
    }
  }
  return paths
}

export function detectLanguage(root) {
  if (existsSync(join(root, 'Cargo.toml'))) return 'rust'
  if (existsSync(join(root, 'package.json'))) return 'typescript'
  return undefined
}

export function detectDependencies(root) {
  const found = new Map()

  for (const path of packageJsonPaths(root)) {
    const manifest = readJson(path)
    if (!manifest) continue
    const all = { ...manifest.dependencies, ...manifest.devDependencies, ...manifest.peerDependencies }
    for (const [name, version] of Object.entries(all)) {
      if (!found.has(name)) found.set(name, version)
    }
  }

  return found
}

export function detectPresets(root, presets) {
  const dependencies = detectDependencies(root)
  const detected = []
  const available = []

  for (const [name, config] of Object.entries(presets)) {
    if (config.always) {
      detected.push({ name, reason: 'always', ...config })
      continue
    }
    const match = (config.dependencies ?? []).find(dependency => dependencies.has(dependency))
    if (match) {
      detected.push({ name, reason: `${match}@${dependencies.get(match)}`, ...config })
    }
    else {
      available.push({ name, ...config })
    }
  }

  const covered = new Set(Object.values(presets).flatMap(config => config.dependencies ?? []))
  const uncovered = [...dependencies.keys()]
    .filter(name => !covered.has(name))
    .filter(name => !name.startsWith('@types/'))

  return { detected, available, uncovered, dependencies }
}

export function isWorkspace(root) {
  return existsSync(join(root, 'pnpm-workspace.yaml'))
    || existsSync(join(root, 'turbo.json'))
    || Boolean(readJson(join(root, 'package.json'))?.workspaces)
}
