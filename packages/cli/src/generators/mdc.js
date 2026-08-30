import { resolveGlobs } from '../lib/layers.js'

function summary(body) {
  const paragraph = body.split('\n\n').find(block => !block.startsWith('#'))
  return (paragraph ?? '').replace(/\n/g, ' ').trim()
}

function bodyFor(rule, language) {
  const expression = rule.expressions?.[language]
  if (!expression) return rule.body
  return `${rule.body}\n\n${expression.body}`
}

export function generateMdc(rule, layerMap, language) {
  const globs = resolveGlobs(rule, layerMap)
  const alwaysApply = rule.layer === 'any' && !globs
  const body = bodyFor(rule, language)

  const frontmatter = [
    '---',
    `description: ${summary(body).slice(0, 160)}`,
    globs ? `globs: ${globs.join(',')}` : undefined,
    `alwaysApply: ${alwaysApply}`,
    '---',
  ].filter(Boolean)

  return `${frontmatter.join('\n')}\n\n# ${rule.title}\n\n${body}\n`
}
