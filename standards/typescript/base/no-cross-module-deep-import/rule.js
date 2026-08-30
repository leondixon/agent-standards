const RELATIVE_PEER_IMPORT = /^((?:\.\.\/)+)([a-z][a-z0-9-]*)(?:\/(.*))?$/

function moduleRootPattern(sourceRoot) {
  const escaped = sourceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|/)${escaped}/([^/]+)/`)
}

function owningModule(filename, modules, sourceRoot) {
  if (!filename) return undefined
  const normalized = filename.replaceAll('\\', '/')
  const match = normalized.match(moduleRootPattern(sourceRoot))
  if (!match) return undefined
  return modules.has(match[1]) ? match[1] : undefined
}

function deepPeerImport(source, fromModule, modules) {
  if (typeof source !== 'string' || !source.startsWith('../')) return undefined

  const match = source.match(RELATIVE_PEER_IMPORT)
  if (!match) return undefined

  const [, ups, targetModule, rest] = match
  if (!modules.has(targetModule) || targetModule === fromModule) return undefined
  if (!rest || rest === 'index') return undefined

  return { targetModule, publicImport: `${ups}${targetModule}` }
}

function report(context, sourceNode, modules, sourceRoot) {
  if (sourceNode?.type !== 'Literal' || typeof sourceNode.value !== 'string') return

  const fromModule = owningModule(context.filename, modules, sourceRoot)
  if (!fromModule) return

  const peerImport = deepPeerImport(sourceNode.value, fromModule, modules)
  if (!peerImport) return

  context.report({
    node: sourceNode,
    messageId: 'deepPeerImport',
    data: {
      fromModule,
      targetModule: peerImport.targetModule,
      source: sourceNode.value,
      publicImport: peerImport.publicImport,
    },
  })
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Sibling modules must import each other through their public surface, not deep internal paths.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          modules: { type: 'array', items: { type: 'string' } },
          sourceRoot: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      deepPeerImport:
        'Do not deep-import sibling module "{{targetModule}}" via "{{source}}" from "{{fromModule}}". Import from "{{publicImport}}" instead.',
    },
  },
  create(context) {
    const { modules = [], sourceRoot = 'src' } = context.options[0] ?? {}
    if (modules.length === 0) return {}

    const moduleSet = new Set(modules)

    return {
      ImportDeclaration(node) {
        report(context, node.source, moduleSet, sourceRoot)
      },
      ExportNamedDeclaration(node) {
        if (node.source) report(context, node.source, moduleSet, sourceRoot)
      },
      ExportAllDeclaration(node) {
        report(context, node.source, moduleSet, sourceRoot)
      },
    }
  },
}
