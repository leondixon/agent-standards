/**
 * Flag files that use `useMutation` but never call any cache-update helper.
 * Without invalidation the cached read path stays stale after a successful
 * mutation.
 */
const CACHE_HELPERS = new Set([
 'invalidateQueries', 'setQueryData', 'refetchQueries', 'removeQueries',
]);

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'useMutation without invalidateQueries/setQueryData/refetchQueries/removeQueries.',
    },
    schema: [],
    messages: {
      missingInvalidation:
       'useMutation without any cache update — the cached read path stays stale after success. Call `invalidateQueries`/`setQueryData` in `onSuccess`, or confirm no cached read needs invalidating.',
    },
  },
  create(context) {
    const mutationCalls = [];
    let hasCacheUpdate = false;

    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'useMutation') {
          mutationCalls.push(node);
        }
        if (node.callee.type === 'MemberExpression'
          && node.callee.property.type === 'Identifier'
          && CACHE_HELPERS.has(node.callee.property.name)) {
          hasCacheUpdate = true;
        }
        if (node.callee.type === 'Identifier' && CACHE_HELPERS.has(node.callee.name)) {
          hasCacheUpdate = true;
        }
      },
     'Program:exit'() {
        if (hasCacheUpdate) return;
        for (const call of mutationCalls) {
          context.report({ node: call, messageId: 'missingInvalidation' });
        }
      },
    };
  },
};
