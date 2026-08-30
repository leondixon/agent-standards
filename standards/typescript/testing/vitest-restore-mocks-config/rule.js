/**
 * Strict: every `vitest.config.{ts,js,mjs,mts,cjs}` must set
 * `restoreMocks: true` in its `test:` block. Without it, `vi.spyOn` /
 * `vi.fn().mockImplementation(...)` state leaks between tests.
 */
function isVitestConfigFile(filename) {
  return /(^|[\\/])vitest\.config\.(ts|js|mts|mjs|cjs)$/.test(filename);
}

function findRestoreMocksTrue(programBody) {
  let found = false;
  function walk(node) {
    if (found || !node || typeof node !== 'object') return;
    if (node.type === 'Property'
      && !node.computed
      && ((node.key.type === 'Identifier' && node.key.name === 'restoreMocks')
        || (node.key.type === 'Literal' && node.key.value === 'restoreMocks'))
      && node.value.type === 'Literal'
      && node.value.value === true) {
      found = true;
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      const child = node[key];
      if (Array.isArray(child)) for (const item of child) walk(item);
      else if (child && typeof child === 'object' && typeof child.type === 'string') walk(child);
    }
  }
  for (const stmt of programBody) walk(stmt);
  return found;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'vitest.config must set `restoreMocks: true` in its `test:` block.',
    },
    schema: [],
    messages: {
      missingRestoreMocks:
       'vitest config without `restoreMocks: true`. Without it, vi.spyOn / vi.fn().mockImplementation(...) state leaks between tests — a mock set in test A keeps firing in test B and false-positives the suite.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!isVitestConfigFile(filename)) return {};
    return {
     'Program:exit'(node) {
        if (!findRestoreMocksTrue(node.body)) {
          context.report({ node, messageId: 'missingRestoreMocks' });
        }
      },
    };
  },
};
