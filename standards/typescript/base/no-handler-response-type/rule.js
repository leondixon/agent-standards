/**
 * Ban plain `*Response` interfaces / object type aliases that exist only to
 * shape handler JSON. Prefer returning object literals from handlers (Hono
 * infers the RPC type) or a Zod schema used at runtime / OpenAPI.
 */

const RESPONSE_TYPE_NAME = /Response$/;

function isResponseTypeName(name) {
  return typeof name === 'string' && RESPONSE_TYPE_NAME.test(name);
}

function isPlainObjectType(typeNode) {
  return typeNode?.type === 'TSTypeLiteral';
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
       'Disallow plain `*Response` types — return handler JSON inline or use a runtime Zod schema.',
    },
    schema: [],
    messages: {
      handlerResponseType:
       'Do not define `{{name}}` as a plain response type — return the object inline from the handler, or use a Zod schema that is parsed / documented at runtime.',
    },
  },
  create(context) {
    function report(node, name) {
      context.report({
        node,
        messageId: 'handlerResponseType',
        data: { name },
      });
    }

    return {
      TSInterfaceDeclaration(node) {
        const name = node.id?.name;
        if (!isResponseTypeName(name)) return;
        report(node.id, name);
      },
      TSTypeAliasDeclaration(node) {
        const name = node.id?.name;
        if (!isResponseTypeName(name)) return;
        if (!isPlainObjectType(node.typeAnnotation)) return;
        report(node.id, name);
      },
    };
  },
};
