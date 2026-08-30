/**
 * Flag Playwright `expect(...).toHaveScreenshot(...)` calls in a spec file
 * where `animations: 'disabled'` doesn't appear anywhere. Visual snapshots
 * against in-flight animation frames are unreproducible.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'toHaveScreenshot without `animations: \'disabled\'` somewhere in the file.',
    },
    schema: [],
    messages: {
      missingAnimationsDisabled:
       '`toHaveScreenshot` without `animations: \'disabled\'` somewhere in the file. Snapshot diffs against in-flight animation frames are unreproducible. Pass `{ animations: \'disabled\' }` or share a config object across calls.',
    },
  },
  create(context) {
    const screenshotCalls = [];
    let hasAnimationsDisabled = false;

    return {
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression'
          && node.callee.property.type === 'Identifier'
          && node.callee.property.name === 'toHaveScreenshot') {
          screenshotCalls.push(node);
        }
      },
      Property(node) {
        if (node.computed) return;
        const keyName = node.key.type === 'Identifier'
          ? node.key.name
          : (node.key.type === 'Literal' ? node.key.value : null);
        if (keyName !== 'animations') return;
        const value = node.value;
        if (value.type === 'Literal' && value.value === 'disabled') hasAnimationsDisabled = true;
      },
     'Program:exit'() {
        if (hasAnimationsDisabled) return;
        for (const call of screenshotCalls) {
          context.report({ node: call, messageId: 'missingAnimationsDisabled' });
        }
      },
    };
  },
};
