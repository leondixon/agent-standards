/**
 * Flag optimistic mutations (`onMutate:`) that lack a rollback context —
 * either no `onError:` handler, or no `getQueryData` snapshot capture.
 * Without rollback the cache stays wrong after the server rejects.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Optimistic mutation without `onError`/`getQueryData` rollback context.',
    },
    schema: [],
    messages: {
      missingRollback:
       'Optimistic mutation without rollback — capture `previous` via `getQueryData` and restore it in `onError`, or the cache stays wrong after a failed mutation.',
    },
  },
  create(context) {
    const onMutateProps = [];
    let hasOnError = false;
    let hasGetQueryData = false;

    return {
      Property(node) {
        if (node.computed) return;
        const keyName = node.key.type === 'Identifier'
          ? node.key.name
          : (node.key.type === 'Literal' ? node.key.value : null);
        if (keyName === 'onMutate') onMutateProps.push(node);
        if (keyName === 'onError') hasOnError = true;
      },
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression'
          && node.callee.property.type === 'Identifier'
          && node.callee.property.name === 'getQueryData') {
          hasGetQueryData = true;
        }
        if (node.callee.type === 'Identifier' && node.callee.name === 'getQueryData') {
          hasGetQueryData = true;
        }
      },
     'Program:exit'() {
        if (hasOnError && hasGetQueryData) return;
        for (const prop of onMutateProps) {
          context.report({ node: prop, messageId: 'missingRollback' });
        }
      },
    };
  },
};
