/**
 * Flag Radix `asChild` wrappers whose immediate child is a `<div>` or
 * `<span>` carrying an interactive handler (`onClick`, `onKeyDown`).
 * A bare `<div onClick>` isn't focusable and breaks keyboard activation.
 */
const NON_SEMANTIC = new Set(['div', 'span']);
const INTERACTIVE_HANDLERS = new Set(['onClick', 'onKeyDown', 'onKeyUp', 'onKeyPress']);

function hasAsChildProp(opening) {
  for (const attr of opening.attributes) {
    if (attr.type === 'JSXAttribute'
      && attr.name.type === 'JSXIdentifier'
      && attr.name.name === 'asChild'
      && (attr.value === null
        || attr.value === undefined
        || (attr.value.type === 'JSXExpressionContainer'
          && attr.value.expression.type === 'Literal'
          && attr.value.expression.value === true)
        || (attr.value.type === 'Literal' && attr.value.value === true))) {
      return true;
    }
  }
  return false;
}

function hasInteractiveHandler(jsxNode) {
  if (!jsxNode || jsxNode.type !== 'JSXElement') return false;
  const opening = jsxNode.openingElement;
  for (const attr of opening.attributes) {
    if (attr.type === 'JSXAttribute'
      && attr.name.type === 'JSXIdentifier'
      && INTERACTIVE_HANDLERS.has(attr.name.name)) {
      return true;
    }
  }
  for (const child of jsxNode.children) {
    if (child.type === 'JSXElement') {
      const cOpening = child.openingElement;
      for (const attr of cOpening.attributes) {
        if (attr.type === 'JSXAttribute'
          && attr.name.type === 'JSXIdentifier'
          && INTERACTIVE_HANDLERS.has(attr.name.name)) {
          return true;
        }
      }
    }
  }
  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Radix asChild wrapping a <div>/<span> with onClick — keyboard inaccessible.',
    },
    schema: [],
    messages: {
      nonSemanticChild:
       'Radix `asChild` wrapping a <div>/<span> with an interactive handler — not focusable, no implicit role, keyboard users can\'t activate it. Use a <button>/<a>, or restore `role` + `tabIndex` + keyboard handler explicitly.',
    },
  },
  create(context) {
    return {
      JSXElement(node) {
        if (!hasAsChildProp(node.openingElement)) return;
        let firstChildEl = null;
        for (const child of node.children) {
          if (child.type === 'JSXElement') {
            firstChildEl = child;
            break;
          }
          if (child.type === 'JSXText' && child.value.trim() === '') continue;
          if (child.type === 'JSXExpressionContainer'
            && child.expression.type === 'JSXEmptyExpression') continue;
          if (child.type === 'JSXText') return;
        }
        if (!firstChildEl) return;
        const childName = firstChildEl.openingElement.name;
        if (childName.type !== 'JSXIdentifier' || !NON_SEMANTIC.has(childName.name)) return;
        if (!hasInteractiveHandler(firstChildEl)) return;
        context.report({ node: firstChildEl, messageId: 'nonSemanticChild' });
      },
    };
  },
};
