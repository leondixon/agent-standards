/**
 * Ban `to*Response` mapper helpers. Prefer inline mapping at the handler with
 * Zod schemas / `satisfies` instead of a named `toPaymentMethodResponse`-style
 * abstraction.
 */

const TO_RESPONSE_HELPER = /^to[A-Z].*Response$/;

function isToResponseHelperName(name) {
  return typeof name === 'string' && TO_RESPONSE_HELPER.test(name);
}

function isFunctionInit(node) {
  return (
    node?.type === 'FunctionExpression'
    || node?.type === 'ArrowFunctionExpression'
  );
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
       'Disallow `to*Response` helper functions — map responses inline at the handler with Zod schemas / `satisfies`.',
    },
    schema: [],
    messages: {
      toResponseHelper:
       'Do not define `{{name}}` helpers — map the response inline at the handler with Zod schemas / `satisfies`.',
    },
  },
  create(context) {
    function report(node, name) {
      context.report({
        node,
        messageId: 'toResponseHelper',
        data: { name },
      });
    }

    return {
      FunctionDeclaration(node) {
        const name = node.id?.name;
        if (!isToResponseHelperName(name)) return;
        report(node.id, name);
      },
      VariableDeclarator(node) {
        if (node.id?.type !== 'Identifier') return;
        const { name } = node.id;
        if (!isToResponseHelperName(name)) return;
        if (!isFunctionInit(node.init)) return;
        report(node.id, name);
      },
      ImportSpecifier(node) {
        const importedName
          = node.imported?.type === 'Identifier' ? node.imported.name : undefined;
        const localName = node.local?.name;
        if (isToResponseHelperName(importedName)) {
          report(node.imported, importedName);
          return;
        }
        if (isToResponseHelperName(localName)) {
          report(node.local, localName);
        }
      },
      ImportDefaultSpecifier(node) {
        const name = node.local?.name;
        if (!isToResponseHelperName(name)) return;
        report(node.local, name);
      },
    };
  },
};
