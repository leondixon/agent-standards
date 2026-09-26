import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { parseFrontmatter } from './frontmatter.js'

const LAYERS = new Set(['any', 'backend', 'frontend', 'schema', 'test'])
const SEVERITIES = new Set(['error', 'warn'])
const OUTPUTS = new Set(['mdc', 'agents-md', 'eslint', 'oxlint', 'hook', 'cargo-lints', 'clippy-config', 'ast-grep'])
const LINT_TOOLS = new Set(['rust', 'clippy', 'bevy'])
const LINT_LEVELS = new Set(['allow', 'expect', 'warn', 'deny', 'forbid'])
const REQUIRED = ['id', 'title', 'layer', 'presets', 'severity', 'outputs']

function directoriesIn(path) {
  if (!existsSync(path)) return []
  return readdirSync(path)
    .filter(entry => !entry.startsWith('.'))
    .filter(entry => statSync(join(path, entry)).isDirectory())
}

function isMap(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function lintProblems(lints) {
  if (!isMap(lints)) return ['`lints:` must be a map of `rust`, `clippy` or `bevy` to lint levels']

  const problems = []
  for (const [tool, entries] of Object.entries(lints)) {
    if (!LINT_TOOLS.has(tool)) {
      problems.push(`unknown lint tool \`${tool}\` (expected rust, clippy or bevy)`)
      continue
    }
    if (!isMap(entries)) {
      problems.push(`\`lints.${tool}\` must be a map of lint names to levels`)
      continue
    }
    for (const [name, setting] of Object.entries(entries)) {
      const level = isMap(setting) ? setting.level : setting
      if (!LINT_LEVELS.has(level)) {
        problems.push(`\`lints.${tool}.${name}\` has unknown level \`${level}\``)
      }
      // bevy_lint reads its table from package metadata, which has no priority field.
      if (tool === 'bevy' && isMap(setting) && Object.keys(setting).some(key => key !== 'level')) {
        problems.push(`\`lints.bevy.${name}\` only supports \`level\``)
      }
      if (isMap(setting) && setting.priority !== undefined && !Number.isInteger(setting.priority)) {
        problems.push(`\`lints.${tool}.${name}.priority\` must be an integer`)
      }
    }
  }
  return problems
}

function validate(rule) {
  const problems = []

  for (const field of REQUIRED) {
    if (rule[field] === undefined) problems.push(`missing \`${field}\``)
  }
  if (rule.id && rule.id !== rule.dirName) {
    problems.push(`id \`${rule.id}\` does not match directory \`${rule.dirName}\``)
  }
  if (rule.layer && !LAYERS.has(rule.layer)) {
    problems.push(`unknown layer \`${rule.layer}\``)
  }
  if (rule.severity && !SEVERITIES.has(rule.severity)) {
    problems.push(`unknown severity \`${rule.severity}\``)
  }
  for (const output of rule.outputs ?? []) {
    if (!OUTPUTS.has(output)) problems.push(`unknown output \`${output}\``)
  }
  if (rule.outputs?.includes('eslint') && !rule.eslint) {
    problems.push('declares the `eslint` output but has no `eslint:` block')
  }
  if (rule.eslint?.own && !rule.implementationPath) {
    problems.push('`eslint.own` is set but the directory has no `rule.js`')
  }
  if (rule.outputs?.includes('oxlint') && !rule.oxlint && !rule.eslint) {
    problems.push('declares the `oxlint` output but has no `oxlint:` or `eslint:` block')
  }
  if (rule.oxlint?.own && !rule.implementationPath) {
    problems.push('`oxlint.own` is set but the directory has no `rule.js`')
  }
  if (rule.outputs?.includes('hook') && !rule.hookPath) {
    problems.push('declares the `hook` output but has no `hook.sh`')
  }
  if (rule.outputs?.includes('cargo-lints')) {
    if (rule.lints === undefined) problems.push('declares the `cargo-lints` output but has no `lints:` block')
    else problems.push(...lintProblems(rule.lints))
  }
  if (rule.outputs?.includes('clippy-config') && !isMap(rule.clippy)) {
    problems.push('declares the `clippy-config` output but has no `clippy:` block')
  }
  if (rule.outputs?.includes('ast-grep') && !rule.astGrepPath) {
    problems.push('declares the `ast-grep` output but has no `rule.yml`')
  }

  return problems
}

function loadRule(path, { language, preset }) {
  const rulePath = join(path, 'rule.md')
  if (!existsSync(rulePath)) return undefined

  const { data, body } = parseFrontmatter(readFileSync(rulePath, 'utf8'))
  const implementationPath = join(path, 'rule.js')
  const hookPath = join(path, 'hook.sh')
  const astGrepPath = join(path, 'rule.yml')

  const rule = {
    ...data,
    body,
    path,
    dirName: basename(path),
    language,
    preset,
    implementationPath: existsSync(implementationPath) ? implementationPath : undefined,
    hookPath: existsSync(hookPath) ? hookPath : undefined,
    astGrepPath: existsSync(astGrepPath) ? astGrepPath : undefined,
  }

  rule.problems = validate(rule)
  return rule
}

function loadCoreRule(path) {
  const rule = loadRule(path, { language: 'core', preset: 'base' })
  if (!rule) return undefined

  const languagesPath = join(path, 'languages')
  rule.expressions = {}
  if (existsSync(languagesPath)) {
    for (const file of readdirSync(languagesPath).filter(name => name.endsWith('.md'))) {
      const { data, body } = parseFrontmatter(readFileSync(join(languagesPath, file), 'utf8'))
      rule.expressions[basename(file, '.md')] = { ...data, body }
    }
  }
  return rule
}

export function loadStandards(root) {
  const standardsPath = join(root, 'standards')
  const rules = []

  for (const path of directoriesIn(join(standardsPath, 'core'))) {
    const rule = loadCoreRule(join(standardsPath, 'core', path))
    if (rule) rules.push(rule)
  }

  for (const language of directoriesIn(standardsPath).filter(name => name !== 'core')) {
    for (const preset of directoriesIn(join(standardsPath, language))) {
      for (const dir of directoriesIn(join(standardsPath, language, preset))) {
        const rule = loadRule(join(standardsPath, language, preset, dir), { language, preset })
        if (rule) rules.push(rule)
      }
    }
  }

  return rules
}

export function invalidRules(rules) {
  return rules.filter(rule => rule.problems.length > 0)
}

/**
 * Authoring-only checks. Fixtures are excluded from the published package, so
 * these run against a source checkout — never against an installed copy.
 */
export function authoringProblems(rules) {
  return rules
    .map((rule) => {
      const problems = []
      if (rule.eslint?.own && !existsSync(join(rule.path, '__fixtures__'))) {
        problems.push('own ESLint implementation requires `__fixtures__/`')
      }
      if (rule.astGrepPath && !existsSync(join(rule.path, '__fixtures__'))) {
        problems.push('ast-grep `rule.yml` requires `__fixtures__/`')
      }
      return { ...rule, problems }
    })
    .filter(rule => rule.problems.length > 0)
}
