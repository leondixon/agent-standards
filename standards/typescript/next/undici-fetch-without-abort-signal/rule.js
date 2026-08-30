/**
 * Flag backend `fetch(...)` calls in a file that has no `signal:` key
 * anywhere. Node's fetch has no default timeout — a stalled upstream
 * hangs forever. Pass `signal: AbortSignal.timeout(ms)`.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Backend fetch(...) with no `signal:` (AbortController/timeout) anywhere in the file.',
    },
    schema: [],
    messages: {
      missingSignal:
       'Backend `fetch(...)` with no `signal:` option — Node\'s fetch has no default timeout, a stalled upstream hangs forever. Pass `signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)` or a manually-managed AbortController.',
    },
  },
  create(context) {
    const fetchCalls = [];
    let hasSignalKey = false;

    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'fetch') {
          fetchCalls.push(node);
        }
      },
      Property(node) {
        if (node.computed) return;
        const keyName = node.key.type === 'Identifier'
          ? node.key.name
          : (node.key.type === 'Literal' ? node.key.value : null);
        if (keyName === 'signal') hasSignalKey = true;
      },
     'Program:exit'() {
        if (hasSignalKey) return;
        for (const call of fetchCalls) {
          context.report({ node: call, messageId: 'missingSignal' });
        }
      },
    };
  },
};
