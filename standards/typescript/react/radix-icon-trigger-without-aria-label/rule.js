/**
 * Flag Radix icon-only triggers (`*Trigger`/`*Close`/`*IconButton`) whose
 * sole child is an icon element and which lack `aria-label`/`aria-labelledby`.
 * Radix renders an unlabelled `button`; screen readers announce nothing.
 */
const TRIGGER_SUFFIX_RE = /(Trigger|Close|IconButton)$/;
const ICON_NAME_RE = /Icon$/;
const ICON_EXACT = new Set(['Icon']);
const LUCIDE_PREFIX_RE = /^Lucide/;

function getLeafName(jsxName) {
  if (jsxName.type === 'JSXIdentifier') return jsxName.name;
  if (jsxName.type === 'JSXMemberExpression') return getLeafName(jsxName.property);
  return null;
}

function isIconName(jsxName) {
  const name = getLeafName(jsxName);
  if (!name) return false;
  if (ICON_EXACT.has(name)) return true;
  if (ICON_NAME_RE.test(name)) return true;
  if (LUCIDE_PREFIX_RE.test(name)) return true;
  return false;
}

function hasAriaLabel(opening) {
  for (const attr of opening.attributes) {
    if (attr.type !== 'JSXAttribute') continue;
    if (attr.name.type !== 'JSXIdentifier') continue;
    if (attr.name.name === 'aria-label' || attr.name.name === 'aria-labelledby') return true;
  }
  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Radix icon-only trigger missing aria-label/aria-labelledby.',
    },
    schema: [],
    messages: {
      missingAriaLabel:
       'Icon-only `*Trigger`/`*Close`/`*IconButton` renders a button with no accessible name. Add `aria-label="..."` on the trigger (or wire `aria-labelledby` to a visible label).',
    },
  },
  create(context) {
    return {
      JSXElement(node) {
        const opening = node.openingElement;
        const name = getLeafName(opening.name);
        if (!name || !TRIGGER_SUFFIX_RE.test(name)) return;
        if (hasAriaLabel(opening)) return;

        let iconChild = null;
        let nonIconChild = false;
        for (const child of node.children) {
          if (child.type === 'JSXText' && child.value.trim() === '') continue;
          if (child.type === 'JSXText') { nonIconChild = true; break; }
          if (child.type === 'JSXExpressionContainer'
            && child.expression.type === 'JSXEmptyExpression') continue;
          if (child.type === 'JSXExpressionContainer') { nonIconChild = true; break; }
          if (child.type === 'JSXElement') {
            if (iconChild) { nonIconChild = true; break; }
            if (!isIconName(child.openingElement.name)) { nonIconChild = true; break; }
            iconChild = child;
            continue;
          }
          nonIconChild = true;
          break;
        }
        if (iconChild && !nonIconChild) {
          context.report({ node: opening, messageId: 'missingAriaLabel' });
        }
      },
    };
  },
};
