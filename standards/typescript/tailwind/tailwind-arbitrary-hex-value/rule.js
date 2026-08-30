/**
 * Flag arbitrary hex colour values in Tailwind utility class strings
 * (e.g. `bg-[#ee7038]`). Sprinkling raw hex through JSX bypasses the
 * design system — promote to `@theme { --color-...: #hex }`.
 */
const HEX_VALUE_RE = /\b(text|bg|border|ring|fill|stroke|from|to|via|decoration|outline|accent|caret|placeholder|divide|shadow)-\[#[0-9a-fA-F]{3,8}\b/;

function checkString(context, node, raw) {
  if (typeof raw !== 'string') return;
  if (HEX_VALUE_RE.test(raw)) {
    context.report({ node, messageId: 'arbitraryHex' });
  }
}

function walkExpression(context, expr) {
  if (!expr) return;
  if (expr.type === 'Literal') {
    checkString(context, expr, expr.value);
    return;
  }
  if (expr.type === 'TemplateLiteral') {
    for (const quasi of expr.quasis) {
      checkString(context, quasi, quasi.value.cooked);
    }
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
      description: 'Arbitrary hex colour in Tailwind utility class (bg-[#...]).',
    },
    schema: [],
    messages: {
      arbitraryHex:
       'Arbitrary hex colour in Tailwind utility (`bg-[#…]`). Promote to a named token: `@theme { --color-brand-orange: #ee7038 }` then `bg-brand-orange`.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (node.name.name !== 'className' && node.name.name !== 'class') return;
        const value = node.value;
        if (!value) return;
        if (value.type === 'Literal') {
          checkString(context, value, value.value);
          return;
        }
        if (value.type === 'JSXExpressionContainer') {
          walkExpression(context, value.expression);
        }
      },
    };
  },
};
