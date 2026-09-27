import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileState, retiredState } from './config.js'
import { ConfigurationError } from './errors.js'
import { appliesTo } from './layers.js'
import { STANDARDS_REGION, regionKey, wrapRegion } from './region.js'
import {
  generateAgentsMd,
  generateCargoLints,
  generateClaudeHooks,
  generateClaudeRule,
  generateClippyConfig,
  generateEslintConfig,
  generateOxlintConfig,
} from '../generators/index.js'

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

/** Ids that more than one language tree defines, such as `no-banner-comments`. */
function sharedIds(rules) {
  const languages = new Map()
  for (const rule of rules) {
    languages.set(rule.id, new Set([...(languages.get(rule.id) ?? []), rule.language]))
  }
  return new Set([...languages].filter(([, set]) => set.size > 1).map(([id]) => id))
}

export function buildArtefacts(rules, config) {
  const selected = selectRules(rules, config)
  const artefacts = []
  const shared = sharedIds(selected)

  for (const rule of selected) {
    if (rule.outputs.includes('claude-rule')) {
      artefacts.push({
        path: join('.claude', 'rules', shared.has(rule.id) ? `${rule.id}-${rule.language}.md` : `${rule.id}.md`),
        content: generateClaudeRule(rule, config.layers, config.languages),
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

  const instructionsFile = config.instructionsFile ?? 'AGENTS.md'
  artefacts.push({
    path: instructionsFile,
    region: STANDARDS_REGION,
    content: wrapRegion(generateAgentsMd(selected).trimEnd(), instructionsFile),
    rule: '(agents md)',
  })

  artefacts.push({
    path: join('.claude', 'skills', 'resolve-standards-conflicts', 'SKILL.md'),
    content: template(config, 'skills', 'resolve-standards-conflicts', 'SKILL.md'),
    rule: '(conflict skill)',
  })

  artefacts.push(...rustArtefacts(selected, config))

  const hookRules = selected.filter(rule => rule.outputs.includes('hook') && rule.hookPath)
  const astGrepRules = selected.filter(rule => rule.outputs.includes('ast-grep'))
  const rustGate = selected.some(rule => rule.language === 'rust')

  const edit = hookRules.map(rule => ({ command: `.standards/hooks/${rule.id}.sh`, title: rule.title }))
  if (astGrepRules.length > 0) {
    edit.push({ command: '.standards/hooks/ast-grep.sh', title: 'ast-grep standards' })
  }
  const stop = rustGate ? [{ command: '.standards/hooks/rust-gate.sh', title: 'Rust quality gate' }] : []

  if (edit.length > 0) {
    artefacts.push({
      path: join('.standards', 'hook-lib', 'diff.sh'),
      content: template(config, 'hook-lib', 'diff.sh'),
      rule: '(hook library)',
      executable: true,
    })
  }

  if (edit.length > 0 || stop.length > 0) {
    artefacts.push({
      path: join('.claude', 'settings.json'),
      region: STANDARDS_REGION,
      content: generateClaudeHooks({ edit, stop }),
      rule: '(claude hooks)',
    })
  }

  return artefacts
}

function template(config, ...segments) {
  return readFileSync(join(config.sourcePath, 'templates', ...segments), 'utf8')
}

function rustArtefacts(selected, config) {
  const artefacts = []
  const lintRules = selected.filter(rule => rule.outputs.includes('cargo-lints'))
  const clippyRules = selected.filter(rule => rule.outputs.includes('clippy-config'))
  const astGrepRules = selected.filter(rule => rule.outputs.includes('ast-grep'))

  if (lintRules.length > 0) {
    if (config.cargoManifest === undefined) {
      throw new ConfigurationError('Rust lint rules are selected but the project has no Cargo.toml at its root.')
    }
    artefacts.push({
      path: 'Cargo.toml',
      region: STANDARDS_REGION,
      content: generateCargoLints(lintRules, config.cargoManifest),
      rule: '(cargo lints)',
    })
  }

  if (clippyRules.length > 0) {
    artefacts.push({
      path: 'clippy.toml',
      content: generateClippyConfig(clippyRules),
      rule: '(clippy config)',
    })
  }

  for (const rule of astGrepRules) {
    artefacts.push({
      path: join('.standards', 'ast-grep', 'rules', `${rule.id}.yml`),
      content: readFileSync(rule.astGrepPath, 'utf8'),
      rule: rule.id,
    })
  }

  if (astGrepRules.length > 0) {
    artefacts.push({
      path: join('.standards', 'sgconfig.yml'),
      content: 'ruleDirs:\n  - ast-grep/rules\n',
      rule: '(ast-grep config)',
    })
    artefacts.push({
      path: join('.standards', 'hooks', 'ast-grep.sh'),
      content: template(config, 'hooks', 'ast-grep.sh'),
      rule: '(ast-grep hook)',
      executable: true,
    })
  }

  if (selected.some(rule => rule.language === 'rust')) {
    artefacts.push({
      path: join('.standards', 'hooks', 'rust-gate.sh'),
      content: template(config, 'hooks', 'rust-gate.sh').replace('__BEVY_LINT__', String(config.presets.includes('bevy'))),
      rule: '(rust gate)',
      executable: true,
    })
  }

  return artefacts
}

export function planSync(root, artefacts, lock) {
  return artefacts.map(artefact => ({
    ...artefact,
    state: fileState(root, artefact.path, lock, artefact.content, artefact.region),
  }))
}

/**
 * Lock entries sync no longer generates, such as a retired rule or a file from
 * an earlier layout. `retired` still holds what sync wrote and is safe to
 * remove; `kept` was edited since, so it stays on disk; `gone` is deleted.
 */
export function planRetired(root, artefacts, lock) {
  const current = new Set(artefacts.map(artefact => regionKey(artefact.path, artefact.region)))

  return Object.keys(lock.files)
    .filter(key => !current.has(key))
    .map((key) => {
      const [path, region] = key.split('#')
      return { key, path, region, state: retiredState(root, path, region, lock.files[key]) }
    })
}

export function summarise(plan) {
  const counts = { missing: 0, stale: 0, drifted: 0, current: 0, untracked: 0, deleted: 0, pinned: 0 }
  for (const entry of plan) counts[entry.state] += 1
  return counts
}
