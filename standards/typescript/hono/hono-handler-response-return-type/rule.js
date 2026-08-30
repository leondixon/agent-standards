function isContextParam(param) {
  const annotation = param?.typeAnnotation?.typeAnnotation;
  if (!annotation || annotation.type !== 'TSTypeReference') {
    return false;
  }
  const { typeName } = annotation;
  if (typeName.type === 'Identifier') {
    return typeName.name === 'Context';
  }
  if (typeName.type === 'TSQualifiedName') {
    return typeName.right.name === 'Context';
  }
  return false;
}

function isResponseTypeName(typeName) {
  if (!typeName) {
    return false;
  }
  if (typeName.type === 'Identifier') {
    return typeName.name === 'Response';
  }
  if (typeName.type === 'TSQualifiedName') {
    return typeName.right.name === 'Response';
  }
  return false;
}

function returnsResponse(returnAnnotation) {
  const annotation = returnAnnotation?.typeAnnotation;
  if (!annotation || annotation.type !== 'TSTypeReference') {
    return false;
  }
  const { typeName, typeArguments, typeParameters } = annotation;

  if (isResponseTypeName(typeName)) {
    return true;
  }

  const isPromise
    = (typeName.type === 'Identifier' && typeName.name === 'Promise')
      || (typeName.type === 'TSQualifiedName' && typeName.right.name === 'Promise');
  if (!isPromise) {
    return false;
  }

  const args = (typeArguments ?? typeParameters)?.params ?? [];
  const inner = args[0];
  return inner?.type === 'TSTypeReference' && isResponseTypeName(inner.typeName);
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
       'Hono route handler annotated Promise<Response>/Response erases the RPC client body type.',
    },
    schema: [],
    messages: {
      responseReturnType:
       'Hono handler is annotated to return {{returned}}, which erases the response body type from the typed RPC client (hc<AppType>). Remove the return annotation and let it be inferred from ctx.json(...).',
    },
  },
  create(context) {
    const specifierExportedNames = new Set();
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    for (const statement of sourceCode.ast.body) {
      if (statement.type === 'ExportNamedDeclaration' && !statement.declaration) {
        for (const specifier of statement.specifiers) {
          if (specifier.local?.type === 'Identifier') {
            specifierExportedNames.add(specifier.local.name);
          }
        }
      }
    }

    function bindingName(node) {
      const { parent } = node;
      if (parent?.type === 'FunctionDeclaration' && parent.id?.type === 'Identifier') {
        return parent.id.name;
      }
      if (node.type === 'FunctionDeclaration' && node.id?.type === 'Identifier') {
        return node.id.name;
      }
      if (parent?.type === 'VariableDeclarator' && parent.id?.type === 'Identifier') {
        return parent.id.name;
      }
      return undefined;
    }

    function isExported(node) {
      const { parent } = node;
      if (!parent) {
        return false;
      }
      if (parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration') {
        return true;
      }
      if (parent.type === 'VariableDeclarator' && parent.parent?.type === 'VariableDeclaration') {
        const declaration = parent.parent.parent;
        if (declaration?.type === 'ExportNamedDeclaration') {
          return true;
        }
      }
      const name = bindingName(node);
      return name !== undefined && specifierExportedNames.has(name);
    }

    function check(node) {
      if (!node.returnType) {
        return;
      }
      if (!isExported(node)) {
        return;
      }
      const [contextParam] = node.params;
      if (!isContextParam(contextParam)) {
        return;
      }
      if (!returnsResponse(node.returnType)) {
        return;
      }
      const returned
        = node.returnType.typeAnnotation?.type === 'TSTypeReference'
          && node.returnType.typeAnnotation.typeName?.type === 'Identifier'
          && node.returnType.typeAnnotation.typeName.name === 'Response'
          ? 'Response'
          : 'Promise<Response>';
      context.report({
        node: node.returnType,
        messageId: 'responseReturnType',
        data: { returned },
      });
    }

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
};
