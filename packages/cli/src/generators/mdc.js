import { resolveGlobs } from '../lib/layers.js'

function summary(body) {
  const paragraph = body.split('\n\n').find(block => !block.startsWith('#'))
  return (paragraph ?? '').replace(/\n/g, ' ').trim()
}

export function generateMdc(rule, layerMap) {
  const globs = resolveGlobs(rule, layerMap)
  const alwaysApply = rule.layer === 'any' && !globs

  const frontmatter = [
    '---',
    `description: ${summary(rule.body).slice(0, 160)}`,
    globs ? `globs: ${globs.join(',')}` : undefined,
    `alwaysApply: ${alwaysApply}`,
    '---',
  ].filter(Boolean)

  return `${frontmatter.join('\n')}\n\n# ${rule.title}\n\n${rule.body}\n`
}
