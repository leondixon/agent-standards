import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateEslintPlugin } from '../generators/index.js'
import { authoringProblems, invalidRules, loadStandards } from '../lib/rules.js'
import { line, style } from '../lib/ui.js'

export function buildCommand(sourceRoot) {
  const rules = loadStandards(sourceRoot)
  const invalid = [...invalidRules(rules), ...authoringProblems(rules)]

  if (invalid.length > 0) {
    line(style.red(`${invalid.length} invalid rule(s):`))
    for (const rule of invalid) line(`  ${rule.id}: ${rule.problems.join('; ')}`)
    return 1
  }

  const target = join(sourceRoot, 'packages', 'eslint-plugin', 'index.js')
  const next = generateEslintPlugin(rules)
  const current = readFileSync(target, 'utf8')

  if (current === next) {
    line(`  ${style.dim('·')} plugin already current (${rules.filter(rule => rule.eslint?.own).length} rules)`)
    return 0
  }

  writeFileSync(target, next)
  line(`  ${style.green('✓')} plugin rebuilt with ${rules.filter(rule => rule.eslint?.own).length} rules`)
  return 0
}
