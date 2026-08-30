import { resolveGlobs } from '../lib/layers.js'

const LANGUAGE_TITLES = {
  typescript: 'TypeScript',
  rust: 'Rust',
}

function summary(body) {
  const paragraph = body.split('\n\n').find(block => !block.startsWith('#'))
  return (paragraph ?? '').replace(/\n/g, ' ').trim()
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

export function generateMdc(rule, layerMap, languages = []) {
  const list = Array.isArray(languages) ? languages : [languages]
  const globs = resolveGlobs(rule, layerMap)
  const alwaysApply = rule.layer === 'any' && !globs
  const body = bodyFor(rule, list)

  const frontmatter = [
    '---',
    `description: ${summary(body).slice(0, 160)}`,
    globs ? `globs: ${globs.join(',')}` : undefined,
    `alwaysApply: ${alwaysApply}`,
    '---',
  ].filter(Boolean)

  return `${frontmatter.join('\n')}\n\n# ${rule.title}\n\n${body}\n`
}
