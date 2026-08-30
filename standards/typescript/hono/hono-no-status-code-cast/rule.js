const WIDE_STATUS_TYPE_NAMES = new Set([
 'ContentfulStatusCode',
 'StatusCode',
 'ErrorStatus',
 'SuccessStatusCode',
]);

function typeReferenceName(typeName) {
  if (!typeName) {
    return undefined;
  }
  if (typeName.type === 'Identifier') {
    return typeName.name;
  }
  if (typeName.type === 'TSQualifiedName') {
    return typeName.right.name;
  }
  return undefined;
}

function typeArgumentsOf(typeNode) {
  return typeNode.typeArguments?.params ?? typeNode.typeParameters?.params ?? [];
}

function isWideStatusAssertion(typeNode) {
  if (!typeNode) {
    return false;
  }

  if (typeNode.type === 'TSParenthesizedType') {
    return isWideStatusAssertion(typeNode.typeAnnotation);
  }

  if (typeNode.type === 'TSUnionType' || typeNode.type === 'TSIntersectionType') {
    return typeNode.types.some(isWideStatusAssertion);
  }

  if (typeNode.type !== 'TSTypeReference') {
    return false;
  }

  const name = typeReferenceName(typeNode.typeName);
  if (name && WIDE_STATUS_TYPE_NAMES.has(name)) {
    return true;
  }

  if (name === 'Exclude' || name === 'Extract' || name === 'Omit') {
    return typeArgumentsOf(typeNode).some((typeArg) => {
      if (typeArg.type !== 'TSTypeReference') {
        return false;
      }
      const argName = typeReferenceName(typeArg.typeName);
      return argName === 'ContentfulStatusCode' || argName === 'StatusCode';
    });
  }

  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
       'Disallow casting to wide HTTP status unions so Hono handlers pass literal status codes.',
    },
    schema: [],
    messages: {
      statusCodeCast:
       'Do not cast to {{typeName}}. Pass a numeric status literal to ctx.json(...) (e.g. 401), or rethrow and let onError handle unknown statuses.',
    },
  },
  create(context) {
    function checkAssertion(node) {
      const typeNode = node.typeAnnotation ?? node.typeName;
      if (!isWideStatusAssertion(typeNode)) {
        return;
      }

      let typeName = 'a wide status union';
      if (typeNode.type === 'TSTypeReference') {
        typeName = typeReferenceName(typeNode.typeName) ?? typeName;
      }

      context.report({
        node,
        messageId: 'statusCodeCast',
        data: { typeName },
      });
    }

    return {
      TSAsExpression: checkAssertion,
      TSTypeAssertion: checkAssertion,
    };
  },
};
