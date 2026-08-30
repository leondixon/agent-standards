/**
 * Flag `useFieldArray` rows keyed by index (`key={i}`). RHF generates a
 * stable `id` per field — using the index undoes that and corrupts input
 * state on reorder/remove. Use `key={field.id}`.
 */
const INDEX_NAMES = new Set(['i', 'index', 'idx']);

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'useFieldArray row keyed by index instead of `field.id`.',
    },
    schema: [],
    messages: {
      indexKey:
       'useFieldArray row keyed by index — RHF generates a stable `id` per field; index keys corrupt input state on reorder/remove. Use `key={field.id}`.',
    },
  },
  create(context) {
    let usesFieldArray = false;
    const indexKeyAttrs = [];

    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'useFieldArray') {
          usesFieldArray = true;
        }
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'key') return;
        const value = node.value;
        if (!value || value.type !== 'JSXExpressionContainer') return;
        const expr = value.expression;
        if (expr.type === 'Identifier' && INDEX_NAMES.has(expr.name)) {
          indexKeyAttrs.push(node);
        }
      },
     'Program:exit'() {
        if (!usesFieldArray) return;
        for (const attr of indexKeyAttrs) {
          context.report({ node: attr, messageId: 'indexKey' });
        }
      },
    };
  },
};
