import { resolveGlobs } from '../lib/layers.js'

const LANGUAGE_TITLES = {
  typescript: 'TypeScript',
  rust: 'Rust',
}

// Rules sit under `### Title` inside the `## Coding standards` section.
const HEADING_SHIFT = '##'

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

function demoteHeadings(markdown) {
  let fenced = false
  return markdown
    .split('\n')
    .map((line) => {
      if (line.startsWith('```')) fenced = !fenced
      return !fenced && /^#+ /.test(line) ? `${HEADING_SHIFT}${line}` : line
    })
    .join('\n')
}

function enforcement(rule) {
  if (rule.eslint?.own || rule.oxlint?.own) return `\`standards/${rule.id}\``
  if (rule.eslint?.rule && rule.oxlint?.rule && rule.oxlint.rule !== rule.eslint.rule) {
    return `\`${rule.eslint.rule}\` / \`${rule.oxlint.rule}\``
  }
  if (rule.eslint?.rule) return `\`${rule.eslint.rule}\``
  if (rule.oxlint?.rule) return `\`${rule.oxlint.rule}\``
  if (rule.lints) return 'Cargo lints'
  if (rule.astGrepPath) return 'ast-grep'
  return undefined
}

export function generateAgentsIntro() {
  return [
    '## Coding standards',
    '',
    'Each rule below is a block managed by `standards sync`. Edit inside a block to',
    'adapt a rule for this project: sync keeps the edit, and asks for a merge when',
    'the rule changes upstream.',
  ].join('\n')
}

/**
 * One rule as an AGENTS.md section. `qualified` adds the language to the title
 * when two language trees define the same rule.
 */
export function generateAgentsRule(rule, { layers, languages = [], qualified = false }) {
  const title = qualified ? `${rule.title} (${languageTitle(rule.language)})` : rule.title
  const globs = resolveGlobs(rule, layers)
  const enforcedBy = enforcement(rule)
  const facts = [
    globs ? `Applies to ${globs.map(glob => `\`${glob}\``).join(', ')}` : undefined,
    enforcedBy ? `enforced by ${enforcedBy}` : undefined,
  ].filter(Boolean)

  return [
    `### ${title}`,
    ...(facts.length > 0 ? ['', `_${facts.join(' · ')}_`] : []),
    '',
    demoteHeadings(bodyFor(rule, languages)),
  ].join('\n')
}
