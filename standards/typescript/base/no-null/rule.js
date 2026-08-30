const PRISMA_WRITE_METHODS = new Set([
 'create',
 'update',
 'upsert',
 'createMany',
 'updateMany',
]);

const REACT_RENDER_TYPE_NAMES = new Set([
 'ReactElement',
 'ReactNode',
 'Element',
 'JSX.Element',
 'React.ReactElement',
 'React.ReactNode',
 'React.JSX.Element',
]);

function isNullLiteral(node) {
  return node.type === 'Literal' && node.value === null;
}

function isEqualityCheck(node) {
  return (
    node.type === 'BinaryExpression'
    && ['==', '!=', '===', '!=='].includes(node.operator)
  );
}

function isMethodCall(node, { object, method, argumentsLength }) {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const { callee } = node;
  if (
    callee.type !== 'MemberExpression'
    || callee.computed
    || callee.property.type !== 'Identifier'
    || callee.property.name !== method
  ) {
    return false;
  }
  if (argumentsLength !== undefined && node.arguments.length !== argumentsLength) {
    return false;
  }
  if (object === undefined) {
    return true;
  }
  return callee.object.type === 'Identifier' && callee.object.name === object;
}

function isUseRefCall(node) {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const { callee } = node;
  if (callee.type === 'Identifier' && callee.name === 'useRef' && node.arguments.length === 1) {
    return true;
  }
  return isMethodCall(node, { object: 'React', method: 'useRef', argumentsLength: 1 });
}

function isHistoryStateCall(node) {
  if (node.type !== 'CallExpression' || node.arguments.length < 1) {
    return false;
  }
  const { callee } = node;
  if (callee.type !== 'MemberExpression' || callee.computed || callee.property.type !== 'Identifier') {
    return false;
  }
  if (!['pushState', 'replaceState'].includes(callee.property.name)) {
    return false;
  }
  if (callee.object.type === 'Identifier' && callee.object.name === 'history') {
    return true;
  }
  return (
    callee.object.type === 'MemberExpression'
    && !callee.object.computed
    && callee.object.property.type === 'Identifier'
    && callee.object.property.name === 'history'
  );
}

function isPrismaWriteCall(callNode) {
  const { callee } = callNode;
  if (
    callee?.type !== 'MemberExpression'
    || callee.computed
    || callee.property.type !== 'Identifier'
    || !PRISMA_WRITE_METHODS.has(callee.property.name)
  ) {
    return false;
  }

  if (callee.object.type === 'MemberExpression') {
    return true;
  }

  return (
    callee.object.type === 'Identifier'
    && (callee.object.name === 'prisma' || callee.object.name === 'tx')
  );
}

function typeName(node) {
  if (!node) {
    return undefined;
  }
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'TSQualifiedName') {
    const left = typeName(node.left);
    const right = typeName(node.right);
    if (left && right) {
      return `${left}.${right}`;
    }
  }
  if (node.type === 'TSTypeReference') {
    return typeName(node.typeName);
  }
  return undefined;
}

function isReactRenderType(node) {
  if (!node) {
    return false;
  }

  switch (node.type) {
    case 'TSTypeAnnotation':
      return isReactRenderType(node.typeAnnotation);
    case 'TSParenthesizedType':
      return isReactRenderType(node.typeAnnotation);
    case 'TSUnionType':
    case 'TSIntersectionType':
      return node.types.some(entry => isReactRenderType(entry));
    case 'TSTypeReference': {
      const name = typeName(node);
      return Boolean(name && REACT_RENDER_TYPE_NAMES.has(name));
    }
    default:
      return false;
  }
}

