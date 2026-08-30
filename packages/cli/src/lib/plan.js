import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileState } from './config.js'
import { appliesTo } from './layers.js'
import { generateAgentsMd, generateEslintConfig, generateMdc } from '../generators/index.js'

export function selectRules(rules, config) {
  const presets = new Set(config.presets)
  return rules
    .filter(rule => rule.language === 'core' || rule.language === config.language)
    .filter(rule => rule.presets.some(preset => presets.has(preset)))
    .filter(rule => appliesTo(rule, config.layers))
}

function substituteOptions(options, config) {
  if (!options) return options
  const resolved = {}
  for (const [key, value] of Object.entries(options)) {
    if (value === '$modules') resolved[key] = config.modules ?? []
    else if (value === '$sourceRoot') resolved[key] = config.sourceRoot ?? 'src'
    else resolved[key] = value
  }
  return resolved
}

export function buildArtefacts(rules, config) {
  const selected = selectRules(rules, config)
  const artefacts = []

  for (const rule of selected) {
    if (rule.outputs.includes('mdc')) {
      artefacts.push({
        path: join('.cursor', 'rules', `${rule.id}.mdc`),
        content: generateMdc(rule, config.layers),
        rule: rule.id,
      })
    }
    if (rule.outputs.includes('hook') && rule.hookPath) {
      artefacts.push({
        path: join('.standards', 'hooks', `${rule.id}.sh`),
        content: readFileSync(rule.hookPath, 'utf8'),
        rule: rule.id,
        executable: true,
      })
    }
  }

  const withOptions = selected.map(rule => ({
    ...rule,
    eslint: rule.eslint
      ? { ...rule.eslint, options: substituteOptions(rule.eslint.options, config) }
      : undefined,
  }))

  artefacts.push({
    path: join('.standards', 'eslint.config.js'),
    content: generateEslintConfig(withOptions, config.layers),
    rule: '(eslint config)',
  })

  artefacts.push({
    path: join('.standards', 'AGENTS.md'),
    content: generateAgentsMd(selected),
    rule: '(agents md)',
  })

  return artefacts
}

export function planSync(root, artefacts, lock) {
  return artefacts.map(artefact => ({
    ...artefact,
    state: fileState(root, artefact.path, lock, artefact.content),
  }))
}

export function summarise(plan) {
  const counts = { missing: 0, stale: 0, drifted: 0, current: 0, untracked: 0, deleted: 0, pinned: 0 }
  for (const entry of plan) counts[entry.state] += 1
  return counts
}
