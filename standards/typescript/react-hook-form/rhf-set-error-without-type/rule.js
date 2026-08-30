/**
 * Flag RHF `setError(name, { message: ... })` calls that omit `type:`.
 * Without a type, the error sticks until the form re-validates globally —
 * typing in the field doesn't clear it. Use `type: 'server'` for
 * back-end-sourced errors.
 */
function hasReactHookFormImport(sourceCode) {
  for (const node of sourceCode.ast.body) {
    if (node.type === 'ImportDeclaration' && node.source.value === 'react-hook-form') {
      return true;
    }
  }
  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'RHF setError without an explicit `type:` field.',
    },
    schema: [],
    messages: {
      missingType:
       'setError without a `type:` — the error won\'t clear on next edit. Use `setError(\'field\', { type: \'server\', message })`.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    if (!hasReactHookFormImport(sourceCode)) return {};

    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'setError') return;
        if (node.arguments.length < 2) return;
        const errArg = node.arguments[1];
        if (errArg.type !== 'ObjectExpression') return;
        let hasMessage = false;
        let hasType = false;
        for (const prop of errArg.properties) {
          if (prop.type !== 'Property' || prop.computed) continue;
          const keyName = prop.key.type === 'Identifier'
            ? prop.key.name
            : (prop.key.type === 'Literal' ? prop.key.value : null);
          if (keyName === 'message') hasMessage = true;
          if (keyName === 'type') hasType = true;
        }
        if (hasMessage && !hasType) {
          context.report({ node, messageId: 'missingType' });
        }
      },
    };
  },
};
