/**
 * Flag files with multiple `useOptimistic` calls — two calls for related
 * fields can fall out of sync if one update fails. Prefer a single
 * optimistic state object with one reducer.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Multiple useOptimistic calls in one file.',
    },
    schema: [],
    messages: {
      multipleCalls:
       'Multiple `useOptimistic` calls in one file — if they track related state, merge into one optimistic object with a single reducer to avoid drift on partial failure.',
    },
  },
  create(context) {
    const calls = [];
    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'useOptimistic') {
          calls.push(node);
        }
      },
     'Program:exit'() {
        if (calls.length < 2) return;
        for (const call of calls) {
          context.report({ node: call, messageId: 'multipleCalls' });
        }
      },
    };
  },
};
