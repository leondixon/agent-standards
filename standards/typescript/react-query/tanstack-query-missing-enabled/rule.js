/**
 * Flag `useQuery({...})` with an id-shaped queryKey but no `enabled:` gate
 * anywhere in the file. Without `enabled` the query fires once with
 * `undefined`, errors, and pollutes the cache.
 */
const ID_SUFFIX_RE = /(Id|Uuid)$/;

function hasIdShapedKey(arrayNode) {
  if (!arrayNode || arrayNode.type !== 'ArrayExpression') return false;
  for (const el of arrayNode.elements) {
    if (!el) continue;
    if (el.type === 'Identifier' && ID_SUFFIX_RE.test(el.name)) return true;
    if (el.type === 'MemberExpression' && el.optional) return true;
    if (el.type === 'ChainExpression') return true;
    if (el.type === 'MemberExpression') {
      const prop = el.property;
      if (prop.type === 'Identifier' && ID_SUFFIX_RE.test(prop.name)) return true;
    }
  }
  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'useQuery with an id-shaped queryKey but no `enabled:` gate.',
    },
    schema: [],
    messages: {
      missingEnabled:
       'useQuery with an id-shaped queryKey but no `enabled:` gate. The query fires against `undefined` at first render, errors, and pollutes the cache. Add `enabled: !!param` or confirm the param is always defined.',
    },
  },
  create(context) {
    const candidates = [];
    let hasEnabledKey = false;

    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'useQuery') return;
        if (node.arguments.length === 0) return;
        const opts = node.arguments[0];
        if (opts.type !== 'ObjectExpression') return;
        for (const prop of opts.properties) {
          if (prop.type !== 'Property' || prop.computed) continue;
          const keyName = prop.key.type === 'Identifier'
            ? prop.key.name
            : (prop.key.type === 'Literal' ? prop.key.value : null);
          if (keyName === 'queryKey' && hasIdShapedKey(prop.value)) {
            candidates.push(node);
          }
        }
      },
      Property(node) {
        if (node.computed) return;
        const keyName = node.key.type === 'Identifier'
          ? node.key.name
          : (node.key.type === 'Literal' ? node.key.value : null);
        if (keyName === 'enabled') hasEnabledKey = true;
      },
     'Program:exit'() {
        if (hasEnabledKey) return;
        for (const node of candidates) {
          context.report({ node, messageId: 'missingEnabled' });
        }
      },
    };
  },
};
