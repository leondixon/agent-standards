/**
 * Flag `try { await ...; ... } catch { expect(...) }` blocks where the
 * `try` body contains `await` but no `throw new ...` after it, and no
 * `expect.assertions(N)` appears in the same `it()` scope. If the
 * awaited call never rejects, the catch is skipped and the test
 * silently passes.
 */
function walkSubtree(node, predicate, stopAtFunctions) {
  if (!node || typeof node !== 'object') return false;
  if (predicate(node)) return true;
  if (stopAtFunctions
    && (node.type === 'FunctionExpression'
      || node.type === 'ArrowFunctionExpression'
      || node.type === 'FunctionDeclaration')) {
    return false;
  }
  for (const key of Object.keys(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (walkSubtree(item, predicate, stopAtFunctions)) return true;
      }
    } else if (child && typeof child === 'object' && typeof child.type === 'string') {
      if (walkSubtree(child, predicate, stopAtFunctions)) return true;
    }
  }
  return false;
}

function bodyHasAwait(blockNode) {
  if (!blockNode || blockNode.type !== 'BlockStatement') return false;
  return walkSubtree(blockNode, (node) => node.type === 'AwaitExpression', true);
}

function bodyHasThrowAfterAwait(blockNode) {
  if (!blockNode || blockNode.type !== 'BlockStatement') return false;
  let sawAwait = false;
  for (const stmt of blockNode.body) {
    if (!sawAwait) {
      if (walkSubtree(stmt, (node) => node.type === 'AwaitExpression', true)) {
        sawAwait = true;
      }
      continue;
    }
    if (stmt.type === 'ThrowStatement') return true;
    if (walkSubtree(stmt, (node) => node.type === 'ThrowStatement', true)) return true;
  }
  return false;
}

function isExpectCall(node) {
  if (node.type !== 'CallExpression') return false;
  const callee = node.callee;
  if (callee.type === 'Identifier' && callee.name === 'expect') return true;
  if (callee.type === 'MemberExpression'
    && callee.object.type === 'CallExpression'
    && callee.object.callee.type === 'Identifier'
    && callee.object.callee.name === 'expect') return true;
  return false;
}

function catchHasExpect(handler) {
  if (!handler || !handler.body) return false;
  return walkSubtree(handler.body, isExpectCall, false);
}

function findEnclosingItCall(node) {
  let current = node.parent;
  while (current) {
    if (current.type === 'CallExpression'
      && current.callee.type === 'Identifier'
      && (current.callee.name === 'it' || current.callee.name === 'test')) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function isExpectAssertionsHint(node) {
  return node.type === 'CallExpression'
    && node.callee.type === 'MemberExpression'
    && node.callee.object.type === 'Identifier'
    && node.callee.object.name === 'expect'
    && node.callee.property.type === 'Identifier'
    && (node.callee.property.name === 'assertions' || node.callee.property.name === 'hasAssertions');
}

function itBodyHasAssertionsHint(itCall) {
  if (!itCall) return false;
  for (const arg of itCall.arguments) {
    if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
      if (walkSubtree(arg.body, isExpectAssertionsHint, false)) return true;
    }
  }
  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'try/await/catch with expect() but no assertions count or throw-after-await guard.',
    },
    schema: [],
    messages: {
      missingGuard:
       'try/await/catch with `expect(...)` in the catch — if the awaited call doesn\'t throw, the catch is skipped and the test silently passes. Rewrite as `await expect(fn()).rejects.toThrow(...)`, or add `expect.assertions(N)` at the top of the it() and `throw new Error(...)` after the await.',
    },
  },
  create(context) {
    return {
      TryStatement(node) {
        if (!node.handler) return;
        if (!bodyHasAwait(node.block)) return;
        if (bodyHasThrowAfterAwait(node.block)) return;
        if (!catchHasExpect(node.handler)) return;
        const itCall = findEnclosingItCall(node);
        if (itCall && itBodyHasAssertionsHint(itCall)) return;
        context.report({ node, messageId: 'missingGuard' });
      },
    };
  },
};
