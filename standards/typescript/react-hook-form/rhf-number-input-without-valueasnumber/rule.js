/**
 * Flag `<input type="number">` paired with RHF `register()` in the same
 * file when no coercion (`valueAsNumber`/`valueAsDate`/`setValueAs`) is
 * present anywhere. Without coercion RHF stores the value as a string
 * and Zod `z.number()` validation fails.
 */
const COERCION_KEYS = new Set(['valueAsNumber', 'valueAsDate', 'setValueAs']);

export default {
  meta: {
    type: 'problem',
    docs: {
      description: '<input type="number"> with `register()` but no `valueAsNumber` coercion.',
    },
    schema: [],
    messages: {
      missingCoercion:
       '<input type="number"> with RHF `register()` but no coercion — RHF stores it as a string. Use `register(\'age\', { valueAsNumber: true })` (or valueAsDate / setValueAs).',
    },
  },
  create(context) {
    const numberInputs = [];
    let hasRegister = false;
    let hasCoercion = false;

    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'input') return;
        for (const attr of node.attributes) {
          if (
            attr.type === 'JSXAttribute'
            && attr.name.type === 'JSXIdentifier'
            && attr.name.name === 'type'
            && attr.value
            && attr.value.type === 'Literal'
            && attr.value.value === 'number'
          ) {
            numberInputs.push(node);
            return;
          }
        }
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'register') {
          hasRegister = true;
        }
      },
      Property(node) {
        if (node.computed) return;
        const keyName = node.key.type === 'Identifier'
          ? node.key.name
          : (node.key.type === 'Literal' ? node.key.value : null);
        if (keyName && COERCION_KEYS.has(keyName)) hasCoercion = true;
      },
     'Program:exit'() {
        if (!hasRegister || hasCoercion) return;
        for (const input of numberInputs) {
          context.report({ node: input, messageId: 'missingCoercion' });
        }
      },
    };
  },
};
