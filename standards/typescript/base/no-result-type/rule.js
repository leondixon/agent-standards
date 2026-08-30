/**
 * Ban plain `*Result` interfaces / type aliases. Prefer `T | undefined`,
 * `throw httpError`, or a Zod schema used at runtime (`z.infer`).
 */

const RESULT_TYPE_NAME = /Result$/;

function isResultTypeName(name) {
  return typeof name === 'string' && RESULT_TYPE_NAME.test(name);
}

function isZodInfer(typeNode) {
  if (typeNode?.type !== 'TSTypeReference') {
    return false;
  }
  const typeName = typeNode.typeName;
  return (
    typeName?.type === 'TSQualifiedName'
    && typeName.left?.type === 'Identifier'
    && typeName.left.name === 'z'
    && typeName.right?.type === 'Identifier'
    && typeName.right.name === 'infer'
  );
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
       'Disallow plain `*Result` types — use T | undefined, throw httpError, or z.infer from a runtime schema.',
    },
    schema: [],
    messages: {
      resultType:
       'Do not define `{{name}}` as a plain result type — prefer `T | undefined`, `throw httpError`, or `z.infer` from a schema used at runtime.',
    },
  },
  create(context) {
    function report(node, name) {
      context.report({
        node,
        messageId: 'resultType',
        data: { name },
      });
    }

    return {
      TSInterfaceDeclaration(node) {
        const name = node.id?.name;
        if (!isResultTypeName(name)) {
          return;
        }
        report(node.id, name);
      },
      TSTypeAliasDeclaration(node) {
        const name = node.id?.name;
        if (!isResultTypeName(name)) {
          return;
        }
        if (isZodInfer(node.typeAnnotation)) {
          return;
        }
        report(node.id, name);
      },
    };
  },
};
