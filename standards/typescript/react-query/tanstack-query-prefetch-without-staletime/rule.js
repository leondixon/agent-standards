/**
 * Flag `prefetchQuery(...)` calls with no `staleTime` set anywhere in the
 * file. Without `staleTime` the hydrated data is immediately stale and
 * the client refetches on mount, defeating the SSR prefetch.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'prefetchQuery without `staleTime` — hydrated data refetches on mount.',
    },
    schema: [],
    messages: {
      missingStaleTime:
       'prefetchQuery without `staleTime` — hydrated data is immediately stale and the client refetches on mount, wasting the SSR prefetch. Add a `staleTime` matching how long the hydrated value should count as fresh.',
    },
  },
  create(context) {
    const prefetchCalls = [];
    let hasStaleTime = false;

    return {
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression'
          && node.callee.property.type === 'Identifier'
          && node.callee.property.name === 'prefetchQuery') {
          prefetchCalls.push(node);
        }
        if (node.callee.type === 'Identifier' && node.callee.name === 'prefetchQuery') {
          prefetchCalls.push(node);
        }
      },
      Property(node) {
        if (node.computed) return;
        const keyName = node.key.type === 'Identifier'
          ? node.key.name
          : (node.key.type === 'Literal' ? node.key.value : null);
        if (keyName === 'staleTime') hasStaleTime = true;
      },
     'Program:exit'() {
        if (hasStaleTime) return;
        for (const call of prefetchCalls) {
          context.report({ node: call, messageId: 'missingStaleTime' });
        }
      },
    };
  },
};
