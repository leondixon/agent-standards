/**
 * Flag `z.object/z.discriminatedUnion/z.union` declared inside a function
 * body in `.tsx`. Schemas defined in render are rebuilt every render and
 * lose Zod's cached validators. Hoist to module scope.
 */
const Z_FACTORIES = new Set(['object', 'discriminatedUnion', 'union']);

function isZFactoryCall(node) {
  return node.type === 'CallExpression'
    && node.callee.type === 'MemberExpression'
    && node.callee.object.type === 'Identifier'
    && node.callee.object.name === 'z'
    && node.callee.property.type === 'Identifier'
    && Z_FACTORIES.has(node.callee.property.name);
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Zod schema declared inside a function body — rebuilt every render.',
    },
    schema: [],
    messages: {
      schemaInBody:
       'Zod schema declared inside a function body — rebuilt every render and loses Zod\'s cached validators. Hoist to module scope (or a sibling `schemas/` file).',
    },
  },
  create(context) {
    const fnStack = [];

    function enterFn(node) { fnStack.push(node); }
    function exitFn() { fnStack.pop(); }

    return {
     ':function': enterFn,
     ':function:exit': exitFn,
      CallExpression(node) {
        if (fnStack.length === 0) return;
        if (!isZFactoryCall(node)) return;
        context.report({ node, messageId: 'schemaInBody' });
      },
    };
  },
};
