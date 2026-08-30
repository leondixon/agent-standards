/**
 * Flag files using `useReactTable` + `columnHelper.<...>(...)` without any
 * `useMemo` anywhere. A fresh `columns` array per render re-initialises
 * `useReactTable` and wipes sort/pagination/visibility state
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'TanStack Table columns built in render without useMemo.',
    },
    schema: [],
    messages: {
      columnsInRender:
       'TanStack Table columns built without `useMemo` — every render creates a fresh array and `useReactTable` re-initialises, wiping sort/pagination/visibility state. Lift columns to module scope or wrap in `useMemo(() => [...], [deps])`',
    },
  },
  create(context) {
    let usesReactTable = false;
    let hasUseMemo = false;
    const columnHelperCalls = [];

    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'useReactTable') {
          usesReactTable = true;
        }
        if (node.callee.type === 'Identifier' && node.callee.name === 'useMemo') {
          hasUseMemo = true;
        }
        if (
          node.callee.type === 'MemberExpression'
          && node.callee.object.type === 'Identifier'
          && node.callee.object.name === 'columnHelper'
        ) {
          columnHelperCalls.push(node);
        }
      },
     'Program:exit'() {
        if (!usesReactTable || hasUseMemo) return;
        for (const call of columnHelperCalls) {
          context.report({ node: call, messageId: 'columnsInRender' });
        }
      },
    };
  },
};
