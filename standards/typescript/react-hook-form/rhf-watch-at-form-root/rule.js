/**
 * Flag `.watch(` calls in the same file that owns the `useForm` call.
 * `watch()` at the form root re-renders the whole form on every change.
 * Scoped subscriptions belong in `useWatch({ control, name })`.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: '.watch() in the same file as useForm — prefer useWatch for scoped subscriptions.',
    },
    schema: [],
    messages: {
      watchAtRoot:
       '.watch() in the same file as useForm — re-renders the whole form on every change. Use `useWatch({ control, name })` in the consumer component.',
    },
  },
  create(context) {
    let hasUseForm = false;
    const watchCalls = [];

    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'useForm') {
          hasUseForm = true;
          return;
        }
        if (
          node.callee.type === 'MemberExpression'
          && node.callee.property.type === 'Identifier'
          && node.callee.property.name === 'watch'
        ) {
          watchCalls.push(node);
        }
      },
     'Program:exit'() {
        if (!hasUseForm) return;
        for (const call of watchCalls) {
          context.report({ node: call, messageId: 'watchAtRoot' });
        }
      },
    };
  },
};
