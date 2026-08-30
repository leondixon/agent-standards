const TEMPORAL_TOKENS = new Set(['date', 'time', 'from', 'at', 'datetime', 'timestamp']);
const PRESENTATION_TOKENS = new Set(['display', 'label', 'text', 'input']);

function propertyName(node) {
  if (!node || node.type !== 'Property' || node.computed) {
    return null;
  }
  if (node.key.type === 'Identifier') {
    return node.key.name;
  }
  if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
    return node.key.value;
  }
  return null;
}

function nameTokens(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(token => token.toLowerCase());
}

function isTemporalName(name) {
  const tokens = nameTokens(name);
  if (tokens.some(token => PRESENTATION_TOKENS.has(token))) {
    return false;
  }
  return tokens.some(token => TEMPORAL_TOKENS.has(token));
}

function zodRootFactory(node) {
  let current = node;
  while (
    current
    && current.type === 'CallExpression'
    && current.callee.type === 'MemberExpression'
    && !current.callee.computed
    && current.callee.property.type === 'Identifier'
  ) {
    const object = current.callee.object;
    if (object.type === 'Identifier' && object.name === 'z') {
      return current.callee.property.name;
    }
    if (
      object.type === 'MemberExpression'
      && !object.computed
      && object.object.type === 'Identifier'
      && object.object.name === 'z'
      && object.property.type === 'Identifier'
    ) {
      return `${object.property.name}.${current.callee.property.name}`;
    }
    current = object;
  }
  return null;
}

function isZStringSchema(node) {
  return zodRootFactory(node) === 'string';
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
       'Zod object properties whose names look temporal (date/time/from/at) must not use z.string().',
    },
    schema: [],
    messages: {
      temporalString:
       'Property "{{name}}" looks temporal — use z.iso.date(), z.iso.datetime(), or z.date() instead of z.string().',
    },
  },
  create(context) {
    return {
      Property(node) {
        const name = propertyName(node);
        if (!name || !isTemporalName(name)) {
          return;
        }
        if (!isZStringSchema(node.value)) {
          return;
        }
        context.report({
          node: node.value,
          messageId: 'temporalString',
          data: { name },
        });
      },
    };
  },
};
