/**
 * Ban function parameters typed as an inline object with fewer than 3 properties.
 * Use plain parameters for one or two values. Object params are for 3 or more
 * fields (see AGENTS.md).
 *
 * React components (PascalCase) may keep a single-prop props object — that is
 * idiomatic JSX, not a domain collaborator options bag.
 */

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
  if (
    node.parent?.type === 'PropertyDefinition'
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

function unwrapType(node) {
  if (!node) {
    return undefined;
  }
  if (node.type === 'TSTypeAnnotation') {
    return unwrapType(node.typeAnnotation);
  }
  if (node.type === 'TSParenthesizedType') {
    return unwrapType(node.typeAnnotation);
  }
  return node;
}

function propertySignatures(typeLiteral) {
  if (!typeLiteral || typeLiteral.type !== 'TSTypeLiteral') {
    return [];
  }
  return typeLiteral.members.filter(member => member.type === 'TSPropertySignature');
}

const MIN_OBJECT_PARAM_FIELDS = 3;

function objectFieldNames(typeLiteral) {
  return propertySignatures(typeLiteral).flatMap((prop) => {
    if (prop.key?.type === 'Identifier') {
      return [prop.key.name];
    }
    if (prop.key?.type === 'Literal' && typeof prop.key.value === 'string') {
      return [prop.key.value];
    }
    return [];
  });
}

const OPTIONS_PARAM_NAMES = new Set(['options', 'opts', 'config']);

function paramBindingName(param) {
  if (param.type === 'Identifier') {
    return param.name;
  }
  if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier') {
    return param.left.name;
  }
  return undefined;
}

function isOptionsBag(param) {
  const name = paramBindingName(param);
  return typeof name === 'string' && OPTIONS_PARAM_NAMES.has(name);
}

function reportParam(context, param, names) {
  context.report({
    node: param,
    messageId: 'singlePropertyParams',
    data: { names: names.join(', ') },
  });
}

function checkFunction(context, node) {
  if (isPascalCase(functionName(node))) {
    return;
  }

  for (const param of node.params) {
    if (param.type === 'RestElement') {
      continue;
    }
    if (isOptionsBag(param)) {
      continue;
    }

    const typeNode = unwrapType(param.typeAnnotation);
    const names = objectFieldNames(typeNode);
    if (names.length === 0 || names.length >= MIN_OBJECT_PARAM_FIELDS) {
      continue;
    }

    reportParam(context, param, names);
  }
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
       'Disallow a function parameter typed as an inline object with fewer than 3 properties — use plain parameters instead.',
    },
    schema: [],
    messages: {
      singlePropertyParams:
       'Do not wrap one or two fields in a params object (`{ {{names}} }`). Use plain parameters instead. Object params are for 3 or more fields.',
    },
  },
  create(context) {
    return {
      FunctionDeclaration(node) {
        checkFunction(context, node);
      },
      FunctionExpression(node) {
        checkFunction(context, node);
      },
      ArrowFunctionExpression(node) {
        checkFunction(context, node);
      },
    };
  },
};
