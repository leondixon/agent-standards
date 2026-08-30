/**
 * Flag files that copy a TanStack Query `data` into React state via
 * `useState(data)` or `useEffect(() => setX(data))`. The cache is the
 * source of truth — read `data` directly or use `select`.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Query data copied into local React state (useState(data) / useEffect setter).',
    },
    schema: [],
    messages: {
      copiedIntoState:
       'Query `data` copied into local React state — two sources of truth that will drift. Read `data` directly or use `select` to derive.',
    },
  },
  create(context) {
    let usesUseQuery = false;
    const offenders = [];

    function isDataIdent(node) {
      return node && node.type === 'Identifier' && node.name === 'data';
    }

    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'useQuery') {
          usesUseQuery = true;
        }
        if (node.callee.type === 'Identifier' && node.callee.name === 'useState') {
          if (node.arguments.length >= 1 && isDataIdent(node.arguments[0])) {
            offenders.push(node);
          }
        }
        if (node.callee.type === 'Identifier' && node.callee.name === 'useEffect') {
          const fnArg = node.arguments[0];
          if (fnArg && (fnArg.type === 'ArrowFunctionExpression' || fnArg.type === 'FunctionExpression')) {
            const sourceCode = context.sourceCode ?? context.getSourceCode();
            const text = sourceCode.getText(fnArg);
            if (/\bset[A-Z][A-Za-z0-9_]*\(\s*data\s*\)/.test(text)) {
              offenders.push(node);
            }
          }
        }
      },
     'Program:exit'() {
        if (!usesUseQuery) return;
        for (const node of offenders) {
          context.report({ node, messageId: 'copiedIntoState' });
        }
      },
    };
  },
};
