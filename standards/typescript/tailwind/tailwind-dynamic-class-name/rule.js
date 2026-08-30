/**
 * Flag dynamically-concatenated Tailwind class names like `text-${severity}`.
 * Tailwind 4's scanner only sees literal class strings — partials with
 * interpolation are purged. Map known keys to full class-name literals.
 *
 */
const DYNAMIC_PREFIX_RE = /\b(text|bg|border|ring|fill|stroke|from|to|via|grid-cols|grid-rows|col-span|row-span)-$/;

function templateHasDynamicTailwind(node) {
  if (!node || node.type !== 'TemplateLiteral') return false;
  for (let i = 0; i < node.quasis.length - 1; i++) {
    const quasi = node.quasis[i];
    const cooked = quasi.value.cooked ?? '';
    const lastSegment = cooked.split(/\s+/).pop() ?? '';
    if (DYNAMIC_PREFIX_RE.test(lastSegment)) return true;
  }
  return false;
}

function walkExpression(context, expr) {
  if (!expr) return;
  if (expr.type === 'TemplateLiteral') {
    if (templateHasDynamicTailwind(expr)) {
      context.report({ node: expr, messageId: 'dynamicClass' });
    }
    for (const part of expr.expressions) walkExpression(context, part);
    return;
  }
  if (expr.type === 'BinaryExpression' && expr.operator === '+') {
    walkExpression(context, expr.left);
    walkExpression(context, expr.right);
    return;
  }
  if (expr.type === 'ConditionalExpression') {
    walkExpression(context, expr.consequent);
    walkExpression(context, expr.alternate);
    return;
  }
  if (expr.type === 'LogicalExpression') {
    walkExpression(context, expr.left);
    walkExpression(context, expr.right);
    return;
  }
  if (expr.type === 'CallExpression') {
    for (const arg of expr.arguments) walkExpression(context, arg);
    return;
  }
  if (expr.type === 'ArrayExpression') {
    for (const el of expr.elements) walkExpression(context, el);
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Dynamic Tailwind class via template-literal interpolation (purged at build).',
    },
    schema: [],
    messages: {
      dynamicClass:
       'Dynamically-built Tailwind class name — Tailwind 4\'s scanner only sees literal class strings, so partials like `text-${severity}` are purged. Map known keys to full class names: `const tone = { ok: \'text-green-600\', err: \'text-red-600\' }[severity]`.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (node.name.name !== 'className' && node.name.name !== 'class') return;
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;
        walkExpression(context, node.value.expression);
      },
    };
  },
};
