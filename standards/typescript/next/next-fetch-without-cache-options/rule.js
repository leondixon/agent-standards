/**
 * Flag bare `fetch(url)` (no options arg) in non-`'use client'` Next files.
 * Next 16 changed the default — fetch is NOT cached unless you opt in.
 * See docs/best-practices.md § Next.js 16.2.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Server-side bare fetch(url) in a Next 16 app — no cache opt-in.',
    },
    schema: [],
    messages: {
      missingCacheOption:
       'Server-side `fetch(url)` with no options argument. Next 16 does NOT cache fetch by default — pass `{ next: { revalidate } }` or `{ cache: \'force-cache\' }`, or confirm uncached is intended. See docs/best-practices.md § Next.js 16.2.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const firstStatement = sourceCode.ast.body[0];
    if (firstStatement
      && firstStatement.type === 'ExpressionStatement'
      && firstStatement.expression.type === 'Literal'
      && firstStatement.expression.value === 'use client') {
      return {};
    }
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'fetch') return;
        if (node.arguments.length !== 1) return;
        context.report({ node, messageId: 'missingCacheOption' });
      },
    };
  },
};
