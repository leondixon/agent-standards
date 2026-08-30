import { loadStandards } from '../lib/rules.js'
import { heading, line, style } from '../lib/ui.js'

export function listCommand(sourceRoot) {
  const rules = loadStandards(sourceRoot)
  const groups = new Map()

  for (const rule of rules) {
    const key = `${rule.language}/${rule.preset}`
    const list = groups.get(key) ?? []
    list.push(rule)
    groups.set(key, list)
  }

  for (const key of [...groups.keys()].sort()) {
    heading(key)
    for (const rule of groups.get(key).sort((a, b) => a.id.localeCompare(b.id))) {
      const marks = [
        rule.eslint || rule.oxlint ? 'lint' : undefined,
        rule.hookPath ? 'hook' : undefined,
        rule.expressions ? `${Object.keys(rule.expressions).length} languages` : undefined,
      ].filter(Boolean)
      line(`  ${rule.id.padEnd(44)} ${style.dim(marks.join(' · '))}`)
    }
  }

  line()
  line(style.dim(`${rules.length} rules`))
}
