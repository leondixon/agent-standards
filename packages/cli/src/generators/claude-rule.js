import { resolveGlobs } from '../lib/layers.js'

const LANGUAGE_TITLES = {
  typescript: 'TypeScript',
  rust: 'Rust',
}

function languageTitle(language) {
  return LANGUAGE_TITLES[language] ?? language
}

function bodyFor(rule, languages) {
  const expressions = languages
    .map(language => ({ language, expression: rule.expressions?.[language] }))
    .filter(entry => entry.expression)

  if (expressions.length === 0) return rule.body

  // A single-language project reads better without a redundant language heading.
  if (expressions.length === 1) {
    return `${rule.body}\n\n${expressions[0].expression.body}`
  }

  const sections = expressions.map(({ language, expression }) =>
    `## In ${languageTitle(language)}\n\n${expression.body}`)

  return `${rule.body}\n\n${sections.join('\n\n')}`
}

/**
 * A `.claude/rules/` file. Claude Code loads it when it reads a file matching
 * `paths`, so each rule costs context only where it applies.
 */
export function generateClaudeRule(rule, layerMap, languages = []) {
  const list = Array.isArray(languages) ? languages : [languages]
  const globs = resolveGlobs(rule, layerMap)
  const body = bodyFor(rule, list)
  const frontmatter = globs
    ? `---\npaths:\n${globs.map(glob => `  - ${JSON.stringify(glob)}`).join('\n')}\n---\n\n`
    : ''

  return `${frontmatter}# ${rule.title}\n\n${body}\n`
}
