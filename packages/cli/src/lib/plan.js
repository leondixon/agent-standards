import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileState } from './config.js'
import { appliesTo } from './layers.js'
import { generateAgentsMd, generateClaudeHooks, generateCursorHooks, generateEslintConfig, generateMdc, generateOxlintConfig } from '../generators/index.js'

export function selectRules(rules, config) {
  const presets = new Set(config.presets)
  const languages = new Set(config.languages)
  return rules
    .filter(rule => rule.language === 'core' || languages.has(rule.language))
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
        content: generateMdc(rule, config.layers, config.languages),
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
    oxlint: rule.oxlint
      ? { ...rule.oxlint, options: substituteOptions(rule.oxlint.options, config) }
      : undefined,
  }))

  if (withOptions.some(rule => rule.outputs.includes('eslint'))) {
    artefacts.push({
      path: join('.standards', 'eslint.config.js'),
      content: generateEslintConfig(withOptions, config.layers),
      rule: '(eslint config)',
    })
  }

  if (withOptions.some(rule => rule.outputs.includes('eslint') || rule.outputs.includes('oxlint'))) {
    artefacts.push({
      path: join('.standards', '.oxlintrc.json'),
      content: generateOxlintConfig(withOptions, config.layers),
      rule: '(oxlint config)',
    })
  }

  artefacts.push({
    path: join('.standards', 'AGENTS.md'),
    content: generateAgentsMd(selected),
    rule: '(agents md)',
  })

  artefacts.push({
    path: join('.standards', 'skills', 'resolve-standards-conflicts', 'SKILL.md'),
    content: readFileSync(
      join(config.sourcePath, 'templates', 'skills', 'resolve-standards-conflicts', 'SKILL.md'),
      'utf8',
    ),
    rule: '(conflict skill)',
  })

  const hookRules = selected.filter(rule => rule.outputs.includes('hook') && rule.hookPath)

  if (hookRules.length > 0) {
    artefacts.push({
      path: join('.standards', 'hook-lib', 'diff.sh'),
      content: readFileSync(join(config.sourcePath, 'templates', 'hook-lib', 'diff.sh'), 'utf8'),
      rule: '(hook library)',
      executable: true,
    })
    artefacts.push({
      path: join('.cursor', 'hooks.json'),
      content: generateCursorHooks(hookRules),
      rule: '(cursor hooks)',
    })
    artefacts.push({
      path: join('.standards', 'claude-hooks.json'),
      content: generateClaudeHooks(hookRules),
      rule: '(claude hooks)',
    })
  }

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