function functionName(node) {
  if (!node) {
    return undefined;
  }
  if (node.type === 'FunctionDeclaration' && node.id?.type === 'Identifier') {
    return node.id.name;
  }
  if (node.type === 'FunctionExpression' && node.id?.type === 'Identifier') {
    return node.id.name;
  }
  if (node.parent?.type === 'VariableDeclarator' && node.parent.id?.type === 'Identifier') {
    return node.parent.id.name;
  }
  if (
    node.parent?.type === 'Property'
    && !node.parent.computed
    && node.parent.key.type === 'Identifier'
  ) {
    return node.parent.key.name;
  }
  if (
    node.parent?.type === 'MethodDefinition'
    && !node.parent.computed
    && node.parent.key.type === 'Identifier'
  ) {
    return node.parent.key.name;
  }
  return undefined;
}

function isPascalCase(name) {
  return typeof name === 'string' && /^[A-Z][A-Za-z0-9]*$/.test(name);
}

function isFunctionNode(node) {
  return (
    node.type === 'FunctionDeclaration'
    || node.type === 'FunctionExpression'
    || node.type === 'ArrowFunctionExpression'
  );
}

function enclosingFunction(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (isFunctionNode(current)) {
      return current;
    }
  }
  return undefined;
}

function isReactComponentFunction(functionNode, filename) {
  if (!functionNode) {
    return false;
  }
  if (functionNode.returnType && isReactRenderType(functionNode.returnType)) {
    return true;
  }
  const name = functionName(functionNode);
  const isTsx = typeof filename === 'string' && filename.replaceAll('\\', '/').endsWith('.tsx');
  return isTsx && isPascalCase(name);
}

function isAllowedNullLiteral(node, filename) {
  const { parent } = node;
  if (!parent) {
    return false;
  }

  if (isEqualityCheck(parent)) {
    return true;
  }

  if (
    isMethodCall(parent, { object: 'Object', method: 'create' })
    && parent.arguments[0] === node
  ) {
    return true;
  }

  if (isUseRefCall(parent) && parent.arguments[0] === node) {
    return true;
  }

  if (
    isMethodCall(parent, { method: 'insertBefore', argumentsLength: 2 })
    && parent.arguments[1] === node
  ) {
    return true;
  }

  if (isHistoryStateCall(parent) && parent.arguments[0] === node) {
    return true;
  }

  for (let current = parent; current; current = current.parent) {
    if (current.type === 'JSXExpressionContainer') {
      return true;
    }
  }

  for (let current = parent; current; current = current.parent) {
    if (current.type === 'CallExpression' && isPrismaWriteCall(current)) {
      return true;
    }
  }

  if (parent.type === 'ReturnStatement' && parent.argument === node) {
    return isReactComponentFunction(enclosingFunction(node), filename);
  }

  if (
    parent.type === 'ArrowFunctionExpression'
    && parent.body === node
    && isReactComponentFunction(parent, filename)
  ) {
    return true;
  }

  return false;
}

function returnTypeContainsNode(functionNode, target) {
  const returnType = functionNode.returnType;
  if (!returnType) {
    return false;
  }

  for (let current = target; current; current = current.parent) {
    if (current === returnType) {
      return true;
    }
    if (isFunctionNode(current)) {
      return false;
    }
  }
  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
       'Disallow `null` as a domain missing-value sentinel. Allow Prisma writes, React render-nothing, DOM APIs that require null, and equality checks against DB/JSON null.',
    },
    schema: [],
    messages: {
      nullLiteral: 'Use `undefined` instead of `null`.',
      nullReturnType:
       'Do not use `null` in function return types; use `undefined`. React render types (`ReactElement | null`) are allowed.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename?.();

    return {
      Literal(node) {
        if (!isNullLiteral(node)) {
          return;
        }
        if (isAllowedNullLiteral(node, filename)) {
          return;
        }
        context.report({ node, messageId: 'nullLiteral' });
      },
      TSNullKeyword(node) {
        const functionNode = enclosingFunction(node);
        if (!functionNode || !returnTypeContainsNode(functionNode, node)) {
          return;
        }
        if (isReactRenderType(functionNode.returnType)) {
          return;
        }
        context.report({ node, messageId: 'nullReturnType' });
      },
    };
  },
};
