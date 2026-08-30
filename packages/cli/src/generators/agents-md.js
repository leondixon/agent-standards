function firstSentence(body) {
  const paragraph = body.split('\n\n').find(block => !block.startsWith('#')) ?? ''
  const flat = paragraph.replace(/\n/g, ' ').trim()
  const stop = flat.search(/\.\s|\.$/)
  return stop === -1 ? flat : flat.slice(0, stop + 1)
}

function reference(rule) {
  if (rule.eslint?.own) return ` (\`standards/${rule.id}\`)`
  if (rule.eslint?.rule) return ` (\`${rule.eslint.rule}\`)`
  return ''
}

export function generateAgentsMd(rules, { heading = 'Coding Standards' } = {}) {
  const included = rules.filter(rule => rule.outputs.includes('agents-md'))
  const byPreset = new Map()

  for (const rule of included) {
    const list = byPreset.get(rule.preset) ?? []
    list.push(rule)
    byPreset.set(rule.preset, list)
  }

  const sections = []
  const presets = [...byPreset.keys()].sort((a, b) => (a === 'base' ? -1 : b === 'base' ? 1 : a.localeCompare(b)))

  for (const preset of presets) {
    const bullets = byPreset
      .get(preset)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(rule => `- ${firstSentence(rule.body)}${reference(rule)}`)

    sections.push(preset === 'base' ? bullets.join('\n') : `### ${preset}\n\n${bullets.join('\n')}`)
  }

  return `## ${heading}\n\n${sections.join('\n\n')}\n`
}
